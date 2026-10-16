#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { table, price } from "./lib/format.mjs";
import {
  models,
  exportTables,
  resolve,
  required,
  validateDate,
  transaction,
  add,
  patch,
  audit,
  importSalesforce,
  cents,
} from "./lib/domain.mjs";
import { insights } from "./lib/insights.mjs";
export const reads = {
  claims: "SELECT * FROM v_claims ORDER BY opened_on,number",
  assets:
    "SELECT a.id,a.name,a.serial,p.code AS product,c.name AS customer,a.purchased_on,a.consumer_scope FROM assets a JOIN products p ON p.id=a.product_id JOIN parties c ON c.id=a.customer_id ORDER BY a.serial",
  parties: "SELECT id,name,role,country FROM parties ORDER BY role,name",
  products:
    "SELECT p.id,p.code,p.name,s.name AS supplier FROM products p LEFT JOIN parties s ON s.id=p.supplier_id ORDER BY p.code",
  terms:
    "SELECT id,name,duration_months,usage_limit,usage_unit,description FROM terms ORDER BY name",
  coverage: "SELECT * FROM v_coverage ORDER BY number,serial",
  triage:
    "SELECT number,status,owner,currency,claimed_cents,age_days,evidence_ref FROM v_claims WHERE status IN ('draft','submitted','review') ORDER BY age_days DESC,number",
  attention:
    "SELECT number,reason,detail,owner FROM v_attention ORDER BY number,reason,detail",
  compliance:
    "SELECT number,rule,finding,source FROM v_compliance ORDER BY number,rule",
  "returns-due":
    "SELECT * FROM v_returns WHERE received_on IS NULL ORDER BY due_on,name",
  returns: "SELECT * FROM v_returns ORDER BY due_on,name",
  recoveries: "SELECT * FROM v_recoveries ORDER BY due_on,name",
  "failure-patterns":
    "SELECT * FROM v_failures ORDER BY currency,claimed_cents DESC,product",
  dashboard: `SELECT status,currency,count(*) AS claims,sum(claimed_cents)::bigint AS claimed_cents,sum(approved_cents)::bigint AS approved_cents FROM v_claims GROUP BY status,currency ORDER BY currency,status`,
};
export function parse(args) {
  const positional = [],
    flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const equal = a.indexOf("=");
    const key = a.slice(2, equal < 0 ? undefined : equal);
    if (Object.hasOwn(flags, key)) throw Error(`Duplicate flag --${key}`);
    if (equal >= 0) flags[key] = a.slice(equal + 1);
    else if (["json", "dry-run"].includes(key)) flags[key] = true;
    else if (args[i + 1] && !args[i + 1].startsWith("--"))
      flags[key] = args[++i];
    else throw Error(`Missing value for --${key}`);
  }
  return { positional, flags };
}
function textRows(rows) {
  if (!rows.length) return "(none)";
  return table(
    rows,
    Object.keys(rows[0]).map((key) => ({
      key,
      label: key.replace(/_cents$/, "").replaceAll("_", " "),
      format: key.endsWith("_cents")
        ? (v, r) => (v == null ? "" : price(v, r.currency || "NZD"))
        : (v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v),
    })),
  );
}
function allow(flags, names) {
  for (const key of Object.keys(flags))
    if (!["json", ...names].includes(key)) throw Error(`Unknown flag --${key}`);
}
function localFile(file, defaultDir) {
  const base = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, defaultDir);
  fs.mkdirSync(base, { recursive: true });
  const name = path.basename(file || `${Date.now()}.json`);
  return path.join(base, name);
}
export async function run(db, args) {
  const {
    positional: [command = "help", arg, ...extra],
    flags: f,
  } = parse(args);
  if (extra.length) throw Error("Too many positional arguments");
  if (command === "help") {
    allow(f, []);
    return {
      commands: [
        ...Object.keys(reads),
        "claim <name>",
        "asset <name>",
        "insights [1..10]",
        "add <type> --fields=<JSON> --actor=<name>",
        "review <claim> --status=review --actor=<name>",
        "evidence <claim> --ref=<reference> --actor=<name>",
        "adjudicate <claim> --decision=approved|rejected --reason=... --rights-review=... --amount=... --actor=...",
        "close <claim> --actor=...",
        "receive <return> --date=YYYY-MM-DD --disposition=inspect|retain|released --actor=...",
        "recover <recovery> --amount=... --ref=... --actor=...",
        "usage <item> --value=... --unit=... --actor=...",
        "safety <claim> --awareness=YYYY-MM-DD --country=AU --actor=... [--reported=YYYY-MM-DD --ref=...]",
        "log <claim> --text=... --actor=... [--contact=YYYY-MM-DD]",
        "weekly-review",
        "draft-claim <claim>",
        "draft-recovery <recovery>",
        "import salesforce --dir=... [--dry-run] --actor=...",
        "export",
      ],
      record_types: Object.keys(models),
    };
  }
  if (reads[command]) {
    allow(f, []);
    if (arg) throw Error("Use a detail command for one record");
    return db.query(reads[command]);
  }
  if (command === "claim" || command === "asset") {
    allow(f, []);
    const row = await resolve(db, command, arg);
    return command === "claim"
      ? {
          claim: row,
          items: await db.query(
            "SELECT * FROM v_coverage WHERE claim_id=$1 ORDER BY serial",
            [row.id],
          ),
          returns: await db.query(
            "SELECT * FROM v_returns WHERE number=$1 ORDER BY name",
            [row.number],
          ),
          recoveries: await db.query(
            "SELECT * FROM v_recoveries WHERE number=$1 ORDER BY name",
            [row.number],
          ),
          notes: await db.query(
            "SELECT name,body,created_at FROM notes WHERE claim_id=$1 ORDER BY created_at,id",
            [row.id],
          ),
          audit: await db.query(
            "SELECT action,actor,created_at FROM audit_events WHERE record_id=$1 ORDER BY created_at,id",
            [row.id],
          ),
        }
      : {
          asset: row,
          warranties: await db.query(
            "SELECT w.*,t.name AS term FROM asset_warranties w JOIN terms t ON t.id=w.term_id WHERE asset_id=$1",
            [row.id],
          ),
          claims: await db.query(
            "SELECT c.number,c.status,i.failure_code FROM claim_items i JOIN claims c ON c.id=i.claim_id WHERE i.asset_id=$1 ORDER BY c.number",
            [row.id],
          ),
        };
  }
  if (command === "insights") {
    allow(f, []);
    if (arg && (!/^\d+$/.test(arg) || Number(arg) < 1 || Number(arg) > 10))
      throw Error("Insight must be 1 to 10");
    const out = [];
    for (const [i, [question, sql]] of insights.entries())
      if (!arg || Number(arg) === i + 1)
        out.push({ number: i + 1, question, rows: await db.query(sql) });
    return out;
  }
  if (command === "import") {
    allow(f, ["dir", "actor", "dry-run"]);
    if (arg !== "salesforce") throw Error("Import source must be salesforce");
    return importSalesforce(
      db,
      path.resolve(required(f.dir, "dir")),
      required(f.actor, "actor"),
      { dryRun: !!f["dry-run"] },
    );
  }
  if (command === "export") {
    allow(f, []);
    const backup = {
      format: 1,
      exported_at: new Date().toISOString(),
      tables: {},
    };
    await transaction(db, async () => {
      await db.exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      for (const t of exportTables)
        backup.tables[t] = await db.query(`SELECT * FROM ${t} ORDER BY id`);
    });
    const file = localFile(`warranty-${Date.now()}.json`, "exports");
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    return {
      file,
      counts: Object.fromEntries(
        Object.entries(backup.tables).map(([k, v]) => [k, v.length]),
      ),
    };
  }
  if (["weekly-review", "draft-claim", "draft-recovery"].includes(command)) {
    allow(f, []);
    let sections = [];
    let name = command;
    if (command === "weekly-review") {
      for (const cmd of ["attention", "dashboard", "compliance"])
        sections.push([cmd, await db.query(reads[cmd])]);
    } else if (command === "draft-claim") {
      const c = await resolve(db, "claim", arg);
      name += "-" + c.number;
      sections = [
        [
          "Claim record",
          await db.query(
            "SELECT number,status,owner,currency,claimed_cents,approved_cents,decision_reason FROM v_claims WHERE id=$1",
            [c.id],
          ),
        ],
        [
          "Coverage checks",
          await db.query(
            "SELECT serial,contractual_check FROM v_coverage WHERE claim_id=$1",
            [c.id],
          ),
        ],
      ];
    } else {
      const r = await resolve(db, "recovery", arg);
      name += "-" + r.name;
      sections = [
        [
          "Supplier recovery",
          await db.query("SELECT * FROM v_recoveries WHERE id=$1", [r.id]),
        ],
      ];
    }
    const file = localFile(
      name.replace(/[^a-zA-Z0-9_-]/g, "-") + "-" + Date.now() + ".md",
      "drafts",
    );
    const content =
      "# DRAFT: " +
      command +
      "\n\nFor operator review. Nothing sent.\n\n" +
      sections
        .map(
          ([title, rows]) =>
            "## " + title + "\n\n```text\n" + textRows(rows) + "\n```",
        )
        .join("\n\n");
    fs.writeFileSync(file, content + "\n");
    return { file, sections: sections.length };
  }
  return transaction(db, async () => {
    const actor = required(f.actor, "actor");
    if (command === "add") {
      allow(f, ["fields", "actor"]);
      const fields = JSON.parse(required(f.fields, "fields"));
      if (!fields || Array.isArray(fields) || typeof fields !== "object")
        throw Error("fields must be a JSON object");
      return add(db, arg, fields, actor);
    }
    if (command === "receive") {
      allow(f, ["date", "disposition", "actor"]);
      const r = await resolve(db, "return", arg);
      if (r.received_on) throw Error("Return already received");
      const day = validateDate(required(f.date, "date"), "date");
      if (day > new Date().toISOString().slice(0, 10))
        throw Error("Receipt cannot be in the future");
      if (!["inspect", "retain", "released"].includes(f.disposition))
        throw Error("Disposition must be inspect, retain or released");
      return patch(
        db,
        "return",
        r,
        { received_on: day, disposition: f.disposition },
        actor,
        "receive",
      );
    }
    if (command === "recover") {
      allow(f, ["amount", "ref", "actor"]);
      const r = await resolve(db, "recovery", arg);
      const total = cents(required(f.amount, "amount"));
      if (total < Number(r.recovered_cents))
        throw Error("Cumulative recovered amount cannot decrease");
      return patch(
        db,
        "recovery",
        r,
        { recovered_cents: total, credit_ref: required(f.ref, "ref") },
        actor,
        "record cumulative supplier credit",
      );
    }
    if (command === "usage") {
      allow(f, ["value", "unit", "actor"]);
      const i = await resolve(db, "item", arg);
      const c = await resolve(db, "claim", i.claim_id);
      if (["approved", "rejected", "closed"].includes(c.status))
        throw Error("Cannot change usage after a decision");
      return patch(
        db,
        "item",
        i,
        {
          usage_value: required(f.value, "value"),
          usage_unit: required(f.unit, "unit"),
        },
        actor,
        "record usage evidence",
      );
    }
    const c = await resolve(db, "claim", arg);
    const today = new Date().toISOString().slice(0, 10);
    if (command === "review") {
      allow(f, ["status", "actor"]);
      if (f.status !== "review" || !["submitted", "draft"].includes(c.status))
        throw Error("Only draft or submitted claims may enter review");
      return patch(db, "claim", c, { status: "review" }, actor, "start review");
    }
    if (command === "evidence") {
      allow(f, ["ref", "actor"]);
      return patch(
        db,
        "claim",
        c,
        { evidence_ref: required(f.ref, "ref") },
        actor,
        "record evidence",
      );
    }
    if (command === "log") {
      allow(f, ["text", "contact", "actor"]);
      if (f.contact) {
        validateDate(f.contact, "contact");
        if (f.contact < c.last_contact_on || f.contact > today)
          throw Error(
            "Contact date must not move backwards or into the future",
          );
        await patch(
          db,
          "claim",
          c,
          { last_contact_on: f.contact },
          actor,
          "record contact",
        );
      }
      const [n] = await db.query(
        "INSERT INTO notes(claim_id,name,body) VALUES($1,$2,$3) RETURNING *",
        [c.id, actor, required(f.text, "text")],
      );
      await audit(db, "notes", null, n, "log", actor);
      return n;
    }
    if (command === "safety") {
      allow(f, ["awareness", "country", "reported", "ref", "actor"]);
      const day = validateDate(required(f.awareness, "awareness"), "awareness");
      if (day > today) throw Error("Awareness date cannot be in the future");
      if (c.injury_awareness_on && day > c.injury_awareness_on)
        throw Error("Cannot move recorded awareness later");
      if (c.safety_country && f.country !== c.safety_country)
        throw Error(
          "Cannot change safety jurisdiction on an existing incident",
        );
      const fields = {
        injury_awareness_on: day,
        safety_country: required(f.country, "country"),
      };
      if (f.reported) {
        validateDate(f.reported, "reported");
        if (f.reported > today)
          throw Error("Report date cannot be in the future");
        fields.safety_reported_on = f.reported;
        fields.safety_report_ref = required(f.ref, "ref");
      } else if (f.ref) throw Error("A report reference needs --reported");
      return patch(db, "claim", c, fields, actor, "record safety evidence");
    }
    if (command === "adjudicate") {
      allow(f, ["decision", "reason", "rights-review", "amount", "actor"]);
      if (!["submitted", "review"].includes(c.status))
        throw Error("Only submitted or review claims may be decided");
      if (!["approved", "rejected"].includes(f.decision))
        throw Error("Decision must be approved or rejected");
      required(c.evidence_ref, "claim evidence reference");
      const coverage = await db.query(
        "SELECT * FROM v_coverage WHERE claim_id=$1",
        [c.id],
      );
      if (!coverage.length) throw Error("Claim needs at least one item");
      if (coverage.some((r) => r.contractual_check === "usage evidence needed"))
        throw Error("Record usage evidence before a decision");
      const needsRights = coverage.some(
        (r) =>
          ["NZ", "AU"].includes(r.country) &&
          r.consumer_scope !== "business" &&
          r.contractual_check !== "within recorded limits",
      );
      if (needsRights)
        required(
          f["rights-review"] || c.rights_review,
          "consumer rights review",
        );
      const [v] = await db.query("SELECT * FROM v_claims WHERE id=$1", [c.id]);
      const amount = cents(required(f.amount, "amount"));
      if (amount > Number(v.claimed_cents))
        throw Error("Approved amount exceeds claimed cost");
      if (f.decision === "rejected" && amount !== 0)
        throw Error("Rejected claim amount must be zero");
      return patch(
        db,
        "claim",
        c,
        {
          status: f.decision,
          decision_reason: required(f.reason, "reason"),
          reviewer: actor,
          rights_review: f["rights-review"] || c.rights_review,
          approved_cents: amount,
          decided_on: today,
        },
        actor,
        "operator decision",
      );
    }
    if (command === "close") {
      allow(f, ["actor"]);
      if (!["approved", "rejected"].includes(c.status))
        throw Error("Decide the claim before closing");
      const gaps = await db.query(
        "SELECT * FROM v_compliance WHERE claim_id=$1",
        [c.id],
      );
      const pending = await db.query(
        "SELECT * FROM v_returns WHERE number=$1 AND received_on IS NULL",
        [c.number],
      );
      if (gaps.some((r) => r.rule !== "AU-SAFETY-LATE") || pending.length)
        throw Error(
          "Unresolved record checks or missing returned parts prevent closure",
        );
      return patch(db, "claim", c, { status: "closed" }, actor, "close claim");
    }
    throw Error(`Unknown command ${command}`);
  });
}
function human(result) {
  if (Array.isArray(result)) {
    if (result[0]?.question)
      return result
        .map(
          (r) => "\n" + r.number + ". " + r.question + "\n" + textRows(r.rows),
        )
        .join("\n");
    return textRows(result);
  }
  if (result && typeof result === "object") {
    return Object.entries(result)
      .map(([k, v]) =>
        Array.isArray(v)
          ? "\n" +
            k +
            "\n" +
            (typeof v[0] === "object" ? textRows(v) : v.join("\n"))
          : v && typeof v === "object"
            ? "\n" + k + "\n" + textRows([v])
            : k + ": " + (v ?? ""),
      )
      .join("\n");
  }
  return String(result);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  let db;
  try {
    db = await getDb();
    const result = await run(db, process.argv.slice(2));
    console.log(
      process.argv.includes("--json")
        ? JSON.stringify(result, null, 2)
        : human(result),
    );
  } catch (e) {
    if (process.argv.includes("--json"))
      console.error(
        JSON.stringify({ error: e.message, candidates: e.candidates || [] }),
      );
    else {
      console.error(e.message);
      if (e.candidates) console.error(textRows(e.candidates));
    }
    process.exitCode = 1;
  } finally {
    await db?.close();
  }
}
