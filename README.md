# SinoPart Backend

A **NestJS + TypeScript + MongoDB (Mongoose)** REST API that powers the SinoPart
car-importer frontend (`../Sinopart/sinopart_importer`). It implements the exact
API contract the frontend's built-in *mock backend* defined, so you can flip one
environment variable in the frontend and it talks to this real server instead.

This project is written to be **learned from**. Almost every file has comments
explaining what NestJS is doing and why. This README is the map — read it top to
bottom once, then dive into the code in the order suggested under
[A suggested learning path](#a-suggested-learning-path).

---

## Table of contents

1. [What this backend does](#what-this-backend-does)
2. [Prerequisites](#prerequisites)
3. [Setup (step by step)](#setup-step-by-step)
4. [Running it](#running-it)
5. [Connecting the frontend](#connecting-the-frontend)
6. [How a request flows through NestJS](#how-a-request-flows-through-nestjs)
7. [Project structure](#project-structure)
8. [How authentication works](#how-authentication-works)
9. [API reference](#api-reference)
10. [Trying it with curl](#trying-it-with-curl)
11. [A suggested learning path](#a-suggested-learning-path)
12. [Where to go next](#where-to-go-next)

---

## What this backend does

- **Auth**: register, login (passwords hashed with bcrypt), issue JWTs, protect
  routes, return the current user.
- **Catalog** (product fetching): store cars in MongoDB, list them (with
  optional filters), and serve a single car's detail page. Seeded automatically
  on first boot.
- **The whole logged-in experience**: dashboard, orders + tracking, checkout
  previews, inspection reports, payments, account + security, trade standing,
  saved cars, documents, notifications, and concierge messages.

Every successful response comes back as `{ success: true, data: ... }` and every
error as `{ success: false, error: { code, message } }`, matching the frontend.

---

## Prerequisites

- **Node.js 18+** (you already have Node installed).
- **A MongoDB database.** We use **MongoDB Atlas** (free cloud) — no local
  install required. (You downloaded *MongoDB Compass*, which is only a GUI for
  viewing data; the actual database server lives in Atlas.)

---

## Setup (step by step)

### 1. Create a free MongoDB Atlas database

1. Go to <https://www.mongodb.com/atlas> and create a free account.
2. Create a new **free (M0)** cluster (any cloud/region near you).
3. **Database Access** → *Add New Database User*. Pick a username + password
   (write them down — the password goes in your connection string).
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`) for development. (Tighten this later for production.)
5. **Clusters** → *Connect* → *Drivers* → copy the connection string. It looks
   like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the user you made, and add the
   database name `sinopart` right before the `?`:
   ```
   mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/sinopart?retryWrites=true&w=majority
   ```

> Tip: you can open the **same** connection string in MongoDB Compass to browse
> your collections visually once the app has created them.

### 2. Configure your environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` and set `MONGODB_URI` to the string from step 1. Also set a long
random `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Your `.env` should look like:

```
PORT=3000
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/sinopart?retryWrites=true&w=majority
JWT_SECRET=<the long random string you generated>
JWT_EXPIRES_IN=8h
```

`.env` is git-ignored, so your secrets never get committed.

### 3. Install dependencies

```bash
npm install
```

---

## Running it

```bash
# Development (auto-restarts when you save a file):
npm run start:dev

# Production-style (compile then run):
npm run build
npm run start:prod
```

On first boot you'll see the catalog + demo-user seeders run:

```
[CatalogSeeder] Seeded 9 cars into the catalog.
[UsersSeeder] Seeded demo dealer (dealer@sinopart.test / password123).
SinoPart backend listening on http://localhost:3000
```

Visit <http://localhost:3000> — you should get `{"success":true,"data":{"service":"sinopart-backend","status":"ok"}}`.

**Demo login** (created automatically):

| email                   | password      |
| ----------------------- | ------------- |
| `dealer@sinopart.test`  | `password123` |

---

## Connecting the frontend

The frontend falls back to its mock backend when `VITE_API_BASE_URL` is empty. To
point it at this server, create a `.env` in the **frontend** project
(`sinopart_importer`) with:

```
VITE_API_BASE_URL=http://localhost:3000
```

Restart the frontend dev server. It will now call this API. (Our `CORS_ORIGIN`
default of `http://localhost:5173` already allows the Vite dev server; change it
if your frontend runs on a different port.)

---

## How a request flows through NestJS

Understanding this pipeline explains the whole framework. For
`POST /auth/login`:

```
HTTP request
   │
   ▼
main.ts globals ─ CORS check
   │
   ▼
ValidationPipe ──── body checked against LoginDto (bad input → 422)
   │
   ▼
Guard (only on protected routes) ── JwtAuthGuard verifies the token
   │
   ▼
Controller method ── AuthController.login(dto)  ← maps URL+verb to code
   │
   ▼
Service ── AuthService.login()  ← the actual logic (hashing, DB, JWT)
   │
   ▼
Return value
   │
   ▼
TransformInterceptor ── wraps it: { success: true, data: ... }
   │
   ▼
HTTP response
```

If anything throws along the way, `AllExceptionsFilter` catches it and formats
`{ success: false, error: { code, message } }`. The **controllers stay tiny**
because validation, wrapping, and error formatting are all handled globally.

The three building blocks you'll see everywhere:

- **Module** (`*.module.ts`) — groups related things and declares dependencies.
- **Controller** (`*.controller.ts`) — maps HTTP routes to methods.
- **Service** (`*.service.ts`) — holds the logic; injected into controllers.

"Injected" means you list a dependency in a `constructor(...)` and NestJS creates
and supplies it for you — that's **dependency injection**, the core NestJS idea.

---

## Project structure

```
src/
├─ main.ts                     App entry point: installs global CORS,
│                              validation, response wrapper, error filter.
├─ app.module.ts               Root module: loads config, opens the Mongo
│                              connection, imports every feature module.
├─ app.controller.ts           GET / health check.
│
├─ config/
│  └─ env.validation.ts        Validates .env on startup (fail fast).
│
├─ common/                     Cross-cutting pieces used everywhere:
│  ├─ app.exception.ts         Throw errors with a machine-readable `code`.
│  ├─ decorators/
│  │  └─ current-user.decorator.ts   @CurrentUser() → the logged-in user.
│  ├─ filters/
│  │  └─ all-exceptions.filter.ts    Formats every error response.
│  ├─ interceptors/
│  │  └─ transform.interceptor.ts    Wraps every success response.
│  └─ types/auth-user.ts       Shape of the authenticated user.
│
├─ users/                      User schema + data access + demo seeder.
├─ auth/                       Register/login/me/logout, JWT strategy + guard.
├─ catalog/                    Cars: schema, seeding, list + detail (DB-backed).
│
├─ dashboard/                  GET /dashboard/summary
├─ orders/                     GET /orders, /orders/:id/tracking, /inspections/:id
├─ checkout/                   GET /checkout/{inspection,purchase,clearance}/...
├─ reports/                    GET /reports, /reports/:id
├─ payments/                   GET /payments
├─ account/                    GET /account, /account/security, /trade-standing,
│                              /saved, /documents
├─ notifications/              GET /notifications, /notifications/preferences
└─ messages/                   GET /messages
```

> **Real data vs. curated data.** `auth`, `users`, and `catalog` are fully
> database-backed — they read and write MongoDB. The dashboard/account-area
> modules return **curated read models** that match the frontend prototype so
> the whole app is demoable end to end. Each of those services has a comment
> marking where a production build would instead query per-user data from Mongo.
> This keeps the project focused: you learn real persistence on the core
> features without modelling a dozen collections of placeholder content.

---

## How authentication works

1. **Register / login** (`auth.service.ts`): we `bcrypt.hash` the password on
   register and `bcrypt.compare` on login — the raw password is never stored.
2. On success we **sign a JWT** (`@nestjs/jwt`) containing the user's identity
   claims (`sub` = user id, plus name/email/role/tier/verified), and return
   `{ user, token }`.
3. The frontend stores the token and sends it on later requests as
   `Authorization: Bearer <token>`.
4. **Protected routes** use `@UseGuards(JwtAuthGuard)`. The guard runs
   `JwtStrategy` (`jwt.strategy.ts`), which verifies the signature + expiry and
   attaches the user to `request.user`.
5. Controllers read that user with the `@CurrentUser()` decorator.

The secret and expiry come from `.env` (`JWT_SECRET`, `JWT_EXPIRES_IN`).

---

## API reference

Base URL: `http://localhost:3000`. 🔒 = requires `Authorization: Bearer <token>`.

### Auth

| Method | Path             | Auth | Description                         |
| ------ | ---------------- | ---- | ----------------------------------- |
| POST   | `/auth/register` |      | Create account → `{ user, token }`  |
| POST   | `/auth/login`    |      | Sign in → `{ user, token }`         |
| POST   | `/auth/logout`   | 🔒   | Acknowledge logout                  |
| GET    | `/auth/me`       | 🔒   | Current user (fresh from DB)         |

### Catalog (product fetching)

| Method | Path                                  | Auth | Description                        |
| ------ | ------------------------------------- | ---- | ---------------------------------- |
| GET    | `/catalog/cars?make=&status=`         |      | List cars (optional filters)       |
| GET    | `/cars/:carId`                        |      | Car detail page                    |

### Logged-in area

| Method | Path                              | Auth | Description                 |
| ------ | --------------------------------- | ---- | --------------------------- |
| GET    | `/dashboard/summary`              | 🔒   | Home dashboard              |
| GET    | `/orders`                         | 🔒   | Orders list                 |
| GET    | `/orders/:orderId/tracking`       |      | Order tracking timeline     |
| GET    | `/inspections/:orderId`           |      | Inspection status           |
| GET    | `/checkout/inspection/:carId`     |      | Inspection checkout preview |
| GET    | `/checkout/purchase/:carId`       |      | Purchase checkout preview   |
| GET    | `/checkout/clearance/:orderId`    |      | Clearance (duty) assessment |
| GET    | `/reports`                        | 🔒   | Reports library             |
| GET    | `/reports/:reportId`              |      | Single condition report     |
| GET    | `/payments`                       | 🔒   | Payments overview + ledger  |
| GET    | `/account`                        | 🔒   | Profile, KYC, bank          |
| GET    | `/account/security`               | 🔒   | 2FA, sessions, alerts       |
| GET    | `/trade-standing`                 | 🔒   | Dealer tier ladder          |
| GET    | `/saved`                          | 🔒   | Reservations + saved cars   |
| GET    | `/documents`                      | 🔒   | Document checklist          |
| GET    | `/notifications`                  | 🔒   | Notification feed           |
| GET    | `/notifications/preferences`      | 🔒   | Channel preferences         |
| GET    | `/messages`                       | 🔒   | Concierge threads           |

(The public routes above match the frontend calling them with `{ auth: false }`.)

---

## Trying it with curl

```bash
# 1. Health check
curl http://localhost:3000

# 2. Log in as the demo dealer and grab the token
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dealer@sinopart.test","password":"password123"}'

# 3. Browse the catalog (public)
curl http://localhost:3000/catalog/cars

# 4. Call a protected route with the token from step 2
TOKEN="paste-the-token-here"
curl http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

On Windows PowerShell, use `Invoke-RestMethod` instead of `curl`, e.g.:

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"dealer@sinopart.test","password":"password123"}'
$token = $r.data.token
Invoke-RestMethod -Uri http://localhost:3000/auth/me -Headers @{ Authorization = "Bearer $token" }
```

---

## A suggested learning path

Read the code in this order — it builds up naturally:

1. **`main.ts`** — see the app start and the global setup.
2. **`app.module.ts`** — how modules and the Mongo connection are wired.
3. **`common/`** — the interceptor + filter that shape every response, and the
   `@CurrentUser()` decorator.
4. **`users/schemas/user.schema.ts`** — how a MongoDB document is modelled.
5. **`users/users.service.ts`** — querying MongoDB via an injected Model.
6. **`auth/`** — the full auth story: DTOs → service (hash/JWT) → strategy →
   guard → controller. This is the richest module; read it slowly.
7. **`catalog/`** — a complete DB-backed feature with seeding, filtering, and a
   detail endpoint. A good template for building your own.
8. **A presentation module** (e.g. `dashboard/`) — the minimal
   module/controller/service shape you'll repeat.

Alongside the code, the official docs are excellent:
<https://docs.nestjs.com> — start with *Overview → Controllers, Providers,
Modules*, then *Techniques → Mongo*, then *Security → Authentication*.

---

## Where to go next

Ideas to extend it (in rough order of difficulty), turning the curated read
models into real, user-specific data:

- Add **write** endpoints: `POST /auth/register` already writes; next add
  `PATCH /account` to update the profile, or a "save car" toggle.
- Model **Orders** as a real Mongoose schema and compute the dashboard/payments
  from it instead of returning fixtures.
- Add a **payment provider** (e.g. Paystack) behind the `/checkout/*` routes.
- Add **roles/permissions** (a `RolesGuard`) for admin/inspector accounts.
- Add **refresh tokens** so sessions can outlive the 8h access token.
- Write **tests**: `npm run test` (unit) and `npm run test:e2e` (end-to-end).
```
#   s i n o p a r t  
 