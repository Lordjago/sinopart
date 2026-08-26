/**
 * Vehicle catalog seed: the SHAPE of the source data
 * ---------------------------------------------------------------------------
 * The database stores one flat row per configuration:
 *
 *   Vehicle { seriesId, year, variant, fuelType, transmission }
 *
 * Authoring 30 000 of those by hand is not possible, so the source data is
 * written one level up, as GENERATIONS. A generation says "between 2018 and
 * today, the Camry shipped with these engines", and `expandSeries()` below
 * multiplies it out into one row per model year.
 *
 * Why generations and not a plain cross-product of every year x engine x fuel x
 * gearbox: the cross-product invents cars. A 2010 diesel manual Camry has a
 * clean-looking row in the database and does not exist on any road, and a parts
 * catalog that offers it sends buyers to a dead end. Engines are therefore
 * attached to the generation that actually carried them.
 *
 * ---------------------------------------------------------------------------
 * A NOTE ON `variant`
 * ---------------------------------------------------------------------------
 * `variant` is a number, and for combustion cars it is engine displacement in
 * litres: 2.5 for a Camry 2.5. Electric cars have no displacement, so for them
 * this file uses USABLE BATTERY CAPACITY IN kWh (60.4 for a BYD Atto 3). It is
 * the number a buyer actually uses to tell two otherwise identical EVs apart,
 * it is positive (the API's CreateVehicleDto requires that), and it keeps every
 * vehicle in one collection. Read `variant` together with `fuelType` and it is
 * never ambiguous.
 */

export type Fuel =
  'Petrol' | 'Diesel' | 'Hybrid' | 'Plug-in Hybrid' | 'Electric' | 'CNG';

export type Transmission =
  'Automatic' | 'Manual' | 'CVT' | 'DCT' | 'AMT' | 'Single-speed';

/** One engine offered in a generation, plus the gearboxes it was sold with. */
export interface Engine {
  /** Litres of displacement, or kWh of battery when `fuel` is 'Electric'. */
  variant: number;
  fuel: Fuel;
  transmissions: Transmission[];
}

/** One production run of a series. `to: null` means "still in production". */
export interface Generation {
  from: number;
  /** Inclusive last model year, or null for current. Clamped to CATALOG_MAX_YEAR. */
  to: number | null;
  engines: Engine[];
}

export interface SeriesSpec {
  name: string;
  generations: Generation[];
}

export interface BrandSpec {
  name: string;
  description: string;
  series: SeriesSpec[];
}

/** One fully expanded row, ready to be written to the `vehicles` collection. */
export interface VehicleRow {
  year: number;
  variant: number;
  /** Already normalised to the stored vocabulary, see FUEL_DB below. */
  fuelType: string;
  transmission: string;
}

/**
 * ---------------------------------------------------------------------------
 * STORED VOCABULARY
 * ---------------------------------------------------------------------------
 * The data files above are written in readable English ('Plug-in Hybrid'), but
 * the `vehicles` collection already had a settled house style before this seed
 * existed: lower-case throughout, `phev` for plug-in hybrids, and electric cars
 * recorded as `automatic`. These maps translate on the way out.
 *
 * This is not cosmetic. The collection's unique index is case-SENSITIVE while
 * `VehicleRepositoryImpl.findByKey` matches case-INSENSITIVELY, so seeding
 * 'Petrol' next to an existing 'petrol' would slip past the index and produce
 * two rows that the API cannot tell apart. Matching the stored spelling exactly
 * is what makes the upserts merge with what is already there.
 *
 * If the house style ever changes, change it here, in one place, and migrate
 * the existing rows to match.
 */
export const FUEL_DB: Record<Fuel, string> = {
  Petrol: 'petrol',
  Diesel: 'diesel',
  Hybrid: 'hybrid',
  'Plug-in Hybrid': 'phev',
  Electric: 'electric',
  CNG: 'cng',
};

export const TRANSMISSION_DB: Record<Transmission, string> = {
  Automatic: 'automatic',
  Manual: 'manual',
  CVT: 'cvt',
  DCT: 'dct',
  AMT: 'amt',
  // The existing electric rows are all recorded as 'automatic'. A single-speed
  // reduction gear is not a gearbox, but splitting it out now would leave the
  // EVs already in the database sitting in a category of their own.
  'Single-speed': 'automatic',
};

/**
 * The catalog window. Nothing before CATALOG_MIN_YEAR is seeded even when a
 * generation started earlier, and nothing after CATALOG_MAX_YEAR is invented
 * for open-ended generations.
 */
export const CATALOG_MIN_YEAR = 2010;
export const CATALOG_MAX_YEAR = 2026;

// ---------------------------------------------------------------------------
// Terse constructors. The data files are thousands of lines; spelling out
// `{ name: ..., generations: [{ from: ..., engines: [{ variant: ... }] }] }`
// every time would bury the actual information in punctuation.
// ---------------------------------------------------------------------------

/** Engine: `e(2.5, 'Petrol', 'Automatic')`. */
export const e = (
  variant: number,
  fuel: Fuel,
  ...transmissions: Transmission[]
): Engine => ({ variant, fuel, transmissions });

/** Generation: `g(2018, null, e(...), e(...))`. */
export const g = (
  from: number,
  to: number | null,
  ...engines: Engine[]
): Generation => ({ from, to, engines });

/** Series: `s('Camry', g(...), g(...))`. */
export const s = (name: string, ...generations: Generation[]): SeriesSpec => ({
  name,
  generations,
});

/** Brand: `b('Toyota', 'Japanese...', s(...), s(...))`. */
export const b = (
  name: string,
  description: string,
  ...series: SeriesSpec[]
): BrandSpec => ({ name, description, series });

/**
 * Multiply a series' generations out into one row per
 * year x engine x transmission, clipped to the catalog window.
 *
 * Overlapping generations are normal in real data (a facelift year sold
 * alongside the run-out of the previous shape), and they can produce the same
 * year/variant/fuel/transmission twice. That combination is the collection's
 * unique key, so duplicates are collapsed here rather than left for Mongo to
 * reject halfway through a bulk write. Dedup runs on the TRANSLATED values,
 * which also collapses the Single-speed/Automatic pair the map above creates.
 */
export function expandSeries(series: SeriesSpec): VehicleRow[] {
  const seen = new Set<string>();
  const rows: VehicleRow[] = [];

  for (const generation of series.generations) {
    const from = Math.max(generation.from, CATALOG_MIN_YEAR);
    const to = Math.min(generation.to ?? CATALOG_MAX_YEAR, CATALOG_MAX_YEAR);

    for (let year = from; year <= to; year++) {
      for (const engine of generation.engines) {
        const fuelType = FUEL_DB[engine.fuel];

        for (const spec of engine.transmissions) {
          const transmission = TRANSMISSION_DB[spec];
          const key = `${year}|${engine.variant}|${fuelType}|${transmission}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({ year, variant: engine.variant, fuelType, transmission });
        }
      }
    }
  }

  return rows;
}
