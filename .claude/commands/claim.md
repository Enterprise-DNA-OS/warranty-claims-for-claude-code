---
description: "Read a claim, linked assets, returns, supplier recoveries and its notes."
---

# claim

Read a claim, linked assets, returns, supplier recoveries and its notes.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs claim "<claim number or name>" --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
