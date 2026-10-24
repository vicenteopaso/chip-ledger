# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Slash commands live in `.claude/commands/`: `/new-spec`, `/new-adr`, `/review-pr`. They follow the same steps as `docs/SDD_GUIDE.md`.
- Keep `AGENTS.md` as the single source for shared rules. Add only Claude-specific notes here so the two files cannot drift.
- Use the task list for multi-step work; mark steps done only when their done-condition holds.
- For UI changes, verify in a real browser (both themes, mobile and desktop widths) and attach evidence before calling the work done.
- When delegating to subagents, confirm they have the tool permissions the task needs; treat permission failures as blocking and report them.
- Personal preferences belong in `~/.claude/CLAUDE.md`, not here. Project governance in this repository wins over personal defaults when they conflict.
