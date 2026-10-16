---
description: "Draft the Monday review from attention, dashboard and compliance results."
---

# weekly-review

Draft the Monday review from attention, dashboard and compliance results.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs weekly-review --json
```

The CLI writes the draft into drafts/. Read the file and present its factual gaps to the operator. Never send or invent an approval, payment or legal conclusion.
