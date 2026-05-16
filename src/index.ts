import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { detectAndRegisterBackends } from "./backend-detect.js";
import { registerSystemPromptHook } from "./hooks/system-prompt.js";
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

  pi.on("session_start", async (_event, ctx) => {
    if (detected.length === 0) {
      ctx.ui.notify("pi-ochat: no local backends detected", "info");
    } else {
      ctx.ui.notify(`pi-ochat: detected ${detected.join(", ")}`, "info");
    }
  });
}
