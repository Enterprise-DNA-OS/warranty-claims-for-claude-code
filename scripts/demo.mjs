import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "./lib/db.mjs";
const env = { ...process.env, DATABASE_URL: "", DATA_DIR: ".data/demo" };
for (const args of [
  ["scripts/migrate.mjs"],
  ["scripts/seed.mjs"],
  ["scripts/warranty.mjs", "attention"],
]) {
  const r = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    env,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log(
  "Fictional demo is isolated in .data/demo. Set DATA_DIR=.data/demo to query it.",
);
