import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

function lastUserMessage(ctx: ExtensionCommandContext): { id: string; text: string } | null {
  const branch = ctx.sessionManager.getBranch();
  for (let i = branch.length - 1; i >= 0; i--) {
    const e = branch[i];
    if (!e || e.type !== "message") continue;
    if (e.message.role !== "user") continue;
    let text = "";
    if (typeof e.message.content === "string") text = e.message.content;
    else if (Array.isArray(e.message.content)) {
      text = e.message.content
        .filter((p): p is { type: "text"; text: string } => (p as { type?: string }).type === "text")
        .map((p) => p.text)
        .join("\n");
    }
    if (text) return { id: e.id, text };
  }
  return null;
}

export function registerRetryCommand(pi: ExtensionAPI): void {
  const handler = async (_args: string, ctx: ExtensionCommandContext) => {
    const last = lastUserMessage(ctx);
    if (!last) {
      ctx.ui.notify("No user message to retry", "warning");
      return;
    }
    const result = await ctx.navigateTree(last.id, { summarize: false });
    if (result.cancelled) {
      ctx.ui.notify("retry: navigation cancelled", "warning");
      return;
    }
    pi.sendUserMessage(last.text);
  };
  pi.registerCommand("retry", { description: "Regenerate the last response (creates a branch)", handler });
  pi.registerCommand("r", { description: "Alias of /retry", handler });
}
