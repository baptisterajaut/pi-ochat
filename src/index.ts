import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { detectAndRegisterBackends } from "./backend-detect.js";

export default async function (pi: ExtensionAPI): Promise<void> {
  const detected = await detectAndRegisterBackends(pi);

  pi.on("session_start", async (_event, ctx) => {
    if (detected.length === 0) {
      ctx.ui.notify("pi-ochat: no local backends detected", "info");
    } else {
      ctx.ui.notify(`pi-ochat: detected ${detected.join(", ")}`, "info");
    }
  });
}
