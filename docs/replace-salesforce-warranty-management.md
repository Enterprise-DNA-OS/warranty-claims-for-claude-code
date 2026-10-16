# Move warranty records from Salesforce

The supported path is a folder of comma-delimited UTF-8 CSV reports, imported in one command. This is a defined report mapping, not a promise to import every Salesforce organisation unchanged.

Sources checked 16 October 2026:

- [Salesforce: Export a Report](https://help.salesforce.com/s/articleView?id=sf.reports_export.htm&language=en_US): select Details Only and CSV, with Export Reports permission. Column labels and separators follow report configuration and locale.
- [Warranty Management data model](https://developer.salesforce.com/docs/platform/data-models/guide/field-service-warranty-management.html): assets, asset warranties, products and warranty terms.
- [Manual warranty claim adjudication](https://help.salesforce.com/s/articleView?id=ind.mfg_warranties_adjudicate_manual.htm&language=en_US&type=5): claim status, amounts, items, asset usage and coverage context.
- [Warranty administration](https://trailhead.salesforce.com/content/learn/modules/warranty-administration-and-claims-management-in-manufacturing-cloud/administer-warranty-terms): terms and coverage have conditions beyond dates.

## Export and map

Have the Salesforce administrator produce detail reports for the supported records. Include stable record IDs and relationship IDs. Save each report under the filename below. API labels and the friendly labels listed in scripts/lib/domain.mjs are accepted case-insensitively. Some columns are enrichment fields, not universal Salesforce fields: Role, Supplier ID, Dealer ID, Consumer Scope, Failure Date, Owner Name, Evidence Reference, Last Contact Date, Failure Code and the three cost columns must be mapped from your configured records. Do not guess them.

| File | Required fields | Links and interpretation |
|---|---|---|
| Account.csv | Id, Name | Role is customer, dealer or supplier, default customer; BillingCountryCode is NZ, AU or OTHER, default OTHER. These defaults need review. |
| Product2.csv | Id, ProductCode, Name | Optional Supplier ID references Account.csv. |
| Asset.csv | Id, Name, SerialNumber, Product2Id, AccountId, PurchaseDate | Optional Dealer ID. Consumer Scope defaults unknown. PurchaseDate is YYYY-MM-DD. |
| WarrantyTerm.csv | Id, Name, WarrantyDuration | Duration is months; a supplied Duration Unit must be month or months. Optional Usage Limit requires Usage Unit. |
| AssetWarranty.csv | Id, Name, AssetId, WarrantyTermId, StartDate, EndDate | The dates are the actual agreed window; no inferred expiry. |
| Claim.csv | Id, ClaimNumber, Name, CreatedDate, Failure Date, CurrencyIsoCode | Currency must be NZD, AUD or USD. Owner Name or OwnerId is retained; absent owner becomes Unassigned. Last Contact Date defaults to opening date as an import baseline, not evidence of a conversation. |
| ClaimItem.csv | Id, Name, ClaimId, AssetId | Parts Amount, Labour Amount and Other Amount are decimal money in the claim currency. Missing amounts are zero. Failure Code defaults UNCLASSIFIED, so map it for meaningful analysis. |

Rows link through original IDs. Files are processed in the order above. Each supported record preserves the entire original CSV row in raw_source, including vendor status and unmapped columns. Files may be omitted when referenced records already exist. Unknown references, duplicate source IDs, invalid dates or malformed amounts roll back the entire import.

A claim's imported vendor status does not confer a decision. Imported claims enter submitted, with Status retained in raw_source. Review evidence and record the actual historical decision with its correct facts through an agreed migration, or make a current decision through adjudicate. Never present an imported approval as a new decision made by the operator today.

The examples/salesforce folder contains fictional mapped reports to demonstrate this contract. It is not a vendor-certified native export fixture. Inspect a real export and map its configured columns before switching.

## Import in a day

Create a fresh local database and migrate it. Keep real exports in imports/ (ignored by git). Run:

```bash
npm run migrate
node scripts/warranty.mjs import salesforce --dir=imports/salesforce --dry-run --actor="Operator"
node scripts/warranty.mjs import salesforce --dir=imports/salesforce --actor="Operator"
node scripts/warranty.mjs compliance
node scripts/warranty.mjs dashboard
```

One import processes the supported files together. Dry run runs the same validation inside a rolled-back transaction. Repeating an unchanged file skips its rows. A changed source row stops the import and names the row to reconcile, protecting local decisions and history.

Compare record counts, serial numbers, claim links and totals by currency with the source reports. Keep a copy of the original export. Test a repeat import and one known claim before retiring access to Salesforce. A business with custom records or missing export fields needs mapping work before the switch.

## Scope of the free import

Claims, cost items, assets, parties, products and recorded warranty windows are supported. Attachments, Salesforce automation, field history, portals, coverage exclusions, claim-coverage payment details, return history and supplier-recovery history are not imported automatically. Add returns and recoveries with their supported commands, or have Enterprise DNA map that history and build the required connections. Local evidence references do not download or copy attachments. There is no payment or email action.
