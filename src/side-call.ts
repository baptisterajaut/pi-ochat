import { complete } from "@earendil-works/pi-ai";
import type { AssistantMessage, Message, UserMessage } from "@earendil-works/pi-ai";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface SideCallResult {
  text: string;
  ok: boolean;
  error?: string;
}

/**
 * Run a one-shot completion using the current model + user-controlled history.
 * Returns plain text. The caller owns the AbortController.
 *
 * Intentionally omits `reasoningEffort` so /impersonate and /imps don't waste
 * tokens on reasoning. For local backends declared as qwen-chat-template/qwen/
 * zai/deepseek (our auto-detected Ollama+llama.cpp), pi-ai turns this into
 * `enable_thinking: false` (resp. `thinking: { type: "disabled" }`). For models
 * whose thinking can't be toggled via API (Claude/GPT5-thinking), defaults apply.
 */
export async function sideCallText(
  ctx: ExtensionContext,
  instruction: string,
  history: { role: "user" | "assistant"; text: string }[],
  signal: AbortSignal,
): Promise<SideCallResult> {
  if (!ctx.model) return { text: "", ok: false, error: "No active model" };
  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
  if (!auth.ok) return { text: "", ok: false, error: auth.error };
  if (!auth.apiKey) return { text: "", ok: false, error: "No API key" };

  const textBlock = (text: string) => [{ type: "text" as const, text }];
  const messages: Message[] = [
    ...history.map((h): Message => {
      if (h.role === "user") {
        return { role: "user", content: textBlock(h.text), timestamp: Date.now() } satisfies UserMessage;
      }
      // Assistant messages require api/provider/model/usage/stopReason — fill with sentinel values
      // since this history is only used as context for the side call.
      return {
        role: "assistant",
        content: textBlock(h.text),
        api: "openai-completions",
        provider: "unknown",
        model: "unknown",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop",
        timestamp: Date.now(),
      } satisfies AssistantMessage;
    }),
    { role: "user", content: textBlock(instruction), timestamp: Date.now() } satisfies UserMessage,
  ];

  try {
    const response = await complete(
      ctx.model,
      { messages },
      { apiKey: auth.apiKey, headers: auth.headers, signal },
    );
    const text = response.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    return { text, ok: true };
  } catch (err) {
    if (signal.aborted) return { text: "", ok: false, error: "aborted" };
    return { text: "", ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
