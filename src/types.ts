import { ThemeColor } from "@earendil-works/pi-coding-agent";

export type WriteTool =
  "write" | "edit" | "delete_file" | "bash" | "shell" | "run" | "exec";

export type WebTool =
  "web-search" | "http-get" | "http-post" | "web" | "fetch" | "api";

export type Permission = "read" | "write" | "web";

/**
 * Configuration for each mode, defining its name and allowed permissions
 * */
export type ModeConfig = {
  name: string;
  icon?: string;
  color?: ThemeColor;
  description: string;
  permissions: Permission[];
  extraInstructions?: string;
};

export type ToolManagerState = {
  currentMode: string;
  currentModeConfig: ModeConfig;

  deniedTools: string[];
  allowedTools: string[];
};
