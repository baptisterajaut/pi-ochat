import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { BuildSystemPromptOptions } from "@earendil-works/pi-coding-agent";
import { paths } from "../paths.js";
import { loadConfig } from "../config.js";
import { loadPersonality } from "../personalities.js";
import { rebuildWithoutLocalContext } from "../strip-context.js";

// Deep-import buildSystemPrompt, bypassing the package's exports map (which only
// exposes "." and "./hooks"). Strategy: walk the Node.js module resolution paths
// from this file's location and find the package's dist file via absolute path.
// Using package-name form ("@earendil-works/.../dist/core/system-prompt.js") would
// trigger exports-map enforcement; absolute paths bypass it.
// If this ever breaks on a pi upgrade, the warning below fires and /project toggle
// becomes a no-op — personality prepend still works.
const _requireCjs = createRequire(import.meta.url);
const _searchPaths = _requireCjs.resolve.paths("@earendil-works/pi-coding-agent") ?? [];
const _subpath = "@earendil-works/pi-coding-agent/dist/core/system-prompt.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let buildSystemPrompt: ((options: BuildSystemPromptOptions) => string) | null = null;
for (const base of _searchPaths) {
  const candidate = join(base, _subpath);
  if (existsSync(candidate)) {
    try {
      const mod = _requireCjs(candidate) as {
        buildSystemPrompt?: (options: BuildSystemPromptOptions) => string;
      };
      if (typeof mod.buildSystemPrompt === "function") {
        buildSystemPrompt = mod.buildSystemPrompt;
      }
    } catch {
      // Ignore load errors; keep searching or fall through to warning.
    }
    break; // Found the file (even if load failed), stop searching.
  }
}

if (buildSystemPrompt === null) {
  console.warn(
    "[pi-ochat] buildSystemPrompt not available via deep import: " +
      "/project off will be a static no-op pending pi upstream export support.",
  );
}

export function registerSystemPromptHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event, _ctx) => {
    const config = loadConfig(paths.configFile());

    let prompt = event.systemPrompt;

    // /project toggle: filter out project-local context files so that the
    // assembled system prompt only contains global (~/.pi/agent/) context.
    // Requires buildSystemPrompt from pi internals (deep import via absolute path).
    // If the deep import failed at load time, this block is skipped (no-op).
    if (!config.append_local_prompt && buildSystemPrompt !== null) {
      prompt = rebuildWithoutLocalContext(
        event.systemPromptOptions,
        paths.agentDir(),
        buildSystemPrompt,
      );
    }

    // Personality prepend: load the configured personality and prepend it
    // to the system prompt so the LLM adopts the persona for this session.
    if (config.personality) {
      const persona = loadPersonality(paths.personalitiesDir(), config.personality);
      if (persona) {
        prompt = `${persona}\n\n${prompt}`;
      }
    }

    return { systemPrompt: prompt };
  });
}
