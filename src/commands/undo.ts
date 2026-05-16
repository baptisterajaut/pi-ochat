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

export function registerUndoCommand(pi: ExtensionAPI): void {
  const handler = async (_args: string, ctx: ExtensionCommandContext) => {
    const last = lastUserMessage(ctx);
    if (!last) {
      ctx.ui.notify("No exchange to undo", "warning");
      return;
    }
    const result = await ctx.navigateTree(last.id, { summarize: false });
    if (result.cancelled) {
      ctx.ui.notify("undo: navigation cancelled", "warning");
      return;
    }
    ctx.ui.setEditorText(last.text);
  };
  pi.registerCommand("undo", { description: "Remove the last exchange and restore the message to the editor", handler });
  pi.registerCommand("u", { description: "Alias of /undo", handler });
}
