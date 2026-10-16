import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parseCsv, pick } from "./csv.mjs";
export const models = {
  party: {
    table: "parties",
    keys: ["source_id", "name", "role", "country"],
    required: ["name", "role", "country"],
  },
  product: {
    table: "products",
    keys: ["source_id", "code", "name", "supplier_id"],
    required: ["code", "name"],
    refs: { supplier_id: "party" },
  },
  asset: {
    table: "assets",
    keys: [
      "source_id",
      "name",
      "serial",
      "product_id",
      "customer_id",
      "dealer_id",
      "purchased_on",
      "consumer_scope",
    ],
    required: ["name", "serial", "product_id", "customer_id", "purchased_on"],
    refs: { product_id: "product", customer_id: "party", dealer_id: "party" },
  },
  term: {
    table: "terms",
    keys: [
      "source_id",
      "name",
      "duration_months",
      "usage_limit",
      "usage_unit",
      "description",
    ],
    required: ["name", "duration_months"],
  },
  warranty: {
    table: "asset_warranties",
    keys: ["source_id", "name", "asset_id", "term_id", "starts_on", "ends_on"],
    required: ["name", "asset_id", "term_id", "starts_on", "ends_on"],
    refs: { asset_id: "asset", term_id: "term" },
  },
  claim: {
    table: "claims",
    keys: [
      "source_id",
      "number",
      "name",
      "opened_on",
      "failure_on",
      "owner",
      "currency",
      "evidence_ref",
      "last_contact_on",
    ],
    required: [
      "number",
      "name",
      "opened_on",
      "failure_on",
      "owner",
      "currency",
      "last_contact_on",
    ],
  },
  item: {
    table: "claim_items",
    keys: [
      "source_id",
      "name",
      "claim_id",
      "asset_id",
      "failure_code",
      "description",
      "usage_value",
      "usage_unit",
      "parts_cents",
      "labour_cents",
      "other_cents",
    ],
    required: ["name", "claim_id", "asset_id", "failure_code", "description"],
    refs: { claim_id: "claim", asset_id: "asset" },
  },
  return: {
    table: "part_returns",
    keys: ["name", "item_id", "due_on", "tracking_ref"],
    required: ["name", "item_id", "due_on"],
    refs: { item_id: "item" },
  },
  recovery: {
    table: "recoveries",
    keys: ["name", "claim_id", "supplier_id", "requested_cents", "due_on"],
    required: ["name", "claim_id", "supplier_id", "requested_cents", "due_on"],
    refs: { claim_id: "claim", supplier_id: "party" },
  },
};
export const exportTables = [
  ...Object.values(models).map((m) => m.table),
  "notes",
  "audit_events",
  "settings",
];
export function validateDate(value, key) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ||
    !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw Error(`${key} must be a real YYYY-MM-DD date`);
  return value;
}
export function required(v, key) {
  if (v === undefined || v === null || String(v).trim() === "")
    throw Error(`Missing ${key}`);
  return v;
}
export function cents(value, key = "amount") {
  const s = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error(
      `${key} must be nonnegative decimal money with at most two places`,
    );
  const [a, b = ""] = s.split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 1e12) throw Error(`${key} too large`);
  return n;
}
export function validateFields(data) {
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (k.endsWith("_on")) validateDate(v, k);
    if (
      k.endsWith("_cents") &&
      (!/^\d+$/.test(String(v)) ||
        !Number.isSafeInteger(Number(v)) ||
        Number(v) > 1e12)
    )
      throw Error(`${k} requires whole nonnegative cents`);
    if (
      ["usage_value", "usage_limit"].includes(k) &&
      (!/^\d+(\.\d{1,2})?$/.test(String(v)) || Number(v) > 1e10)
    )
      throw Error(`${k} requires nonnegative numeric value`);
    if (k === "duration_months" && !/^[1-9]\d*$/.test(String(v)))
      throw Error("duration_months must be a positive integer");
  }
}
export async function resolve(db, kind, query) {
  const m = models[kind];
  if (!m) throw Error(`Unknown record type ${kind}`);
  required(query, "record");
  const q = String(query);
  const all = await db.query(`SELECT * FROM ${m.table} ORDER BY name,id`);
  let found = all.filter((r) =>
    [r.id, r.source_id, r.number, r.serial, r.code, r.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase() === q.toLowerCase()),
  );
  if (!found.length)
    found = all.filter(
      (r) =>
        String(r.id).startsWith(q.toLowerCase()) ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        [r.number, r.serial, r.code]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q.toLowerCase())),
    );
  if (found.length !== 1) {
    const e = Error(
      found.length ? "Ambiguous record; use an exact ID" : "Record not found",
    );
    e.candidates = found.map((r) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      serial: r.serial,
    }));
    throw e;
  }
  return found[0];
}
export async function audit(db, entity, before, after, action, actor) {
  await db.query(
    "INSERT INTO audit_events(entity,record_id,action,actor,before_record,after_record) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)",
    [
      entity,
      (after || before).id,
      action,
      required(actor, "actor"),
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ],
  );
}
export async function add(db, kind, fields, actor, raw = null) {
  const m = models[kind];
  if (!m) throw Error(`Unknown record type ${kind}`);
  for (const k of Object.keys(fields))
    if (!m.keys.includes(k))
      throw Error(`Unknown ${kind} field ${k}; expected ${m.keys.join(", ")}`);
  for (const k of m.required) required(fields[k], k);
  validateFields(fields);
  const data = { ...fields };
  for (const [k, ref] of Object.entries(m.refs || {}))
    if (data[k] != null) data[k] = (await resolve(db, ref, data[k])).id;
  if (kind === "product" && data.supplier_id) {
    const p = await resolve(db, "party", data.supplier_id);
    if (p.role !== "supplier") throw Error("supplier_id must name a supplier");
  }
  if (kind === "asset") {
    for (const [key, role] of [
      ["customer_id", "customer"],
      ["dealer_id", "dealer"],
    ])
      if (data[key] && (await resolve(db, "party", data[key])).role !== role)
        throw Error(`${key} must name a ${role}`);
  }
  if (
    kind === "item" &&
    (await resolve(db, "claim", data.claim_id)).status !== "submitted"
  )
    throw Error(
      "Add items only to submitted claims; use import for historical records",
    );
  if (
    kind === "recovery" &&
    (await resolve(db, "party", data.supplier_id)).role !== "supplier"
  )
    throw Error("Recovery counterparty must be a supplier");
  if (raw) data.raw_source = JSON.stringify(raw);
  const keys = Object.keys(data);
  const [row] = await db.query(
    `INSERT INTO ${m.table}(${keys.join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
    Object.values(data),
  );
  await audit(db, m.table, null, row, "add", actor);
  return row;
}
export async function transaction(db, fn, { dryRun = false } = {}) {
  await db.exec("BEGIN");
  try {
    const result = await fn();
    await db.exec(dryRun ? "ROLLBACK" : "COMMIT");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
export async function patch(db, kind, row, fields, actor, action) {
  validateFields(fields);
  const keys = Object.keys(fields);
  const [out] = await db.query(
    `UPDATE ${models[kind].table} SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")} WHERE id=$${keys.length + 1} RETURNING *`,
    [...Object.values(fields), row.id],
  );
  await audit(db, models[kind].table, row, out, action, actor);
  return out;
}

// Salesforce Details Only reports or object exports. Explicit field mapping is retained in raw_source.
// An unchanged source row is idempotent; a changed row is a reconciliation task, never a silent overwrite.
export const imports = [
  [
    "Account",
    "party",
    {
      source_id: ["Id", "Account ID"],
      name: ["Name", "Account Name"],
      role: ["Role"],
      country: ["BillingCountryCode", "Country"],
    },
  ],
  [
    "Product2",
    "product",
    {
      source_id: ["Id", "Product ID"],
      code: ["ProductCode", "Product Code"],
      name: ["Name", "Product Name"],
      supplier_id: ["Supplier ID"],
    },
  ],
  [
    "Asset",
    "asset",
    {
      source_id: ["Id", "Asset ID"],
      name: ["Name", "Asset Name"],
      serial: ["SerialNumber", "Serial Number"],
      product_id: ["Product2Id", "Product ID"],
      customer_id: ["AccountId", "Account ID"],
      dealer_id: ["Dealer ID"],
      purchased_on: ["PurchaseDate", "Purchase Date"],
      consumer_scope: ["Consumer Scope"],
    },
  ],
  [
    "WarrantyTerm",
    "term",
    {
      source_id: ["Id", "Warranty Term ID"],
      name: ["Name", "Warranty Term Name"],
      duration_months: ["WarrantyDuration", "Duration Months"],
      usage_limit: ["Usage Limit"],
      usage_unit: ["Usage Unit"],
      description: ["Description"],
    },
  ],
  [
    "AssetWarranty",
    "warranty",
    {
      source_id: ["Id", "Asset Warranty ID"],
      name: ["Name", "Asset Warranty Number"],
      asset_id: ["AssetId", "Asset ID"],
      term_id: ["WarrantyTermId", "Warranty Term ID"],
      starts_on: ["StartDate", "Start Date"],
      ends_on: ["EndDate", "End Date"],
    },
  ],
  [
    "Claim",
    "claim",
    {
      source_id: ["Id", "Claim ID"],
      number: ["ClaimNumber", "Claim Number"],
      name: ["Name", "Claim Name"],
      opened_on: ["CreatedDate", "Opened Date"],
      failure_on: ["Failure Date"],
      owner: ["Owner Name", "OwnerId"],
      currency: ["CurrencyIsoCode", "Currency"],
      evidence_ref: ["Evidence Reference"],
      last_contact_on: ["Last Contact Date"],
    },
  ],
  [
    "ClaimItem",
    "item",
    {
      source_id: ["Id", "Claim Item ID"],
      name: ["Name", "Claim Item Name"],
      claim_id: ["ClaimId", "Claim ID"],
      asset_id: ["AssetId", "Asset ID"],
      failure_code: ["Failure Code"],
      description: ["Description"],
      usage_value: ["AssetUsageValue", "Usage Value"],
      usage_unit: ["AssetUsageUnitOfMeasure", "Usage Unit"],
      parts_cents: ["Parts Amount"],
      labour_cents: ["Labour Amount"],
      other_cents: ["Other Amount"],
    },
  ],
];
export async function importSalesforce(
  db,
  dir,
  actor,
  { dryRun = false } = {},
) {
  const totals = { created: 0, unchanged: 0, files: [], dry_run: dryRun };
  await transaction(
    db,
    async () => {
      const seen = new Set();
      for (const [file, kind, mapping] of imports) {
        const f = path.join(dir, file + ".csv");
        if (!existsSync(f)) continue;
        const rows = parseCsv(readFileSync(f, "utf8"));
        totals.files.push({ file: file + ".csv", rows: rows.length });
        for (const [index, raw] of rows.entries()) {
          try {
            const data = {};
            for (const [key, names] of Object.entries(mapping)) {
              let value = pick(raw, ...names).trim();
              if (value === "") continue;
              if (key.endsWith("_cents")) value = cents(value, key);
              if (key === "opened_on" && /^\d{4}-\d{2}-\d{2}T/.test(value))
                value = value.slice(0, 10);
              data[key] = value;
            }
            required(data.source_id, "source ID");
            const identity = kind + ":" + data.source_id;
            if (seen.has(identity))
              throw Error("Duplicate source ID in import");
            seen.add(identity);
            if (kind === "party") {
              data.role = data.role?.toLowerCase() || "customer";
              data.country =
                { Australia: "AU", "New Zealand": "NZ" }[data.country] ||
                data.country ||
                "OTHER";
            }
            if (kind === "claim") {
              required(data.failure_on, "Failure Date");
              required(data.currency, "Currency");
              data.last_contact_on ||= data.opened_on;
              data.owner ||= "Unassigned";
            }
            if (kind === "item") {
              data.failure_code ||= "UNCLASSIFIED";
              data.description ||= "Imported claim item";
            }
            if (kind === "term") {
              const unit = pick(raw, "WarrantyDurationUnit", "Duration Unit");
              if (unit && !/^months?$/i.test(unit))
                throw Error(
                  "Only month-based duration is supported; map the term before importing",
                );
            }
            const [existing] = await db.query(
              `SELECT * FROM ${models[kind].table} WHERE source_id=$1`,
              [data.source_id],
            );
            if (existing) {
              const canonical = (o) =>
                JSON.stringify(
                  Object.entries(o).sort(([a], [b]) => a.localeCompare(b)),
                );
              if (canonical(existing.raw_source) !== canonical(raw))
                throw Error(
                  "Changed source row requires reconciliation; existing record was preserved",
                );
              totals.unchanged++;
              continue;
            }
            // Imported claims start submitted. Preserve vendor Status in raw_source and map decisions after reviewing evidence.
            await add(db, kind, data, actor, raw);
            totals.created++;
          } catch (e) {
            throw Error(`${file}.csv row ${index + 2}: ${e.message}`);
          }
        }
      }
      if (!totals.files.length) throw Error("No supported CSV files found");
    },
    { dryRun },
  );
  return totals;
}
