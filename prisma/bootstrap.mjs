/**
 * Post-migration bootstrap  runs on every deploy, before the new container
 * takes traffic (Railway "Pre-deploy Command").
 *
 * It must be safe to run on an already-populated database, so every step is an
 * upsert or a no-op. Nothing here destroys data.
 *
 * Deliberately plain JavaScript, not TypeScript: production installs prune
 * devDependencies, so `ts-node` is not available at deploy time.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ["error"] });

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Administrator";
const resetPassword = process.env.ADMIN_BOOTSTRAP_RESET_PASSWORD === "true";

// Passwords that have appeared in this repo's seed data or in the docs. Letting
// one of these reach a public deployment is worse than having no admin at all.
const FORBIDDEN_PASSWORDS = new Set([
  "admin",
  "admin123",
  "password",
  "changeme",
  "customer123",
]);

function fail(message) {
  console.error(`[bootstrap] ${message}`);
  process.exitCode = 1;
}

async function bootstrapAdmin() {
  if (!email || !password) {
    console.log(
      "[bootstrap] ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD not set  skipping admin bootstrap."
    );
    return true;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`ADMIN_BOOTSTRAP_EMAIL is not a valid address: ${email}`);
    return false;
  }

  if (FORBIDDEN_PASSWORDS.has(password.toLowerCase())) {
    fail(
      "ADMIN_BOOTSTRAP_PASSWORD is a well-known placeholder. Set a real password."
    );
    return false;
  }

  if (password.length < 12) {
    fail("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.");
    return false;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, password: true },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email,
        name,
        password: await bcrypt.hash(password, 12),
        role: "SUPER_ADMIN",
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    console.log(`[bootstrap] Created SUPER_ADMIN ${email} (id ${created.id}).`);
    return true;
  }

  // The account is already there. Only ever widen its role and  on explicit
  // request  rotate its password. Never silently overwrite a working login.
  const data = {};

  if (existing.role !== "SUPER_ADMIN") {
    data.role = "SUPER_ADMIN";
  }

  if (resetPassword || !existing.password) {
    data.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(data).length === 0) {
    console.log(`[bootstrap] Admin ${email} already correct  nothing to do.`);
    return true;
  }

  await prisma.user.update({ where: { email }, data });
  console.log(
    `[bootstrap] Updated ${email}: ${Object.keys(data).join(", ")}.` +
      (data.password && !resetPassword
        ? " (password was empty, so it was set)"
        : "")
  );
  return true;
}

async function main() {
  // Migrations ran a moment ago; this confirms the app's own credentials work
  // against the migrated database before the container is marked healthy.
  await prisma.$queryRaw`SELECT 1`;
  console.log("[bootstrap] Database reachable.");

  const ok = await bootstrapAdmin();
  if (!ok) {
    throw new Error("Admin bootstrap failed  see errors above.");
  }
}

main()
  .catch((error) => {
    console.error("[bootstrap] Failed:", error.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
