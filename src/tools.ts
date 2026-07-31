import { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { ModeConfig } from "./types";
import { DEFAULT_MODE, getAllowedTools, MODE_CONFIG } from "./utils";

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
