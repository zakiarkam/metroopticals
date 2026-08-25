# Deploying Metro Opticals on Railway

This project deploys entirely on Railway. There is no Docker image to build, no
Jenkins pipeline, no nginx config and no VPS to SSH into all of that was
removed. Railway builds from the repository and runs `next start` directly.

---

## 1. How it fits together

```
GitHub                          Railway project "metroopticals"
──────                          ────────────────────────────────

  main  ──── push ───▶  environment: production
                          ├─ service: web        (this repo)
                          └─ service: Postgres

  dev   ──── push ───▶  environment: development
                          ├─ service: web        (this repo)
                          └─ service: Postgres
```

Each Railway environment watches exactly one branch. Push to that branch and
Railway builds and releases automatically nothing else has to be triggered.

Every deploy runs three steps in order, and stops if any of them fails:

| Step       | Command                                    | Where it is configured       |
| ---------- | ------------------------------------------ | ---------------------------- |
| Build      | `npm ci` → `postinstall` → `npm run build` | [railway.json](railway.json) |
| Pre-deploy | `npm run deploy:release`                   | [railway.json](railway.json) |
| Start      | `npm run start`                            | [railway.json](railway.json) |

`deploy:release` is `prisma migrate deploy && node prisma/bootstrap.mjs`: it
applies any pending migrations, then makes sure the admin account exists. It
runs in a throwaway container **before** the new version receives traffic, so a
failed migration leaves the previous version serving instead of releasing a
broken build.

Railway then polls `/api/health` (which checks the database) for up to 300s
before switching traffic over.

---

## 2. One-time setup in the Railway dashboard

Everything in `railway.json` is already committed. What follows is the part that
only exists in Railway's UI.

### 2.1 Production environment

1. Open the project → **Settings → Environments**. The default environment is
   your production one; rename it to `production` if it is still called
   `default`.
2. Add a **Postgres** database to it if there isn't one (**+ New → Database →
   Add PostgreSQL**).
3. Add the app: **+ New → GitHub Repo → `zakiarkam/metroopticals`**. Name the
   service `web`.
4. On `web` → **Settings → Source**, set **Branch** to `main`.
5. On `web` → **Settings → Networking**, click **Generate Domain**. Note the
   domain you need it for `NEXTAUTH_URL`.
6. Set the variables from §3.

### 2.2 Development environment

1. **Settings → Environments → New Environment**. Name it `development` and
   duplicate `production` so the service layout is copied.
2. On the `development` copy of `web` → **Settings → Source**, set **Branch** to
   `dev`.
3. Make sure `development` has **its own Postgres service**. Do not let the dev
   branch write to the production database check that the `DATABASE_URL`
   reference in this environment resolves to the Postgres inside _this_
   environment.
4. **Generate Domain** for the dev `web` service, and set that environment's
   `NEXTAUTH_URL` to it.
5. Confirm **Settings → Deploys → Automatic Deploys** is enabled (it is by
   default). Pushing to `dev` should now deploy on its own.

> Both environments read the same `railway.json`, so migrations and the admin
> bootstrap behave identically in each.

---

## 3. Environment variables

Set these on the **`web` service**, once per environment. Values differ per
environment where the table says so.

### Database use references, not pasted strings

| Variable       | Value                        |
| -------------- | ---------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |

That is the only database variable. Type the `${{...}}` string literally
Railway resolves it to whichever Postgres lives in the same environment. That is
what keeps development off the production database, and it keeps working if the
credentials are ever rotated.

Railway Postgres has no connection pooler, so there is no pooled/direct split to
configure: `schema.prisma` uses this one URL for both runtime queries and
migrations. (Prisma's `directUrl` was removed for exactly this reason it only
exists to pair with a pooled `DATABASE_URL`, as on Neon.)

### Authentication

| Variable          | Value                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`    | `https://${{RAILWAY_PUBLIC_DOMAIN}}`                                                                |
| `NEXTAUTH_SECRET` | A fresh 32+ char secret, **different in each environment**. Generate with `openssl rand -base64 32` |

`NEXTAUTH_URL` must match the domain in the browser's address bar or every login
redirect breaks. The `RAILWAY_PUBLIC_DOMAIN` reference handles that for you,
including after you attach a custom domain.

### First admin login

| Variable                         | Value                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| `ADMIN_BOOTSTRAP_EMAIL`          | The address you want to sign in with                                 |
| `ADMIN_BOOTSTRAP_PASSWORD`       | 12+ characters. Not `admin123` the script rejects known placeholders |
| `ADMIN_BOOTSTRAP_NAME`           | e.g. `Administrator` (optional)                                      |
| `ADMIN_BOOTSTRAP_RESET_PASSWORD` | Leave unset. See §5.                                                 |

### Storage, email and site details

| Variable                      | Notes                                               |
| ----------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_R2_PUBLIC_URL`   | e.g. `https://pub-xxxxxxxx.r2.dev` **build-time**   |
| `R2_BUCKET_NAME`              |                                                     |
| `R2_ACCOUNT_ID`               |                                                     |
| `R2_ACCESS_KEY_ID`            |                                                     |
| `R2_SECRET_ACCESS_KEY`        |                                                     |
| `RESEND_API_KEY`              | Required in production unless `USE_MOCK_EMAIL=true` |
| `EMAIL_FROM`                  | e.g. `Metro Opticals <hello@metroopticals.lk>`      |
| `USE_MOCK_EMAIL`              | `false` in production, `true` in development        |
| `ADMIN_EMAIL`                 | Store contact address shown on the site             |
| `ADMIN_PHONE`                 | Store contact number                                |
| `NEXT_PUBLIC_SITE_URL`        | `https://metroopticals.lk` (prod) **build-time**    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | e.g. `94770000000` **build-time**                   |
| `LOG_LEVEL`                   | `info` (use `debug` temporarily when investigating) |
| `NODE_ENV`                    | `production` in both environments                   |

**The `NEXT_PUBLIC_*` gotcha:** those values are compiled into the JavaScript
sent to the browser during `npm run build`. Changing one and restarting does
nothing you must **redeploy** for it to take effect.

### Do not set

- `PORT` Railway assigns it and `npm run start` reads it. Hard-coding it will
  make the health check fail.
- `LOG_TO_FILE` the container filesystem is wiped on every deploy, so file
  logs are unreadable. Railway captures stdout instead, which is where all logs
  already go.

---

## 4. Everyday workflow

```bash
git checkout dev
# ...work...
git push origin dev          # → Railway builds and deploys development
```

When development looks right:

```bash
git checkout main
git merge dev
git push origin main         # → Railway builds and deploys production
```

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) runs in parallel on both
branches. It does not deploy; it lints, typechecks, applies the migrations to a
throwaway Postgres and builds so a broken commit is visible even if Railway's
own build happens to succeed.

---

## 5. Database tasks

**Adding a schema change.** Migrations are committed to the repo and applied by
the pre-deploy command. Never use `prisma db push` against a deployed database
it changes the schema without recording a migration, and the next
`migrate deploy` will then disagree with reality.

```bash
# against your LOCAL database
npm run db:migrate -- --name add_something   # writes prisma/migrations/...
git add prisma/migrations && git commit       # commit the SQL
git push origin dev                           # Railway applies it on deploy
```

CI fails the build if `schema.prisma` was edited without a matching migration,
so this is hard to get wrong by accident.

**The baseline migration.** `prisma/migrations/20260824000000_init` creates all
16 tables from scratch. On a fresh Railway Postgres it just runs. If you are
pointing at a database that _already_ has these tables (from the old
`db push` workflow), mark the baseline as already applied instead of running it:

```bash
railway run --environment production npx prisma migrate resolve \
  --applied 20260824000000_init
```

**Resetting the admin password.** Set `ADMIN_BOOTSTRAP_RESET_PASSWORD=true` and
`ADMIN_BOOTSTRAP_PASSWORD` to the new password, redeploy once, then remove the
reset flag. Without that flag the bootstrap never overwrites an existing
password so a routine deploy can't clobber a working login.

**Sample catalogue data.** `prisma/seed.ts` contains demo brands, categories and
products, plus placeholder logins. It is **not** wired into the deploy on
purpose it is for local development only:

```bash
npm run db:seed        # local only
```

**Connecting from your machine.** `postgres.railway.internal` resolves only
inside Railway. To reach a deployed database locally, use the **public** proxy
connection string from the Postgres service's _Connect_ tab, or run the command
inside Railway with `railway run`.

---

## 6. Troubleshooting

| Symptom                                     | Cause                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Deploy stuck, then "health check failed"    | The app isn't listening on `$PORT`. Check that no `PORT` variable is set on the service.                                         |
| Health check returns 503                    | `/api/health` couldn't query the database. Check `DATABASE_URL` resolves to a Postgres in the same environment.                  |
| Login redirects to the wrong host, or loops | `NEXTAUTH_URL` doesn't match the domain being used.                                                                              |
| Images render broken                        | The R2 hostname isn't in `next.config.mjs` → `images.remotePatterns`, or `NEXT_PUBLIC_R2_PUBLIC_URL` changed without a redeploy. |
| Deploy fails during pre-deploy              | Read the pre-deploy log. Either a migration failed, or `ADMIN_BOOTSTRAP_PASSWORD` was rejected (too short / known placeholder).  |
| Schema changes not appearing                | The migration wasn't committed. `migrate deploy` only runs SQL from `prisma/migrations`.                                         |
| Dev deploy changed production data          | The `development` environment's `DATABASE_URL` is pointing at the production Postgres. Fix the reference.                        |

Logs: Railway dashboard → service → **Deployments** → pick a deploy →
**Build / Deploy / Pre-deploy** logs. Everything the app writes goes to stdout
as JSON.
