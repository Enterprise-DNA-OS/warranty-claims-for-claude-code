---
description: "Group claim costs and affected assets by product, fault and currency."
---

# failure-patterns

Group claim costs and affected assets by product, fault and currency.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs failure-patterns --json
```

Keep currencies separate. Describe claimed, approved and recovered amounts distinctly. Show the question and its answer, with the record numbers needed to act.
