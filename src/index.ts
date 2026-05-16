import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("pi-ochat loaded", "info");
  });
}
