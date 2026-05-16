import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { paths } from "./paths.js";
import { loadConfig } from "./config.js";
import { createDoublePress } from "./double-press.js";

export function registerShortcuts(pi: ExtensionAPI): void {
  const dp = createDoublePress(loadConfig(paths.configFile()).double_press_window_ms);

  const sendCmd = (cmd: string) => pi.sendUserMessage(cmd);

  pi.registerShortcut("ctrl+l", {
    description: "Clear chat (double-press)",
    handler: (ctx) => {
      dp.press("ctrl+l", "Press Ctrl+L again to clear chat", () => sendCmd("/clear"), (m) => ctx.ui.notify(m, "warning"));
    },
  });

  pi.registerShortcut("ctrl+r", {
    description: "Retry last response (double-press)",
    handler: (ctx) => {
      dp.press("ctrl+r", "Press Ctrl+R again to retry", () => sendCmd("/retry"), (m) => ctx.ui.notify(m, "warning"));
    },
  });

  pi.registerShortcut("ctrl+u", {
    description: "Undo last exchange (double-press)",
    handler: (ctx) => {
      dp.press("ctrl+u", "Press Ctrl+U again to undo", () => sendCmd("/undo"), (m) => ctx.ui.notify(m, "warning"));
    },
  });

  pi.registerShortcut("ctrl+g", {
    description: "Generate user message suggestion",
    handler: (ctx) => {
      if (ctx.ui.getEditorText().trim().length > 0) return;
      sendCmd("/impersonate");
    },
  });
}
