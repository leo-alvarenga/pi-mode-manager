import { WEB_TOOLS, WRITE_TOOLS } from "./constants";
import { ModeConfig, WebTool, WriteTool } from "./types";
import { Logger } from "./logger";

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncateString(
  str: string,
  maxLength: number,
  suffix = " [...]",
): string {
  const maxAllowedLength = maxLength - suffix.length;

  if (str.length <= maxAllowedLength) {
    return str;
  }

  return str.slice(0, maxAllowedLength) + suffix;
}

/**
 * Checks if the provided mode is valid for the given mode configuration
 * @param mode - The mode to validate
 * @param modes - The available mode configurations
 * @returns boolean indicating if the mode is valid
 */
export function isValidMode(mode: string, modes: ModeConfig[]): boolean {
  return modes.some((m) => m.name === mode.toLowerCase());
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
 * @param modes - The available mode configurations
 * @param toolName - Optional tool name to filter valid modes
 * @returns ModeConfig[] list of valid modes
 */
export function getValidModes(
  modes: ModeConfig[],
  toolName?: string,
): ModeConfig[] {
  let modesWithTool: ModeConfig[] = modes;

  if (toolName?.length) {
    modesWithTool = modes.filter((m) => isToolAllowed(toolName, m));
  }

  return modesWithTool;
}

/**
 * Returns a string of valid mode names, optionally filtered by a tool name
 * @param modes - The available mode configurations
 * @param toolName - Optional tool name to filter valid modes
 * @returns string list of valid mode names
 */
export function getValidModeNames(
  modes: ModeConfig[],
  toolName?: string,
): string[] {
  return getValidModes(modes, toolName).map((m) => m.name);
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

function permissionToString(permission: string, logger: Logger): string {
  switch (permission) {
    case "read":
      return logger.fg("success", "read");
    case "write":
      return logger.fg("error", "write");
    case "web":
      return logger.fg("warning", "web");
    default:
      return permission;
  }
}

function modeToString(
  {
    color,
    icon,
    name,
    description,
    permissions,
    extraInstructions,
  }: ModeConfig,
  logger: Logger,
): string {
  let label = capitalize(name);
  if (icon) {
    label = `${icon} ${label}`;
  }

  label = logger.bold(logger.fg(color ?? "accent", label));

  const instructions = logger.fg("muted", extraInstructions || "(Empty)");

  return `
  - ${label}
    - Description: ${description}
    - Permissions: ${permissions.map((perm) => permissionToString(perm, logger)).join(", ")}
    - Extra Instructions: ${truncateString(instructions, 60)}
`;
}

/**
 * Returns a help text string that describes the PiModeManager, available modes, permissions, and usage instructions
 * @param modes - The available mode configurations
 * @returns string help text
 */
export function getHelpText(modes: ModeConfig[], logger: Logger): string {
  return `
This extension helps you manage what you agent can do by hiding or showing tools based on the current mode.
Each mode has specific ${logger.bold(logger.fg("warning", "permissions"))} that determine which ${logger.bold(logger.fg("toolTitle", "tools"))} are accessible.
Use the ${logger.bold(logger.fg("accent", "\`mode\`"))} command to switch between modes and control the agent's capabilities.

${logger.bold(logger.fg("accent", "> Available modes"))}
${modes.map((m) => modeToString(m, logger)).join("\n")}

${logger.bold(logger.fg("accent", "> Permissions"))}
  - ${permissionToString("read", logger)}: Allows the agent to read files and access information
  - ${permissionToString("write", logger)}: Allows the agent to modify files, execute commands, and perform write operations
  - ${permissionToString("web", logger)}: Allows the agent to access web tools for searching and fetching data

${logger.bold(logger.fg("accent", "> Usage"))}
  - ${logger.fg("success", "read")}: Allows the agent to read files and access information
  - To switch modes: \`mode <mode_name>\`
`;
}
