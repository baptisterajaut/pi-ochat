import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { detectAndRegisterBackends } from "./backend-detect.js";
import { registerSystemPromptHook } from "./hooks/system-prompt.js";
import { registerPersonalityCommands } from "./commands/personality.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerImpersonateCommands } from "./commands/impersonate.js";
import { registerStatsCommands } from "./commands/stats.js";
import { registerStatsCollector } from "./hooks/stats-collector.js";
import { registerShortcuts } from "./shortcuts.js";
import { registerRetryCommand } from "./commands/retry.js";
import { registerUndoCommand } from "./commands/undo.js";
import { registerToggleCommands } from "./commands/toggles.js";
import { registerAutoSuggest } from "./hooks/auto-suggest.js";
import { registerStreamBuffer } from "./hooks/stream-buffer.js";
import { paths } from "./paths.js";
import { ensureBundledPersonalities } from "./personalities.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const bundledPersonalitiesDir = join(here, "..", "personalities");

export default async function (pi: ExtensionAPI): Promise<void> {
  ensureBundledPersonalities(bundledPersonalitiesDir, paths.personalitiesDir());
  const detected = await detectAndRegisterBackends(pi);
  registerSystemPromptHook(pi);
  registerPersonalityCommands(pi);
  registerProfileCommand(pi);
  registerImpersonateCommands(pi);
  registerStatsCollector(pi);
  registerStatsCommands(pi);
  registerShortcuts(pi);
  registerRetryCommand(pi);
  registerUndoCommand(pi);
  registerToggleCommands(pi);
  registerAutoSuggest(pi);
  registerStreamBuffer(pi);

  pi.on("session_start", async (_event, ctx) => {
    if (detected.length === 0) {
      ctx.ui.notify("pi-ochat: no local backends detected", "info");
    } else {
      ctx.ui.notify(`pi-ochat: detected ${detected.join(", ")}`, "info");
    }
  });
}
