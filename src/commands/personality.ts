import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { paths } from "../paths.js";
import { loadConfig, saveConfig } from "../config.js";
import { listPersonalities } from "../personalities.js";
import { refreshHeader } from "../hooks/header.js";

export function registerPersonalityCommands(pi: ExtensionAPI): void {
  const handler = async (args: string, ctx: import("@earendil-works/pi-coding-agent").ExtensionCommandContext) => {
    const dir = paths.personalitiesDir();
    const names = listPersonalities(dir);
    const arg = args.trim();
    const config = loadConfig(paths.configFile());

    if (!arg) {
      if (names.length === 0) {
        ctx.ui.notify("No personalities in " + dir, "warning");
        return;
      }
      const active = config.personality ?? "(none)";
      const lines = names.map((n, i) => `${i + 1}. ${n}${n === config.personality ? " (active)" : ""}`).join("\n");
      ctx.ui.notify(`Personalities (active: ${active}):\n${lines}\n\nUse "/p none" to unset.`, "info");
      return;
    }

    let pick: string | null | "unset" = null;
    if (arg === "none" || arg === "off" || arg === "-") {
      pick = "unset";
    } else {
      const asNum = Number.parseInt(arg, 10);
      if (Number.isFinite(asNum) && asNum >= 1 && asNum <= names.length) {
        pick = names[asNum - 1] ?? null;
      } else if (names.includes(arg)) {
        pick = arg;
      }
    }
    if (!pick) {
      ctx.ui.notify(`Unknown personality: ${arg}`, "warning");
      return;
    }

    const next = pick === "unset" ? null : pick;
    saveConfig(paths.configFile(), { ...config, personality: next });
    refreshHeader();
    ctx.ui.notify(`personality: ${next ?? "(none)"} — starting new session`, "info");
    // The personality is prepended to the system prompt in `before_agent_start`,
    // which only fires when a session starts. Switching personality mid-session
    // would leave the previous persona baked into the history. Spawn a fresh
    // session so the new personality takes effect immediately.
    await ctx.newSession();
  };

  pi.registerCommand("p", { description: "List/switch personality", handler });
  pi.registerCommand("personality", { description: "List/switch personality", handler });
}
