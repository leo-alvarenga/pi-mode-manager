import { AgentConfig, WriteTool } from "./types";

/**
 * The built-in agents for the agent. Each agent has a name, a set of permissions, and a description. The permissions determine which tools the agent can access in that agent.
 * The description provides context for the agent's intended use case.
 * User-defined agents from pi-agent-manager.json are merged on top of these (see src/config.ts).
 */
export const BUILT_IN_AGENTS: AgentConfig[] = [
  {
    icon: "◆",
    name: "plan",
    color: "accent",
    permissions: ["read", "web", "ask"],
    description:
      "Reads files and researches the web freely; write/exec tools require explicit approval before they run (say, for planning and analysis).",
    extraInstructions: `
The agent should create and keep a TODO list of tasks to complete, and should prefer analysis over action.
Unless it has been given explicit approval for a specific write or command, it should not write files or run commands; if it needs to change the tree it should propose the change and ask for approval first.
It can read files and use web tools freely for research purposes.
`,
  },
  {
    icon: "◆",
    name: "build",
    color: "warning",
    permissions: ["read", "write"],
    description:
      "The agent can read and write/edit/delete files and run commands, but cannot access web tools; This agent is suitable for building and executing tasks.",
  },
];

/**
 * The list of tools that are considered "write" tools. These tools allow the agent to modify files or execute commands.
 */
export const WRITE_TOOLS: WriteTool[] = [
  "write",
  "edit",
  "delete_file",
  "bash",
  "shell",
  "run",
  "exec",
];

/**
 * Tools considered "web"/network tools. Used only to phrase the capability
 * policy in the system prompt (forbidden tools are not hard-disabled).
 */
export const WEB_TOOLS: string[] = [
  "web-search",
  "http-get",
  "http-post",
  "web",
  "fetch",
  "api",
];

export const LOGGER_KEY = "pi-agent-manager";
export const LOGGER_PREFIX = `[${LOGGER_KEY}]`;

/**
 * The name of the optional JSON file, read from pi's agents directory, that
 * lets users define additional agents (see src/config.ts).
 */
export const AGENTS_FILE_NAME = `${LOGGER_KEY}.json`;

export const DEFAULT_AGENT: string = BUILT_IN_AGENTS[0].name;

export const AGENT_DATA_KEY = "pi-agent-manager-agent";
export const AGENT_CHANGED_EVENT = "pi-agent-manager:agent-changed";

export const DEFAULT_AGENT_ICON = "◆";
