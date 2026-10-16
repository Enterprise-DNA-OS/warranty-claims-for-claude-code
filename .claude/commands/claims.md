---
description: "List warranty claims with status, owner, age and costs."
---

# claims

List warranty claims with status, owner, age and costs.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs claims --json
```

Keep currencies separate. Describe claimed, approved and recovered amounts distinctly. Show the question and its answer, with the record numbers needed to act.
