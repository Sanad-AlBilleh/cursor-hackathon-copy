# Hackathon agent instructions

Instructions for AI agents (and humans) working in this repo during the hackathon. **Project Skills** in `.cursor/skills/` implement focused workflows; invoke them with `/skill-name` when you want that mode explicitly.

---

## Primary objective

Ship a working, impressive demo fast. Favor **reliability and polish** over novelty in infrastructure.

---

## Build strategy

- First propose **three approaches** and recommend the **smallest viable** one.
- Default to the option with the **fewest moving parts**.
- Reuse **proven libraries and templates** instead of custom infrastructure.
- Keep scope to **one killer workflow**, not many mediocre features.

---

## Coding behavior

- Make **small, reviewable** commits and patches.
- Prefer **boring, stable** tech over clever abstractions.
- Do **not** introduce a dependency unless it clearly saves time.
- Preserve **existing working behavior** unless the task explicitly requires change.

---

## Verification

Before marking any task done:

- Run **lint** (if configured).
- Run **typecheck** (if configured).
- Run **tests** if present.
- Run a **local build** if present.
- **Report** exactly what passed and what failed.

---

## Demo readiness

Optimize for demoability:

- Add **seeded / demo data** when helpful.
- Include **loading**, **empty**, and **error** states.
- Make the **happy path obvious** in the UI.
- Keep a **short demo script** in `README.md` (update as the app evolves).
- Prefer **one-command** startup instructions.

---

## UX bias

- The app should look **finished enough to judge in ~2 minutes**.
- Fix **copy, spacing, and call-to-action clarity** before adding marginal features.

---

## When blocked

- Isolate the blocker.
- Propose the **fastest workaround** first.
- Prefer **mock data** or **local-only fallbacks** over burning hours on infra.

---

## Cursor workflow (operational)

These are **defaults**, not rules you must cite every reply—use them to move fast.

### Models and context

- Turn on **Max Mode** when touching **many files** or when **repo-wide context** matters.
- Use **faster models** for exploration, search, boilerplate, and repetitive edits.
- Use **stronger models** for architecture, tricky bugs, auth, data flow, and deployment.

### Plan Mode

- Use **Plan Mode** only for the **first ~10 minutes** of a hard problem: picking architecture, choosing between 2–3 approaches, or untangling a nasty blocker—then **switch back to execution**. Over-planning kills momentum in a hackathon.

### Parallel agents

- Use **parallel agents** (separate worktrees) for **exploration branches** that should not stomp each other—for example SQLite vs Supabase spike, or “polish UI” vs “fix build”.

### MCP servers

- Prefer a **tiny MCP stack** (roughly **1–3** servers). Too many tools burns time on auth and context.
- **High leverage:** browser / web testing for flows, screenshots, console errors, accessibility.
- **Consider:** one **docs/search** MCP if you need fast API lookup; **one DB MCP** only if the build is clearly CRUD-heavy; **Figma MCP** only if design polish is central.

### Cursor CLI

- Useful as a **sidecar** for structured checklists, batch review of diffs, or scripted prompts while editor chat stays focused on implementation.

### Cloud agents

- Use **only if** the repo is already connected to GitHub/GitLab and integration is smooth. Good for long chores: README/demo polish, review passes, loading/empty states, refactors while you code locally. If setup is not ready, **skip**.

### Bugbot (before submit)

- Run **Bugbot** (or equivalent PR review) **after** “it works” and **once more before final submission**—limited free tier on many plans; use it for score-killing bugs and security footguns.

### Claude Code vs Cursor

- **Claude Code** plugins and slash commands are **not** Cursor. If you use both, **mirror the same playbook** (skills, verification, demo bar)—avoid two totally different systems.

---

## Event rules

Some hackathons allow **generic prep** (notes, templates) but require the **submitted project** to be built during the event. **Verify your event’s rules** before relying on pre-built boilerplate.

---

## Project Skills (this repo)

| Skill | Purpose |
|-------|---------|
| `/rapid-scaffold` | Smallest architecture, structure, install, env, first milestone |
| `/integration-spike` | One external API/library, happy path + fallback |
| `/debug-and-unblock` | Logs/errors → root cause → fastest fix, no broad refactors |
| `/ship-demo` | Sample data, happy path, copy, states, 60s demo flow |
| `/judge-pass` | Judge-style review; fix top score-killers first |

Skills live under `.cursor/skills/<name>/SKILL.md`.
