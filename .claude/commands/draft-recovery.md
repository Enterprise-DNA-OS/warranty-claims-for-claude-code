---
description: "Draft a supplier recovery follow-up from the recorded balance."
---

# draft-recovery

Draft a supplier recovery follow-up from the recorded balance.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs draft-recovery "<recovery>" --json
```

The CLI writes the draft into drafts/. Read the file and present its factual gaps to the operator. Never send or invent an approval, payment or legal conclusion.
