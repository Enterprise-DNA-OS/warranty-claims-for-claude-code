---
description: "Answer ten questions across claims, serial numbers, suppliers and reviews."
---

# insights

Answer ten questions across claims, serial numbers, suppliers and reviews.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs insights --json
```

Keep currencies separate. Describe claimed, approved and recovered amounts distinctly. Show the question and its answer, with the record numbers needed to act.
