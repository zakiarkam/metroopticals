# Metro Opticals

E-commerce storefront and admin dashboard for **Metro Opticals** — prescription eyeglasses, sunglasses, contact lenses and eye care.

Built with Next.js 15 (App Router), Prisma, PostgreSQL, NextAuth and Cloudflare
R2. Deployed on Railway — see **[RAILWAY.md](RAILWAY.md)**.

---

## Stack

| Concern   | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | Next.js 15 (App Router, React 19)                  |
| Database  | PostgreSQL via Prisma                              |
| Auth      | NextAuth (credentials + Google OAuth)              |
| Storage   | Cloudflare R2 (S3-compatible API)                  |
| Email     | Resend                                             |
| Styling   | Tailwind CSS + Radix UI                            |
| State     | Redux Toolkit                                      |
| Hosting   | Railway (`dev` → development, `main` → production) |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in `.env`. The values that must be set before the app will run:

| Variable          | Notes                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Postgres connection string used for queries and migrations                          |
| `NEXTAUTH_URL`    | `http://localhost:4500` in development                                              |
| `NEXTAUTH_SECRET` | At least 32 characters — `openssl rand -base64 32`. The app refuses to boot with less |

Storage and email can be left blank while developing; uploads will fail with a
clear error and emails are logged to the console while `USE_MOCK_EMAIL=true`.

### 3. Set up the database

```bash
npm run db:migrate:deploy  # apply prisma/migrations to create the tables
npm run db:generate        # generate the Prisma client
npm run db:bootstrap       # create the first SUPER_ADMIN from ADMIN_BOOTSTRAP_*
```

### 4. Run

```bash
npm run dev
```

The app runs at <http://localhost:4500>.

Seeded logins — **local development only**, never deployed:

- Admin: `admin@metroopticals.lk` / `admin123`
- Customer: `customer@example.com` / `customer123`

Deployed environments do not run the seed. They create their admin from
`ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` instead, and the bootstrap
script rejects the placeholder passwords above.

---

## Cloudflare R2 storage

Product images, catalogues and category images are stored in R2 and served from
a public bucket URL.

### Required variables

```bash
NEXT_PUBLIC_R2_PUBLIC_URL="https://pub-xxxxxxxx.r2.dev"  # public read URL
R2_BUCKET_NAME="metro"
R2_ACCOUNT_ID="..."          # Cloudflare account ID
R2_ACCESS_KEY_ID="..."       # S3 API access key
R2_SECRET_ACCESS_KEY="..."   # S3 API secret (64-char hex, shown once)
```

`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` come from **Cloudflare dashboard →
R2 → Manage API Tokens**. Note that a Cloudflare API token (`cfat_…`) is _not_
the same as the S3 secret access key — the S3 API needs the latter.

### Bucket layout

```
product/image/       product photos
product/catalogue/   product PDFs
product/tryon-2d/    virtual try-on cut-outs (transparent PNG, front-on)
product/tryon-3d/    virtual try-on models (GLB, real scale)
category/image/      category thumbnails
tryon-runtime/vX/    face-tracking runtime published by `npm run tryon:publish`
```

The database stores only the **filename**; URLs are built at render time by the
helpers in [`src/lib/storageUtils.ts`](src/lib/storageUtils.ts). Server-side
uploads and deletes live in [`src/lib/storage/r2.ts`](src/lib/storage/r2.ts).

### Public access

The bucket must allow public reads for images to render. Either enable the
`r2.dev` subdomain, or attach a custom domain and point
`NEXT_PUBLIC_R2_PUBLIC_URL` at it. When you use a custom domain, add its
hostname to `images.remotePatterns` in [`next.config.mjs`](next.config.mjs).

The virtual try-on fetches models and its runtime from the bucket with
`fetch`, which unlike `<img>` needs a **CORS rule** on the bucket allowing
`GET` from the site's origin. See [RAILWAY.md](RAILWAY.md) § Virtual try-on.

---

## Virtual try-on

Customers can see a frame on their own face from the product page. Tracking
runs entirely in the browser (MediaPipe + three.js); no image leaves the
device and nothing is metered. Each frame colour gets a transparent cut-out
(2D) or a real-scale GLB (3D) on the product's **Virtual try-on** tab in the
admin, with a caliper width, a preview on a face and a checklist before it
goes live. How it works, how to photograph frames and how to verify it on a
device is in **[VIRTUAL-TRY-ON.md](VIRTUAL-TRY-ON.md)**.

---

## Online payments (PayHere)

Card payments go through **PayHere**, Sri Lanka's card gateway, in LKR. The
storefront offers three ways to pay: cash on hand, bank transfer, and online
card. The card option only appears when `NEXT_PUBLIC_PAYHERE_ENABLED="true"`.

**How the flow works.** The customer's browser posts a *server-signed* form to
PayHere and pays there — no card details ever touch this site. PayHere then
calls back to `/api/payments/payhere/notify` server to server, and **that
callback is the only thing that marks an order paid**. The customer's return
to the site proves nothing; the confirmation page just polls the order until
the callback has landed. A card order holds its stock but keeps the cart
intact, so a declined or abandoned payment leaves the shopper able to retry
from the confirmation page or from **My account → Orders**.

**The surcharge.** `NEXT_PUBLIC_PAYHERE_FEE_PERCENT` (default `2.5`) is added
to card orders only, computed on the server, shown on the checkout before the
customer commits and printed on the invoice. Set it to `0` to charge nothing,
and rename the line with `NEXT_PUBLIC_PAYHERE_FEE_LABEL`.

**Testing against the sandbox.**

1. Create a sandbox account at <https://sandbox.payhere.lk>, register your
   domain under **Settings → Domains & Credentials**, and copy the merchant id
   and secret into `.env`.
2. PayHere has to reach your callback, and it cannot reach `localhost`. Run a
   tunnel (`ngrok http 4500`) and set
   `PAYHERE_NOTIFY_URL="https://<tunnel>/api/payments/payhere/notify"`.
3. Set `NEXT_PUBLIC_PAYHERE_ENABLED="true"` and `NEXT_PUBLIC_PAYHERE_MODE="sandbox"`,
   then restart — both are build-time values.
4. Check out with a PayHere test card — Visa `4916217501611292`, Mastercard
   `5307732125531191`, Amex `346781005510225`; any name, CVV and future
   expiry are accepted. The order should land as **Confirmed / Card paid**,
   the confirmation email should arrive, and the cart should empty.
5. Cancel a payment instead, and confirm the order is cancelled, the stock
   goes back, and the cart still has your items.

Anything other than exactly `live` in `NEXT_PUBLIC_PAYHERE_MODE` is treated as
sandbox, so a typo can never charge a real card. Full deployment notes are in
[RAILWAY.md](RAILWAY.md#online-card-payments-payhere).

### Why registering the domain is not optional

PayHere signs `merchant_id + order_id + amount + currency` with **no separator
between the fields**, so the digest cannot tell one reading of that string from
another: `512` + `3500.00` and `5123` + `500.00` concatenate identically and
hash identically. A customer holding a form we signed for their own order could
re-split it, be charged a fraction of the total, and hand PayHere's genuine —
correctly signed — reply back to us as proof the full amount was paid.

Two things stand between that and a working exploit, and both must be in place:

1. **Fixed-width order ids.** We always send `order_id` zero-padded to 12
   digits and reject any callback whose order id is not exactly 12 digits
   (`src/lib/payments/payhere.ts`). A re-split then produces a 13-digit order
   id, so the callback PayHere sends for the shifted charge names no order we
   will accept. **Do not "tidy up" that padding.**
2. **PayHere's domain restriction.** The attack only survives if the attacker
   can intercept that callback, which means repointing `notify_url` — a field
   that is *outside* the signature. Registering the domain under
   **Settings → Domains & Credentials** is what makes PayHere refuse a
   `return_url` / `cancel_url` / `notify_url` on any other host. Confirm this
   is active on the live account before taking real money, and keep
   `PAYHERE_NOTIFY_URL` unset in production.

If you move to a PayHere plan with the Payment Retrieval API, the belt-and-
braces fix is to confirm each `payment_id` against that API before marking an
order paid, and trust its amount over the callback's.

**Policy pages.** PayHere's activation review requires a Refund policy, a
Privacy policy and Terms & conditions reachable from the landing page. They
live at `/refund-policy`, `/privacy` and `/terms`, are linked from the footer
on every page, and share one layout in
[`src/components/common/LegalPage.tsx`](src/components/common/LegalPage.tsx).

---

## Brand and contact details

Store name, contact details, social links and bank details live in one place:
[`src/config/site.ts`](src/config/site.ts). Update that file rather than editing
components — the header, footer, contact page, emails, receipts and invoices
all read from it.

> **Before going live**, replace the placeholder values in `siteConfig.banking`
> and the phone number and address in `siteConfig.contact`.

---

## Scripts

| Command                     | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `npm run dev`               | Development server on port 4500                                 |
| `npm run build`             | Production build                                                |
| `npm run start`             | Serve the production build                                      |
| `npm run lint`              | ESLint                                                          |
| `npm run typecheck`         | `tsc --noEmit`                                                  |
| `npm run deploy:release`    | Apply migrations, then bootstrap the admin (Railway pre-deploy) |
| `npm run db:migrate`        | Create and apply a migration (local)                            |
| `npm run db:migrate:deploy` | Apply pending migrations without creating one                   |
| `npm run db:bootstrap`      | Create or promote the admin from `ADMIN_BOOTSTRAP_*`            |
| `npm run db:push`           | Push the schema with no migration — **local experiments only**    |
| `npm run db:studio`         | Open Prisma Studio                                              |
| `npm run db:generate`       | Regenerate the Prisma client                                    |
| `npm run clean`             | Remove `.next` and the module cache                             |
| `npm run tryon:runtime`     | Copy the try-on runtime under `public/` for a dev server        |
| `npm run tryon:publish`     | Publish the try-on runtime to R2 and print the URL to set       |
| `npm run tryon:sample-frame`| Generate a to-scale sample frame GLB from catalogue millimetres |

---

## Project structure

```
src/
├── app/              # App Router: routes, layouts, API handlers
│   ├── (site)/       # Public storefront
│   ├── (auth)/       # Login and registration
│   ├── admin/        # Admin dashboard
│   └── api/          # Route handlers
├── components/       # Shared UI (layout, modals, primitives)
├── config/           # site.ts (brand), env.ts (env validation)
├── features/         # Feature modules: products, orders, cart, …
├── lib/              # Storage, email, auth, logging, utilities
└── store/            # Redux store and slices
```

Each feature module follows the same shape: `api/` (client calls),
`services/` (server logic), `components/`, `types/` and `validators/`.

---

## Deployment

Hosted on **Railway**. Deploys are automatic:

| Branch | Railway environment | Trigger        |
| ------ | ------------------- | -------------- |
| `dev`  | `development`       | push to `dev`  |
| `main` | `production`        | push to `main` |

Each deploy builds the app, runs `npm run deploy:release` (apply migrations →
bootstrap the admin) in a pre-deploy container, then starts the server and waits
for `/api/health` to pass before taking traffic. A failed migration leaves the
previous version running.

Build and runtime settings are committed in [`railway.json`](railway.json).
The full setup — environments, branch mapping, the variable list, migration
and admin-password procedures, and troubleshooting — is in
**[RAILWAY.md](RAILWAY.md)**.

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) is a quality gate only:
it lints, typechecks, applies the migrations to a throwaway Postgres and builds.
It never deploys.
