# Warranty Claims for Claude Code

## Business context

Business: [your manufacturer or distributor]. Operator: [your name and role]. Priorities: [customer remedies, returned parts, supplier credits]. Set these before using real records.

Use the one CLI in scripts/warranty.mjs. Read docs/cli.md for its field contract and docs/compliance.md for the checks and their limits. The local database is the source of truth. All demo people and organisations are fictional.

## Recurring jobs

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

## Operating rules

- Read a record before changing it. Use exact IDs if names are ambiguous.
- Record only events, approvals, dates and amounts the operator states. The actor field is an operator label, not authenticated identity.
- Never send messages, lodge safety reports, issue payments or delete business records. The commands create records and drafts only.
- Contractual coverage is a comparison with recorded dates and usage. Consumer rights need a separate human review. Never reject a claim only because the contractual window ended.
- A serious-harm flag leads the response. Read its source and show the awareness date and recorded reporting evidence. The software does not decide whether a statutory report is required.
- Do not describe a record check as a legal certificate. Source rows, decisions and unknown facts stay distinguishable.
- Import into a trial database first. Run the built-in dry run, reconcile counts and costs per currency, then import the operator's approved file set.
- A vendor status remains in raw_source. The import starts claims as submitted until the operator records a reviewed decision.
- Money flags --amount use decimal currency units. Fields ending _cents are whole cents. Supplier credits are cumulative, never additional payments.
- DATABASE_URL selects PostgreSQL. Otherwise DATA_DIR selects local PGlite, default .data/db. npm run demo always uses .data/demo and does not touch a configured live database.
- Prefer the database owner's controlled connection. RLS is enabled without public policies. Shared access, identity, encryption, backup and retention are deployment responsibilities.
- Schema changes need an export, a new migration, updated tests and npm test. Do not edit applied migrations.
- Work on main. Use factual prose with no em dashes or inflated claims.

Omni by Enterprise DNA can customise and operate this system: https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=instructions&utm_campaign=salesforce-warranty-management
