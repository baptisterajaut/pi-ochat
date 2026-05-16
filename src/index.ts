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
import { registerHelpCommand } from "./commands/help.js";
import { registerHeader } from "./hooks/header.js";
import { registerCtrlCHint } from "./hooks/ctrlc-hint.js";
import { paths } from "./paths.js";
import { ensureBundledPersonalities } from "./personalities.js";
import { loadConfig } from "./config.js";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const bundledPersonalitiesDir = join(here, "..", "personalities");

export default async function (pi: ExtensionAPI): Promise<void> {
  ensureBundledPersonalities(bundledPersonalitiesDir, paths.personalitiesDir());

  const legacyOchat = join(homedir(), ".config", "ochat");
  const noticeFile = join(paths.agentDir(), ".pi-ochat-migration-shown");
  if (existsSync(legacyOchat) && !existsSync(noticeFile)) {
    pi.on("session_start", async (_event, ctx) => {
      ctx.ui.notify(
        "pi-ochat: legacy ~/.config/ochat detected. See README for migration steps.",
        "info",
      );
    });
    writeFileSync(noticeFile, new Date().toISOString());
  }

  const detected = await detectAndRegisterBackends(pi);
  registerHeader(pi, detected);
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
  registerHelpCommand(pi);
  registerCtrlCHint(pi);

  pi.on("session_start", async (_event, ctx) => {
    if (detected.length === 0) {
      ctx.ui.notify("pi-ochat: no local backends detected", "info");
    } else {
      ctx.ui.notify(`pi-ochat: detected ${detected.join(", ")}`, "info");
    }
    const cfg = loadConfig(paths.configFile());
    if (cfg.profile) ctx.ui.setStatus("ochat-profile", `profile: ${cfg.profile}`);
  });
}
