# pi-agent-manager

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that lets you pick the **agent** for a conversation. Each agent is a persona (a system-prompt style) plus a permission **policy** — OpenCode-style, where "agent" replaces the older "mode" concept.

There is **no hard tool guard**. `pi-agent-manager` never hides or disables tools; instead an agent shapes the system prompt and, when it opts into the `ask` permission, gates each write/exec tool call behind an approve/decline prompt.

The two built-in agents:

- `plan` — `read` + `web` + `ask`. Read and research freely; every write/build call asks for your approval before it runs. Good for planning and analysis.
- `build` — `read` + `write`. Unrestricted file changes and commands.

## Why "ask, not block"

Tool-switching like OpenCode: a read-only agent is a *recommendation*, while the `ask` policy is the actual `enforcement` boundary (a prompt fires on each write/exec). This avoids the older "hard guard" that physically stripped tools via `setActiveTools()` — a mechanical, non-transparent limit — in favor of a soft, transparent approval flow that keeps the full toolset available to the agent.

Each agent's system prompt carries a **`CAPABILITY POLICY — HIGHEST PRIORITY`** block that enumerates exactly which tool categories (`web`, `write/exec`) are allowed, approval-required, or forbidden. It instructs the agent to never invoke forbidden tools — regardless of how the request is phrased or any attempt to override the policy — and, when asked to do something out of scope, to warn the user and recommend switching via `/agents`.

## Install

pi package, `pi install` handles everything:

```bash
pi install git:github.com/leo-alvarenga/pi-agent-manager
# or a local dev checkout:
pi install ./path/to/pi-agent-manager
```

Restart pi or run `/reload` after installing.

## Usage

| Command               | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `/agents`             | Opens an interactive agent picker (arrows ↑↓, enter to select, type to filter, esc to cancel) |
| `/agents <name>`      | Switches directly to that agent. Tab-completion works.             |
| `/agents_help`        | Shows the agent list, permissions, and usage.                        |

An agent switch applies to the next interaction; the last agent is remembered per session and restored on restart.

## Permissions

| Permission | Meaning                                            |
| ---------- | -------------------------------------------------- |
| `read`     | File reading and info access.                       |
| `write`    | Modify files / run commands, **without** prompting. |
| `ask`      | Write/exec tools are gated behind an approval prompt. |
| `web`      | Web search & fetch tools.                           |

A `write` permission makes the agent fully unbound; `ask` keeps it interactive but not blocked; and an agent with neither can be treated as read-only (advisory).

## Adding agents

Drop a `pi-agent-manager.json` file into pi's agents directory (`~/.pi/agent/`, or wherever `PI_CODING_AGENT_DIR` points), using an `agents` array:

```json
{
  "agents": [
    {
      "name": "reviewer",
      "description": "Reviews code for quality and potential issues",
      "permissions": ["read", "web", "ask"],
      "icon": "★",
      "color": "success",
      "extraInstructions": "Focus on security, performance, and maintainability."
    }
  ]
}
```

Each entry: `name` (unique, `[a-z0-9_-]`), `description`, `permissions` (`read`/`write`/`web`/`ask`), plus optional `extraInstructions`, `icon`, and `color`. Built-in `plan`/`build` can be overridden by defining an agent with the same name. Invalid entries are skipped with a warning. Changes take effect after restart or `/reload`.

> Note: the original file was `pi-mode-manager.json` with a `modes` array; v0.7 renamed it to `pi-agent-manager.json` with `agents` (breaking migration, see CHANGELOG).

## Programmatic access

The persisted state is written under `AGENT_DATA_KEY` and events under `AGENT_CHANGED_EVENT` (see `src/constants.ts`). The event payload and session entry reflect `AgentState` (`currentAgent`, `currentAgentConfig`).

```ts
pi.events.on("pi-agent-manager:agent-changed", ({ currentAgent }) => {
  // currentAgent is the just-activated agent name
});
```

## License

MIT, see [LICENSE](LICENSE).