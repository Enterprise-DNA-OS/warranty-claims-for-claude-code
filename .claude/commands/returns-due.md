---
description: "Find parts still waiting to arrive, oldest due first."
---

# returns-due

Find parts still waiting to arrive, oldest due first.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs returns-due --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
