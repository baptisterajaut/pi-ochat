import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { paths } from "../paths.js";
import { loadConfig } from "../config.js";

interface StreamState {
  enabled: boolean;
  t0: number | null;
}

export function registerStreamBuffer(pi: ExtensionAPI): void {
  const state: StreamState = { enabled: true, t0: null };

  pi.on("before_provider_request", async (_event, ctx) => {
    state.enabled = loadConfig(paths.configFile()).streaming;
    state.t0 = Date.now();
    if (!state.enabled) {
      ctx.ui.setWorkingMessage("thinking (buffered)...");
    }
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (state.enabled || state.t0 === null) {
      ctx.ui.setWorkingMessage();
      state.t0 = null;
      return;
    }
    const dt = ((Date.now() - state.t0) / 1000).toFixed(1);
    state.t0 = null;
    ctx.ui.setWorkingMessage();

    const original = event.message;
    if (!Array.isArray(original.content)) return;
    const prefix = `*thought for ${dt}s*\n\n`;
    const newContent = original.content.map((p, i) => {
      if (i === 0 && (p as { type?: string }).type === "text") {
        return { ...(p as { type: "text"; text: string }), text: prefix + ((p as { text?: string }).text ?? "") };
      }
      return p;
    });
    return { message: { ...original, content: newContent } };
  });
}
