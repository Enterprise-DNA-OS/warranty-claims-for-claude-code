---
description: "Record serious-harm awareness and the evidence of a report already submitted."
---

# safety

Record serious-harm awareness and the evidence of a report already submitted.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs safety "<claim>" --awareness=YYYY-MM-DD --country=AU --reported=YYYY-MM-DD --ref="<report reference>" --actor="<operator>" --json
```

Read the full linked claim before writing. Record only the decision, event, date, amount and reference that the operator actually stated. A claim decision or recovery record never moves money. Safety records never submit reports. Show unresolved checks after the change.
