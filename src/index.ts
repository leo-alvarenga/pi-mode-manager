import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { createToolManager } from "./tools";
import { ToolManagerState } from "./types";
import {
  DEFAULT_MODE,
  LOGGER_PREFIX,
  MODE_CONFIG,
  MODE_DATA_KEY,
  UI_KEY,
} from "./constants";
import { isValidMode, getHelpText, getValidModeNames } from "./utils";

export default function (pi: ExtensionAPI) {
  const toolManager = createToolManager();

  // Initialize state on start
  pi.on("session_start", async (_, ctx) => {
    // Start from the most recent mode in the session history, if available
    const entries = [...ctx.sessionManager.getBranch()].reverse();

    for (const entry of entries) {
      if (entry.type !== "custom" || entry.customType !== MODE_DATA_KEY) {
        continue;
      }

      const possibleState = entry.data as Partial<ToolManagerState>;
      const mode = possibleState?.currentMode;

      if (mode && isValidMode(mode)) {
        setMode(mode, ctx);

        return;
      }
    }

    setMode(DEFAULT_MODE, ctx);
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
      ctx.ui.notify(getHelpText(), "info");
    },
  });

  pi.registerCommand("mode", {
    description: "Manage modes ".concat(
      MODE_CONFIG.map((m) => m.name).join("/"),
    ),

    getArgumentCompletions: async (partial: string) => {
      return new Promise((resolve) =>
        resolve(
          getValidModeNames(partial)
            .filter((mode) => mode.startsWith(partial.toLowerCase()))
            .map((mode) => ({ label: mode, value: mode })),
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
        if (!isValidMode(requested)) {
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
  function setMode(mode: string, ctx?: ExtensionContext) {
    toolManager.setMode(mode, pi);

    // Set the active tools based on the current mode's permissions
    pi.setActiveTools(toolManager.getAllowedTools());

    if (!ctx) return;

    ctx.ui.notify(`${LOGGER_PREFIX} Switched to ${mode} mode`, "info");

    ctx.ui.setWidget(UI_KEY, undefined, { placement: "aboveEditor" });
    ctx.ui.setWidget(UI_KEY, [`Mode: ${mode}`], {
      placement: "aboveEditor",
    });

    if (ctx.isIdle()) return;

    ctx.ui.notify(
      `${LOGGER_PREFIX} New mode will take effect after the current interaction has completed`,
      "info",
    );
  }

  function listValidModes(ctx: ExtensionContext, toolName?: string) {
    ctx.ui.notify(
      `${LOGGER_PREFIX} Valid modes: ${getValidModeNames(toolName).join(", ")}`,
      "info",
    );
  }
}
