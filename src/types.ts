import { ThemeColor } from "@earendil-works/pi-coding-agent";

export type WriteTool =
  "write" | "edit" | "delete_file" | "bash" | "shell" | "run" | "exec";

export type Permission = "read" | "write" | "web" | "ask";

/**
 * Configuration for each agent, defining its name and allowed permissions
 */
export type AgentConfig = {
  name: string;
  icon?: string;
  color?: ThemeColor;
  description: string;
  permissions: Permission[];
  extraInstructions?: string;
};

/**
 * Visual permission badges for an agent, e.g. "read ✓ · write ✓ · web ✗".
 * `ask` counts as a soft "write" (tools stay active but require confirmation).
 */
export type PermissionBadges = Record<
  "read" | "write" | "web",
  "✓" | "✗" | "!"
>;

export type AgentState = {
  currentAgent: string;
  currentAgentConfig: AgentConfig;
};
