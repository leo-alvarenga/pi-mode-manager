# pi-mode-manager

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that keeps the agent on a short leash. It adds two modes, `plan` and `build`, and hides the tools that don't belong to the current one.

- `plan` — read and web. The agent can read files and search the internet, but it can't write, edit, or run commands. Good for reviews, research, and anything where you don't want your tree touched.
- `build` — read and write. Full file access, but no web tools. For when there's actual work to do.

Without something like this, the agent gets every tool it registered, and "can you look at this function?" ends with an unexpected `rm -rf`. Modes are a cheap way to say "look, don't touch" without babysitting each interaction.

### How it behaves

- On session start it restores the last mode used in that session, falling back to `plan` when there's nothing to go on
- Tools that don't match the current mode are disabled through `setActiveTools()`, so the agent can't even call them
- A short mode briefing is injected into the system prompt, so the model knows what it's allowed to do
- The active mode is shown in a widget above the editor as a colored pill — its `icon` (default `◆`) and `color` (default `accent`) control the appearance

## Installation

It's a pi package, so `pi install` handles everything:

```bash
pi install git:github.com/leo-alvarenga/pi-mode-manager
```

Local checkout, e.g. while hacking on it:

```bash
pi install ./path/to/pi-mode-manager
```

If it ever lands on npm, `pi install npm:pi-mode-manager` works the same way.

Want to try it without installing? Run a one-off session with `-e`:

```bash
pi -e git:github.com/leo-alvarenga/pi-mode-manager
```

Restart pi or run `/reload` inside a session after installing. You should see a `◆ Plan` pill above the editor — the glyph and color come from the mode's `icon` and `color` properties.

## Usage

| Command                      | What it does                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| `/mode`                      | Shows the current mode and the list of valid ones                    |
| `/mode plan` / `/mode build` | Switches mode. Tab completion works, so `/mode` + Tab gets you there |
| `/mode_help`                 | Prints the same info as the commands, for the forgetful              |

A mode switch applies to the next interaction. If the agent is already working, it finishes the current interaction under the old mode; the widget updates right away either way.

The last mode you used is remembered per session and restored on the next start.

## Adding modes

No source changes needed. Drop a `pi-mode-manager.json` file into pi's agents directory (`~/.pi/agent/`, or wherever `PI_CODING_AGENT_DIR` points):

```json
{
  "showWidget": true,
  "modes": [
    {
      "name": "review",
      "description": "Read-only review mode with web access",
      "permissions": ["read", "web"],
      "icon": "★",
      "color": "success",
      "extraInstructions": "Focus on reviewing code quality and suggesting improvements."
    }
  ]
}
```

The top-level `showWidget` key (default `false`) turns the mode pill above the editor on or off. Each entry is a name, a description, and a permission list (`read`, `write`, `web`), plus three optional fields: `extraInstructions` (appended to the mode briefing), `icon` (a glyph shown in the widget pill, default `◆`), and `color` (a pi theme token that colors the pill, default `accent` — e.g. `success`, `warning`, `error`, `muted`, `dim`, `text`). The built-in `plan` and `build` modes use `accent` and `warning` respectively. Command completion, the help text, and the prompt injection all derive from the merged table, so a new mode mostly writes itself.

Rules:

- User modes are **additive**: the built-in `plan` and `build` modes are always present and cannot be overridden or removed.
- Mode names must be `[a-z0-9_-]` and unique — duplicates (including built-in names) are skipped.
- Invalid entries — broken JSON, unknown permissions, missing descriptions — are skipped with a warning; the rest still load.
- The built-in modes live in `src/constants.ts` (`BUILT_IN_MODES`); loading and validation live in `src/config.ts`.
- Changes take effect after restarting pi or running `/reload`.

Which tool names count as `write` or `web` is decided by the `WRITE_TOOLS` and `WEB_TOOLS` lists in `src/constants.ts`. Anything not in either list is treated as read-only and always allowed.

## Programmatic access

Other extensions can read the current mode or react to changes. Two ways:

Pull: every mode change is persisted to the session tree via `pi.appendEntry("pi-mode-manager-mode", { mode })`. To get the current mode, scan the branch for the latest entry:

```ts
for (const entry of ctx.sessionManager.getBranch()) {
  if (entry.type === "custom" && entry.customType === "pi-mode-manager-mode") {
    const mode = entry.data?.mode; // latest entry wins
  }
}
```

Push — changes are emitted on the `pi-mode:changed` channel of the inter-extension event bus (`pi.events`):

```ts
pi.events.on("pi-mode-manager:mode-changed", ({ mode, previousMode }) => {
  // `mode` is authoritative; `previousMode` is "plan" when no mode was set yet
});
```

The entry type and channel name are `MODE_DATA_KEY` and `MODE_CHANGED_EVENT` in `src/constants.ts`, in case you ever want to rename them.

Restore on `session_start` reads the persisted entry first and falls back to message `details` from older sessions, so pre-existing conversations still come back in the right mode.

## License

MIT, see [LICENSE](LICENSE).
