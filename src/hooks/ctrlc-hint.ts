import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PI_CTRLC_WINDOW_MS = 500;
const HINT_KEY = "ochat-ctrlc-hint";

/**
 * Pi's handleCtrlC (interactive-mode.js:2609) clears the editor on first press
 * and quits if a second press arrives within 500ms — silently. This hook adds
 * an "Ctrl+C again to quit" status line for the duration of that window.
 *
 * We observe terminal input via ctx.ui.onTerminalInput WITHOUT consuming, so
 * pi's native cascade keeps working. ctrl+c is reserved (cannot be intercepted
 * via registerShortcut), so this is the cleanest route.
 */
export function registerCtrlCHint(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    let lastPressMs = 0;
    let clearTimer: NodeJS.Timeout | null = null;

    ctx.ui.onTerminalInput((data) => {
      if (data !== "\x03") return undefined;
      const now = Date.now();
      const isDouble = now - lastPressMs < PI_CTRLC_WINDOW_MS;
      lastPressMs = now;

      if (clearTimer) clearTimeout(clearTimer);
      if (isDouble) {
        ctx.ui.setStatus(HINT_KEY, undefined);
        clearTimer = null;
      } else {
        ctx.ui.setStatus(HINT_KEY, "Ctrl+C again to quit");
        clearTimer = setTimeout(() => {
          ctx.ui.setStatus(HINT_KEY, undefined);
          clearTimer = null;
        }, PI_CTRLC_WINDOW_MS + 100);
      }
      return undefined;
    });
  });
}
