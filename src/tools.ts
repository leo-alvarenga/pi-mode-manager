import { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  DEFAULT_MODE,
  LOGGER_PREFIX,
  MODE_CHANGED_EVENT,
  MODE_DATA_KEY,
} from "./constants";
import { getAllowedTools } from "./utils";
import type { ModeConfig, ToolManagerState } from "./types";

/**
 * ToolManager class manages the current mode and allowed tools based on the mode configuration
 */
export class ToolManager {
  private readonly modes: ModeConfig[];

  private hasInitialized: boolean = false;

  private currentMode: string = DEFAULT_MODE;
  private currentModeConfig: ModeConfig;

  constructor(modes: ModeConfig[]) {
    this.modes = modes;
    this.currentModeConfig = modes[0];
  }

  private allTools: string[] = [];
  private deniedToolsSet: Set<string> = new Set();
  private allowedToolsSet: Set<string> = new Set();

  public initialize(pi: ExtensionAPI): void {
    if (this.hasInitialized) {
      return;
    }

    this.currentMode = DEFAULT_MODE;
    this.currentModeConfig =
      this.modes.find((m) => m.name === this.currentMode) || this.modes[0];

    this.allTools = [...pi.getAllTools().map((tool) => tool.name)];
  }

  public setMode(mode: string, pi: ExtensionAPI): void {
    this.initialize(pi);

    if (!this.isValidMode(mode)) {
      return;
    }

    this.currentMode = mode;
    this.currentModeConfig =
      this.modes.find((m) => m.name === this.currentMode) || this.modes[0];

    this.updateAllowedTools();

    this.updateDataEntry(pi);
    this.triggerModeChangedEvent(pi);
  }

  public getPrePromptInstructions(): string {
    const mode = this.getCurrentModeConfig();
    const deniedTools = this.getDeniedTools();
    const allowedTools = this.getAllowedTools();

    let instructions = [
      `\n`,
      `${LOGGER_PREFIX} Mode instructions`,
      `Current Agent Mode: ${mode.name}`,
      `Mode description: ${mode.description}`,
      `Allowed tools (${allowedTools.length}): ${allowedTools.join(", ")}`,
      `NOT available in this mode (${deniedTools.length}): ${deniedTools.join(", ")}`,
      "DO NOT ATTEMPT TO USE tools that are not allowed in this mode.",
      "Assume the user has set the mode intentionally and follow the mode's restrictions.",
      "The mode may have changed while you were working. Only the latest mode change applies: follow the mode instructions above and disregard any earlier mode instructions in the conversation.",
      "Remind the user to switch modes if they want to use tools that are not allowed in the current mode.",
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

  public getState(): ToolManagerState {
    return {
      currentMode: this.getCurrentMode(),
      currentModeConfig: this.getCurrentModeConfig(),
      deniedTools: this.getDeniedTools(),
      allowedTools: this.getAllowedTools(),
    };
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

  private updateDataEntry(pi: ExtensionAPI): void {
    pi.appendEntry(MODE_DATA_KEY, this.getState());
  }

  private triggerModeChangedEvent(pi: ExtensionAPI): void {
    pi.events.emit(MODE_CHANGED_EVENT, this.getState());
  }

  private isValidMode(mode: string): boolean {
    return this.modes.some((m) => m.name === mode.toLowerCase());
  }
}

/**
 * Factory function to create a new instance of ToolManager
 * @returns ToolManager instance
 */
export function createToolManager(modes: ModeConfig[]): ToolManager {
  return new ToolManager(modes);
}
