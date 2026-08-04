import { ModeConfig, WebTool, WriteTool } from "./types";

/**
 * The built-in modes for the agent. Each mode has a name, a set of permissions, and a description. The permissions determine which tools the agent can access in that mode.
 * The description provides context for the mode's intended use case.
 * User-defined modes from pi-mode-manager.json are merged on top of these (see src/config.ts).
 */
export const BUILT_IN_MODES: ModeConfig[] = [
  {
    icon: "◆",
    name: "plan",
    color: "accent",
    permissions: ["read", "web"],
    description:
      "The agent can read files and access web tools, but cannot modify files or execute commands; This mode is suitable for planning and research tasks.",
    extraInstructions: `
If the requested task does not require multiple steps or is a plain question, the agent should answer directly without creating/modifying a TODO list.
The agent should create and keep a TODO list of tasks to complete, and should not execute any commands or modify files.
The agent should only read files and access web tools for research purposes.
`,
  },
  {
    icon: "◆",
    name: "build",
    color: "warning",
    permissions: ["read", "write"],
    description:
      "The agent can read and write/edit/delete files, but cannot access web tools; This mode is suitable for building and executing tasks.",
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
 * The list of tools that are considered "web" tools. These tools allow the agent to access web resources or APIs.
 */
export const WEB_TOOLS: WebTool[] = [
  "web-search",
  "http-get",
  "http-post",
  "web",
  "fetch",
  "api",
];

export const LOGGER_KEY = "pi-mode-manager";
export const LOGGER_PREFIX = `[${LOGGER_KEY}]`;

/**
 * The name of the optional JSON file, read from pi's agents directory, that
 * lets users define additional modes (see src/config.ts).
 */
export const MODES_FILE_NAME = `${LOGGER_KEY}.json`;

export const DEFAULT_MODE: string = BUILT_IN_MODES[0].name;

export const MODE_DATA_KEY = "pi-mode-manager-mode";
export const MODE_CHANGED_EVENT = "pi-mode-manager:mode-changed";

export const DEFAULT_MODE_ICON = "◆";
