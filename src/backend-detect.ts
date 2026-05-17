import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface OllamaModel {
  name: string;
  details?: { parameter_size?: string };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OpenAIModel {
  id: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
}

const TIMEOUT_MS = 800;

// Honor env-var overrides so users on a LAN can point pi-ochat at a remote
// llama.cpp / Ollama. Trailing slash tolerated. Empty/unset → localhost default.
function baseUrl(envName: string, fallback: string): string {
  const raw = process.env[envName];
  if (!raw) return fallback;
  return raw.replace(/\/+$/, "");
}

const OLLAMA_BASE = baseUrl("PI_OCHAT_OLLAMA_URL", "http://localhost:11434");
const LLAMA_CPP_BASE = baseUrl("PI_OCHAT_LLAMA_CPP_URL", "http://localhost:8080");

async function probe(url: string): Promise<Response | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function tryOllama(pi: ExtensionAPI): Promise<boolean> {
  const res = await probe(`${OLLAMA_BASE}/api/tags`);
  if (!res) return false;
  const json = (await res.json()) as OllamaTagsResponse;
  if (!Array.isArray(json.models) || json.models.length === 0) return false;
  pi.registerProvider("ollama-local", {
    name: "Ollama (local)",
    baseUrl: `${OLLAMA_BASE}/v1`,
    apiKey: "OLLAMA_API_KEY",
    api: "openai-completions",
    models: json.models.map((m) => ({
      id: m.name,
      name: m.name,
      // reasoning: true + qwen-chat-template lets /thinking off send
      // `chat_template_kwargs.enable_thinking: false` (ochat parity for Qwen3/
      // DeepSeek-style models). Ollama's OpenAI-compat endpoint may ignore the
      // field; native `think` parameter isn't reachable from this route.
      reasoning: true,
      compat: { thinkingFormat: "qwen-chat-template" },
      input: ["text"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 4096,
    })),
  });
  return true;
}

async function tryLlamaCpp(pi: ExtensionAPI): Promise<boolean> {
  const res = await probe(`${LLAMA_CPP_BASE}/v1/models`);
  if (!res) return false;
  const json = (await res.json()) as OpenAIModelsResponse;
  if (!Array.isArray(json.data) || json.data.length === 0) return false;
  pi.registerProvider("llama-cpp-local", {
    name: "llama.cpp (local)",
    baseUrl: `${LLAMA_CPP_BASE}/v1`,
    apiKey: "LLAMA_CPP_API_KEY",
    api: "openai-completions",
    models: json.data.map((m) => ({
      id: m.id,
      name: m.id,
      // ochat used to send chat_template_kwargs.enable_thinking on the same
      // route. qwen-chat-template makes pi-ai do the same when /thinking off.
      reasoning: true,
      compat: { thinkingFormat: "qwen-chat-template" },
      input: ["text"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 4096,
    })),
  });
  return true;
}

/** Probe and register local backends. Safe to call from an async factory. */
export async function detectAndRegisterBackends(pi: ExtensionAPI): Promise<string[]> {
  const detected: string[] = [];
  if (await tryOllama(pi)) detected.push("ollama-local");
  if (await tryLlamaCpp(pi)) detected.push("llama-cpp-local");
  return detected;
}
