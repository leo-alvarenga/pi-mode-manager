import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { loadUserModes } from "./config";
import { createToolManager } from "./tools";
import { ToolManagerState } from "./types";
import {
  BUILT_IN_MODES,
  DEFAULT_MODE,
  LOGGER_PREFIX,
  MODE_DATA_KEY,
} from "./constants";
import {
  isValidMode,
  getHelpText,
  getValidModeNames,
  getValidModes,
  capitalize,
} from "./utils";

export default async function (pi: ExtensionAPI) {
  // Load user-defined modes from pi-mode-manager.json in the agents dir.
  // Built-in modes are always present; user modes are additive on top.
  const { modes: userModes, errors: configErrors } = await loadUserModes();

  for (const error of configErrors) {
    console.warn(`${LOGGER_PREFIX} ${error}`);
  }

  const modes = [...BUILT_IN_MODES, ...userModes];
  const toolManager = createToolManager(modes);

  // Initialize state on start
  pi.on("session_start", async (_, ctx) => {
    if (configErrors.length > 0) {
      ctx.ui.notify(
        `${LOGGER_PREFIX} ${configErrors.length} problem(s) in pi-mode-manager.json; affected modes were skipped`,
        "error",
      );
    }

    // Start from the most recent mode in the session history, if available
    const entries = [...ctx.sessionManager.getBranch()].reverse();
    let mode: string | undefined = undefined;

    for (const entry of entries) {
      if (entry.type !== "custom" || entry.customType !== MODE_DATA_KEY) {
        continue;
      }

      const possibleState = entry.data as Partial<ToolManagerState>;

      if (mode && isValidMode(mode, modes)) {
        mode = possibleState?.currentMode;

        break;
      }
    }

    setMode(mode || DEFAULT_MODE, ctx, true);
  });

  // Add pre-prompt instructions based on the current mode
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: event.systemPrompt + toolManager.getPrePromptInstructions(),
    };
  });

  // Commands
  pi.registerCommand("mode_help", {
    description: "Learn about PiModeManager and its modes",

    handler: async (_, ctx) => {
      ctx.ui.notify(getHelpText(modes), "info");
    },
  });

  pi.registerCommand("mode", {
    description: "Manage modes ".concat(modes.map((m) => m.name).join("/")),

    getArgumentCompletions: async (partial: string) => {
      return new Promise((resolve) =>
        resolve(
          getValidModes(modes, partial)
            .filter(({ name }) => name.startsWith(partial.toLowerCase()))
            .map(({ icon, name }) => {
              let label = capitalize(name);

              if (icon) {
                label = `${icon} ${label}`;
              }

              return {
                label,
                value: name,
              };
            }),
        ),
      );
    },

    handler: async (args: string | undefined, ctx) => {
      try {
        if (!args) {
          ctx.ui.notify(
            `${LOGGER_PREFIX} Current mode: ${toolManager.getCurrentMode()}`,
            "info",
          );

          listValidModes(ctx);

          return;
        }

        const requested = args.trim().toLowerCase();
        if (!isValidMode(requested, modes)) {
          listValidModes(ctx);

          return;
        }

        setMode(requested, ctx);
      } catch (e) {
        ctx.ui.notify(`Failed to switch mode: ${e}`, "error");
      }
    },
  });

  // Helper functions
  function setMode(mode: string, ctx?: ExtensionContext, silent = false) {
    toolManager.setMode(mode, pi);

    // Set the active tools based on the current mode's permissions
    pi.setActiveTools(toolManager.getAllowedTools());

    if (!ctx || silent) return;

    ctx.ui.notify(`${LOGGER_PREFIX} Switched to ${mode} mode`, "info");

    if (ctx.isIdle()) return;
    ctx.ui.notify(
      `${LOGGER_PREFIX} New mode will take effect after the current interaction has completed`,
      "info",
    );
  }

  function listValidModes(ctx: ExtensionContext, toolName?: string) {
    ctx.ui.notify(
      `${LOGGER_PREFIX} Valid modes: ${getValidModeNames(modes, toolName).join(", ")}`,
      "info",
    );
  }
}
