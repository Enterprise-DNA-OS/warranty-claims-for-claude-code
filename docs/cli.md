# CLI reference

Run node scripts/warranty.mjs help for the command list. Every read supports --json. Human output is aligned text. Names match without case; an exact name, number, serial, code or source ID wins, then partial names and ID prefixes are considered. Ambiguous matches list candidates and exit 1. Errors do not change records.

Use DATA_DIR to select the local database. For demo records set DATA_DIR=.data/demo. In PowerShell use $env:DATA_DIR='.data/demo'. For a fresh real database use the default .data/db, npm run migrate, and no seed. DATABASE_URL selects a PostgreSQL connection. Local .env files are read without overwriting values already in the environment.

## Reads

claims, claim <record>, assets, asset <record>, parties, products, terms, coverage, triage, attention, compliance, returns-due, returns, recoveries, failure-patterns and dashboard. insights accepts no argument for all ten questions or an integer 1 to 10.

## Add records

add <type> --fields='<JSON object>' --actor='Operator'. Types and allowed fields are in scripts/lib/domain.mjs. On shells that alter JSON quotes, have the coding agent call the CLI using an argument array. Relationships accept exact IDs or unambiguous names. Unknown fields fail. Use whole nonnegative cents for fields ending _cents.

```bash
node scripts/warranty.mjs add party --fields='{"name":"Demo Customer","role":"customer","country":"NZ"}' --actor="Operator"
node scripts/warranty.mjs add claim --fields='{"number":"WC-2001","name":"Leaking seal","opened_on":"2026-10-16","failure_on":"2026-10-15","last_contact_on":"2026-10-16","owner":"Operator","currency":"NZD"}' --actor="Operator"
```

## Decisions and evidence

review <claim> --status=review --actor=... starts review from draft or submitted.
evidence <claim> --ref=... --actor=... records a document reference.
usage <item> --value=... --unit=hours --actor=... records observed usage before a decision.
adjudicate <claim> --decision=approved|rejected --amount=... --reason=... --rights-review=... --actor=... records the operator's decision. amount is decimal money in claim currency, never more than the claimed total; rejected claims use zero. Evidence, item records and any required consumer review must exist. This does not send an acceptance or rejection or pay a claim.
close <claim> --actor=... requires a recorded decision, completed evidence checks and receipt of requested parts.

## Returns and recoveries

receive <return> --date=YYYY-MM-DD --disposition=inspect|retain|released --actor=... records actual receipt.
recover <recovery> --amount=... --ref=... --actor=... records the total credit recovered so far. It is cumulative, not an increment. It cannot decrease or exceed the request. Nothing is paid or posted to accounting.

## Safety and contact

safety <claim> --awareness=YYYY-MM-DD --country=AU|NZ|OTHER --actor=... records awareness. Optional --reported=YYYY-MM-DD --ref=... records a report already lodged. No report is submitted by this command.
log <claim> --text=... --actor=... appends a note. Optional --contact=YYYY-MM-DD records actual contact and cannot move backwards or into the future.

## Files

weekly-review, draft-claim <claim> and draft-recovery <recovery> write Markdown to drafts/. export writes a complete JSON snapshot to exports/. OUTPUT_DIR changes the root for exports, drafts, views and documents, which tests use to keep files isolated. Export is a snapshot, not a restore command; test your database backup and restore procedure separately.

npm run view renders three read-only dashboards. npm run docs renders four types of draft paperwork. Both read views.json or documents.json and brand.json. The output stays local and ignored by git. The actor value is an operator label, not verified authentication.
