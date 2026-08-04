import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getAgentDir, ThemeColor } from "@earendil-works/pi-coding-agent";

import {
  BUILT_IN_MODES,
  DEFAULT_MODE_ICON,
  MODES_FILE_NAME,
} from "./constants";
import { ModeConfig, Permission } from "./types";

const VALID_PERMISSIONS: readonly Permission[] = ["read", "write", "web"];

export type LoadedUserModes = {
  modes: ModeConfig[];
  errors: string[];
};

export type ModeValidation =
  { ok: true; mode: ModeConfig } | { ok: false; error: string };

/**
 * Resolve the absolute path to the pi-mode-manager.json file in pi's agents
 * directory. Uses pi's canonical getAgentDir(), which respects the
 * PI_CODING_AGENT_DIR environment variable and falls back to ~/.pi/agent
 * (or the fork-specific config dir).
 */
export function resolveModesFilePath(): string {
  return join(getAgentDir(), MODES_FILE_NAME);
}

/**
 * Load and validate user-defined modes from pi-mode-manager.json in the agents
 * directory. A missing file is fine (no user modes); a broken or invalid file
 * yields descriptive errors so the caller can fall back to the built-ins.
 */
export async function loadUserModes(): Promise<LoadedUserModes> {
  let raw: string;
  let parsed: unknown;
  const filePath = resolveModesFilePath();

  try {
    raw = await readFile(filePath, "utf8");
  } catch (err: unknown) {
    if (isErrorWithCode(err, "ENOENT")) {
      return { modes: [], errors: [] };
    }

    return {
      modes: [],
      errors: [`Could not read ${filePath}: ${errorMessage(err)}`],
    };
  }

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { modes: [], errors: [`${filePath} is not valid JSON`] };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      modes: [],
      errors: [`${filePath} must contain an object, e.g. { "modes": [...] }`],
    };
  }

  const rawModes = (parsed as Record<string, unknown>).modes;
  if (rawModes === undefined) {
    // Empty config file: nothing to add.
    return { modes: [], errors: [] };
  }

  if (!Array.isArray(rawModes)) {
    return { modes: [], errors: [`${filePath}: "modes" must be an array`] };
  }

  const modes: ModeConfig[] = [];
  const errors: string[] = [];
  const usedNames = new Set<string>(BUILT_IN_MODES.map((m) => m.name));

  rawModes.forEach((entry, index) => {
    const result = validateMode(entry, usedNames);

    if (result.ok) {
      usedNames.add(result.mode.name);
      modes.push(result.mode);
    } else {
      errors.push(`${filePath}: mode #${index + 1}: ${result.error}`);
    }
  });

  return { modes, errors };
}

/**
 * Validate a single user-defined mode entry
 *
 * Uses whitelist extraction only; the parsed object is never spread or
 * merged, so prototype-polluting keys like "__proto__" cannot leak into the
 * resulting mode config
 */
function validateMode(entry: unknown, usedNames: Set<string>): ModeValidation {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return { ok: false, error: "mode is not an object" };
  }

  const raw = entry as Record<string, unknown>;

  const name = raw.name;
  if (typeof name !== "string" || usedNames.has(name)) {
    return { ok: false, error: `invalid name "${name}"` };
  }

  const description = raw.description;
  if (typeof description !== "string" || description.trim().length === 0) {
    return { ok: false, error: `mode "${name}" is missing a description` };
  }

  const rawPermissions = raw.permissions;
  if (!Array.isArray(rawPermissions) || rawPermissions.length === 0) {
    return {
      ok: false,
      error: `mode "${name}" must have a non-empty "permissions" array`,
    };
  }

  const permissions: Permission[] = [];
  for (const permission of rawPermissions) {
    if (
      typeof permission !== "string" ||
      !VALID_PERMISSIONS.includes(permission as Permission)
    ) {
      return {
        ok: false,
        error: `mode "${name}" has an invalid permission "${String(permission)}" (expected one of read, write, web)`,
      };
    }

    if (!permissions.includes(permission as Permission)) {
      permissions.push(permission as Permission);
    }
  }

  let extraInstructions: string | undefined;
  if (raw.extraInstructions !== undefined) {
    if (typeof raw.extraInstructions !== "string") {
      return {
        ok: false,
        error: `mode "${name}" has a non-string "extraInstructions"`,
      };
    }

    extraInstructions = raw.extraInstructions;
  }

  let icon = DEFAULT_MODE_ICON;
  if (raw.icon !== undefined) {
    if (typeof raw.icon !== "string") {
      return {
        ok: false,
        error: `mode "${name}" has a non-string "icon"`,
      };
    }

    icon = raw.icon;
  }

  let color: string | undefined;
  if (raw.color !== undefined) {
    if (typeof raw.color !== "string") {
      return {
        ok: false,
        error: `mode "${name}" has a non-string "color"`,
      };
    }

    color = raw.color;
  }

  return {
    ok: true,
    mode: {
      icon,
      name,
      color: color as ThemeColor,
      description: description.trim(),
      permissions,
      extraInstructions,
    },
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isErrorWithCode(err: unknown, code: string): boolean {
  return err instanceof Error && (err as { code?: unknown }).code === code;
}
