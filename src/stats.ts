export interface StatsMeasurement {
  ttftMs: number;
  tokensPerSec: number;
  totalTokens: number;
  contextPct: number | null;
}

export interface StatsState {
  last: StatsMeasurement | null;
  /** Mutable in-flight tracking */
  t0: number | null;
  t1: number | null;
  charsAccum: number;
}

export function createStatsState(): StatsState {
  return { last: null, t0: null, t1: null, charsAccum: 0 };
}

export function resetForTurn(s: StatsState, now: number): void {
  s.t0 = now;
  s.t1 = null;
  s.charsAccum = 0;
}

export function markFirstToken(s: StatsState, now: number): void {
  if (s.t1 === null) s.t1 = now;
}

/**
 * Commit measurement at message_end. tokens = from usage if known, else chars/4 fallback.
 * Note: callers (stats-collector) set `s.charsAccum` by *assignment* to the cumulative
 * text length seen so far on each `message_update`, not by delta. Pi's `message_update`
 * carries the full assistant message at each step, so this works. If pi ever switches
 * to delta-only updates, this fallback will under-count tokens.
 */
export function commitTurn(
  s: StatsState,
  now: number,
  totalTokens: number | null,
  contextPct: number | null,
): void {
  if (s.t0 === null) return;
  const ttftMs = s.t1 !== null ? s.t1 - s.t0 : now - s.t0;
  const durationS = Math.max(0.001, (now - s.t0) / 1000);
  const fallback = Math.round(s.charsAccum / 4);
  const tokens = totalTokens ?? fallback;
  const tokensPerSec = tokens / durationS;
  s.last = { ttftMs: Math.round(ttftMs), tokensPerSec, totalTokens: tokens, contextPct };
  s.t0 = null;
  s.t1 = null;
  s.charsAccum = 0;
}

export function formatStatusLine(s: StatsState): string {
  if (!s.last) return "";
  const tps = s.last.tokensPerSec.toFixed(1);
  const ctxFrag = s.last.contextPct !== null ? ` · ctx ${s.last.contextPct}%` : "";
  return `${tps} t/s${ctxFrag}`;
}

/**
 * Live status during streaming. Uses chars/4 as a rolling token estimate since
 * provider usage is only delivered at message_end.
 */
export function formatLiveLine(s: StatsState, now: number): string {
  if (s.t0 === null) return "";
  if (s.t1 === null) return "⏱ waiting first token…";
  const ttftMs = s.t1 - s.t0;
  const elapsed = Math.max(0.001, (now - s.t1) / 1000);
  const tokens = Math.round(s.charsAccum / 4);
  const tps = (tokens / elapsed).toFixed(1);
  return `TTFT ${ttftMs}ms · ~${tps} t/s · ~${tokens} tok`;
}

export function formatDetail(s: StatsState): string {
  if (!s.last) return "No measurement yet.";
  return [
    `TTFT: ${s.last.ttftMs} ms`,
    `Rate: ${s.last.tokensPerSec.toFixed(1)} t/s`,
    `Tokens: ${s.last.totalTokens} tokens`,
    `Context: ${s.last.contextPct ?? "?"}%`,
  ].join(" · ");
}

let sharedState: StatsState | null = null;
export function getSharedStats(): StatsState {
  if (!sharedState) sharedState = createStatsState();
  return sharedState;
}
