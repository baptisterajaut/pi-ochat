import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getSharedStats, formatDetail } from "../stats.js";

export function registerStatsCommands(pi: ExtensionAPI): void {
  const handler = async (
    _args: string,
    ctx: import("@earendil-works/pi-coding-agent").ExtensionCommandContext,
  ) => {
    ctx.ui.notify(formatDetail(getSharedStats()), "info");
  };

  pi.registerCommand("stats", { description: "Show last generation stats", handler });
  pi.registerCommand("st", { description: "Alias of /stats", handler });
}
