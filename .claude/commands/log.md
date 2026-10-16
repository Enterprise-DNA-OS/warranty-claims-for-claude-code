---
description: "Add an operator note and, when stated, the date of actual customer contact."
---

# log

Add an operator note and, when stated, the date of actual customer contact.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs log "<claim>" --text="<note>" --contact=YYYY-MM-DD --actor="<operator>" --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
