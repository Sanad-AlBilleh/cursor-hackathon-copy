# Hackathon agent instructions

You are helping build a project that must **ship during a hackathon** and stay **clean enough to continue** after the event.

**Project Skills** live in `.cursor/skills/` — invoke with `/skill-name` when you want that workflow explicitly.

---

## Read first (project memory)

Before **major** work (new features, large refactors, architecture choices), read:

| File | Role |
|------|------|
| [docs/spec.md](docs/spec.md) | High-level product/architecture — keep **stable** |
| [docs/steps.md](docs/steps.md) | **Current** milestone, in-progress task, **next 3 steps** — keep **updated** |
| [docs/learned.md](docs/learned.md) | Short lessons: mistake → fix → rule for next time |
| [docs/demo.md](docs/demo.md) | Demo flow and script — update when the happy path changes |

If those files are still placeholders, **create real content** as soon as the direction is clear—do not leave the agent flying blind.

---

## Primary objective (hackathon)

Ship a **working, impressive demo** fast. Favor **reliability and polish** over novelty in infrastructure.

---

## Core behavior

- Keep **`docs/steps.md`** updated: current milestone, in-progress task, next **three** concrete steps.
- After solving a **non-obvious** bug or integration issue, **append** a line to **`docs/learned.md`** (mistake → fix → future rule).
- Prefer **clean, extensible** code over hacks that will poison the project later—when you must hack for time, **record the debt** in `learned.md` or a `// HACK:` with why.
- Default to a **modular monolith** unless there is a strong reason not to (avoid microservice sprawl in 48h).
- **Do not** silently swap libraries or frameworks, invent APIs/env/schema without checking the codebase, or rewrite large working areas unless the task requires it.

---

## Build strategy

- First propose **three approaches** and recommend the **smallest viable** one.
- Default to the **fewest moving parts**; reuse **proven** libraries and templates.
- Keep scope to **one killer workflow**, not many mediocre features.

---

## Project structure

- **Respect** the existing layout; do not add random config/service folders if an existing place fits.
- Before creating a **new** file, check whether an **existing** module should be extended.
- Keep **domain logic** separate from **UI** and **integration glue** (API clients, adapters).

---

## Planning (major features)

Before implementing, write (in chat or in `docs/steps.md`):

1. **Goal**
2. **Affected files**
3. **Minimal implementation plan**
4. **Risks**

Then implement in **small** steps.

---

## Coding behavior

- Make **small, reviewable** commits and patches.
- Prefer **boring, stable** tech over clever abstractions.
- Do **not** introduce a dependency unless it clearly saves time.
- Preserve **existing working behavior** unless the task explicitly requires change.

---

## Debugging

- When the failure mode is unclear, add **targeted logs or assertions** first—**evidence beats guessing**.
- Prefer **stack traces, logs, and errors** over speculation.
- Remove **noisy** temporary debug code before finishing unless it is genuinely useful (or gate behind env).

---

## Verification

Before marking any task done:

- Run **lint** (if configured).
- Run **typecheck** (if configured).
- Run **tests** if present (add or update tests **with** features when practical—they are guardrails).
- Run a **local build** if present.
- **Report** exactly what passed and what failed.

---

## Demo readiness

- Add **seeded / demo data** when helpful.
- Include **loading**, **empty**, and **error** states.
- Make the **happy path obvious** in the UI.
- Keep **`docs/demo.md`** and **`README.md`** aligned: one-command startup + short demo script.

---

## UX bias

- The app should look **finished enough to judge in ~2 minutes**.
- Fix **copy, spacing, and CTA clarity** before marginal features.

---

## When blocked

- Isolate the blocker; propose the **fastest workaround** first.
- Prefer **mock data** or **local-only fallbacks** over burning hours on infra.
- Document workarounds in **`docs/learned.md`** when non-obvious.

---

## Chat discipline (context hygiene)

- If the **task or milestone** changes materially, **suggest a fresh chat** or use a **subagent** for isolated work—do not drag stale assumptions forward.
- **Subagents** / parallel worktrees are the modern replacement for “new window every step”: use them for **parallel experiments** or **clean context**.

---

## Cursor workflow (operational)

Defaults—not every reply needs to cite these.

### Models and context

- **Max Mode** when touching **many files** or repo-wide context.
- **Faster models** for exploration, boilerplate, repetitive edits; **stronger models** for architecture, tricky bugs, auth, deployment.

### Plan Mode

- Use for the **first ~10 minutes** of a hard problem (architecture, 2–3 options, nasty blocker), then **execute**. Over-planning kills hackathon momentum.

### Parallel agents / subagents

- Use for branches of work that should not stomp each other (e.g. two integration spikes, UI vs build).

### MCP servers

- **1–3** max. Browser/testing for UI flows; optional docs search; DB MCP only if CRUD-heavy. Disable unused servers.

### Cursor CLI

- Sidecar for checklists, batch diff review, scripted prompts; reads **`AGENTS.md`** / project docs like the IDE.

### Cloud agents

- Only if GitHub/GitLab is connected and stable; good for polish/review chores—not if integration is flaky.

### Bugbot (before submit)

- Run **after** “it works” and **once before** final submission.

### Claude Code vs Cursor

- If you use both, **mirror the same playbook**—not two different rule systems.

---

## Event rules

Verify your **local hackathon rules** on prep vs build time.

---

## Project Skills (this repo)

| Skill | Purpose |
|-------|---------|
| `/rapid-scaffold` | Smallest architecture, structure, install, env, first milestone |
| `/plan-feature` | Read spec + steps; output goal, affected files, risks, implementation order |
| `/integration-spike` | One external API/library, happy path + fallback |
| `/debug-with-evidence` | Logs/assertions, interpret evidence, smallest fix, remove temp noise |
| `/ship-demo` | Sample data, happy path, copy, states, 60s demo flow |
| `/judge-pass` | Judge-style review; fix top score-killers first |
| `/close-task` | Update `steps`/`learned`, run checks, summarize status |

Skills live under `.cursor/skills/<name>/SKILL.md`.

---

## What we intentionally avoid

- **Emoji “context checks”** and other gimmicks.
- **Auto-append bloated rules after every session**—review occasionally; keep **AGENTS.md** lean; push repeat workflows into **Skills**.
- **Dumping the full tree** into prompts—use **spec** + **structure rules** + concise architecture instead.
