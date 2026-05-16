import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface ProfileFile {
  /** `provider/modelId` form (e.g., "ollama/qwen3-coder:30b") */
  model: string;
  personality?: string | null;
  num_ctx?: number;
}

export function listProfiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.slice(0, -5))
    .sort();
}

export function loadProfile(dir: string, name: string): ProfileFile | null {
  const file = join(dir, `${name}.json`);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof (parsed as { model?: unknown }).model !== "string") {
      return null;
    }
    return parsed as ProfileFile;
  } catch {
    return null;
  }
}
