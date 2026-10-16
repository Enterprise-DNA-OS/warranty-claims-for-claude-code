# Warranty Claims for Claude Code

Warranty claims, serial numbers, returned parts and supplier credits in a database you own. Free MIT code from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code. Clone, install and run the demo. Hosting and coding-agent costs are yours. | Your records, rules, Salesforce history, screens and connections. [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-warranty-management). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-warranty-management). |

## What this covers

A manufacturer's or distributor's warranty desk: log a claim against a serial number, check recorded warranty dates and usage, review evidence, record an operator decision, chase returned parts and reconcile supplier credits. This is a focused claims system, not the whole Salesforce platform.

Salesforce lists Manufacturing Cloud Service Core at US$275 per user per month, billed annually. Ten users illustrate US$33,000 a year before implementation. That is a list-price calculation, not a verified customer invoice or a standalone warranty-module quote. [Salesforce pricing](https://www.salesforce.com/manufacturing/cloud/pricing/), checked 16 October 2026. Confirm the edition and warranty entitlements in your actual quote.

## Quick start

Node 20 or newer. No database server needed for the local demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/warranty-claims-for-claude-code.git
cd warranty-claims-for-claude-code
npm install
npm test
npm run demo
```

The demo deliberately contains late contact, an overdue returned part, missing usage evidence, a partial supplier credit and a safety review. All names and data are fictional. The demo uses .data/demo even when DATABASE_URL is configured, keeping it separate from real records.

For another demo query on Linux or macOS:

```bash
DATA_DIR=.data/demo node scripts/warranty.mjs coverage
DATA_DIR=.data/demo npm run view
DATA_DIR=.data/demo npm run docs
```

On PowerShell, set `$env:DATA_DIR='.data/demo'` first, then run the same commands without the DATA_DIR prefix. For real work choose a fresh DATA_DIR, run npm run migrate and import your records without seeding. For a controlled PostgreSQL connection, set DATABASE_URL in a local .env file. See docs/cli.md.

## The commands

| Command | Result |
|---|---|
| `/claims` | List warranty claims with status, owner, age and costs. |
| `/claim` | Read a claim, linked assets, returns, supplier recoveries and its notes. |
| `/assets` | List serialised products and the customer who owns each one. |
| `/asset` | Read one serial number, its warranties and claim history. |
| `/parties` | List customers, dealers and suppliers. |
| `/products` | List product codes and their suppliers. |
| `/terms` | Read contractual warranty periods and recorded usage limits. |
| `/coverage` | Check claim failure dates and usage against the recorded contractual limits. |
| `/triage` | Review unresolved claims by age, evidence and claimed amount. |
| `/attention` | Find late contact, missing evidence, overdue parts and supplier balances. |
| `/compliance` | Check consumer review, Australian safety reporting evidence and decision records. |
| `/returns-due` | Find parts still waiting to arrive, oldest due first. |
| `/returns` | Read all returned-part records and their disposition. |
| `/recoveries` | Read supplier requests, cumulative credits and outstanding balances. |
| `/failure-patterns` | Group claim costs and affected assets by product, fault and currency. |
| `/dashboard` | Summarise claims and costs by stage and currency. |
| `/insights` | Answer ten questions across claims, serial numbers, suppliers and reviews. |
| `/add` | Create a customer, product, asset, term, warranty, claim, item, return or recovery. |
| `/review` | Move a submitted claim into the review queue. |
| `/evidence` | Record the reference to a claim inspection or supporting document. |
| `/adjudicate` | Record the operator's explicit claim decision with the reason and evidence. |
| `/close` | Close a decided claim once outstanding part returns and required checks are resolved. |
| `/receive` | Record a returned part as received and set its inspection disposition. |
| `/recover` | Record cumulative supplier credit against a recovery request. |
| `/usage` | Record the observed usage and unit for a claim item. |
| `/safety` | Record serious-harm awareness and the evidence of a report already submitted. |
| `/log` | Add an operator note and, when stated, the date of actual customer contact. |
| `/weekly-review` | Draft the Monday review from attention, dashboard and compliance results. |
| `/draft-claim` | Draft a claim assessment for operator review, without sending. |
| `/draft-recovery` | Draft a supplier recovery follow-up from the recorded balance. |
| `/import` | Bring supported Salesforce reports across in one transaction, after a trial run. |
| `/export` | Export every domain record, source row, note and audit event as JSON. |
| `/view` | Render the week, supplier recovery and record-check dashboards. |
| `/documents` | Render draft claim assessments, part authorisations, recovery requests and safety records. |
| `/customise` | Change a field, rule or workflow in plain language. |
| `/new-view` | Add a read-only view that answers the operator's own question. |

## Ten questions across your records

Every question runs today with `node scripts/warranty.mjs insights`. These combine the records and checks in this build. They are not a claim that a configured Salesforce report can never answer the same question.

1. Which open claims need both a consumer-rights review and a returned part?
2. Which product and fault combinations account for the largest claimed cost?
3. Which serial numbers have repeat claims?
4. How much approved cost remains after supplier recoveries, by currency?
5. Which owners have the oldest unresolved claims?
6. Which supplier balances are late despite a partial credit?
7. Which claims have no evidence reference and no recent contact?
8. Which contractual checks cannot finish because usage evidence is missing?
9. Which dealers supplied assets with repeat failure codes?
10. Which Australian serious-harm records still need reporting evidence?

## Record checks, documents and views

Contractual coverage compares the failure date and observed usage with recorded warranties. It never decides legal entitlement. Consumer review and Australian safety-report evidence checks cite primary sources in [docs/compliance.md](docs/compliance.md). All decisions remain the operator's. No email, regulator report or payment is sent.

`npm run docs` creates branded draft claim assessments, return authorisations, supplier recovery requests and safety review records. `npm run view` creates the week, supplier recovery and compliance dashboards. Set the business name, logo and colours in brand.json. The output is read-only HTML with no server or action buttons.

## Your first hour: ten things to ask for

1. Show me the claims nobody has contacted this week.
2. Show me the full record for WC-1001.
3. Which serial numbers have failed more than once?
4. Which claims need a consumer-rights review?
5. Which parts are overdue back from the dealer?
6. How much supplier credit remains outstanding?
7. Draft the Monday review from the current records.
8. Draft a recovery request for REC-101.
9. Import my mapped Salesforce reports after a trial run.
10. Add our inspection engineer field and a view of claims waiting on that engineer.

## Instead of Salesforce Warranty Lifecycle Management

Export supported detail reports with their stable relationship IDs. Put the mapped CSV files in one folder. A single import validates all supported files together and either commits them all or rolls them all back. Original rows are retained. Repeating unchanged source rows is safe; changed source rows stop for reconciliation. Read [the switching guide](docs/replace-salesforce-warranty-management.md) for exact columns, enrichment fields and limits.

```bash
node scripts/warranty.mjs import salesforce --dir=imports/salesforce --dry-run --actor="Operator"
node scripts/warranty.mjs import salesforce --dir=imports/salesforce --actor="Operator"
```

Historical vendor approvals stay in the original source row until reviewed; they do not create new local decisions. Attachments, portals, automation, detailed contract exclusions and legacy payment records need a separate mapping and build. Enterprise DNA can scope those for your version.

## How it is built

Plain PostgreSQL migrations, the same queries on embedded PGlite, one CLI and one command library. Every domain record has an ID and timestamps. The audit log keeps the before and after state of CLI mutations. Source imports retain raw rows. RLS blocks public access by default; the local database owner has access. This is not an authenticated multi-user service or an immutable audit product. Shared production use needs deployment controls, backups and a tested restoration procedure.

No mobile capture, offline sync or customer portal is included. [Why no front end](docs/why-no-front-end.md) explains the operating shape. Change fields through /customise and add read-only views through /new-view. Use new migrations rather than rewriting history.

## Validation

`npm test` uses an isolated temporary database and output directory. It exercises every CLI command, rollback on failed imports, date and amount validation, repeat imports, consumer review gates, safety evidence, full exports and HTML rendering. CI runs Node 20 and 22 on Linux and Windows.

## Built and run for you

Omni by Enterprise DNA can bring your Salesforce records across, customise the rules and operate your version. One setup fee, then a monthly retainer. [Book Sam's 30-minute call](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-warranty-management).

## Licence

MIT. Copyright (c) 2026 Enterprise DNA. Salesforce is a trademark of Salesforce, Inc. This independent project is not affiliated with or endorsed by Salesforce.
