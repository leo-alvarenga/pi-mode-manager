// pi-mode-manager extension
// Name: pi-mode-manager
// Description: Manages configurable modes with read/write/web permissions
// Author: Leonardo A. Alvarenga (leo-alvarenga)

import type {
  ExtensionAPI,
  ExtensionContext,
  SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";

//#region Types
export type WriteTool =
  "write" | "edit" | "delete_file" | "bash" | "shell" | "run" | "exec";

export type WebTool =
  "web-search" | "http-get" | "http-post" | "web" | "fetch" | "api";

export type Permission = "read" | "write" | "web";

export type SafeStatefulMessage = SessionMessageEntry["message"] & {
  details?: {
    mode?: string;
  };
};

/**
 * Configuration for each mode, defining its name and allowed permissions
 * */
export type ModeConfig = {
  name: string;
  description: string;
  extraInstructions?: string;
  permissions: Permission[];
};
//#endregion

//#region Helper Functions

// Configuration
export const MODE_CONFIG: ModeConfig[] = [
  {
    name: "plan",
    permissions: ["read", "web"],
    description:
      "The agent can read files and access web tools, but cannot modify files or execute commands; This mode is suitable for planning and research tasks.",
  },
  {
    name: "build",
    permissions: ["read", "write"],
    description:
      "The agent can read and write/edit/delete files, but cannot access web tools; This mode is suitable for building and executing tasks.",
  },
];

export const WRITE_TOOLS: WriteTool[] = [
  "write",
  "edit",
  "delete_file",
  "bash",
  "shell",
  "run",
  "exec",
];

export const WEB_TOOLS: WebTool[] = [
  "web-search",
  "http-get",
  "http-post",
  "web",
  "fetch",
  "api",
];

export const UI_KEY = "pi-mode__";
export const DEFAULT_MODE: string = MODE_CONFIG[0].name;

/**
 * Checks if the provided mode is valid based on the MODE_CONFIG
 * @param mode - The mode to validate
 * @returns boolean indicating if the mode is valid
 */
export function isValidMode(mode: string): boolean {
  return MODE_CONFIG.some((m) => m.name === mode.toLowerCase());
}

/**
 * Checks if a tool is allowed in the current mode based on its permissions
 * @param tool - The tool name to check
 * @param mode - The current mode configuration
 * @returns boolean indicating if the tool is allowed in the current mode
 */
export function isToolAllowed(tool: string, mode: ModeConfig): boolean {
  if (WRITE_TOOLS.includes(tool as WriteTool)) {
    return mode.permissions.includes("write");
  }

  if (WEB_TOOLS.includes(tool as WebTool)) {
    return mode.permissions.includes("web");
  }

  return true;
}

/**
 * Returns a string of valid mode names, optionally filtered by a tool name
 * @param toolName - Optional tool name to filter valid modes
 * @returns string list of valid mode names
 */
export function getValidModeNames(toolName?: string): string[] {
  let modesWithTool: ModeConfig[] = MODE_CONFIG;

  if (toolName?.length) {
    modesWithTool = MODE_CONFIG.filter((m) => isToolAllowed(toolName, m));
  }

  return modesWithTool.map((m) => m.name);
}

/**
 * Returns a list of tools that are not allowed in the current mode
 * @param mode - The current mode configuration
 * @param allTools - List of all available tools
 * @returns array of disallowed tool names
 */
export function getAllowedTools(
  mode: ModeConfig,
  allTools: string[],
): string[] {
  return allTools.filter((tool) => isToolAllowed(tool, mode));
}

/**
 * Returns a help text string that describes the PiModeManager, available modes, permissions, and usage instructions
 * @returns string help text
 */
export function getHelpText(): string {
  return `
## PiModeManager

PiModeManager helps you manage what you agent can do by hiding or showing tools based on the current mode.
Each mode has specific permissions that determine which tools are accessible.
Use the \`mode\` command to switch between modes and control the agent's capabilities.
The current mode is displayed above the editor for easy reference.

### Available modes:
${MODE_CONFIG.map((m) => `- ${m.name} (permissions: ${m.permissions.join(", ")})`).join("\n")}

### Permissions:
- **read**: Allows the agent to read files and access information.
- **write**: Allows the agent to modify files, execute commands, and perform write operations.
- **web**: Allows the agent to access web tools for searching and fetching data.

### Usage:
- To switch modes: \`mode <mode_name>\`
`;
}
//#endregion

//#region Tool Manager

/**
 * ToolManager class manages the current mode and allowed tools based on the mode configuration
 */
export class ToolManager {
  private hasInitialized: boolean = false;

  private currentMode: string = DEFAULT_MODE;
  private currentModeConfig: ModeConfig = MODE_CONFIG[0];

  private allTools: string[] = [];
  private deniedToolsSet: Set<string> = new Set();
  private allowedToolsSet: Set<string> = new Set();

  public initialize(pi: ExtensionAPI): void {
    if (this.hasInitialized) {
      return;
    }

    this.currentMode = DEFAULT_MODE;
    this.currentModeConfig =
      MODE_CONFIG.find((m) => m.name === this.currentMode) || MODE_CONFIG[0];

    this.allTools = [...pi.getAllTools().map((tool) => tool.name)];
  }

  public setMode(mode: string, pi: ExtensionAPI): void {
    this.initialize(pi);

    if (!this.isValidMode(mode)) {
      return;
    }

    this.currentMode = mode;
    this.currentModeConfig =
      MODE_CONFIG.find((m) => m.name === this.currentMode) || MODE_CONFIG[0];

    this.updateAllowedTools();
  }

  public getPrePromptInstructions(): string {
    const mode = this.getCurrentModeConfig();
    const deniedTools = this.getDeniedTools();
    const allowedTools = this.getAllowedTools();

    let instructions = [
      `\n`,
      `[pi-mode-manager] Mode instructions`,
      `Current Agent Mode: ${mode.name}`,
      `Mode description: ${mode.description}`,
      `Allowed tools (${allowedTools.length}): ${allowedTools.join(", ")}`,
      `NOT available in this mode (${deniedTools.length})): ${deniedTools.join(", ")}`,
      `DO NOT ATTEMPT TO USE tools that are not allowed in this mode.`,
      `Assume the user has set the mode intentionally and follow the mode's restrictions.`,
      `Remind the user to swithch modes if they want to use tools that are not allowed in the current mode.`,
    ];

    if (mode.extraInstructions) {
      instructions.push(`\n\n${mode.extraInstructions}`);
    }

    return instructions.join("\n");
  }

  public getCurrentMode(): string {
    return this.currentMode;
  }

  public getCurrentModeConfig(): ModeConfig {
    return this.currentModeConfig;
  }

  public getAllowedTools(): string[] {
    return Array.from(this.allowedToolsSet);
  }

  public getDeniedTools(): string[] {
    return Array.from(this.deniedToolsSet);
  }

  public isToolAllowed(tool: string): boolean {
    return this.allowedToolsSet.has(tool) || !this.deniedToolsSet.has(tool);
  }

  private updateAllowedTools(): void {
    this.allowedToolsSet.clear();
    this.deniedToolsSet = new Set(this.allTools);

    getAllowedTools(this.currentModeConfig, this.allTools).forEach((tool) => {
      this.allowedToolsSet.add(tool);
      this.deniedToolsSet.delete(tool);
    });
  }

  private isValidMode(mode: string): boolean {
    return MODE_CONFIG.some((m) => m.name === mode.toLowerCase());
  }
}

/**
 * Factory function to create a new instance of ToolManager
 * @returns ToolManager instance
 */
export function createToolManager(): ToolManager {
  return new ToolManager();
}
//#endregion

//#region Lifecycle and Command Registration
export default function (pi: ExtensionAPI) {
  const toolManager = createToolManager();

  // Initialize state on start
  pi.on("session_start", async (_, ctx) => {
    const entries = [...ctx.sessionManager.getBranch()].reverse();

    for (const entry of entries) {
      if (entry.type !== "message") {
        continue;
      }

      const mode = (entry.message as SafeStatefulMessage)?.details?.mode;

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
            `Current mode: ${toolManager.getCurrentMode()}`,
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

    ctx.ui.notify(`Switched to ${mode} mode`, "info");

    ctx.ui.setWidget(UI_KEY, undefined, { placement: "aboveEditor" });
    ctx.ui.setWidget(UI_KEY, [`Mode: ${mode}`], {
      placement: "aboveEditor",
    });

    if (ctx.isIdle()) return;

    ctx.ui.notify(
      `New mode will take effect after the current interaction has completed`,
      "info",
    );
  }

  function listValidModes(ctx: ExtensionContext, toolName?: string) {
    ctx.ui.notify(
      `Valid modes: ${getValidModeNames(toolName).join(", ")}`,
      "info",
    );
  }
}

//#endregion
