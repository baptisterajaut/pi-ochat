import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem, AutocompleteProvider, AutocompleteSuggestions } from "@earendil-works/pi-tui";
import { paths } from "../paths.js";
import { loadConfig } from "../config.js";
import { loadInstructions } from "../instructions.js";
import { sideCallText } from "../side-call.js";

interface SuggestState {
  current: string | null;
  controller: AbortController | null;
}

function collectHistory(
  ctx: ExtensionContext,
  maxMsgs = 30,
): { role: "user" | "assistant"; text: string }[] {
  const entries = ctx.sessionManager.getBranch();
  const out: { role: "user" | "assistant"; text: string }[] = [];
  for (const e of entries) {
    if (e.type !== "message") continue;
    const role = e.message.role;
    if (role !== "user" && role !== "assistant") continue;
    const c = e.message.content;
    let text = "";
    if (typeof c === "string") text = c;
    else if (Array.isArray(c)) {
      text = c
        .filter((p): p is { type: "text"; text: string } => (p as { type?: string }).type === "text")
        .map((p) => p.text)
        .join("\n");
    }
    if (text) out.push({ role, text });
  }
  return out.slice(-maxMsgs);
}

function showWidget(ctx: ExtensionContext, text: string | null): void {
  if (!text) {
    ctx.ui.setWidget("ochat-suggest", undefined);
    return;
  }
  const theme = ctx.ui.theme;
  ctx.ui.setWidget(
    "ochat-suggest",
    [theme.fg("dim", `» ${text} (Tab to accept)`)],
    { placement: "belowEditor" },
  );
}

export function registerAutoSuggest(pi: ExtensionAPI): void {
  const state: SuggestState = { current: null, controller: null };

  // Register autocomplete provider once per session.
  // The factory wraps the built-in provider: when the editor is empty and we have
  // a suggestion, expose it as the single autocomplete item so native Tab accepts it.
  pi.on("session_start", (_event, ctx) => {
    try {
    ctx.ui.addAutocompleteProvider((current: AutocompleteProvider): AutocompleteProvider => ({
      async getSuggestions(lines, cursorLine, cursorCol, options): Promise<AutocompleteSuggestions | null> {
        const isEmpty = lines.length === 1 && (lines[0] ?? "").length === 0;
        if (isEmpty && state.current) {
          const item: AutocompleteItem = { value: state.current, label: state.current, description: "pi-ochat suggestion" };
          return { items: [item], prefix: "" };
        }
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      },
      applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
        if (prefix === "" && state.current && item.value === state.current) {
          state.current = null;
          showWidget(ctx, null);
          return { lines: [item.value], cursorLine: 0, cursorCol: item.value.length };
        }
        return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
      },
      shouldTriggerFileCompletion(lines, cursorLine, cursorCol): boolean {
        const isEmpty = lines.length === 1 && (lines[0] ?? "").length === 0;
        if (isEmpty && state.current) return true;
        return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
      },
    }));
    } catch { /* ctx stale (e.g., --print mode) */ }
  });

  // Cancel pending suggest and clear ghost line when user starts typing.
  pi.on("input", (_event, ctx) => {
    if (state.controller) {
      state.controller.abort();
      state.controller = null;
    }
    state.current = null;
    try { showWidget(ctx, null); } catch { /* ctx stale */ }
  });

  // Use `agent_end` (loop done), not `message_end` (fires after every tool
  // call, intermediate assistant message, and tool_result). Auto-suggest
  // should only fire once the model has actually stopped responding.
  pi.on("agent_end", async (_event, ctx) => {
    // Don't fire side-calls or touch UI in non-interactive (--print) mode.
    let hasUI = false;
    try { hasUI = ctx.hasUI; } catch { return; }
    if (!hasUI) return;
    const cfg = loadConfig(paths.configFile());
    if (!cfg.auto_suggest) return;
    if (ctx.ui.getEditorText().trim().length > 0) return;

    if (state.controller) state.controller.abort();
    const controller = new AbortController();
    state.controller = controller;

    const inst = loadInstructions().impersonate_short;
    const history = collectHistory(ctx);
    const result = await sideCallText(ctx, inst, history, controller.signal);
    if (controller.signal.aborted) return;
    state.controller = null;
    if (!result.ok || !result.text) {
      showWidget(ctx, null);
      return;
    }
    state.current = result.text;
    showWidget(ctx, result.text);
  });
}
