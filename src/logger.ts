import {
  ExtensionContext,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";
import { LOGGER_PREFIX } from "./constants";

const TYPE_TO_PREFIX_COLOR: Record<string, ThemeColor> = {
  info: "accent",
};

export class Logger {
  private theme: Theme;
  private ctx: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.ctx = context;
    this.theme = context.ui.theme;
  }

  log(...args: Parameters<typeof this.ctx.ui.notify>) {
    const [message, type = "info"] = args;
    const prefix = this.getPrefix(type);

    this.ctx.ui.notify(`${prefix} ${message}`, type);
  }

  logAnonymous(...args: Parameters<typeof this.ctx.ui.notify>) {
    const [message, type = "info"] = args;

    this.ctx.ui.notify(`${message}`, type);
  }

  bold(...args: Parameters<typeof this.theme.bold>) {
    return this.theme.bold(...args);
  }

  italic(...args: Parameters<typeof this.theme.italic>) {
    return this.theme.italic(...args);
  }

  fg(...args: Parameters<typeof this.theme.fg>) {
    return this.safeFg(...args);
  }

  private safeFg(...args: Parameters<typeof this.theme.fg>) {
    try {
      return this.theme.fg(...args);
    } catch (error) {
      return args[1];
    }
  }

  getPrefix(type: string) {
    const fg = TYPE_TO_PREFIX_COLOR[type];
    let prefix = this.bold(LOGGER_PREFIX);

    if (!fg) return prefix;

    return this.fg(fg, prefix);
  }
}

export function createLogger(context: ExtensionContext) {
  return new Logger(context);
}
