import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { migrate } from "./migrate.mjs";
import { run, reads } from "./warranty.mjs";
import { resolve, exportTables } from "./lib/domain.mjs";
import { parseCsv } from "./lib/csv.mjs";
import { esc } from "./lib/render.mjs";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "warranty-test-"));
process.env.DATABASE_URL = "";
process.env.DATA_DIR = path.join(tmp, "db");
process.env.OUTPUT_DIR = path.join(tmp, "out");
let db = await getDb(),
  checks = 0;
const check = (condition, msg) => {
  assert.ok(condition, msg);
  checks++;
};
const eq = (a, b, msg) => {
  assert.deepEqual(a, b, msg);
  checks++;
};
const rejects = async (args, re) => {
  await assert.rejects(() => run(db, args), re);
  checks++;
};
const call = (...args) => run(db, args);
const today = new Date().toISOString().slice(0, 10);
const date = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const count = async (t) =>
  Number((await db.query(`SELECT count(*) AS n FROM ${t}`))[0].n);
function child(args, expected = 0) {
  const out = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
  });
  assert.equal(out.status, expected, out.stderr || out.stdout);
  checks++;
  return out;
}
try {
  eq((await migrate(db)).ran.length, 2);
  eq((await migrate(db)).skipped, 2);
  const seed = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/seed.sql"),
    "utf8",
  );
  await db.exec(seed);
  const sizes = Object.fromEntries(
    await Promise.all(exportTables.map(async (t) => [t, await count(t)])),
  );
  await db.exec(seed);
  for (const t of exportTables)
    eq(await count(t), sizes[t], "seed idempotent " + t);
  for (const cmd of Object.keys(reads))
    check(Array.isArray(await call(cmd)), cmd);
  const initial = await call("coverage");
  eq(
    initial.find((r) => r.number === "WC-1001").contractual_check,
    "outside recorded limits",
  );
  eq(
    initial.find((r) => r.number === "WC-1002").contractual_check,
    "within recorded limits",
  );
  eq(
    initial.find((r) => r.number === "WC-1003").contractual_check,
    "usage evidence needed",
  );
  check((await call("attention")).some((r) => r.reason === "RECOVERY"));
  check((await call("compliance")).some((r) => r.rule === "AU-SAFETY-REPORT"));
  eq((await call("claim", "wc-1001")).claim.number, "WC-1001");
  eq((await call("asset", "HP-001")).asset.serial, "HP-001");
  eq(
    (await call("claim", "60000000-0000-0000-0000-000000000001")).claim.number,
    "WC-1001",
  );
  await rejects(["claim", "pump"], /Ambiguous/);
  await rejects(["claim", "does-not-exist"], /not found/);
  await rejects(["claims", "--surprise=yes"], /Unknown flag/);
  await rejects(["claims", "x"], /detail/);
  await rejects(["help", "--json", "--json"], /Duplicate/);
  const ten = await call("insights");
  eq(ten.length, 10);
  for (let n = 1; n <= 10; n++)
    eq((await call("insights", String(n)))[0].number, n);
  await rejects(["insights", "11"], /1 to 10/);
  await rejects(["insights", "1x"], /1 to 10/);
  check(ten[0].rows.some((r) => r.number === "WC-1001"));
  check(ten[2].rows.some((r) => r.serial === "HP-001"));
  eq(ten[3].rows[0].net_cents, 43000);
  check(ten[5].rows.some((r) => r.outstanding_cents === 13000));
  await rejects(
    [
      "adjudicate",
      "WC-1001",
      "--decision=rejected",
      "--amount=0",
      "--reason=Expired",
      "--actor=Pat",
    ],
    /consumer rights review/,
  );
  await rejects(
    [
      "adjudicate",
      "WC-1002",
      "--decision=approved",
      "--amount=650",
      "--reason=Inspected",
      "--actor=Pat",
    ],
    /evidence/,
  );
  await rejects(
    [
      "adjudicate",
      "WC-1003",
      "--decision=approved",
      "--amount=550",
      "--reason=Inspected",
      "--actor=Pat",
    ],
    /usage evidence/,
  );
  await call(
    "usage",
    "WC-1003 bearing",
    "--value=900",
    "--unit=hours",
    "--actor=Pat",
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "within recorded limits",
  );
  await rejects(
    ["usage", "WC-1003 bearing", "--value=NaN", "--unit=hours", "--actor=Pat"],
    /nonnegative/,
  );
  await call(
    "usage",
    "WC-1003 bearing",
    "--value=1001",
    "--unit=hours",
    "--actor=Pat",
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "outside recorded limits",
  );
  await call(
    "usage",
    "WC-1003 bearing",
    "--value=1000",
    "--unit=hours",
    "--actor=Pat",
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "within recorded limits",
  );
  await rejects(
    [
      "adjudicate",
      "WC-1003",
      "--decision=approved",
      "--amount=999",
      "--reason=Test",
      "--actor=Pat",
    ],
    /exceeds/,
  );
  await rejects(
    [
      "adjudicate",
      "WC-1003",
      "--decision=rejected",
      "--amount=1",
      "--reason=Test",
      "--actor=Pat",
    ],
    /zero/,
  );
  await rejects(
    [
      "adjudicate",
      "WC-1003",
      "--decision=approved",
      "--amount=1.001",
      "--reason=Test",
      "--actor=Pat",
    ],
    /two places/,
  );
  await call(
    "adjudicate",
    "WC-1001",
    "--decision=approved",
    "--amount=520",
    "--reason=Remedy agreed after review",
    "--rights-review=Consumer remedy reviewed by Pat",
    "--actor=Pat",
  );
  await rejects(
    [
      "adjudicate",
      "WC-1001",
      "--decision=rejected",
      "--amount=0",
      "--reason=Second decision",
      "--actor=Pat",
    ],
    /Only submitted/,
  );
  await rejects(["close", "WC-1001", "--actor=Pat"], /returned parts/);
  await rejects(
    [
      "receive",
      "RMA-101",
      "--date=2026-02-30",
      "--disposition=inspect",
      "--actor=Pat",
    ],
    /real/,
  );
  await rejects(
    [
      "receive",
      "RMA-101",
      "--date=" + date(1),
      "--disposition=inspect",
      "--actor=Pat",
    ],
    /future/,
  );
  await call(
    "receive",
    "RMA-101",
    "--date=" + today,
    "--disposition=inspect",
    "--actor=Pat",
  );
  await call("close", "WC-1001", "--actor=Pat");
  eq((await call("claim", "WC-1001")).claim.status, "closed");
  await rejects(
    [
      "receive",
      "RMA-101",
      "--date=" + today,
      "--disposition=inspect",
      "--actor=Pat",
    ],
    /already/,
  );
  await rejects(
    ["recover", "REC-101", "--amount=200", "--ref=SUP-TEST", "--actor=Pat"],
    /check constraint/,
  );
  await rejects(
    ["recover", "REC-101", "--amount=40", "--ref=SUP-TEST", "--actor=Pat"],
    /decrease/,
  );
  await call(
    "recover",
    "REC-101",
    "--amount=180",
    "--ref=SUP-TEST",
    "--actor=Pat",
  );
  eq((await call("recoveries"))[0].outstanding_cents, 0);
  await call("review", "WC-1002", "--status=review", "--actor=Pat");
  await call("evidence", "WC-1002", "--ref=inspection/HP-002", "--actor=Pat");
  await call(
    "safety",
    "WC-1002",
    "--awareness=" + date(-3),
    "--country=AU",
    "--reported=" + date(-1),
    "--ref=AUTH-DEMO-123",
    "--actor=Pat",
  );
  check(
    !(await call("compliance")).some(
      (r) => r.rule === "AU-SAFETY-REPORT" || r.rule === "AU-SAFETY-LATE",
    ),
  );
  await call(
    "safety",
    "WC-1002",
    "--awareness=" + date(-3),
    "--country=AU",
    "--reported=" + today,
    "--ref=AUTH-DEMO-LATE",
    "--actor=Pat",
  );
  check((await call("compliance")).some((r) => r.rule === "AU-SAFETY-LATE"));
  await rejects(
    [
      "safety",
      "WC-1002",
      "--awareness=" + today,
      "--country=AU",
      "--actor=Pat",
    ],
    /awareness later/,
  );
  await rejects(
    [
      "safety",
      "WC-1002",
      "--awareness=" + date(-3),
      "--country=NZ",
      "--actor=Pat",
    ],
    /jurisdiction/,
  );
  await call(
    "log",
    "WC-1002",
    "--text=Spoke with customer",
    "--contact=" + today,
    "--actor=Pat",
  );
  eq((await call("claim", "WC-1002")).claim.last_contact_on, today);
  await rejects(
    ["log", "WC-1002", "--text=Old", "--contact=" + date(-1), "--actor=Pat"],
    /backwards/,
  );
  const before = await count("audit_events");
  await rejects(
    ["log", "WC-1002", "--contact=" + today, "--actor=Pat"],
    /Missing text/,
  );
  eq(
    await count("audit_events"),
    before,
    "failed multiwrite transaction rolls back",
  );
  const fields = JSON.stringify({
    name: "Fresh supplier",
    role: "supplier",
    country: "NZ",
  });
  await call("add", "party", "--fields=" + fields, "--actor=Pat");
  check((await call("parties")).some((p) => p.name === "Fresh supplier"));
  await rejects(
    [
      "add",
      "party",
      "--fields=" +
        JSON.stringify({
          name: "Bad",
          role: "supplier",
          country: "NZ",
          evil: "DROP TABLE claims",
        }),
      "--actor=Pat",
    ],
    /Unknown/,
  );
  await rejects(
    [
      "add",
      "party",
      "--fields=" +
        JSON.stringify({ name: "Bad", role: "unknown", country: "NZ" }),
      "--actor=Pat",
    ],
    /check constraint/,
  );

  // Coverage edges: inclusive start/end, missing warranty, wrong unit and decision locks.
  const aw = "50000000-0000-0000-0000-000000000003";
  await db.query(
    "UPDATE asset_warranties SET starts_on=current_date-17, ends_on=current_date-17 WHERE id=$1",
    [aw],
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "within recorded limits",
  );
  await db.query(
    "UPDATE asset_warranties SET starts_on=current_date-16, ends_on=current_date+1 WHERE id=$1",
    [aw],
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "outside recorded limits",
  );
  await db.query(
    "UPDATE asset_warranties SET starts_on=current_date-250, ends_on=current_date+115 WHERE id=$1",
    [aw],
  );
  await call(
    "usage",
    "WC-1003 bearing",
    "--value=900",
    "--unit=km",
    "--actor=Pat",
  );
  eq(
    (await call("coverage")).find((r) => r.number === "WC-1003")
      .contractual_check,
    "usage evidence needed",
  );
  await call(
    "usage",
    "WC-1003 bearing",
    "--value=900",
    "--unit=hours",
    "--actor=Pat",
  );
  await call(
    "adjudicate",
    "WC-1003",
    "--decision=approved",
    "--amount=550",
    "--reason=Inspection accepted",
    "--actor=Pat",
  );
  await rejects(
    ["usage", "WC-1003 bearing", "--value=800", "--unit=hours", "--actor=Pat"],
    /after a decision/,
  );
  await rejects(
    [
      "add",
      "asset",
      "--fields=" +
        JSON.stringify({
          name: "Bad relation",
          serial: "BAD-1",
          product_id: "PUMP-40",
          customer_id: "Southern Components",
          purchased_on: today,
        }),
      "--actor=Pat",
    ],
    /customer/,
  );
  const fresh = await call(
    "add",
    "claim",
    "--fields=" +
      JSON.stringify({
        number: "WC-TEST",
        name: "Fresh test claim",
        opened_on: today,
        failure_on: today,
        owner: "Pat",
        currency: "NZD",
        last_contact_on: today,
      }),
    "--actor=Pat",
  );
  check(
    (await call("compliance")).some(
      (r) => r.number === "WC-TEST" && r.rule === "CLAIM-ITEMS",
    ),
  );
  const line = await call(
    "add",
    "item",
    "--fields=" +
      JSON.stringify({
        name: "Fresh line",
        claim_id: fresh.id,
        asset_id: "HP-002",
        failure_code: "SEAL",
        description: "Test",
        parts_cents: 100,
      }),
    "--actor=Pat",
  );
  await call(
    "add",
    "return",
    "--fields=" +
      JSON.stringify({ name: "RMA-TEST", item_id: line.id, due_on: today }),
    "--actor=Pat",
  );
  await call(
    "add",
    "recovery",
    "--fields=" +
      JSON.stringify({
        name: "REC-TEST",
        claim_id: fresh.id,
        supplier_id: "Southern Components",
        requested_cents: 100,
        due_on: today,
      }),
    "--actor=Pat",
  );
  check((await call("returns")).some((r) => r.name === "RMA-TEST"));
  check((await call("recoveries")).some((r) => r.name === "REC-TEST"));
  await rejects(
    [
      "add",
      "recovery",
      "--fields=" +
        JSON.stringify({
          name: "BAD-REC",
          claim_id: fresh.id,
          supplier_id: "Harbour Home Products",
          requested_cents: 100,
          due_on: today,
        }),
      "--actor=Pat",
    ],
    /supplier/,
  );
  await rejects(
    [
      "add",
      "term",
      "--fields=" +
        JSON.stringify({
          name: "Bad usage",
          duration_months: 12,
          usage_limit: 100,
        }),
      "--actor=Pat",
    ],
    /check constraint/,
  );
  // Import: trial and committed runs, exact repeats, raw preservation, rollback and broken references.
  const dir = path.join(REPO_ROOT, "examples/salesforce");
  const n = await count("claims");
  const dry = await call(
    "import",
    "salesforce",
    "--dir=" + dir,
    "--dry-run",
    "--actor=Pat",
  );
  eq(dry.created, 9);
  eq(await count("claims"), n);
  const imp = await call("import", "salesforce", "--dir=" + dir, "--actor=Pat");
  eq(imp.created, 9);
  eq(
    (await call("import", "salesforce", "--dir=" + dir, "--actor=Pat"))
      .unchanged,
    9,
  );
  const imported = await call("claim", "IMP-CLAIM-01");
  eq(imported.claim.raw_source.Status, "Approved");
  eq(imported.claim.status, "submitted");
  eq(imported.items[0].claimed_cents, 20075);
  eq(imported.items[0].contractual_check, "within recorded limits");
  const changed = path.join(tmp, "changed");
  fs.mkdirSync(changed);
  fs.writeFileSync(
    path.join(changed, "Account.csv"),
    "Id,Name,Role,BillingCountryCode\nA-NEW,New rollback,supplier,NZ\nA-101,Changed customer,customer,NZ\n",
  );
  const parties = await count("parties");
  await rejects(
    ["import", "salesforce", "--dir=" + changed, "--actor=Pat"],
    /Changed source row/,
  );
  eq(await count("parties"), parties);
  fs.writeFileSync(
    path.join(changed, "Account.csv"),
    "Id,Name,Role,BillingCountryCode\nA-DUP,Duplicate one,customer,NZ\nA-DUP,Duplicate two,customer,NZ\n",
  );
  await rejects(
    ["import", "salesforce", "--dir=" + changed, "--actor=Pat"],
    /Duplicate source ID/,
  );
  eq(await count("parties"), parties);
  fs.rmSync(path.join(changed, "Account.csv"));
  fs.writeFileSync(
    path.join(changed, "ClaimItem.csv"),
    "Id,Name,ClaimId,AssetId,Parts Amount\nI-BAD,Broken,C-NOPE,S-101,1\n",
  );
  await rejects(
    ["import", "salesforce", "--dir=" + changed, "--actor=Pat"],
    /not found/,
  );
  fs.rmSync(path.join(changed, "ClaimItem.csv"));
  fs.writeFileSync(
    path.join(changed, "Claim.csv"),
    "Id,ClaimNumber,Name,CreatedDate,Failure Date,Owner Name\nC-NOCURRENCY,NO-CURRENCY,Missing currency,2026-01-01,2026-01-01,Pat\n",
  );
  await rejects(
    ["import", "salesforce", "--dir=" + changed, "--actor=Pat"],
    /Currency/,
  );
  eq(
    parseCsv('\ufeffName,Note\r\n"A","line 1\nline ""2"""\r\n')[0].Note,
    'line 1\nline "2"',
  );
  assert.throws(() => parseCsv("Name,name\na,b"), /unique/);
  checks++;
  assert.throws(() => parseCsv('Name\n"unterminated'), /unclosed/);
  checks++;
  assert.throws(() => parseCsv("Name\na,b"), /expected/);
  checks++;
  eq(esc('<script>"'), "&lt;script&gt;&quot;");
  for (const [cmd, arg] of [
    ["weekly-review"],
    ["draft-claim", "WC-1001"],
    ["draft-recovery", "REC-101"],
  ]) {
    const out = await call(cmd, ...(arg ? [arg] : []));
    const text = fs.readFileSync(out.file, "utf8");
    check(text.includes("Nothing sent"));
    check(out.file.startsWith(process.env.OUTPUT_DIR));
  }
  const out = await call("export");
  const backup = JSON.parse(fs.readFileSync(out.file));
  eq(Object.keys(backup.tables), exportTables);
  eq(backup.tables.claims.length, await count("claims"));
  check(backup.tables.audit_events.length > 10);
  check(backup.tables.claims.some((r) => r.raw_source.Status === "Approved"));
  // HTML renderers use an isolated output directory, CLI subprocess confirms JSON and exit codes.
  await db.close();
  db = null;
  child(["scripts/view.mjs"]);
  child(["scripts/docs.mjs"]);
  const html = fs.readFileSync(
    path.join(process.env.OUTPUT_DIR, "views", "week.html"),
    "utf8",
  );
  check(html.includes("WC-1002"));
  check(!html.includes("<button"));
  const dirs = fs.readdirSync(path.join(process.env.OUTPUT_DIR, "docs-out"));
  eq(dirs.length, 4);
  for (const d of dirs)
    check(
      fs.readdirSync(path.join(process.env.OUTPUT_DIR, "docs-out", d)).length >
        0,
    );
  const json = JSON.parse(
    child(["scripts/warranty.mjs", "claims", "--json"]).stdout,
  );
  check(json.some((r) => r.number === "IMP-CLAIM-01"));
  const bad = child(["scripts/warranty.mjs", "claim", "pump", "--json"], 1);
  check(JSON.parse(bad.stderr).candidates.length > 1);
  const usage = child(["scripts/warranty.mjs", "help", "--json"]);
  check(JSON.parse(usage.stdout).commands.length > 25);
  console.log(
    `PASS: ${checks} checks. Migrations, idempotent seed, every CLI command, decision gates, import rollback, exports, branded documents and read-only views.`,
  );
} finally {
  await db?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
