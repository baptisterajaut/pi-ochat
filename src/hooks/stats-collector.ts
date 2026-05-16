import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { resetForTurn, markFirstToken, commitTurn, formatStatusLine, getSharedStats } from "../stats.js";

export function registerStatsCollector(pi: ExtensionAPI): void {
  const state = getSharedStats();

  pi.on("before_provider_request", async (_event, _ctx) => {
    resetForTurn(state, Date.now());
  });

  pi.on("message_update", async (event, _ctx) => {
    markFirstToken(state, Date.now());
    const msg = event.message;
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      let chars = 0;
      for (const p of msg.content) {
        if ((p as { type?: string }).type === "text") {
          chars += (p as { text?: string }).text?.length ?? 0;
        }
      }
      state.charsAccum = chars;
    }
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    const usage = (event.message as { usage?: { outputTokens?: number } }).usage;
    const totalTokens = typeof usage?.outputTokens === "number" ? usage.outputTokens : null;
    const ctxUsage = ctx.getContextUsage();
    const ctxPct = ctxUsage?.percent ?? null;
    commitTurn(state, Date.now(), totalTokens, ctxPct);
    const line = formatStatusLine(state);
    if (line) ctx.ui.setStatus("ochat-stats", line);
  });
}
