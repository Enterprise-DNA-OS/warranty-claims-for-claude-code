---
description: "Record a returned part as received and set its inspection disposition."
---

# receive

Record a returned part as received and set its inspection disposition.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs receive "<return>" --date=YYYY-MM-DD --disposition=inspect --actor="<operator>" --json
```

Read the full linked claim before writing. Record only the decision, event, date, amount and reference that the operator actually stated. A claim decision or recovery record never moves money. Safety records never submit reports. Show unresolved checks after the change.
