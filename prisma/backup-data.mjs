/**
 * Every table as one JSON file  a version-independent snapshot.
 *
 *   DATABASE_URL=... node prisma/backup-data.mjs backups/2026-08-26.json
 *
 * Plain SQL on purpose: it reads whatever columns the database actually has,
 * so it works before and after a migration, and it does not need `pg_dump`
 * to match the server's version.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const out = process.argv[2];
if (!out) {
  console.error("usage: node prisma/backup-data.mjs <output.json>");
  process.exit(1);
}

const prisma = new PrismaClient();
const tables = await prisma.$queryRawUnsafe(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
   ORDER BY table_name`,
);

const dump = {};
for (const { table_name } of tables) {
  dump[table_name] = await prisma.$queryRawUnsafe(`SELECT * FROM "public"."${table_name}"`);
}
writeFileSync(
  out,
  JSON.stringify(dump, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2),
);
console.log("rows:", Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])));
await prisma.$disconnect();
