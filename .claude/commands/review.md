---
description: "Move a submitted claim into the review queue."
---

# review

Move a submitted claim into the review queue.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs review "<claim>" --status=review --actor="<operator>" --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
