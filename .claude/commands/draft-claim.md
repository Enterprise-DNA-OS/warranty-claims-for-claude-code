---
description: "Draft a claim assessment for operator review, without sending."
---

# draft-claim

Draft a claim assessment for operator review, without sending.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs draft-claim "<claim>" --json
```

The CLI writes the draft into drafts/. Read the file and present its factual gaps to the operator. Never send or invent an approval, payment or legal conclusion.
