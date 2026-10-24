---
description: Draft an Architecture Decision Record from the template
argument-hint: <decision to record>
---

Draft an ADR for: $ARGUMENTS

1. Read `docs/adr/README.md` and the existing ADRs to avoid duplicating or contradicting a prior decision. If this decision changes an accepted ADR, plan to supersede it rather than edit it.
2. Find the next free four-digit number. Copy `docs/adr/0000-adr-template.md` to `docs/adr/NNNN-short-kebab-title.md`.
3. Fill in context, decision drivers, at least two genuinely considered options, the decision, honest consequences (positive, negative, neutral), and how success will be validated.
4. Check the decision against `docs/CONSTITUTION.md`. If it needs an invariant to change, say so and note that it requires the amendment process.
5. Set `Status: Proposed`. Add a row to the index in `docs/adr/README.md`.
6. List the follow-ups the decision implies (`sdd.yaml` changes, lint or CI enforcement, doc updates). Do not make them yet unless asked.
7. Present the draft and ask the user to confirm or edit the decision before anything else is changed.
