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

export function addChunkChars(s: StatsState, chars: number): void {
  s.charsAccum += chars;
}

/** Commit measurement at message_end. tokens = from usage if known, else chars/4 fallback. */
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
