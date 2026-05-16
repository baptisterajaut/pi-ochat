import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config.js";
import { paths } from "../paths.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

type Rgb = [number, number, number];

const DEEP: Rgb = [120, 30, 200];
const PURPLE: Rgb = [165, 70, 235];
const PINK: Rgb = [220, 110, 220];
const SOFT: Rgb = [240, 170, 220];
const PALETTE: Rgb[] = [DEEP, PURPLE, PINK, SOFT, PINK, PURPLE];

const TITLE_LINES = [
  "  ██████╗   ██████╗ ██╗  ██╗  █████╗  ████████╗",
  " ██╔═══██╗ ██╔════╝ ██║  ██║ ██╔══██╗ ╚══██╔══╝",
  " ██║   ██║ ██║      ███████║ ███████║    ██║   ",
  " ██║   ██║ ██║      ██╔══██║ ██╔══██║    ██║   ",
  " ╚██████╔╝ ╚██████╗ ██║  ██║ ██║  ██║    ██║   ",
  "  ╚═════╝   ╚═════╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝    ╚═╝   ",
];

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

function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function sampleGradient(position: number): Rgb {
  const wrapped = ((position % 1) + 1) % 1;
  const scaled = wrapped * PALETTE.length;
  const idx = Math.floor(scaled);
  const next = (idx + 1) % PALETTE.length;
  const t = scaled - idx;
  const a = PALETTE[idx]!;
  const b = PALETTE[next]!;
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function rgb([r, g, b]: Rgb, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`;
}

function gradientLine(text: string, phase: number): string {
  const chars = [...text];
  const span = Math.max(chars.length - 1, 1);
  return chars
    .map((char, i) => (char === " " ? char : rgb(sampleGradient(i / span + phase), char)))
    .join("");
}

function center(text: string, width: number): string {
  const len = [...text].length;
  if (len >= width) return text;
  return " ".repeat(Math.floor((width - len) / 2)) + text;
}

function subtitleText(): string {
  const cfg = loadConfig(paths.configFile());
  const parts: string[] = [];
  if (state.detected.length > 0) parts.push(state.detected.join("+"));
  parts.push(state.modelId);
  if (cfg.personality) parts.push(`personality: ${cfg.personality}`);
  if (cfg.profile) parts.push(`profile: ${cfg.profile}`);
  return parts.join("  ·  ");
}

function renderHeader(width: number): string[] {
  const titleWidth = [...TITLE_LINES[0]!].length;
  const lines = TITLE_LINES.map((line, row) => {
    const centered = titleWidth >= width ? line : center(line, width);
    return gradientLine(centered, row * 0.045);
  });
  const sub = center(subtitleText(), width);
  return ["", ...lines, `${BOLD}${gradientLine(sub, 0.18)}${RESET}`, ""];
}

export function registerHeader(pi: ExtensionAPI, detected: string[]): void {
  state.detected = detected;

  pi.on("session_start", async (_event, ctx) => {
    state.modelId = ctx.model?.id ?? "no model selected";
    if (!ctx.hasUI) return;
    ctx.ui.setHeader((tui) => {
      state.requestRender = () => tui.requestRender();
      return {
        render(width: number) {
          return renderHeader(width);
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
