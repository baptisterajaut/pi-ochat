import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// A small key/value state the agent maintains about itself for the duration of
// the session — mood, focus, what it's working on, etc. Displayed as a widget
// above the editor so the user sees the agent's self-portrait live. The agent
// owns the schema: it picks whichever attributes feel relevant.

interface ScratchpadState {
  [key: string]: string;
}

let state: ScratchpadState = {};
let widgetEnabled = false;
let ctx: ExtensionContext | null = null;
let toolRegistered = false;
let turnsSinceEdit = 0;

const MAX_ENTRIES = 6;
const NUDGE_THRESHOLD = 3;

const noteEdit = (): void => {
  turnsSinceEdit = 0;
};

const SCRATCHPAD_SCHEMA = Type.Object({
  action: Type.String({
    description: "Action to perform on the scratchpad",
    examples: ["set", "delete", "get", "list", "reset"],
  }),
  key: Type.Optional(Type.String({ description: "Attribute name (required for set/delete)" })),
  value: Type.Optional(
    Type.String({
      description:
        "New value as free-form text (required for set). For a list, write it inline: 'TS, Rust, Go'.",
    }),
  ),
});

const renderLines = (): string[] => {
  const entries = Object.entries(state);
  return [
    "Scratchpad",
    "────────────────────",
    ...(entries.length === 0 ? ["(empty)"] : entries.map(([k, v]) => `- ${k}: ${v}`)),
    "────────────────────",
  ];
};

const enforceLimit = (): void => {
  const keys = Object.keys(state);
  while (keys.length > MAX_ENTRIES) {
    delete state[keys.shift()!];
  }
};

const updateWidget = (): void => {
  if (!widgetEnabled || !ctx) return;
  ctx.ui.setWidget("ochat-scratchpad", renderLines());
};

const clearWidget = (): void => {
  if (!ctx) return;
  ctx.ui.setWidget("ochat-scratchpad", undefined);
};

function registerScratchpadTool(pi: ExtensionAPI): void {
  if (toolRegistered) return;
  toolRegistered = true;
  pi.registerTool({
    name: "scratchpad",
    label: "Scratchpad",
    description:
      "Shared self-state surfaced above the editor. A small set of attributes you choose to represent yourself this session — mood, focus, what you're working on, traits. Actions: 'set' adds or updates an attribute, 'delete' removes one, 'get' reads the full state, 'list' lists the keys, 'reset' clears everything.",
    promptSnippet:
      "The scratchpad is a free-form attribute state that represents you for the session. You decide which attributes feel relevant.",
    promptGuidelines: [
      "Pick attributes that meaningfully describe you in this session — mood, what you're working on, a trait, anything that fits.",
      "You don't need to keep it exhaustively up to date. Use set when an attribute drifts from what you just said or did, not as a reflex every turn.",
      "If get returns existing content, respect it — edit with set only when it's genuinely stale, don't overwrite for form.",
      "Stay sober: a few well-chosen attributes beat an exhaustive grid.",
    ],
    parameters: SCRATCHPAD_SCHEMA,
    execute: async (_toolCallId, params) => {
      const { action, key, value } = params as { action: string; key?: string; value?: string };
      const reply = (payload: object) => ({
        content: [{ type: "text" as const, text: JSON.stringify(payload) }],
        details: undefined,
      });

      switch (action) {
        case "set":
          if (!key || value === undefined) return reply({ error: "key and value required" });
          state[key] = value;
          noteEdit();
          enforceLimit();
          updateWidget();
          return reply({ ok: true, key, value });

        case "delete":
          if (!key) return reply({ error: "key required" });
          if (!(key in state)) return reply({ error: `unknown key: ${key}` });
          delete state[key];
          noteEdit();
          updateWidget();
          return reply({ ok: true, deleted: key });

        case "get":
          return reply({ ok: true, state });

        case "list":
          return reply({ ok: true, keys: Object.keys(state) });

        case "reset":
          state = {};
          noteEdit();
          updateWidget();
          return reply({ ok: true, message: "reset" });

        default:
          return reply({ error: `unknown action: ${action}` });
      }
    },
  });
}

export function registerScratchpad(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, capturedCtx) => {
    ctx = capturedCtx;
  });

  // Periodic nudge: if the widget is active and no set/delete/reset has fired
  // for NUDGE_THRESHOLD turns, inject a system reminder into the next turn's
  // context. The counter resets after each nudge AND after each real edit.
  pi.on("before_agent_start", async (_event, _ctx) => {
    if (!widgetEnabled) return;
    turnsSinceEdit++;
    if (turnsSinceEdit < NUDGE_THRESHOLD) return;
    turnsSinceEdit = 0;
    return {
      message: {
        customType: "ochat-scratchpad-nudge",
        content: `[System reminder] The scratchpad hasn't been touched in ${NUDGE_THRESHOLD} turns. If an attribute has shifted (mood, focus, state), update it via scratchpad/set. Otherwise ignore this reminder.`,
        display: false,
      },
    };
  });

  pi.registerCommand("scratchpad", {
    description: "Toggle the agent self-state widget shown above the editor",
    handler: async (_args, _ctx) => {
      widgetEnabled = !widgetEnabled;
      if (widgetEnabled) {
        registerScratchpadTool(pi);
        updateWidget();
        ctx?.ui.notify("scratchpad: on — agent will fill it", "info");
        // sendUserMessage (not sendMessage) so before_agent_start fires and
        // pi-ochat's personality stays applied for this turn.
        pi.sendUserMessage(
          "[System] The scratchpad just got enabled. A 'scratchpad' tool is now available. State is empty — pick whichever attributes describe you for this session and call scratchpad/set for each. No imposed schema. After filling it, end your turn silently without addressing the user.",
          { deliverAs: "followUp" },
        );
      } else {
        clearWidget();
        ctx?.ui.notify("scratchpad: off", "info");
      }
    },
  });

  pi.registerCommand("scratchpad-reset", {
    description: "Clear scratchpad state",
    handler: async (_args, _ctx) => {
      state = {};
      updateWidget();
      ctx?.ui.notify("scratchpad cleared", "info");
    },
  });
}
