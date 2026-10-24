---
description: Start a feature spec from the template (Specify and Clarify phases)
argument-hint: <short feature description>
---

Start a new feature spec for: $ARGUMENTS

Follow `docs/SDD_GUIDE.md`.

1. Read `docs/CONSTITUTION.md`, `sdd.yaml`, and `docs/specs/README.md`. Find the next free spec number (highest in the index plus one).
2. Classify the change tier (0, 1, or 2). If Tier 0, say so and stop: no spec is needed.
3. Copy `docs/specs/_template/` to `docs/specs/NNNN-short-slug/`. Replace `NNNN` in all three files.
4. Fill in `spec.md` only: problem, goals and non-goals, user stories, requirements with `REQ-NNNN-nn` IDs, Given/When/Then acceptance criteria, and every cross-cutting section (write `N/A: <reason>` where not applicable). Describe behavior, not code.
5. List every unknown as `[NEEDS CLARIFICATION: question]` in section 7. Do not guess.
6. Add a row to the index in `docs/specs/README.md` with status `draft`.
7. Stop. Present the open questions and ask the user to resolve them. Do not write `plan.md` or any code until they are resolved.
