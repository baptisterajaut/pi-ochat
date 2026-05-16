import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  resetForTurn,
  markFirstToken,
  commitTurn,
  formatStatusLine,
  formatLiveLine,
  getSharedStats,
} from "../stats.js";

const STATUS_KEY = "ochat-stats";
const THROTTLE_MS = 250;

export function registerStatsCollector(pi: ExtensionAPI): void {
  const state = getSharedStats();
  let lastPushMs = 0;

  pi.on("before_provider_request", async (_event, ctx) => {
    resetForTurn(state, Date.now());
    lastPushMs = 0;
    ctx.ui.setStatus(STATUS_KEY, "⏱ waiting first token…");
  });

  pi.on("message_update", async (event, ctx) => {
    const now = Date.now();
    markFirstToken(state, now);
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
    if (now - lastPushMs >= THROTTLE_MS) {
      lastPushMs = now;
      const live = formatLiveLine(state, now);
      if (live) ctx.ui.setStatus(STATUS_KEY, live);
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
    if (line) ctx.ui.setStatus(STATUS_KEY, line);
  });
}
