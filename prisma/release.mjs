import { execSync } from "node:child_process";

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 5_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = (command) =>
  execSync(command, { stdio: "inherit", env: process.env });

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    run("npx prisma migrate deploy");
    break;
  } catch (error) {
    if (attempt === MAX_ATTEMPTS) {
      console.error(`migrate deploy failed after ${MAX_ATTEMPTS} attempts.`);
      process.exit(1);
    }
    const delay = BASE_DELAY_MS * attempt;
    console.warn(
      `migrate deploy failed (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delay / 1000}s…`,
    );
    await sleep(delay);
  }
}

run("node prisma/bootstrap.mjs");
