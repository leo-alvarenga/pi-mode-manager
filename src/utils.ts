import {
  LOGGER_PREFIX,
  MODE_CONFIG,
  WEB_TOOLS,
  WRITE_TOOLS,
} from "./constants";
import { ModeConfig, WebTool, WriteTool } from "./types";

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
# ${LOGGER_PREFIX}

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
