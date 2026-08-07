# Changelog

All notable changes to **pi-agent-manager** (formerly **pi-mode-manager**).

## [0.7.0] - 2026-08-07 — Breaking rename + soft-guard model

### Renamed "mode" → "agent" (OpenCode-style) — **breaking**
The whole concept is now expressed as **agents**, matching OpenCode vocabulary.

- **Package** `pi-mode-manager` → `pi-agent-manager`.
- **Config file** `pi-mode-manager.json` → `pi-agent-manager.json`, and its top-level **array key `modes` → `agents`**. Existing configs must be renamed/migrated.
- **Types / constants**: `ModeConfig`→`AgentConfig`, `ToolManagerState`→`AgentState`, `ToolManager`→`AgentManager`, `createToolManager`→`createAgentManager`, `BUILT_IN_MODES`→`BUILT_IN_AGENTS`, `DEFAULT_MODE`→`DEFAULT_AGENT`.
- **Persistence**: session-restore entry `pi-mode-manager-mode` → `pi-agent-manager-agent`; event bus `pi-mode-manager:mode-changed` → `pi-agent-manager:agent-changed`. Old session entries and listeners no longer match.
- **UI text**: prompt now says `Current agent:` / agent policy; help/usage wording uses "agents".

### Removed the hard tool guard — breaking behavior change
- Deleted the `setActiveTools()`-based allowlist/denylist plumbing: `isToolAllowed`, `getAllowedTools`, `getDeniedTools`, `getValidAgents(tool)` filtering, `WEB_TOOLS`/`WebTool`.
- Tools are **never physically hidden**. Agents now only shape the system prompt (advisory) plus, for `ask` agents, a per-call approve/decline gate at the `tool_call` boundary.
- The prompt no longer prints `Allowed tools (N) / NOT available`; it prints a short `Agent policy` line instead.

### Behavior
- Built-in `plan` is now `read` + `web` + **`ask`** (approve before write/exec) instead of hard read-only.
- Built-in agents are listed **before** user-defined ones in the picker/completion/help (ordering fix).
- New `ask` permission validated in config (`read`/`write`/`web`/`ask`).
- `free`/unguarded persona is now redundant (all tools are always available) and has been removed from the shipped config.
- Added an OpenCode-style `/agents` interactive picker (`SelectList` dialog).

### Migration
1. Rename `~/.pi/agent/pi-mode-manager.json` → `~/.pi/agent/pi-agent-manager.json` and change its `modes` key to `agents`.
2. If your `settings.json` `packages` list references the package, point it at the new name/path.
3. Restart pi / `/reload`.

[0.6.0] - Initial public release as `pi-mode-manager` (hard guard, `plan`/`build`, `/mode`).