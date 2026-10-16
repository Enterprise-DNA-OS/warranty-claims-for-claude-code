---
description: "Change a field, rule or workflow in plain language."
---

# customise

Change a field, rule or workflow in plain language.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
node scripts/warranty.mjs export --json
```

Back up first with the command above. Describe the requested field or rule, write the next numbered migration, update the CLI, fixtures, tests and this command library, then run npm run migrate and npm test. Preserve existing history. Never edit an applied migration or invent business rules. Ask the operator only when the meaning is unresolved.
