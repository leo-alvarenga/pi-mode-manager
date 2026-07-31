import { SessionMessageEntry } from "@earendil-works/pi-coding-agent";

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
