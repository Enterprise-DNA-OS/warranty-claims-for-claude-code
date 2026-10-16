---
description: "Record the operator's explicit claim decision with the reason and evidence."
---

# adjudicate

Record the operator's explicit claim decision with the reason and evidence.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs adjudicate "<claim>" --decision=approved --amount=<decimal amount> --reason="<reason>" --rights-review="<review where required>" --actor="<operator>" --json
```

Read the full linked claim before writing. Record only the decision, event, date, amount and reference that the operator actually stated. A claim decision or recovery record never moves money. Safety records never submit reports. Show unresolved checks after the change.
