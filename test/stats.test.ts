import { describe, it, expect } from "vitest";
import { createStatsState, formatStatusLine, formatDetail } from "../src/stats.js";

describe("stats", () => {
  it("formats status line with t/s and ctx%", () => {
    const s = createStatsState();
    s.last = { ttftMs: 300, tokensPerSec: 12.34, totalTokens: 200, contextPct: 42 };
    expect(formatStatusLine(s)).toBe("12.3 t/s · ctx 42%");
  });

  it("returns empty status line when no measurement", () => {
    expect(formatStatusLine(createStatsState())).toBe("");
  });

  it("formats detail block", () => {
    const s = createStatsState();
    s.last = { ttftMs: 320, tokensPerSec: 18.7, totalTokens: 412, contextPct: 55 };
    const txt = formatDetail(s);
    expect(txt).toContain("TTFT: 320 ms");
    expect(txt).toContain("18.7 t/s");
    expect(txt).toContain("412 tokens");
    expect(txt).toContain("55%");
  });
});
