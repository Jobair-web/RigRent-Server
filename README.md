# RigRent - Equipment Rental Platform (Server)

REST API for RigRent, built with **Node.js, Express, TypeScript and MongoDB**. It handles equipment listings, bookings, Stripe payments, favorites, user management, analytics and scheduled booking updates.

| | |
|---|---|
| **Live API** | https://rigrent-server.onrender.com |
| **Health check** | https://rigrent-server.onrender.com/api/health |
| **Server repository** | https://github.com/Jobair-web/RigRent-Server |
| **Client repository** | https://github.com/Jobair-web/RigRent |
| **Live site** | https://rig-rent.vercel.app |

## Purpose

Provide a secure, role-based backend for the RigRent marketplace. Owners manage equipment, customers book and pay, and admins approve listings and monitor the whole platform.

## Key features

- **JWT authentication:** tokens issued by Better Auth are verified against its public JWKS, and the user's role is loaded from MongoDB on every request so permission changes apply immediately
- **Role-based middlewares:** `verifyToken`, `verifyRenter`, `verifyOwner`, `verifyAdmin`, `verifyOwnerOrAdmin`
- **Equipment API:** search (name, location, category), filters, sorting and pagination performed in MongoDB
- **Approval workflow:** owners create equipment as `pending`, admins approve or reject
- **Bookings and payments:** availability check against overlapping bookings, price calculation, Stripe Checkout, payment confirmation, optional webhook, and a separate `payments` collection for transactions
- **Favorites, profile and admin user management** (role change, delete)
- **Analytics:** MongoDB aggregation pipelines for owner and admin dashboards (totals, monthly trends, status split)
- **Cron job:** updates booking status automatically (confirmed, active, completed) and sends emails when a rental completes
- **Security and reliability:** Helmet, CORS allow-list, centralized error handling, secrets only in environment variables
- **Strict TypeScript:** typed MongoDB collections, typed request user (`AuthedRequest`), and string-literal unions for roles and statuses

## API overview

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public |
| GET | `/api/equipment` | Public (search, filter, sort, pagination) |
| GET | `/api/equipment/featured`, `/api/equipment/categories` | Public |
| GET | `/api/equipment/:id` | Logged in |
| POST | `/api/equipment` | Owner |
| PUT, DELETE | `/api/equipment/:id` | Owner (own items) or Admin |
| PATCH | `/api/equipment/:id/status` | Admin |
| GET | `/api/equipment/owner/mine` | Owner |
| GET | `/api/equipment/admin/all` | Admin |
| GET, POST, DELETE | `/api/favorites`, `/api/favorites/:equipmentId` | Customer |
| POST | `/api/bookings/checkout` | Customer |
| GET | `/api/bookings/my` | Customer |
| GET | `/api/bookings/owner` | Owner |
| GET | `/api/bookings` | Admin |
| PATCH | `/api/bookings/:id/status` | Owner or Admin |
| POST | `/api/payments/confirm` | Customer |
| POST | `/api/payments/webhook` | Stripe |
| GET, PATCH | `/api/users/me` | Logged in |
| GET | `/api/users` | Admin |
| PATCH, DELETE | `/api/users/:id/role`, `/api/users/:id` | Admin |
| GET | `/api/analytics/owner` | Owner |
| GET | `/api/analytics/admin` | Admin |
| POST | `/api/cron/run` | Secret header (`x-cron-secret`) |

## How authentication works

1. The Next.js client signs the user in with Better Auth, which stores users in MongoDB.
2. The client requests a JWT and sends it as `Authorization: Bearer <token>`.
3. This server verifies the signature using the JWKS published at `AUTH_JWKS_URL`, loads the user from MongoDB and checks the role.
4. Roles can never be set from the browser. Every user starts as `customer`, the account registered with `ADMIN_EMAIL` becomes `admin`, and admins promote others to `owner`.

## Tech stack

Node.js, Express 4, TypeScript (strict), MongoDB native driver, Stripe, node-cron, Nodemailer

## npm packages used

**Dependencies**

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `mongodb` | Database driver |
| `jose` | Verify JWTs with the remote JWKS |
| `stripe` | Checkout sessions and payment verification |
| `cors` | CORS allow-list |
| `helmet` | Security headers |
| `morgan` | Request logging |
| `dotenv` | Environment variables |
| `node-cron` | Scheduled booking updates |
| `nodemailer` | Email notifications |

**Dev dependencies**

| Package | Purpose |
|---|---|
| `typescript` | Static typing and production build |
| `tsx` | Run TypeScript directly in development |
| `@types/express`, `@types/cors`, `@types/morgan`, `@types/node`, `@types/node-cron`, `@types/nodemailer` | Type definitions |

## Environment variables

Create a `.env` file in this folder. It is git-ignored and must never be committed. Use `.env.example` as a template.

| Variable | Description |
|---|---|
| `PORT` | Local port (Render sets this automatically) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name (must match the client) |
| `CLIENT_URL` | `https://rig-rent.vercel.app` (no trailing slash, used for CORS and Stripe redirects) |
| `AUTH_JWKS_URL` | `https://rig-rent.vercel.app/api/auth/jwks` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Optional, only if you register a webhook |
| `ENABLE_CRON` | `true` to run the cron job inside the server |
| `CRON_SECRET` | Protects `POST /api/cron/run` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional email settings |

## Getting started

```bash
git clone https://github.com/Jobair-web/RigRent-Server.git
cd RigRent-Server
npm install
cp .env.example .env      # then fill in the values
npm run seed              # optional: adds 12 sample equipment items
npm run dev               # http://localhost:5000
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`node dist/server.js`) |
| `npm run seed` | Insert sample equipment |
| `npm run type-check` | Run the TypeScript compiler without emitting files |

## Folder structure

```
src/
  config/        env, db (typed collections + indexes), stripe
  constants/     roles, statuses and categories as const unions
  types/         AuthUser, AuthedRequest, document interfaces
  middlewares/   JWT + role guards, error handling
  controllers/   equipment, favorite, booking, payment, user, analytics
  services/      booking, analytics, email
  routes/        one router per resource
  jobs/          node-cron booking sync
  scripts/       seed script
  utils/         ApiError, asyncHandler, pagination, rental pricing
  app.ts         Express app (CORS, helmet, routes, error handlers)
  server.ts      Entry point
api/index.ts     Optional serverless entry
```

## Deployment (Render)

1. Create a **Web Service** from this repository.
2. **Build Command:** `npm install --include=dev && npm run build`
3. **Start Command:** `npm start`
4. Add all environment variables from the table above. Do not set `PORT`.
5. In MongoDB Atlas, open **Network Access** and allow `0.0.0.0/0` so Render can connect.
6. Render's free plan sleeps when idle. Ping `/api/health` every 5 minutes with a free uptime monitor to avoid slow first requests.