# Cursor setup for this hackathon

What is **automated in this repo** vs what you must **do once in the Cursor app**.

## Already in this repository

| Item | Purpose |
|------|---------|
| [AGENTS.md](./AGENTS.md) | Primary instructions; points agents at `docs/` before major work |
| [docs/spec.md](./docs/spec.md), [steps.md](./docs/steps.md), [learned.md](./docs/learned.md), [demo.md](./docs/demo.md) | Spec, current plan, lessons, demo script |
| [.cursor/rules/hackathon.mdc](./.cursor/rules/hackathon.mdc) | Always-on project rule |
| [.cursor/skills/](./.cursor/skills/) | Skills: `/rapid-scaffold`, `/plan-feature`, `/integration-spike`, `/debug-with-evidence`, `/ship-demo`, `/judge-pass`, `/close-task` |
| [.vscode/settings.json](./.vscode/settings.json) | Format on save, trim whitespace, newline at EOF (team-shared) |
| [.vscode/extensions.json](./.vscode/extensions.json) | Suggested extensions (ESLint, Prettier, Python, GitHub PR) |

## Applied on this machine (user `settings.json`)

If you ran the setup script or copied settings, your **global** Cursor user settings include:

- `editor.formatOnSave` — on  
- `files.trimTrailingWhitespace` — on  
- `files.insertFinalNewline` — on  
- `editor.formatOnSaveMode` — `modificationsIfAvailable` (only formats changed lines when the formatter supports it)

Path on macOS: `~/Library/Application Support/Cursor/User/settings.json`

---

## You must do in Cursor (not representable as stable repo-only config)

These move between Cursor versions; use the **in-app** settings and chat UI.

### 1. Max Mode (large context)

- Open **Agent** or **Chat** (where you pick the model).
- Enable **Max** / **Max Mode** when you need **maximum context** (multi-file refactors, big diffs). Turn it off for small edits to save latency/cost.
- Docs: [Max Mode](https://docs.cursor.com/context/max-mode)

### 2. Models: fast vs strong

- In the same chat/agent UI, **switch models** per task: faster for search/boilerplate, stronger for architecture and hard bugs. No single `settings.json` key covers “always use model X”—it’s per conversation.

### 3. Agent auto-run and safe commands

- **Cursor Settings** → **Agent** (or **Features** → **Agent**, depending on version).
- Configure **which terminal commands** the agent may run without asking (e.g. `npm test`, `npm run lint`). Tighten or loosen for your risk tolerance.

### 4. MCP servers (keep it to 1–3)

- **Cursor Settings** → **MCP** (or **Tools**).
- Add only what you need (e.g. **Browser** for UI flows, one **docs** tool). **Disable** unused servers so they don’t fail auth or eat context.

### 5. Bugbot / PR review

- Use Cursor’s **Bugbot** or **PR review** from the **GitHub integration** / PR view when the product version you have exposes it—often after you connect GitHub and open a PR.
- Run once when “it works” and once before final submit.

### 6. Cloud Agents

- Requires **GitHub (or GitLab) connected** and Cursor cloud features enabled in your plan.
- Use for long chores (README polish, review pass) only if integration is already working—see Cursor docs for **Cloud Agents**.

### 7. Parallel agents (separate worktrees)

- From Cursor’s **Agent** UI, use **parallel** / **multi-agent** flows if your build supports it—spawns isolated worktrees so two experiments do not overwrite each other.

### 8. Plan mode and subagents

- Use **Plan** only for short architecture / approach decisions, then return to normal agent execution (see `AGENTS.md`).
- Use **subagents** or parallel agents when you need **isolated context** (big step change, parallel experiments)—see `AGENTS.md` “Chat discipline”.

### 9. Cursor CLI (optional sidecar)

- Install from [Cursor documentation](https://docs.cursor.com) if you want terminal-based agent runs with the same rules.
- Optional CLI config may live at `~/.cursor/cli-config.json` when the CLI creates it (not always present until first use).

### 10. GitHub CLI (for PRs from terminal)

```bash
gh auth login
```

Useful for creating PRs and checks from the terminal; unrelated to Cursor internals but helps your workflow.

---

## Teammate checklist

1. Clone repo and open folder in Cursor.  
2. Install **recommended extensions** when prompted (from `.vscode/extensions.json`).  
3. Read `AGENTS.md`, fill in **`docs/spec.md`** and **`docs/steps.md`** as soon as you pick a direction.  
4. Read this file for in-app toggles (Max Mode, MCP, etc.).  
5. Optionally copy the **user** editor block above into your own `settings.json` for global hygiene (or rely on workspace `.vscode/settings.json` only).
