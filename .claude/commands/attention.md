---
description: "Find late contact, missing evidence, overdue parts and supplier balances."
---

# attention

Find late contact, missing evidence, overdue parts and supplier balances.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs attention --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
