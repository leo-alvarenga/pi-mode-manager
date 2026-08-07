import {
  DynamicBorder,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import {
  Container,
  type SelectItem,
  SelectList,
  Text,
} from "@earendil-works/pi-tui";

import { loadUserAgents } from "./config";
import { createAgentManager } from "./tools";
import { AgentState } from "./types";
import { BUILT_IN_AGENTS, DEFAULT_AGENT, AGENT_DATA_KEY } from "./constants";
import {
  isValidAgent,
  getHelpText,
  getValidAgentNames,
  getPermissionBadges,
  capitalize,
} from "./utils";
import { createLogger, Logger } from "./logger";

export default async function (pi: ExtensionAPI) {
  // Load user-defined agents from pi-agent-manager.json in the agents dir.
  // User agents can redefine the built-in `plan`/`build` agents (see below).
  const { agents: userAgents, errors: configErrors } = await loadUserAgents();

  let logger: Logger;

  // Built-in agents come first so picker/completion/help order is stable, and
  // user agents extend rather than displace them. A user agent that redefines
  // a built-in (`plan`/`build`) still wins: the built-in of the same name is
  // dropped by the filter below, so it never appears twice.
  const userNames = new Set(userAgents.map((m) => m.name));
  const agents = [
    ...BUILT_IN_AGENTS.filter((m) => !userNames.has(m.name)),
    ...userAgents,
  ];
  const agentManager = createAgentManager(agents);

  // Initialize state on start
  pi.on("session_start", async (_, ctx) => {
    logger = createLogger(ctx);

    if (configErrors.length > 0) {
      logger.log(
        `${configErrors.length} problem(s) in pi-agent-manager.json; affected agents were skipped`,
        "error",
      );
    }

    // Start from the most recent agent in the session history, if available
    const entries = [...ctx.sessionManager.getBranch()].reverse();
    let agent: string | undefined = undefined;

    for (const entry of entries) {
      if (entry.type !== "custom" || entry.customType !== AGENT_DATA_KEY) {
        continue;
      }

      const possibleState = entry.data as Partial<AgentState>;

      if (agent && isValidAgent(agent, agents)) {
        agent = possibleState?.currentAgent;

        break;
      }
    }

    setAgent(agent || DEFAULT_AGENT, ctx, true);
  });

  // Add pre-prompt instructions based on the current agent
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: event.systemPrompt + agentManager.getPrePromptInstructions(),
    };
  });

  // Commands
  pi.registerCommand("agents_help", {
    description: "Learn about PiAgent and its agents/agents",

    handler: async () => {
      logger.log(getHelpText(agents, logger), "info");
    },
  });

  pi.registerCommand("agents", {
    description: "Pick an agent (or switch by name)",

    getArgumentCompletions: async (partial: string) => {
      return new Promise((resolve) =>
        resolve(
          agents
            .filter(({ name }) => name.startsWith(partial.toLowerCase()))
            .map((agent) => {
              let label = capitalize(agent.name);

              if (agent.icon) {
                label = `${agent.icon} ${label}`;
              }

              return {
                label,
                value: agent.name,
              };
            }),
        ),
      );
    },

    handler: async (args: string | undefined, ctx: ExtensionCommandContext) => {
      try {
        // No argument: open the interactive OpenCode-style agent picker.
        if (!args) {
          const chosen = await openAgentPicker(ctx);

          if (!chosen) {
            return;
          }

          setAgent(chosen, ctx);

          return;
        }

        const requested = args.trim().toLowerCase();
        if (!isValidAgent(requested, agents)) {
          listValidAgents();

          logger.log(
            `Unknown agent "${requested}". Use /agents to open the picker or pass a valid agent name.`,
            "error",
          );

          return;
        }

        setAgent(requested, ctx);
      } catch (e) {
        logger.log(`Failed to switch agent: ${e}`, "error");
      }
    },
  });

  // Soft "ask" gate: when the current agent has the "ask" permission, every
  // write/exec tool call is gated behind a user confirmation (OpenCode's
  // "Plan = ask, not block" semantics). Tools stay active; the user can
  // decline any single call.
  pi.on("tool_call", async (event, ctx) => {
    if (!agentManager.requiresConfirmation(event.toolName)) {
      return;
    }

    const ok = await ctx.ui.confirm(
      "Approval required",
      `Allow \`${event.toolName}\` to run in "${agentManager.getCurrentAgent()}" agent?`,
    );

    if (ok) {
      return;
    }

    return { block: true, reason: "Declined by the agent's ask permissions" };
  });

  async function openAgentPicker(
    ctx: ExtensionCommandContext,
  ): Promise<string | null> {
    const current = agentManager.getCurrentAgent();

    const items: SelectItem[] = agents.map((agent) => {
      const isCurrent = agent.name === current;
      const label = `${agent.icon ? agent.icon + " " : ""}${capitalize(agent.name)}${
        isCurrent ? "  ● current" : ""
      }`;
      const description = `${getPermissionBadges(agent)}  ─  ${agent.description}`;

      return { value: agent.name, label, description };
    });

    return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const container = new Container();

      container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

      container.addChild(
        new Text(theme.fg("accent", theme.bold("Select an agent")), 1, 0),
      );

      const selectList = new SelectList(items, Math.min(items.length, 10), {
        selectedPrefix: (t) => theme.fg("accent", t),
        selectedText: (t) => theme.fg("accent", t),
        description: (t) => theme.fg("dim", t),
        scrollInfo: (t) => theme.fg("dim", t),
        noMatch: (t) => theme.fg("warning", t),
      });

      selectList.onSelect = (item) => done(item.value);
      selectList.onCancel = () => done(null);
      container.addChild(selectList);

      container.addChild(
        new Text(
          theme.fg(
            "dim",
            "↑↓ navigate · enter select · esc cancel · type to filter",
          ),
          1,
          0,
        ),
      );

      container.addChild(
        new DynamicBorder((s: string) => theme.fg("accent", s)),
      );

      return {
        render: (w) => container.render(w),
        invalidate: () => container.invalidate(),
        handleInput: (data) => {
          selectList.handleInput(data);
          tui.requestRender();
        },
      };
    });
  }

  // Helper functions
  function setAgent(agent: string, ctx?: ExtensionContext, silent = false) {
    agentManager.setAgent(agent, pi);

    if (!ctx || silent) return;
    const { name } = agentManager.getCurrentAgentConfig();

    let label = logger.fg("accent", capitalize(name));

    logger.log(`Agent set to ${label}`, "info");

    if (ctx.isIdle()) return;
    logger.log(
      "Agent change will take effect after the current interaction has completed",
      "info",
    );
  }

  function listValidAgents() {
    logger.log(`Valid agents: ${getValidAgentNames(agents).join(", ")}`, "info");
  }
}
