---
description: "Close a decided claim once outstanding part returns and required checks are resolved."
---

# close

Close a decided claim once outstanding part returns and required checks are resolved.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs close "<claim>" --actor="<operator>" --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
