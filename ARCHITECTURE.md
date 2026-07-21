# SinoPart Backend — Hexagonal Architecture Guide

This backend is built with **hexagonal architecture** (also called **ports & adapters**
or **clean architecture**). This document explains the *why*, the folder layout, what
every part does, and how a request flows through the system — so you can find your way
around and extend it confidently.

---

## 1. The core idea in one picture

```
                 ┌──────────────────────────────────────────────┐
   HTTP request  │                                              │
   ───────────►  │   infrastructure/https  (DRIVING adapter)    │
                 │        controllers, guard, filter, pipe      │
                 │                   │  calls                    │
                 │                   ▼                           │
                 │   core/usecase   (APPLICATION logic)          │
                 │        │ depends on PORTS (interfaces) only    │
                 │        ▼                                      │
                 │   core/interfaces   (PORTS)                   │
                 │     repository ports │ service ports          │
                 │            ▲                    ▲             │
                 │   bound to │          bound to  │             │
                 │   ADAPTERS │                    │ ADAPTERS    │
                 │   infrastructure/database   infrastructure/services
                 │      (Mongo repos)            (JWT, bcrypt)   │
                 └──────────────────────────────────────────────┘
```

**The one rule that makes it "hexagonal":** dependencies point *inward*. The core
(domain + use cases) knows nothing about NestJS, MongoDB, HTTP, or bcrypt. The outer
layers depend on the core, never the reverse. The core only ever talks to the outside
world through **ports** (interfaces it owns), and the infrastructure supplies concrete
**adapters** for those ports.

**Why bother?**
- **Testable:** a use case can be tested with fake repositories — no database needed.
- **Swappable:** change Mongo → Postgres, or bcrypt → argon2, by editing one adapter.
  No use case changes.
- **Readable:** each file does one job; business logic isn't tangled with framework code.

---

## 2. Folder layout

```
src/
├─ application/                 Cross-boundary data shapes & translation
│  ├─ dtos/                     Request/response DTOs (validated inputs, output shapes)
│  │  ├─ auth/                  register.dto, login.dto, auth.response
│  │  └─ page.dto               pagination query params
│  └─ mappers/                  document ⇄ domain ⇄ public translators
│     ├─ user.mapper
│     └─ car.mapper
│
├─ core/                        THE HEXAGON — no framework/DB knowledge
│  ├─ domain/
│  │  ├─ entities/              Pure business objects
│  │  │  ├─ base.domain         _id / createdAt / updatedAt shared by all
│  │  │  ├─ user                User entity + UserRole / UserTier enums
│  │  │  └─ car                 Car entity + CarStatus enum
│  │  └─ value-object/          Identity-less values
│  │     ├─ page                Page<T> — one page of a list
│  │     └─ auth-user           AuthUser — the authenticated principal
│  ├─ errors/                   Framework-free domain errors
│  │  ├─ resource-not-found         → 404
│  │  ├─ resource-already-exists    → 409
│  │  ├─ unauthorized               → 401
│  │  └─ validation                 → 422
│  ├─ interfaces/               PORTS (the contracts the core owns)
│  │  ├─ repository/            Storage ports (UserRepository, CarRepository)
│  │  └─ services/              External-service ports (AuthenticationService)
│  ├─ usecase/                  One class per application operation (execute())
│  │  ├─ base.usecase           the shared execute() contract
│  │  ├─ auth/ catalog/ account/ checkout/ dashboard/
│  │  ├─ orders/ payments/ reports/ notifications/ messages/
│  ├─ injection.token.ts        DI symbols that bind ports → adapters
│  ├─ core.module.ts            registers every use case
│  └─ utils.ts                  pure helpers (token parsing, name-from-email)
│
├─ infrastructure/              ADAPTERS — all framework/DB/HTTP lives here
│  ├─ config/                   env validation (validateEnv) + barrel
│  ├─ database/
│  │  ├─ mongoose/
│  │  │  ├─ documents/          Mongoose schemas (user.document, car.document)
│  │  │  ├─ repositories/       Repository ADAPTERS (…​.repository.impl)
│  │  │  └─ seeders/            Demo dealer + car catalog seed-on-boot
│  │  └─ database.module.ts     opens connection, binds repo ports → adapters
│  ├─ https/                    DRIVING adapter (HTTP)
│  │  ├─ controllers/           one per feature; thin — call a use case
│  │  ├─ decorator/             @Public(), @CurrentUser()
│  │  ├─ guards/                AuthGuard (global; verifies JWT)
│  │  ├─ filters/               CustomExceptionFilter (errors → JSON envelope)
│  │  ├─ interceptors/          HttpResponseInterceptor (success → { success, data })
│  │  └─ https.module.ts        registers controllers + global guard
│  ├─ services/                 External-service ADAPTERS
│  │  ├─ authentication/        AuthenticationServiceImpl (JWT + bcrypt)
│  │  └─ service.module.ts      configures JwtModule, binds service ports
│  └─ infrastructure.module.ts  aggregates http + database + services + core
│
├─ app.module.ts                root: loads config, imports infrastructure
└─ main.ts                      bootstrap: CORS, ValidationPipe, filter, interceptor
```

> **Note on the folder name.** The reference project this mirrors calls its persistence
> folder `database/typeorm/` even though it uses Mongoose. We use the honest name
> `database/mongoose/`. The *structure and roles* are identical.

---

## 3. The layers, explained

### `core/domain` — the entities and value objects
Plain TypeScript classes describing *what things are*: a `User`, a `Car`, a `Page`. No
decorators, no Mongoose, no NestJS. This is the most stable, most reusable code and the
thing use cases reason about.

### `core/interfaces` — the ports
Interfaces the core **owns** that say what it needs from the outside world:
- `UserRepository`, `CarRepository` — how to persist/fetch (but not *how* it's stored).
- `AuthenticationService` — how to hash passwords and sign tokens (not *which* library).

The core depends only on these interfaces, never on a concrete class.

### `core/usecase` — the application logic
One class per operation, each with a single `execute(input)` method. A use case
orchestrates: it calls ports, applies business rules, and returns a result. Example
(`RegisterUserUseCase`): reject duplicate email → hash password → save → issue token.
Use cases receive their ports by **injection token**, so they never name a concrete
adapter.

### `application/dtos` and `application/mappers`
- **DTOs** validate data crossing *into* the app (request bodies) and describe output
  shapes. The global `ValidationPipe` enforces the class-validator rules on every body.
- **Mappers** translate a thing between its three shapes: the Mongoose **document**, the
  domain **entity**, and the **public** API shape. This is the only place a password
  hash is stripped for output, and the only place Mongoose types touch domain types.

### `infrastructure/database` — the persistence adapters
- **documents/** — Mongoose schemas (the DB-facing twin of each entity).
- **repositories/** — classes implementing the repository ports against MongoDB, using
  the mappers. Bound to their ports in `database.module.ts`.
- **seeders/** — `OnModuleInit` hooks that populate an empty database on first boot
  (demo dealer + car catalog), going through the ports.

### `infrastructure/services` — the external-service adapters
`AuthenticationServiceImpl` implements the `AuthenticationService` port with bcrypt and
`@nestjs/jwt`. Bound to its port in `service.module.ts`.

### `infrastructure/https` — the HTTP adapter
Turns HTTP into use-case calls:
- **controllers** — thin: map URL+verb → `useCase.execute()`; no logic, no error
  handling, no response wrapping.
- **AuthGuard** — global; lets `@Public()` routes through, otherwise verifies the JWT
  and puts an `AuthUser` on the request.
- **CustomExceptionFilter** — maps domain errors + Nest exceptions to
  `{ success: false, error: { code, message } }` with the right status.
- **HttpResponseInterceptor** — wraps success as `{ success: true, data }`, and unwraps
  a `Page` into `{ data, pagination }`.

---

## 4. How dependency injection binds it together

Interfaces don't exist at runtime, so NestJS can't use them as lookup keys. We use
`Symbol` **tokens** (`core/injection.token.ts`) instead. Three steps:

1. **A use case asks for a port by token**
   ```ts
   constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}
   ```
2. **A module binds the token to an adapter** (`database.module.ts`)
   ```ts
   { provide: USER_REPOSITORY, useClass: UserRepositoryImpl }
   ```
3. **Nest injects the adapter** wherever the token is requested.

Swapping storage or auth means editing only step 2. This is **dependency inversion**:
the core defines the contract; the infrastructure fulfils it.

---

## 5. Request lifecycle (worked example)

`POST /auth/login` with `{ "email": "...", "password": "..." }`:

1. **main.ts** — the global `ValidationPipe` validates the body against `LoginDto`
   (422 if invalid).
2. **AuthGuard** — the route is `@Public()`, so it passes straight through.
3. **AuthController.login** — calls `authenticateUser.execute(dto)`.
4. **AuthenticateUserUseCase** — `userRepository.findByEmail(email, true)` →
   `auth.comparePassword(...)` → `auth.signToken(...)`. On bad credentials it throws
   `UnauthorizedError`.
5. **Adapters** — `UserRepositoryImpl` runs the Mongo query and maps the document to a
   `User`; `AuthenticationServiceImpl` does bcrypt + JWT.
6. **HttpResponseInterceptor** — wraps the returned `{ user, token }` as
   `{ success: true, data: { user, token } }`.
7. If anything threw, **CustomExceptionFilter** turns it into
   `{ success: false, error: { code, message } }` with the right status.

A protected route (e.g. `GET /dashboard/summary`) differs only at step 2: the guard
verifies the `Authorization: Bearer <token>` header and attaches an `AuthUser`, which
`@CurrentUser()` hands to the controller.

---

## 6. Endpoint map

| Method | Path                         | Auth   | Use case |
|--------|------------------------------|--------|----------|
| GET    | `/`                          | public | (system health) |
| POST   | `/auth/register`             | public | RegisterUserUseCase |
| POST   | `/auth/login`                | public | AuthenticateUserUseCase |
| POST   | `/auth/logout`               | auth   | — (client discards token) |
| GET    | `/auth/me`                   | auth   | GetProfileUseCase |
| GET    | `/catalog/cars`              | public | GetCarsUseCase |
| GET    | `/cars/:carId`               | public | GetCarDetailUseCase |
| GET    | `/account`                   | auth   | GetAccountUseCase |
| GET    | `/account/security`          | auth   | GetSecurityUseCase |
| GET    | `/trade-standing`            | auth   | GetTradeStandingUseCase |
| GET    | `/saved`                     | auth   | GetSavedUseCase |
| GET    | `/documents`                 | auth   | GetDocumentsUseCase |
| GET    | `/checkout/inspection/:carId`| public | GetInspectionCheckoutUseCase |
| GET    | `/checkout/purchase/:carId`  | public | GetPurchaseCheckoutUseCase |
| GET    | `/checkout/clearance/:orderId`| public| GetClearancePaymentUseCase |
| GET    | `/dashboard/summary`         | auth   | GetDashboardSummaryUseCase |
| GET    | `/orders`                    | auth   | ListOrdersUseCase |
| GET    | `/orders/:orderId/tracking`  | public | GetOrderTrackingUseCase |
| GET    | `/inspections/:orderId`      | public | GetInspectionStatusUseCase |
| GET    | `/payments`                  | auth   | GetPaymentsUseCase |
| GET    | `/reports`                   | auth   | ListReportsUseCase |
| GET    | `/reports/:reportId`         | public | GetReportUseCase |
| GET    | `/notifications`             | auth   | ListNotificationsUseCase |
| GET    | `/notifications/preferences` | auth   | GetNotificationPreferencesUseCase |
| GET    | `/messages`                  | auth   | ListMessagesUseCase |

Only **auth/users** and **catalog** are database-backed. The other features return
**read models** (curated presentation data) from their use case — see §7.

---

## 7. DB-backed vs. read-model features

- **DB-backed** (`auth`/`users`, `catalog`): the full flow — entity → port → use case →
  mapper → document → repository adapter → MongoDB. This is the pattern to copy for any
  new persisted feature.
- **Read-model** (account, checkout, dashboard, orders, payments, reports,
  notifications, messages): the prototype returns curated data, so the use case returns
  it directly — no repository. The controller → use case path is identical, so promoting
  one to be database-backed is mechanical:
  1. add an entity in `core/domain/entities`,
  2. add a repository port in `core/interfaces/repository`,
  3. add a document + repository adapter in `infrastructure/database/mongoose`,
  4. bind the port→adapter in `database.module.ts`,
  5. inject the port into the use case and fetch instead of returning a constant.

---

## 8. How to add a new feature (checklist)

Say you want `GET /suppliers`:
1. **Entity** — `core/domain/entities/supplier.ts`.
2. **Port** — `core/interfaces/repository/supplier.repository.ts` + a token in
   `injection.token.ts`.
3. **Use case** — `core/usecase/supplier/get-suppliers.usecase.ts` (inject the port);
   register it in `core.module.ts`.
4. **Document + adapter** — `infrastructure/database/mongoose/documents/supplier.document.ts`
   and `.../repositories/supplier.repository.impl.ts`; bind the token in
   `database.module.ts` and register the schema with `forFeature`.
5. **Mapper** — `application/mappers/supplier.mapper.ts`.
6. **Controller** — `infrastructure/https/controllers/suppliers.controller.ts`; register
   it in `https.module.ts`.

Typecheck (`npx tsc --noEmit`), then run.

---

## 9. Running it

```bash
npm install
# .env must define PORT, CORS_ORIGIN, MONGODB_URI, JWT_SECRET (16+ chars), JWT_EXPIRES_IN
npm run start:dev
```

On first boot the seeders create a demo dealer (`dealer@sinopart.test` / `password123`)
and the car catalog. The env is validated at startup — a missing/invalid variable
crashes early with a clear message.
