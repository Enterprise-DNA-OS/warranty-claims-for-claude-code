---
description: "Read supplier requests, cumulative credits and outstanding balances."
---

# recoveries

Read supplier requests, cumulative credits and outstanding balances.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs recoveries --json
```

Keep currencies separate. Describe claimed, approved and recovered amounts distinctly. Show the question and its answer, with the record numbers needed to act.
