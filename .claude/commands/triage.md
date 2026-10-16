---
description: "Review unresolved claims by age, evidence and claimed amount."
---

# triage

Review unresolved claims by age, evidence and claimed amount.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs triage --json
```

Present the result in plain words, with record numbers. Do not invent missing evidence. Never send a message, submit a report or make a payment.
