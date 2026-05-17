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
    try { ctx.ui.setStatus(STATUS_KEY, "⏱ waiting first token…"); } catch { /* stale */ }
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
      try { if (live) ctx.ui.setStatus(STATUS_KEY, live); } catch { /* stale */ }
    }
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    const usage = (event.message as { usage?: { outputTokens?: number } }).usage;
    const totalTokens = typeof usage?.outputTokens === "number" ? usage.outputTokens : null;
    // ctx may be stale in --print mode by the time message_end resolves.
    let ctxPct: number | null = null;
    try {
      ctxPct = ctx.getContextUsage()?.percent ?? null;
    } catch {
      /* stale ctx; commit stats without context % */
    }
    commitTurn(state, Date.now(), totalTokens, ctxPct);
    const line = formatStatusLine(state);
    try {
      if (line) ctx.ui.setStatus(STATUS_KEY, line);
    } catch {
      /* stale ctx; status no longer visible anyway */
    }
  });
}
