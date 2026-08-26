/**
 * Seed the vehicle catalog: brands -> series -> vehicles.
 * ---------------------------------------------------------------------------
 *   npm run seed:catalog
 *   npm run seed:catalog -- --dry-run
 *   npm run seed:catalog -- --brand=Toyota --brand=BYD
 *
 * WHY THIS IS A SCRIPT AND NOT AN ENDPOINT
 * The catalog is reference data, not user data. It is written once per
 * deployment and then edited by hand, so it does not belong behind the request
 * path where a 30 000-row insert would be one long HTTP timeout waiting to
 * happen. Running it as a script also means it can be pointed at staging or a
 * fresh local database without an admin account existing yet.
 *
 * WHY IT DOES NOT GO THROUGH THE USE CASES
 * CreateVehicleUseCase does one existence check and one insert per row. That is
 * exactly right for a human adding a car through the admin UI and completely
 * wrong for tens of thousands of rows: it would be ~60 000 sequential round
 * trips. This uses the same schemas (imported, not re-declared, so the indexes
 * and field names cannot drift) and does the work in bulk.
 *
 * IDEMPOTENCE
 * Every write is an upsert keyed on the same natural key the unique indexes
 * enforce: brand by `name`, series by `(brandId, name)`, vehicle by
 * `(seriesId, year, variant, fuelType, transmission)`. Updates use
 * `$setOnInsert`, never `$set`, so a description or a logo the client edited in
 * the admin UI survives the next run. Running this twice changes nothing the
 * second time.
 *
 * It is purely additive. It never deletes or rewrites a row, which matters
 * because listings reference vehicles by id.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import mongoose, { Model, Types } from 'mongoose';

import {
  BrandDoc,
  BrandSchema,
} from '../src/infrastructure/database/mongoose/documents/brand.document';
import {
  SeriesDoc,
  SeriesSchema,
} from '../src/infrastructure/database/mongoose/documents/series.document';
import {
  VehicleDoc,
  VehicleSchema,
} from '../src/infrastructure/database/mongoose/documents/vehicle.document';

import { CATALOG } from './catalog/data';
import {
  CATALOG_MAX_YEAR,
  CATALOG_MIN_YEAR,
  FUEL_DB,
  TRANSMISSION_DB,
  expandSeries,
  type BrandSpec,
} from './catalog/types';

loadEnv();

/** Mongo caps a single bulkWrite; 1 000 ops per batch keeps requests small. */
const BATCH_SIZE = 1000;

interface Options {
  dryRun: boolean;
  /** Lower-cased brand names to restrict the run to. Empty means "all". */
  only: Set<string>;
}

function parseArgs(argv: string[]): Options {
  const only = new Set<string>();
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--brand=')) {
      for (const name of arg.slice('--brand='.length).split(',')) {
        if (name.trim()) only.add(name.trim().toLowerCase());
      }
    } else if (arg.startsWith('--')) {
      throw new Error(
        `Unknown flag ${arg}. Supported: --dry-run, --brand=<name>`,
      );
    }
  }

  return { dryRun, only };
}

interface Totals {
  brandsCreated: number;
  brandsExisting: number;
  seriesCreated: number;
  seriesExisting: number;
  vehiclesCreated: number;
  vehiclesExisting: number;
}

interface Models {
  brands: Model<BrandDoc>;
  series: Model<SeriesDoc>;
  vehicles: Model<VehicleDoc>;
}

async function seedBrand(
  spec: BrandSpec,
  models: Models,
  totals: Totals,
): Promise<void> {
  // --- brand -------------------------------------------------------------
  // `new: true` plus `upsert` returns the document either way, so one round
  // trip covers both "create it" and "find the id of the existing one".
  const before = await models.brands.countDocuments({ name: spec.name });
  const brand = await models.brands.findOneAndUpdate(
    { name: spec.name },
    { $setOnInsert: { name: spec.name, description: spec.description } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!brand) throw new Error(`Upserting brand ${spec.name} returned nothing.`);
  if (before) totals.brandsExisting++;
  else totals.brandsCreated++;

  // --- series ------------------------------------------------------------
  const seriesResult = await models.series.bulkWrite(
    spec.series.map((series) => ({
      updateOne: {
        filter: { brandId: brand._id, name: series.name },
        update: { $setOnInsert: { brandId: brand._id, name: series.name } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  totals.seriesCreated += seriesResult.upsertedCount;
  totals.seriesExisting += seriesResult.matchedCount;

  // Read the ids back rather than trusting bulkWrite's upsertedIds: that map
  // only covers rows this run inserted, and on a re-run it is empty.
  const stored = await models.series
    .find({ brandId: brand._id }, { name: 1 })
    .lean();
  const seriesIds = new Map<string, Types.ObjectId>(
    stored.map((doc) => [doc.name, doc._id as Types.ObjectId]),
  );

  // --- vehicles ----------------------------------------------------------
  const ops: Parameters<Model<VehicleDoc>['bulkWrite']>[0] = [];
  for (const series of spec.series) {
    const seriesId = seriesIds.get(series.name);
    if (!seriesId) {
      throw new Error(
        `${spec.name} ${series.name}: series id missing after upsert.`,
      );
    }

    for (const row of expandSeries(series)) {
      const key = { seriesId, ...row };
      ops.push({
        updateOne: {
          filter: key,
          update: { $setOnInsert: key },
          upsert: true,
        },
      });
    }
  }

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const result = await models.vehicles.bulkWrite(
      ops.slice(i, i + BATCH_SIZE),
      {
        ordered: false,
      },
    );
    totals.vehiclesCreated += result.upsertedCount;
    totals.vehiclesExisting += result.matchedCount;
  }

  console.log(
    `  ${spec.name.padEnd(16)} ${String(spec.series.length).padStart(3)} series` +
      `  ${String(ops.length).padStart(5)} vehicles`,
  );
}

/** Count what a run WOULD write, without touching the database. */
function summarise(specs: BrandSpec[]): void {
  let series = 0;
  let vehicles = 0;

  for (const spec of specs) {
    const rows = spec.series.reduce(
      (n, one) => n + expandSeries(one).length,
      0,
    );
    series += spec.series.length;
    vehicles += rows;

    console.log(
      `  ${spec.name.padEnd(16)} ${String(spec.series.length).padStart(3)} series` +
        `  ${String(rows).padStart(5)} vehicles`,
    );
  }

  console.log(
    `\nWould write ${specs.length} brands, ${series} series, ${vehicles} vehicles.`,
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const specs = options.only.size
    ? CATALOG.filter((spec) => options.only.has(spec.name.toLowerCase()))
    : CATALOG;

  if (!specs.length) {
    const known = CATALOG.map((spec) => spec.name).join(', ');
    throw new Error(`No brand matched --brand. Known brands: ${known}`);
  }

  console.log(
    `Vehicle catalog ${CATALOG_MIN_YEAR}-${CATALOG_MAX_YEAR}: ` +
      `${specs.length} brand(s)\n`,
  );

  if (options.dryRun) {
    summarise(specs);
    console.log('\nDry run: nothing was written.');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env and fill it in.',
    );
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const models: Models = {
    brands: mongoose.model('brands', BrandSchema),
    series: mongoose.model('series', SeriesSchema),
    vehicles: mongoose.model('vehicles', VehicleSchema),
  };

  // Build the unique indexes FIRST. They are what makes the upserts safe, and
  // if one cannot be built (because the collection already holds a duplicate)
  // it is much better to hear about it here than to silently seed alongside it.
  for (const [name, model] of Object.entries(models)) {
    try {
      await model.createIndexes();
    } catch (error) {
      console.error(
        `\nCould not build the indexes on '${name}'. The collection probably ` +
          `already contains duplicate rows; resolve those and re-run.\n`,
      );
      throw error;
    }
  }

  const totals: Totals = {
    brandsCreated: 0,
    brandsExisting: 0,
    seriesCreated: 0,
    seriesExisting: 0,
    vehiclesCreated: 0,
    vehiclesExisting: 0,
  };

  for (const spec of specs) {
    await seedBrand(spec, models, totals);
  }

  console.log('\n---');
  console.log(
    `brands     ${String(totals.brandsCreated).padStart(6)} new  ` +
      `${String(totals.brandsExisting).padStart(6)} already there`,
  );
  console.log(
    `series     ${String(totals.seriesCreated).padStart(6)} new  ` +
      `${String(totals.seriesExisting).padStart(6)} already there`,
  );
  console.log(
    `vehicles   ${String(totals.vehiclesCreated).padStart(6)} new  ` +
      `${String(totals.vehiclesExisting).padStart(6)} already there`,
  );

  // The vehicle unique index is case-SENSITIVE while the repository's lookups
  // are not, so a row entered by hand as "petrol" would sit invisibly beside
  // this script's "Petrol" and read as two cars. Surface any such drift.
  await reportVocabularyDrift(models.vehicles);

  await mongoose.disconnect();
}

const CANONICAL_FUELS = Object.values(FUEL_DB);
const CANONICAL_TRANSMISSIONS = Object.values(TRANSMISSION_DB);

async function reportVocabularyDrift(
  vehicles: Model<VehicleDoc>,
): Promise<void> {
  const [fuels, transmissions] = await Promise.all([
    vehicles.distinct('fuelType'),
    vehicles.distinct('transmission'),
  ]);

  const strayFuels = fuels.filter((v) => !CANONICAL_FUELS.includes(v));
  const strayTransmissions = transmissions.filter(
    (v) => !CANONICAL_TRANSMISSIONS.includes(v),
  );

  if (!strayFuels.length && !strayTransmissions.length) return;

  console.log('\nHeads up: values outside the catalog vocabulary are present.');
  console.log('They were entered by another route and are left untouched.');
  if (strayFuels.length)
    console.log(`  fuelType:     ${strayFuels.join(', ')}`);
  if (strayTransmissions.length) {
    console.log(`  transmission: ${strayTransmissions.join(', ')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(
      '\nSeed failed:',
      error instanceof Error ? error.message : error,
    );
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
