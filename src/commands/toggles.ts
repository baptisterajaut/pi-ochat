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

  pi.registerCommand("thinking", {
    description: "Cycle thinking level: off → minimal → low → medium → high → xhigh → off",
    handler: async (_args, ctx) => {
      const order: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
      const cur = pi.getThinkingLevel();
      const idx = order.indexOf(cur);
      const next: ThinkingLevel = order[(idx + 1) % order.length] ?? "off";
      pi.setThinkingLevel(next);
      // Mirror in config for status display (boolean: on if any level != "off")
      const cfg = loadConfig(paths.configFile());
      saveConfig(paths.configFile(), { ...cfg, thinking: next !== "off" });
      ctx.ui.notify(`thinking: ${next}`, "info");
    },
  });
}
