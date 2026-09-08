# KS MILK

Milk & dairy delivery platform — backend, per the product requirements in
the original PRD (customer ordering, subscriptions with postpaid billing,
delivery-radius validation, admin operations, delivery-person workflow).

## What's implemented (backend)

- **Database schema** (Postgres via Prisma): users/roles, addresses,
  products with full price history, one-time orders, subscriptions with a
  per-delivery ledger (the billing source of truth), postpaid bills,
  idempotent payments, delivery assignments, notifications, admin-configurable
  business settings, non-delivery days, and idempotency guards for jobs.
- **Auth**: mobile+password (bcrypt, JWT access + rotating refresh tokens),
  plus **Google SSO** for both customers (auto-creates a customer account)
  and admins (only links an existing admin account by email — Google sign-in
  can never create a new admin, to prevent privilege escalation).
- **Business rules**, all backend-enforced and admin-configurable (never
  hard-coded, never trusted from the frontend):
  - Delivery radius (haversine distance, default 2 km, exact boundary
    allowed).
  - Same-day order cutoff (default 18:00 IST) vs. next-deliverable-day
    scheduling, including weekly/holiday non-delivery days.
  - Subscription plans (Monthly/Quarterly/Yearly) with start-date-based end
    dates (not calendar-month snapped).
  - Subscription delivery ledger: one row per expected delivery, driving
    skip (9 PM previous-day deadline), pause (date range), cancellation
    (immediate, completed deliveries stay billable), and expiry.
  - Postpaid billing computed strictly from ledger rows — never
    days × price.
  - Payments: provider abstraction (dev adapter + extension point for a real
    provider), idempotent webhook handling keyed on the provider's event id,
    payment success only ever recognized server-side.
  - Delivery assignment/reassignment, delivery-person status updates,
    mandatory failure reason.
- **Admin API**: dashboard metrics, customer/order/subscription/payment/
  delivery management, reports with date filters, business settings.
- **Background jobs** (node-cron): daily subscription-delivery generation,
  end-of-period billing, overdue-bill sweep, subscription expiry, and a
  frequent notification-queue drain — every job is idempotent (a `JobRun`
  row per job+key makes a duplicate run a no-op).
- **Tests**: boundary-correctness tests for the delivery radius, the 18:00
  cutoff, the 21:00 skip deadline, subscription end-date calculation
  (including month-end dates), and the billing arithmetic.

## What's implemented (frontend)

`frontend/` — a single React + Vite + TypeScript + Tailwind app serving all
three roles from one codebase, each with its own auth session and layout:

- **Customer app** (`/`): custom KS MILK visual identity (Fraunces display
  serif + Inter, moss/cream/clay palette — not a generic template), a
  mobile-first bottom-nav layout with a desktop top-nav, and screens for
  login/register (with "use my location" + server-side radius check),
  browse/cart/checkout, order history + detail, subscriptions (create,
  view ledger, skip, pause, cancel), bills (view, pay), addresses, profile.
- **Admin panel** (`/admin`): dark sidebar console — dashboard metrics,
  orders (search/filter/assign/cancel), subscriptions, products (create,
  reprice inline, deactivate), deliveries, delivery-team management,
  payments, reports (date-filtered), business settings editor.
- **Delivery-person panel** (`/delivery`): large-tap-target mobile flow —
  today's assignments with one-tap call, out-for-delivery/delivered/failed
  (with mandatory reason) actions.
- Every screen has loading, empty, and error states — not just the happy
  path. Google SSO is wired into the login flow wherever `VITE_GOOGLE_CLIENT_ID`
  is set.

Not built on the frontend yet: OTP-based password reset UI, a real payment
provider's hosted checkout redirect (the pay button currently calls the
backend's dev payment adapter), CSV/PDF export for reports.

## Not yet built (explicitly, so scope is honest)

- A real payment provider integration (Razorpay/etc.) — the abstraction and
  dev adapter are in place; wiring a live provider needs real credentials.
- Real SMS/email/push notification providers — same, dev/log adapter only.
- OTP-based password reset — the endpoint is gated on an
  `otpVerificationToken` but OTP issuance/verification itself isn't
  implemented yet.
- CI pipeline, production monitoring/alerting.

## Local development

Backend:

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL etc.
npm install
npx prisma migrate dev
npm run prisma:seed    # creates a demo admin (9999999999 / ChangeMe123!) + 2 products
npm run dev
```

Tests: `npm test` (no database required — the tests cover pure business
logic with the DB layer mocked/isolated).

Frontend:

```bash
cd frontend
cp .env.example .env   # VITE_API_URL should point at the backend, e.g. http://localhost:4000/api
npm install
npm run dev
```

Customer app at `/`, admin console at `/admin`, delivery panel at `/delivery`.

## Deployment (Railway or Render)

Both configs are included:

- `backend/Dockerfile` — multi-stage build, runs `prisma migrate deploy` on
  boot before starting the server.
- `backend/railway.json` — Railway service config (Docker builder).
- `render.yaml` — Render blueprint: web service + managed Postgres,
  auto-generates JWT secrets.

**Railway**: New Project → Deploy from GitHub repo → select this repo → add
a Postgres plugin (provides `DATABASE_URL` automatically) → set the
remaining env vars from `.env.example` → deploy.

**Render**: New → Blueprint → point at this repo (picks up `render.yaml`
automatically) → deploy.

Either way, after first deploy run the seed script once (via the platform's
shell/one-off job feature) if you want demo data, and **change the seeded
admin password immediately**.

## Environment variables

See `backend/.env.example` for the full list. Notably:

- `DATABASE_URL` — Postgres connection string.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — set to long random values in
  production.
- `GOOGLE_CLIENT_ID` — required for Google SSO; leave blank to disable it.
- `PAYMENT_PROVIDER` — `dev` (no-op, non-production only) until a real
  provider is integrated.

## Architecture notes

- Every customer-scoped endpoint verifies the resource belongs to the
  authenticated customer — an id in the URL is never sufficient
  authorization on its own.
- Product prices are versioned (`ProductPrice`); orders/subscription
  deliveries snapshot the price that applied at the time, so a later price
  change never rewrites historical financials.
- All "business date" values (order/delivery scheduled dates) are stored as
  UTC-midnight representing a calendar day in the business timezone, not a
  literal instant — this avoids an off-by-one-day bug when the business
  timezone (IST, UTC+5:30) is read back naively. See
  `backend/src/lib/businessDate.ts`.
