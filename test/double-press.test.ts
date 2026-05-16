import { describe, it, expect, vi } from "vitest";
import { createDoublePress } from "../src/double-press.js";

describe("createDoublePress", () => {
  it("first press records, does not fire", () => {
    const action = vi.fn();
    const onPrompt = vi.fn();
    const dp = createDoublePress(2000);
    dp.press("ctrl+r", "Press again to retry", action, onPrompt, 1000);
    expect(action).not.toHaveBeenCalled();
    expect(onPrompt).toHaveBeenCalledWith("Press again to retry");
  });

  it("second press within window fires", () => {
    const action = vi.fn();
    const dp = createDoublePress(2000);
    dp.press("ctrl+r", "p", action, vi.fn(), 1000);
    dp.press("ctrl+r", "p", action, vi.fn(), 2500);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("second press after window only records again", () => {
    const action = vi.fn();
    const onPrompt = vi.fn();
    const dp = createDoublePress(2000);
    dp.press("ctrl+r", "p", action, onPrompt, 1000);
    dp.press("ctrl+r", "p", action, onPrompt, 5000);
    expect(action).not.toHaveBeenCalled();
    expect(onPrompt).toHaveBeenCalledTimes(2);
  });

  it("different keys do not interfere", () => {
    const a1 = vi.fn();
    const a2 = vi.fn();
    const dp = createDoublePress(2000);
    dp.press("ctrl+r", "p", a1, vi.fn(), 1000);
    dp.press("ctrl+l", "p", a2, vi.fn(), 1500);
    expect(a1).not.toHaveBeenCalled();
    expect(a2).not.toHaveBeenCalled();
  });
});
