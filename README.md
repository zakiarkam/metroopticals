# Metro Opticals

E-commerce storefront and admin dashboard for **Metro Opticals** — prescription eyeglasses, sunglasses, contact lenses and eye care.

Built with Next.js 15 (App Router), Prisma, PostgreSQL (Neon), NextAuth and Cloudflare R2.

---

## Stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | Next.js 15 (App Router, React 19)       |
| Database   | PostgreSQL on Neon, via Prisma          |
| Auth       | NextAuth (credentials + Google OAuth)   |
| Storage    | Cloudflare R2 (S3-compatible API)       |
| Email      | Resend                                  |
| Styling    | Tailwind CSS + Radix UI                 |
| State      | Redux Toolkit                           |

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

| Variable          | Notes                                                     |
| ----------------- | --------------------------------------------------------- |
| `DATABASE_URL`    | Neon **pooled** connection string (host contains `-pooler`) |
| `DIRECT_URL`      | Neon **direct** connection string, used for migrations     |
| `NEXTAUTH_URL`    | `http://localhost:4500` in development                     |
| `NEXTAUTH_SECRET` | At least 32 characters — `openssl rand -base64 32`         |

Storage and email can be left blank while developing; uploads will fail with a
clear error and emails are logged to the console while `USE_MOCK_EMAIL=true`.

### 3. Set up the database

```bash
npm run db:push      # create tables from prisma/schema.prisma
npm run db:generate  # generate the Prisma client
npm run db:seed      # optional: sample categories, products and users
```

### 4. Run

```bash
npm run dev
```

The app runs at <http://localhost:4500>.

Seeded logins (development only — change these before going live):

- Admin: `admin@metroopticals.lk` / `admin123`
- Customer: `customer@example.com` / `customer123`

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
R2 → Manage API Tokens**. Note that a Cloudflare API token (`cfat_…`) is *not*
the same as the S3 secret access key — the S3 API needs the latter.

### Bucket layout

```
product/image/       product photos
product/catalogue/   product PDFs
category/image/      category thumbnails
```

The database stores only the **filename**; URLs are built at render time by the
helpers in [`src/lib/storageUtils.ts`](src/lib/storageUtils.ts). Server-side
uploads and deletes live in [`src/lib/storage/r2.ts`](src/lib/storage/r2.ts).

### Public access

The bucket must allow public reads for images to render. Either enable the
`r2.dev` subdomain, or attach a custom domain and point
`NEXT_PUBLIC_R2_PUBLIC_URL` at it. When you use a custom domain, add its
hostname to `images.remotePatterns` in [`next.config.mjs`](next.config.mjs).

---

## Brand and contact details

Store name, contact details, social links and bank details live in one place:
[`src/config/site.ts`](src/config/site.ts). Update that file rather than editing
components — the header, footer, contact page, emails, receipts and invoices all
read from it.

> **Before going live**, replace the placeholder values in `siteConfig.banking`
> and the phone number and address in `siteConfig.contact`.

---

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Development server on port 4500              |
| `npm run build`         | Production build                             |
| `npm run start`         | Serve the production build                   |
| `npm run lint`          | ESLint                                       |
| `npm run db:push`       | Push the schema to the database (no migration) |
| `npm run db:migrate`    | Create and apply a migration                 |
| `npm run db:studio`     | Open Prisma Studio                           |
| `npm run db:seed`       | Seed sample data                             |
| `npm run db:generate`   | Regenerate the Prisma client                 |
| `npm run clean`         | Remove `.next` and the module cache          |

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

Docker and nginx configuration is under [`docker/`](docker/) and
[`nginx/`](nginx/); CI lives in [`.github/workflows/`](.github/workflows/).

These were inherited from the previous deployment and still reference the old
host and container registry. Before deploying, update:

- the container image name in `docker/docker-compose.prod.yml`
- `server_name` and the certificate paths in `nginx/conf.d/metroopticals.conf`
- the SSH host, registry and deploy secrets in the GitHub Actions workflow

Production also needs `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` set to the real
domain, a strong `NEXTAUTH_SECRET`, and `USE_MOCK_EMAIL=false` with a valid
`RESEND_API_KEY`.
# metroopticals
