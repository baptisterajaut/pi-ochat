import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { loadInstructions } from "../instructions.js";
import { sideCallText } from "../side-call.js";

function collectHistory(ctx: ExtensionCommandContext, maxMsgs = 40): { role: "user" | "assistant"; text: string }[] {
  const entries = ctx.sessionManager.getBranch();
  const out: { role: "user" | "assistant"; text: string }[] = [];
  for (const e of entries) {
    if (e.type !== "message") continue;
    const role = e.message.role;
    if (role !== "user" && role !== "assistant") continue;
    const c = e.message.content;
    if (typeof c === "string") {
      out.push({ role, text: c });
    } else if (Array.isArray(c)) {
      const text = c
        .filter((p): p is { type: "text"; text: string } => (p as { type?: string }).type === "text")
        .map((p) => p.text)
        .join("\n");
      if (text) out.push({ role, text });
    }
  }
  return out.slice(-maxMsgs);
}

async function runImpersonate(ctx: ExtensionCommandContext, short: boolean): Promise<void> {
  const instructions = loadInstructions();
  const inst = short ? instructions.impersonate_short : instructions.impersonate;
  const history = collectHistory(ctx);

  const ctl = new AbortController();
  ctx.ui.notify(short ? "generating short suggestion..." : "generating suggestion...", "info");

  const result = await sideCallText(ctx, inst, history, ctl.signal);
  if (!result.ok) {
    ctx.ui.notify(`impersonate failed: ${result.error}`, "warning");
    return;
  }
  ctx.ui.setEditorText(result.text);
}

export function registerImpersonateCommands(pi: ExtensionAPI): void {
  const long = (args: string, ctx: ExtensionCommandContext) => runImpersonate(ctx, false);
  const short = (args: string, ctx: ExtensionCommandContext) => runImpersonate(ctx, true);
  pi.registerCommand("impersonate", { description: "Generate a long user suggestion", handler: long });
  pi.registerCommand("imp", { description: "Alias of /impersonate", handler: long });
  pi.registerCommand("generate", { description: "Alias of /impersonate", handler: long });
  pi.registerCommand("gen", { description: "Alias of /impersonate", handler: long });
  pi.registerCommand("imps", { description: "Generate a short user suggestion", handler: short });
}
