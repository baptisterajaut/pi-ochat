import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface SystemInstructions {
  impersonate: string;
  impersonate_short: string;
  compact?: string;
}

const FALLBACK: SystemInstructions = {
  impersonate: "Generate what the USER would say next. Reply with the user message text only.",
  impersonate_short: "Generate a short suggestion (under 15 words). Text only, no preamble.",
};

let cached: SystemInstructions | null = null;

/** Locate system_instructions.json relative to this source file. */
function locate(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/ is one level under the package root
  return join(here, "..", "system_instructions.json");
}

export function loadInstructions(): SystemInstructions {
  if (cached) return cached;
  const path = locate();
  if (!existsSync(path)) {
    cached = FALLBACK;
    return cached;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<SystemInstructions>;
    cached = {
      impersonate: parsed.impersonate ?? FALLBACK.impersonate,
      impersonate_short: parsed.impersonate_short ?? FALLBACK.impersonate_short,
      compact: parsed.compact,
    };
    return cached;
  } catch {
    cached = FALLBACK;
    return cached;
  }
}
