import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export interface OchatConfig {
  personality: string | null;
  profile: string | null;
  auto_suggest: boolean;
  streaming: boolean;
  thinking: boolean;
  append_local_prompt: boolean;
  // When false, replace pi's self-aware base prompt ("You are an expert coding
  // assistant operating inside pi, a coding agent harness..." + Pi
  // documentation section) with a neutral one. Tools, guidelines, and context
  // are still appended by pi normally. Personality still prepends on top.
  pi_self_aware: boolean;
  double_press_window_ms: number;
}

export const DEFAULT_CONFIG: OchatConfig = {
  personality: "default",
  profile: null,
  auto_suggest: true,
  streaming: true,
  thinking: false,
  append_local_prompt: true,
  pi_self_aware: true,
  double_press_window_ms: 2000,
};

const KNOWN_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

export function loadConfig(path: string): OchatConfig {
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ...DEFAULT_CONFIG };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_CONFIG };
  const result: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (KNOWN_KEYS.has(k)) result[k] = v;
  }
  return result as unknown as OchatConfig;
}

export function saveConfig(path: string, config: OchatConfig): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), "utf8");
}
