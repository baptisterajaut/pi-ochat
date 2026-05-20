# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

pi-ochat is a **pi extension**, not a standalone CLI. It plugs into [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) (the `pi` binary) via a single `default async function(pi: ExtensionAPI)` export in `src/index.ts`. Pi loads it from `~/.pi/agent/extensions/pi-ochat/` (symlink created by `./install.sh`). It reuses pi's session loop, UI primitives (`ctx.ui.setHeader`, `setStatus`, `notify`), and provider system — it does not implement its own.

Target runtime: pi v0.74+. Node ESM, TS strict, `noEmit: true` (pi runs the TS sources directly via tsx).

## Commands

```bash
npm install
npm test                    # vitest run (one-shot)
npm run test:watch          # vitest watch
npm run typecheck           # tsc --noEmit
npm run dev                 # ./node_modules/.bin/pi -e ./src/index.ts (no symlink needed)

npx vitest run test/profiles.test.ts          # single test file
npx vitest run -t "loadProfile returns null"  # single test by name

./install.sh                # npm install + symlink into ~/.pi/agent/extensions/pi-ochat
./install.sh --launcher     # also create ~/bin/pi-ochat
./install.sh --bind-ochat-keys  # unbind pi built-ins on ctrl+l/r/u/g + set quietStartup
./pi-ochat.sh -p "hello"    # one-shot non-interactive run (uses node_modules/.bin/pi)
```

## Architecture

### Entry point: `src/index.ts`

Wires everything into the `ExtensionAPI` passed by pi. Order matters: `detectAndRegisterBackends` runs first (it `await`s HTTP probes), then commands/hooks register synchronously, then a `session_start` listener emits the detection notice.

### Two flavours of registration

- **Commands** (`src/commands/*.ts`) — slash commands registered via `pi.registerCommand(name, { description, run })`. Each file exports a single `register*Command(pi)` function. Aliases (`/p` for `/personality`, `/r` for `/retry`, etc.) are separate `registerCommand` calls that delegate.
- **Hooks** (`src/hooks/*.ts`) — listeners on pi lifecycle events (`session_start`, `message_start`, `message_end`, `stream_chunk`, `tool_call_end`, `agent_end`, `input`). Hooks own the live header, the TPS status line, auto-suggest ghost lines, stream buffering, and the system-prompt rewrite.

### State

Three files in `~/.pi/agent/` (paths centralised in `src/paths.ts`):

- `pi-ochat.json` — `OchatConfig` (active personality, profile, toggles). Schema and defaults live in `src/config.ts`; `loadConfig` discards unknown keys silently. Always read via `loadConfig(paths.configFile())`, write via `saveConfig`.
- `personalities/*.md` — markdown templates. Bundled defaults in `personalities/` are copied to `~/.pi/agent/personalities/` on first run by `ensureBundledPersonalities`.
- `profiles/*.json` — `{model: "provider/modelId", personality?, num_ctx?}`. `model` MUST be `provider/id` (slash-split). Switching a profile starts a fresh session.

### Backend detection (`src/backend-detect.ts`)

Probes `localhost:11434` (Ollama) and `localhost:8080` (llama.cpp) at startup with an 800ms timeout. Overridable via `PI_OCHAT_OLLAMA_URL` / `PI_OCHAT_LLAMA_CPP_URL`. On hit, calls `pi.registerProvider("ollama-local" | "llama-cpp-local", …)` with the discovered models. Detection is `localhost`-only by design — for remote LAN backends, either set the env vars or declare a custom provider in `~/.pi/agent/models.json` (a pi-coding-agent feature, not part of this repo).

All registered local models use `compat: { thinkingFormat: "qwen-chat-template" }` so `/thinking off` sends `chat_template_kwargs.enable_thinking: false` — this is the ochat-parity behaviour for Qwen3 / DeepSeek-style chat templates. llama.cpp honors it; Ollama's OpenAI-compat endpoint may ignore it.

### System-prompt rewrite (`src/hooks/system-prompt.ts`)

When `pi_self_aware` is `false`, the hook **replaces** pi's built-in self-aware preamble with a neutral one; the personality then becomes the base. It deep-imports `buildSystemPrompt` from `@earendil-works/pi-coding-agent` internals (not re-exported). If pi's internal file layout moves, the hook degrades silently to a no-op and prints a `console.warn` at module load. Same path is used by the `/project` toggle (AGENTS.md inclusion). Treat this as a known fragile point — `instructions.ts` and `strip-context.ts` exist to keep the rewrite predictable.

### Double-press shortcuts (`src/double-press.ts` + `src/shortcuts.ts`)

`Ctrl+L` / `Ctrl+R` / `Ctrl+U` require two presses within `double_press_window_ms` (default 2000). The window is shared per key and reset on any other input. `Ctrl+G` is single-press but only fires when the editor is empty. Pi reserves several of these keys with `restrictOverride: true`; without `./install.sh --bind-ochat-keys` the override is silently dropped — this is the intended pi behaviour, not a bug here.

### Side-call (`src/side-call.ts`)

Used by `/impersonate`, `/imps`, `/retry` to run a one-off LLM completion outside the session's message stream (no session pollution, no tool loop). It reuses the active model/provider via `pi.getCurrentModel()`.

### Stats (`src/stats.ts` + `src/hooks/stats-collector.ts`)

Collector subscribes to streaming events and accumulates TTFT, tokens, t/s, ctx%. The header hook reads the same snapshot on `message_end` and pushes it via `ctx.ui.setStatus("ochat-stats", …)`. Status keys are namespaced (`ochat-*`) to avoid collisions with pi natives.

## Testing notes

- `vitest.config.ts` enables `globals: true` — tests use `describe/it/expect` without imports.
- Tests cover pure modules only (config, profiles, personalities, double-press, stats, strip-context). Commands, hooks, and backend-detect are integration-tested manually because they need a live `ExtensionAPI`.
- No fixtures dir; tests stub paths through arguments rather than mocking `~/.pi/agent`.

## Gotchas worth knowing before editing

- `/stream` non-streaming mode is fundamentally degraded — pi has no API to hide a streaming message, so the toggle only prepends `*thought for Xs*` to the final output. Don't try to "fix" this without an upstream pi patch.
- Auto-suggest ghost line persists while typing because pi's `input` event fires on submit, not per-keystroke. This is a pi limitation, not a bug here.
- `ctx` from `session_start` may be stale in `--print` mode after session replacement — wrap any `ctx.ui.*` calls in try/catch (see `src/index.ts:61`).
- Personality switch always starts a fresh session (intentional — personality is in the system prompt, which pi locks for the session lifetime).
