import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config.js";
import { paths } from "../paths.js";

interface HeaderState {
  modelId: string;
  detected: string[];
  requestRender: (() => void) | null;
}

const state: HeaderState = {
  modelId: "no model selected",
  detected: [],
  requestRender: null,
};

export function refreshHeader(): void {
  state.requestRender?.();
}

function buildLine(): string {
  const cfg = loadConfig(paths.configFile());
  const parts: string[] = ["pi-ochat"];
  if (state.detected.length > 0) parts.push(state.detected.join("+"));
  parts.push(state.modelId);
  if (cfg.personality) parts.push(`personality: ${cfg.personality}`);
  if (cfg.profile) parts.push(`profile: ${cfg.profile}`);
  return parts.join("  ·  ");
}

export function registerHeader(pi: ExtensionAPI, detected: string[]): void {
  state.detected = detected;

  pi.on("session_start", async (_event, ctx) => {
    state.modelId = ctx.model?.id ?? "no model selected";
    if (!ctx.hasUI) return;
    ctx.ui.setHeader((tui, theme) => {
      state.requestRender = () => tui.requestRender();
      return {
        render(_width: number) {
          const accent = theme.fg("accent", buildLine());
          return ["", accent, ""];
        },
        invalidate() {
          tui.requestRender();
        },
      };
    });
  });

  pi.on("model_select", async (event) => {
    state.modelId = event.model?.id ?? state.modelId;
    refreshHeader();
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.setHeader(undefined);
    state.requestRender = null;
  });
}
