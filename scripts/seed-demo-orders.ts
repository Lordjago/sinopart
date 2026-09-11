/**
 * Seed two active orders for one supplier, so the store overview's
 * "Active orders" block has something real to draw.
 *
 *   npx ts-node -P tsconfig.json scripts/seed-demo-orders.ts [--dry]
 *
 * An order is not a standalone record: it is the end of a chain (a buyer pays
 * to inspect a car, the car passes, they buy it). So this creates the whole
 * chain rather than an orphan order — otherwise the order screens would open
 * onto a missing inspection, and `PurchaseListingUseCase`'s own invariant
 * ("one report buys one car") would be describing something untrue.
 *
 * The money is built with the domain's real functions, not hand-typed numbers,
 * so these orders are priced exactly as a genuine purchase would have been.
 *
 * Idempotent: re-running finds the records it made last time and leaves them
 * alone. Safe against the shared Atlas cluster.
 */
import mongoose, { Types } from 'mongoose';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from 'bcryptjs';
import {
  buildEscrow,
  buildOrderMoney,
  buildOrderRef,
  OrderStatus,
} from '../src/core/domain/entities/order';
import {
  buildInspectionRef,
  InspectionStatus,
  reservationDeadline,
} from '../src/core/domain/entities/inspection';
import { landedPrice, DEFAULT_RATES } from '../src/core/domain/value-object/landed-price';

const DRY = process.argv.includes('--dry');

/** Ishola Autos Limited, +8613800007720. */
const SUPPLIER_ID = '6a8dab71199e0fe549e6c377';

/** The dealer these orders belong to. Marked so it is obviously not a real
    signup, and so a later cleanup can find it. */
const BUYER = {
  name: 'Demo Dealer',
  business: 'Adeola Motors Ltd',
  email: 'demo.dealer@sinopart.test',
  phone: '+2348030000001',
};

/**
 * Which cars, and how far along each one is.
 *
 * Two different stages on purpose: `securing` is the one that needs the store
 * to act (it shows an "Open" button and counts toward "Needs action"), and
 * `in_transit` is the one that does not, so the block shows both shapes.
 */
const PLAN = [
  { listingId: '6aa43a99844ac583c6b4c683', orderStatus: OrderStatus.SECURING },
  { listingId: '6aa43a99844ac583c6b4c684', orderStatus: OrderStatus.IN_TRANSIT },
];

const INSPECTION_FEE = 155_000;
const ESCROW_RELEASE_PCT = 0.85;
const oid = (v: string) => new Types.ObjectId(v);
const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

async function main() {
  /* __dirname, not import.meta: this compiles to CommonJS under ts-node, the
     same as scripts/seed-catalog.ts. */
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const uri = env.match(/^MONGODB_URI=(.+)$/m)![1].trim();
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log(DRY ? '— DRY RUN, nothing will be written —\n' : '');

  /* ---- the dealer ---- */
  let buyer = await db.collection('users').findOne({ email: BUYER.email });
  if (!buyer) {
    const doc = {
      ...BUYER,
      passwordHash: await hash('DemoDealer123!', 10),
      role: 'BUYER',
      tier: 'tier_1',
      verified: true,
      emailVerified: true,
      kycStatus: 'verified',
      createdAt: ago(90),
      updatedAt: ago(90),
    };
    /* In a dry run nothing is inserted, so stand in an id: the rest of the
       script needs something to reference while it reports what it WOULD do. */
    const _id = DRY
      ? new Types.ObjectId()
      : (await db.collection('users').insertOne(doc as never)).insertedId;
    buyer = { ...doc, _id } as never;
    console.log(`buyer  ${DRY ? 'would be' : 'CREATED '} ${BUYER.email}`);
  } else {
    console.log(`buyer  exists   ${BUYER.email}  ${String(buyer._id)}`);
  }

  /* ---- one chain per car ---- */
  for (const { listingId, orderStatus } of PLAN) {
    const listing = await db.collection('listings').findOne({ _id: oid(listingId) });
    if (!listing) {
      console.log(`SKIP   ${listingId} — listing not found`);
      continue;
    }

    const existing = await db.collection('orders').findOne({ listingId: oid(listingId) });
    if (existing) {
      console.log(`order  exists   ${existing.reference}  ${listing.title}`);
      continue;
    }

    const paidAt = ago(orderStatus === OrderStatus.IN_TRANSIT ? 21 : 6);

    /* The inspection the purchase was built on. PASSED, because a failed or
       unanswered one could never have become an order. */
    const inspection = {
      reference: buildInspectionRef(paidAt, Math.random()),
      listingId: oid(listingId),
      supplierId: oid(SUPPLIER_ID),
      buyerId: buyer!._id,
      status: InspectionStatus.PASSED,
      fee: INSPECTION_FEE,
      currency: 'NGN',
      paidAt: ago(orderStatus === OrderStatus.IN_TRANSIT ? 30 : 12),
      paymentReference: null,
      reservedUntil: reservationDeadline(paidAt, 72),
      respondedAt: ago(orderStatus === OrderStatus.IN_TRANSIT ? 29 : 11),
      supplierNote: null,
      inspectorId: null,
      scheduledAt: null,
      cancelledAt: null,
      createdAt: paidAt,
      updatedAt: paidAt,
    };

    /* Priced by the same calculation the real checkout runs, so these orders
       carry the figures a genuine purchase would have snapshotted. */
    const totals = landedPrice(listing.fobPrice, DEFAULT_RATES);
    const money = buildOrderMoney(
      { vehicle: totals.vehicle, freight: totals.freight, fees: totals.fees, duty: totals.duty },
      INSPECTION_FEE,
    );

    const order = {
      reference: buildOrderRef(Math.random()),
      listingId: oid(listingId),
      supplierId: oid(SUPPLIER_ID),
      buyerId: buyer!._id,
      inspectionId: null as unknown, // filled after the inspection insert
      status: orderStatus,
      money,
      currency: 'NGN',
      escrow: buildEscrow(money.subtotal, ESCROW_RELEASE_PCT),
      paidAt,
      paymentReference: null,
      createdAt: paidAt,
      updatedAt: paidAt,
      ...(orderStatus === OrderStatus.IN_TRANSIT
        ? {
            preparedAt: ago(18),
            loadedAt: ago(16),
            vinVerifiedAt: ago(16),
            trackingReference: 'MSC-ARIES-118W',
            etaAt: new Date(Date.now() + 12 * 86_400_000),
            trackingNote: 'Loaded at Shanghai. Sailing via Singapore.',
          }
        : {}),
    };

    console.log(
      `order  ${DRY ? 'would be' : 'CREATED '} ${order.reference}  ${String(orderStatus).padEnd(10)}` +
        `  ${listing.title}  escrow=₦${money.subtotal.toLocaleString('en-NG')}`,
    );

    if (!DRY) {
      const insRes = await db.collection('inspections').insertOne(inspection as never);
      order.inspectionId = insRes.insertedId;
      await db.collection('orders').insertOne(order as never);
      /* A car with an order on it is off the market. PENDING is what
         PurchaseListingUseCase sets the moment a dealer pays. */
      await db
        .collection('listings')
        .updateOne({ _id: oid(listingId) }, { $set: { status: 'pending', updatedAt: new Date() } });
    }
    console.log(`       listing status -> pending`);
  }

  await mongoose.disconnect();
  console.log('\ndone.');
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
