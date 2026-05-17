import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { paths } from "../paths.js";
import { loadConfig, saveConfig } from "../config.js";
import type { OchatConfig } from "../config.js";

function toggleBool(key: keyof OchatConfig, ctx: ExtensionCommandContext, label: string): void {
  const file = paths.configFile();
  const cfg = loadConfig(file);
  const next = !cfg[key];
  saveConfig(file, { ...cfg, [key]: next });
  ctx.ui.notify(`${label}: ${next ? "on" : "off"}`, "info");
}

export function registerToggleCommands(pi: ExtensionAPI): void {
  pi.registerCommand("suggest", {
    description: "Toggle auto-suggest ghost line after each response",
    handler: async (_args, ctx) => toggleBool("auto_suggest", ctx, "auto-suggest"),
  });

  pi.registerCommand("stream", {
    description: "Toggle streaming vs buffered-with-*thought-for* output",
    handler: async (_args, ctx) => toggleBool("streaming", ctx, "streaming"),
  });

  pi.registerCommand("project", {
    description: "Toggle appending project-local AGENTS.md to the system prompt",
    handler: async (_args, ctx) => toggleBool("append_local_prompt", ctx, "project context"),
  });

  pi.registerCommand("pi-aware", {
    description: "Toggle pi's self-aware base prompt (you-are-coding-inside-pi framing)",
    handler: async (_args, ctx) => toggleBool("pi_self_aware", ctx, "pi self-awareness"),
  });

  const LEVELS: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
  pi.registerCommand("thinking", {
    description: "Set thinking level — usage: /thinking [off|minimal|low|medium|high|xhigh]",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      if (!arg) {
        const cur = pi.getThinkingLevel();
        ctx.ui.notify(`thinking: ${cur}  (levels: ${LEVELS.join(", ")})`, "info");
        return;
      }
      if (!LEVELS.includes(arg as ThinkingLevel)) {
        ctx.ui.notify(`unknown level "${arg}" — try one of: ${LEVELS.join(", ")}`, "warning");
        return;
      }
      const next = arg as ThinkingLevel;
      pi.setThinkingLevel(next);
      const cfg = loadConfig(paths.configFile());
      saveConfig(paths.configFile(), { ...cfg, thinking: next !== "off" });
      ctx.ui.notify(`thinking: ${next}`, "info");
    },
  });
}
