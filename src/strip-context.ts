import type { BuildSystemPromptOptions } from "@earendil-works/pi-coding-agent";

export interface ContextFile {
  path: string;
  content: string;
}

/** Keep only files whose path starts with `globalDir` (with or without trailing slash). */
export function filterContextFiles(files: ContextFile[] | undefined, globalDir: string): ContextFile[] {
  if (!files) return [];
  const prefix = globalDir.endsWith("/") ? globalDir : globalDir + "/";
  return files.filter((f) => f.path === globalDir || f.path.startsWith(prefix));
}

/**
 * Rebuild the system prompt with project-local context files dropped.
 *
 * NOTE: `buildSystemPrompt` is not exposed through the package's exports map
 * (only "." and "./hooks" are exported by @earendil-works/pi-coding-agent).
 * The caller (Task 11 before_agent_start hook) must supply it directly from
 * the extension runtime, which has access to the internal module. This keeps
 * strip-context free of any unresolvable deep-path import.
 */
export function rebuildWithoutLocalContext(
  options: BuildSystemPromptOptions,
  globalAgentDir: string,
  buildFn: (options: BuildSystemPromptOptions) => string,
): string {
  const filtered = filterContextFiles(options.contextFiles, globalAgentDir);
  return buildFn({ ...options, contextFiles: filtered });
}
