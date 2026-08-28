/**
 * Empty the shop's data while keeping every login.
 *
 * For taking a site from testing to live: everything created while trying
 * the system out  products, orders, bills, customers, reviews, ads, stock
 * history, messages  goes, and the staff and customer accounts stay so
 * nobody has to sign up again. Site content (headlines, menus, business
 * details) is kept: it is configuration, not test data.
 *
 * Deliberately not wired to an npm script and deliberately refusing to run
 * without being told twice: this is a one-way door.
 *
 *   CONFIRM_CLEAR=yes DATABASE_URL=... node prisma/clear-data.mjs
 *
 * Plain SQL, so it works whether or not the latest migrations have run: it
 * clears the tables that exist and skips the ones that do not.
 *
 * Files already uploaded to R2 are NOT deleted; clean the bucket from the
 * Cloudflare dashboard if wanted.
 */
import { PrismaClient } from "@prisma/client";

const fail = (message) => {
  console.error(`\n[clear-data] ${message}\n`);
  process.exit(1);
};

if (process.env.CONFIRM_CLEAR !== "yes") {
  fail(
    "Refusing to run. This deletes every product, order, bill and customer. " +
      "Back the database up first, then run with CONFIRM_CLEAR=yes.",
  );
}

const prisma = new PrismaClient();
const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL || "").host;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
})();

// Children before parents. `CASCADE` on TRUNCATE also clears anything that
// references these rows  none of which is a login.
const WANT = [
  "payments", "stock_movements", "order_items", "orders", "customers",
  "cart_items", "wishlist_items", "reviews", "advertisements", "products",
  "categories", "brands", "contact_messages",
];
const KEEP = ["users", "accounts", "sessions", "verification_tokens", "password_reset_tokens", "site_content"];

const existing = new Set(
  (
    await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
  ).map((row) => row.table_name),
);
const targets = WANT.filter((t) => existing.has(t));
const skipped = WANT.filter((t) => !existing.has(t));

const count = async (table) =>
  Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "public"."${table}"`))[0].n);

console.log(`[clear-data] Database host: ${host}`);
const before = {};
for (const t of [...targets, "users"]) before[t] = await count(t);
console.log("[clear-data] Before:", before);
if (skipped.length) console.log("[clear-data] Not present yet (skipped):", skipped.join(", "));

await prisma.$executeRawUnsafe(
  `TRUNCATE TABLE ${targets.map((t) => `"public"."${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
);

const after = {};
for (const t of [...targets, ...KEEP.filter((t) => existing.has(t))]) after[t] = await count(t);
console.log("[clear-data] After:", after);
await prisma.$disconnect();
