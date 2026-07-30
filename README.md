# SinoPart API

A B2B auto-parts sourcing backend: buyers request quotes, vetted suppliers are onboarded by
invitation and KYC, and approved suppliers publish parts listings.

**TypeScript · NestJS · MongoDB · JWT · Cloudinary**

---

## Why it's built this way

The service is organised as **ports and adapters** (hexagonal architecture). The rule the
codebase enforces is one-directional:

```
application/          DTOs and mappers — the shape of data crossing the boundary
     ↓
core/                 domain entities, use cases, and the interfaces (ports) they need
     ↑                ← imports nothing from NestJS, Mongoose, or any vendor SDK
infrastructure/       adapters: Mongoose repositories, HTTP controllers, Cloudinary,
                      SMS, Slack, mail
```

`core/` declares what it needs (`OtpRepository`, `FileStorageService`, `SmsService`) and
`infrastructure/` supplies it, wired through DI tokens in
[injection.token.ts](src/core/injection.token.ts). Two things follow from that:

- **Business rules are testable without a database or network.** A use case takes fakes
  that satisfy the interface — no Mongo, no HTTP, no vendor credentials.
- **Vendors are replaceable.** Cloudinary sits behind `FileStorageService` alongside a null
  adapter, so the app boots and runs with file storage unconfigured. Swapping to S3 is one
  new adapter and one token binding, with no change to any use case.

Each use case is a single class with one `execute()` method
([base.usecase.ts](src/core/usecase/base.usecase.ts)). There are 31 of them; every one does
exactly one thing.

---

## Security design

The parts worth reading, because they're where the real decisions are:

**One OTP engine, many channels.** [Otp](src/core/domain/entities/otp.ts) is
channel-agnostic — `channelAddress` holds an email or a phone number, so email verification,
password reset, and supplier phone verification share one state machine and one set of
guarantees rather than three near-copies that drift apart.

**The OTP is not decorative.** In
[verify-otp.usecase.ts](src/core/usecase/auth/verify-otp.usecase.ts):

- codes are compared by hash, never plaintext equality
- wrong guesses increment `attempts` and die at `OTP_MAX_ATTEMPTS` — six digits is a
  million options and trivially brute-forceable without a cap
- every failure path returns an identical message, so an attacker can't distinguish
  "no such request" from "wrong code" from "expired"

**Password reset can't skip the code.**
[reset-password.usecase.ts](src/core/usecase/auth/reset-password.usecase.ts) refuses unless
`otp.verified` is true. Without that check, anyone holding a `codeToken` could reset a
password without ever knowing the six digits. The attempt is then consumed, so the same
token can't be replayed.

**Suppliers cannot self-register.** Onboarding requires a single-use invitation code, then
SMS-proven phone ownership, before any KYC document is accepted. KYC identifiers are
encrypted at rest via [field-cipher.ts](src/infrastructure/services/crypto/field-cipher.ts),
and KYC state is a value object with an explicit status machine rather than loose boolean
flags — so a partial write can't silently conflate "submitted" with "approved".

**Ownership is enforced in the use case, not the controller**, so the rule holds no matter
which transport calls it. Route-level roles are applied with
[RolesGuard](src/infrastructure/https/guards/roles.guard.ts) and a `@Roles` decorator.

---

## API

Every response is enveloped: `{ success: true, data }` or
`{ success: false, error: { code, message } }`.

### Auth — `/auth`

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | bcrypt-hashed password |
| POST | `/login` | returns JWT |
| POST | `/logout` | |
| GET | `/me` | authenticated |
| POST | `/forgot-password` | issues OTP |
| POST | `/verify-otp` | attempt-capped |
| POST | `/resend-otp` | |
| POST | `/reset-password` | requires a verified OTP |
| POST | `/send-verification`, `/verify-email` | email confirmation |

### Supplier onboarding — `/supplier-auth`

| Method | Path | Access |
|---|---|---|
| POST | `/invitations` | admin |
| GET | `/invitation/:code` | public — validates an invite |
| POST | `/otp/send`, `/otp/verify`, `/otp/resend` | phone verification |
| GET | `/me` | supplier |
| POST | `/kyc/documents` | upload |
| POST | `/kyc/submit`, GET `/kyc/status` | |

### Listings — `/listings`

| Method | Path | Access |
|---|---|---|
| GET | `/public`, `/public/:id` | public — published listings only |
| GET | `/`, `/:id` | seller — own listings, any status |
| POST | `/`, PATCH `/:id`, DELETE `/:id` | seller |
| POST | `/photos` | seller — upload |
| POST | `/:id/publish`, `/:id/pause` | seller |

Public reads never expose unpublished listings or supplier-internal fields.

Plus `/quotes` (create, read) and `/waitlist` (join, read).

---

## Running it

Requires **Node 20–22** and a MongoDB instance (local or Atlas).

```bash
npm install
cp .env.example .env     # then fill in the values
npm run start:dev        # http://localhost:3000
```

Configuration is validated on boot in
[env.validation.ts](src/infrastructure/config/env.validation.ts) — the app refuses to start
with mail or Slack misconfigured rather than failing at the first password reset. Cloudinary
is optional; without it the null storage adapter is used and uploads error explicitly.

```bash
npm run build
npm run lint
```

---

## Project layout

```
src/
├── core/
│   ├── domain/           entities and value objects (Otp, Supplier, Listing, Kyc)
│   ├── usecase/          31 use cases: auth, supplier-auth, listing, request-quote, waitlist
│   ├── interfaces/       ports — repository and service contracts
│   └── errors/           domain errors, mapped to HTTP by the exception filter
├── application/          DTOs (class-validator) and entity↔DTO mappers
└── infrastructure/
    ├── https/            controllers, guards, decorators, interceptors, exception filter
    ├── database/         Mongoose documents and repository implementations
    ├── services/         mail, sms, slack, storage, crypto, authentication adapters
    └── config/           environment validation
```
