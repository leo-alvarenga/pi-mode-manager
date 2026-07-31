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
  description: string;
  extraInstructions?: string;
  permissions: Permission[];
};

export type ToolManagerState = {
  currentMode: string;
  currentModeConfig: ModeConfig;

  deniedTools: string[];
  allowedTools: string[];
};
