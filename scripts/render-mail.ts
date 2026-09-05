/**
 * Render every transactional email to HTML, without sending anything.
 *
 *   npm run mail:preview            -> writes to .mail-preview/
 *   npm run mail:preview -- <dir>   -> writes somewhere else
 *
 * Open the files next to the client's design catalogue to compare. Sample data
 * below is deliberately realistic (a long car title, a real-looking VIN, money
 * in the millions) because that is where layouts break, not on "Test Test".
 *
 * Add every new template here as you write it: this is the only way to see one
 * before it reaches a customer, since there are no snapshot tests.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OtpPurpose } from '../src/core/domain/entities/otp';
import { otpTemplate } from '../src/core/mail/otp.template';
import { welcomeTemplate } from '../src/core/mail/welcome.template';
import { passwordChangedTemplate } from '../src/core/mail/password-changed.template';
import { newSignInTemplate } from '../src/core/mail/new-signin.template';
import {
  inspectionAcceptedTemplate,
  inspectionBookedTemplate,
  inspectionDeclinedTemplate,
  inspectionFailedTemplate,
  inspectionPassedTemplate,
  inspectionVisitTemplate,
} from '../src/core/mail/inspection.template';
import {
  orderClearanceDueTemplate,
  orderClearedTemplate,
  orderClearingTemplate,
  orderCompleteTemplate,
  orderDeliveredTemplate,
  orderLandedTemplate,
  orderPlacedTemplate,
  orderPreparingTemplate,
  orderShippedTemplate,
  orderStoppedTemplate,
  orderUpdateTemplate,
} from '../src/core/mail/order.template';

const out = process.argv[2] ?? '.mail-preview';
mkdirSync(out, { recursive: true });

const to = 'chidi@example.com';
const car = '2021 Toyota Corolla LE';
const base = {
  to,
  car,
  reference: 'INS-26-0912',
  inspectionId: 'insp123',
  vin: 'JTDBR32E720123456',
};
const soon = new Date(Date.now() + 40 * 3600_000);
const order = {
  to,
  car,
  reference: 'SP-ORD-02312',
  orderId: 'ord123',
  vin: base.vin,
};

const all = {
  D01: otpTemplate({
    to,
    code: '473921',
    purpose: OtpPurpose.EMAIL_VERIFICATION,
    expiresInMinutes: 10,
  }),
  D02: otpTemplate({
    to,
    code: '473921',
    purpose: OtpPurpose.EMAIL_VERIFICATION,
    expiresInMinutes: 10,
    resend: true,
  }),
  D03: welcomeTemplate({ to, name: 'Chidi Okafor' }),
  D04: otpTemplate({
    to,
    code: '820456',
    purpose: OtpPurpose.PASSWORD_RESET,
    expiresInMinutes: 10,
  }),
  D05: passwordChangedTemplate({ to }),
  D06: newSignInTemplate({ to, device: 'Chrome on Windows' }),
  D11: inspectionBookedTemplate({
    ...base,
    fee: 155000,
    reservedUntil: soon,
    supplierProvince: 'Guangdong',
  }),
  D12: inspectionAcceptedTemplate(base),
  D13: inspectionDeclinedTemplate({
    ...base,
    fee: 155000,
    supplierNote: 'The car was sold locally last week.',
  }),
  D14: inspectionVisitTemplate({ ...base, supplierProvince: 'Guangdong' }),
  D16: inspectionPassedTemplate({ ...base, fee: 155000, decideBy: soon }),
  D17: inspectionFailedTemplate({ ...base, fee: 155000 }),
  D22: orderPlacedTemplate({
    to,
    car,
    reference: 'SP-ORD-02312',
    orderId: 'ord123',
    vin: base.vin,
    subtotal: 9850000,
    inspectionCredit: 155000,
    dueNow: 9695000,
  }),
  D23: orderPreparingTemplate(order),
  D24: orderShippedTemplate({
    ...order,
    vessel: 'MV Grand Ace 12',
    etaAt: soon,
  }),
  D25: orderStoppedTemplate({
    ...order,
    reason: 'The odometer read 31,400 km against 18,900 km in the report.',
  }),
  D26: orderUpdateTemplate({
    ...order,
    note: 'The vessel was rerouted via Tema and is now due in Lagos on 2 October.',
    vessel: 'MV Grand Ace 12',
    etaAt: soon,
  }),
  D27: orderLandedTemplate(order),
  D28: orderClearanceDueTemplate({
    ...order,
    duty: 2_400_000,
    vat: 780_000,
    agentFees: 315_000,
    total: 3_495_000,
    estimate: 3_200_000,
    graceDeadline: soon,
  }),
  D31: orderClearingTemplate({ ...order, clearanceTotal: 3_495_000 }),
  D32: orderClearedTemplate(order),
  D33: orderDeliveredTemplate({
    ...order,
    inspectionId: 'insp123',
    disputeDeadline: soon,
  }),
  D35: orderCompleteTemplate({ ...order, name: 'Chidi Okafor' }),
};

const index: string[] = [];
for (const [id, mail] of Object.entries(all)) {
  writeFileSync(join(out, `${id}.html`), mail.html);
  index.push(`${id}  ${mail.subject}`);
}
console.log(index.join('\n'));
