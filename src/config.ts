import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getAgentDir, ThemeColor } from "@earendil-works/pi-coding-agent";

import {
  BUILT_IN_AGENTS,
  DEFAULT_AGENT_ICON,
  AGENTS_FILE_NAME,
} from "./constants";
import { AgentConfig, Permission } from "./types";

const VALID_PERMISSIONS: readonly Permission[] = [
  "read",
  "write",
  "web",
  "ask",
];

export type LoadedUserAgents = {
  agents: AgentConfig[];
  errors: string[];
};

export type AgentValidation =
  { ok: true; agent: AgentConfig } | { ok: false; error: string };

/**
 * Resolve the absolute path to the pi-agent-manager.json file in pi's agents
 * directory. Uses pi's canonical getAgentDir(), which respects the
 * PI_CODING_AGENT_DIR environment variable and falls back to ~/.pi/agent
 * (or the fork-specific config dir).
 */
export function resolveAgentsFilePath(): string {
  return join(getAgentDir(), AGENTS_FILE_NAME);
}

/**
 * Load and validate user-defined agents from pi-agent-manager.json in the agents
 * directory. A missing file is fine (no user agents); a broken or invalid file
 * yields descriptive errors so the caller can fall back to the built-ins.
 */
export async function loadUserAgents(): Promise<LoadedUserAgents> {
  let raw: string;
  let parsed: unknown;
  const filePath = resolveAgentsFilePath();

  try {
    raw = await readFile(filePath, "utf8");
  } catch (err: unknown) {
    if (isErrorWithCode(err, "ENOENT")) {
      return { agents: [], errors: [] };
    }

    return {
      agents: [],
      errors: [`Could not read ${filePath}: ${errorMessage(err)}`],
    };
  }

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { agents: [], errors: [`${filePath} is not valid JSON`] };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      agents: [],
      errors: [`${filePath} must contain an object, e.g. { "agents": [...] }`],
    };
  }

  const rawAgents = (parsed as Record<string, unknown>).agents;
  if (rawAgents === undefined) {
    // Empty config file: nothing to add.
    return { agents: [], errors: [] };
  }

  if (!Array.isArray(rawAgents)) {
    return { agents: [], errors: [`${filePath}: "agents" must be an array`] };
  }

  let agents: AgentConfig[] = [];
  const errors: string[] = [];
  const usedNames = new Set<string>(BUILT_IN_AGENTS.map((m) => m.name));

  rawAgents.forEach((entry, index) => {
    const result = validateAgent(entry);

    if (result.ok) {
      if (usedNames.has(result.agent.name)) {
        agents = agents.filter((m) => m.name !== result.agent.name);
      } else {
        usedNames.add(result.agent.name);
      }

      agents.push(result.agent);
    } else {
      errors.push(`${filePath}: agent #${index + 1}: ${result.error}`);
    }
  });

  return { agents, errors };
}

/**
 * Validate a single user-defined agent entry
 *
 * Uses whitelist extraction only; the parsed object is never spread or
 * merged, so prototype-polluting keys like "__proto__" cannot leak into the
 * resulting agent config
 */
function validateAgent(entry: unknown): AgentValidation {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return { ok: false, error: "agent is not an object" };
  }

  const raw = entry as Record<string, unknown>;

  const name = raw.name;
  if (typeof name !== "string") {
    return { ok: false, error: `invalid name "${name}"` };
  }

  const description = raw.description;
  if (typeof description !== "string" || description.trim().length === 0) {
    return { ok: false, error: `agent "${name}" is missing a description` };
  }

  const rawPermissions = raw.permissions;
  if (!Array.isArray(rawPermissions) || rawPermissions.length === 0) {
    return {
      ok: false,
      error: `agent "${name}" must have a non-empty "permissions" array`,
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
        error: `agent "${name}" has an invalid permission "${String(permission)}" (expected one of read, write, ask, web)`,
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
        error: `agent "${name}" has a non-string "extraInstructions"`,
      };
    }

    extraInstructions = raw.extraInstructions;
  }

  let icon = DEFAULT_AGENT_ICON;
  if (raw.icon !== undefined) {
    if (typeof raw.icon !== "string") {
      return {
        ok: false,
        error: `agent "${name}" has a non-string "icon"`,
      };
    }

    icon = raw.icon;
  }

  let color: string | undefined;
  if (raw.color !== undefined) {
    if (typeof raw.color !== "string") {
      return {
        ok: false,
        error: `agent "${name}" has a non-string "color"`,
      };
    }

    color = raw.color;
  }

  return {
    ok: true,
    agent: {
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
