---
description: "Bring supported Salesforce reports across in one transaction, after a trial run."
---

# import

Bring supported Salesforce reports across in one transaction, after a trial run.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs import salesforce --dir="<export folder>" --dry-run --actor="<operator>" --json
```

Read docs/replace-salesforce-warranty-management.md. Show the trial counts and mapping problems. After the operator has asked to import and the trial is clean, repeat without --dry-run. Preserve source files. Changed source rows require reconciliation, not overwriting. Imported decisions are source history until the operator reviews and records them.
