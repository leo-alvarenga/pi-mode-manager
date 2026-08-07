import { AgentConfig, PermissionBadges } from "./types";
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
 * Checks if the provided agent is valid for the given agent configuration
 * @param agent - The agent to validate
 * @param agents - The available agent configurations
 * @returns boolean indicating if the agent is valid
 */
export function isValidAgent(agent: string, agents: AgentConfig[]): boolean {
  return agents.some((m) => m.name === agent.toLowerCase());
}

/**
 * Compact, human-readable permission badge row for an agent (mimics OpenCode's
 * per-agent tool matrix). `ask` shows as a "soft write" badge (!).
 *
 * @example read ✓ · write ✓ · web ✗
 * @example read ✓ · write ! · web ✗   (ask policy)
 */
export function getPermissionBadges(agent: AgentConfig): string {
  const has = (p: "read" | "write" | "web" | "ask") =>
    agent.permissions.includes(p);

  const badges: PermissionBadges = {
    read: has("read") ? "✓" : "✗",
    write: has("write") ? "✓" : has("ask") ? "!" : "✗",
    web: has("web") ? "✓" : "✗",
  };

  return `read ${badges.read} · write ${badges.write} · web ${badges.web}`;
}

/**
 * Returns a string of valid agent names, optionally filtered by a tool name
 * @param agents - The available agent configurations
 * @param toolName - Optional tool name to filter valid agents
 * @returns AgentConfig[] list of valid agents
 */
/**
 * Returns the list of valid agent names.
 * @param agents - The available agent configurations
 * @returns string list of valid agent names
 */
export function getValidAgentNames(agents: AgentConfig[]): string[] {
  return agents.map((m) => m.name);
}

function permissionToString(permission: string, logger: Logger): string {
  switch (permission) {
    case "read":
      return logger.fg("success", "read");
    case "write":
      return logger.fg("error", "write");
    case "ask":
      return logger.fg("accent", "ask");
    case "web":
      return logger.fg("warning", "web");
    default:
      return permission;
  }
}

function agentToString(
  {
    color,
    icon,
    name,
    description,
    permissions,
    extraInstructions,
  }: AgentConfig,
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
 * Returns a help text string that describes the PiAgentManager, available agents, permissions, and usage instructions
 * @param agents - The available agent configurations
 * @returns string help text
 */
export function getHelpText(agents: AgentConfig[], logger: Logger): string {
  return `
This extension lets you pick the agent for a conversation. Each agent is a persona (a prompt plus a permission policy) that shapes how the agent behaves: it can be read-only, "ask" before write/exec, or fully unguarded.

${logger.bold(logger.fg("accent", "> Available agents"))}
${agents.map((m) => agentToString(m, logger)).join("\n")}

${logger.bold(logger.fg("accent", "> Permissions"))}
  - ${permissionToString("read", logger)}: Allows the agent to read files and access information
  - ${permissionToString("write", logger)}: Allows the agent to modify files, execute commands, and perform write operations without prompting
  - ${permissionToString("ask", logger)}: Allows write tools (edit, bash, ...) but asks the user before each one runs \u2013 a soft approval policy
  - ${permissionToString("web", logger)}: Allows the agent to access web tools for searching and fetching data

${logger.bold(logger.fg("accent", "> Usage"))}
  - To open the agent picker: \`/agents\` (arrow keys \u2191\u2193, enter to select, esc to cancel)
  - To switch agents directly: \`/agents <name>\`
  - To see this menu: \`/agents_help\`
`;
}
