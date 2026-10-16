---
description: "Add a read-only view that answers the operator's own question."
---

# new-view

Add a read-only view that answers the operator's own question.

Read CLAUDE.md and docs/cli.md first. Resolve names by reading the records. If the name is ambiguous, show the candidates and ask for the exact record.

```bash
npm run view
```

Read views.json and the existing database views. Add a query and a named section in views.json, with currency kept separate. If the existing schema cannot answer the question, say what evidence is missing. Render it with npm run view and inspect the output. Never add action buttons or a web application.
