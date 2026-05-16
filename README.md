# pi-ochat

ochat workflow as a pi extension: personalities, profiles, `/retry`, `/undo`, `/impersonate`, `/stats`, double-press destructive shortcuts. Designed for pi v0.74+.

## Install

```bash
git clone <git url> pi-ochat
cd pi-ochat
./install.sh              # npm install + symlink into ~/.pi/agent/extensions/pi-ochat
```

After `./install.sh`, every `pi` invocation auto-loads the extension. The script is idempotent and safe to re-run after `git pull`.

### Variants

```bash
./install.sh --launcher       # also drop ~/bin/pi-ochat that calls `pi -e ./src/index.ts`
./install.sh --launcher-only  # skip the global symlink; only create the launcher.
                              # Useful when you want vanilla `pi` for some sessions and `pi-ochat` for others.
```

### Dev loop (without symlink)

```bash
git clone <git url> /tmp/pi-ochat
cd /tmp/pi-ochat && npm install
./node_modules/.bin/pi -e ./src/index.ts
```

## Files

- `~/.pi/agent/pi-ochat.json` — toggles, active personality, active profile.
- `~/.pi/agent/personalities/*.md` — personality templates (bundled defaults copied on first run).
- `~/.pi/agent/profiles/*.json` — `{model, personality?, num_ctx?}` profiles. `model` is `"provider/modelId"` (e.g. `ollama-local/qwen3-coder:30b`).

## Commands

| Command | Aliases | What |
|---|---|---|
| `/p` | `/personality` | List or switch personality (`/p`, `/p 2`, `/p creative`) |
| `/profile` | — | List or switch profile bundle (model + personality) |
| `/impersonate` | `/imp` `/gen` `/generate` | Generate a long user-message suggestion into the editor |
| `/imps` | — | Short variant (under 15 words) |
| `/retry` | `/r` | Regenerate the last response as a branch |
| `/undo` | `/u` | Remove the last exchange, restore the prompt to the editor |
| `/stats` | `/st` | Show TTFT / t/s / tokens / ctx% |
| `/suggest` | — | Toggle auto-suggest ghost line |
| `/stream` | — | Toggle streaming vs buffered (`*thought for Xs*` prefix) |
| `/thinking` | — | Cycle thinking level off → minimal → low → medium → high → xhigh |
| `/project` | — | Toggle project-local AGENTS.md inclusion in system prompt |
| `/help` | — | Help listing |

Pi natives keep working: `/compact`, `/tree`, `/fork`, `/clone`, `/new`, `/resume`, `/model`, `/export`, `/share`.

## Shortcuts

`Ctrl+L` clear, `Ctrl+R` retry, `Ctrl+U` undo — all require a double-press within 2 seconds. `Ctrl+G` triggers `/impersonate` when the editor is empty. Other defaults that pi binds to these keys (Ctrl+L=model select, Ctrl+R=session rename, Ctrl+U=delete-to-line-start, Ctrl+G=external editor) are overridden by this extension.

## Migrating from ochat (Python)

1. Copy `~/.config/ochat/personalities/*.md` → `~/.pi/agent/personalities/`.
2. Rename project-local `agent.md` / `system.md` → `AGENTS.md`.
3. Declare backends in `~/.pi/agent/models.json` if you do not run Ollama / llama.cpp on default ports (otherwise pi-ochat auto-detects them).

## Known limitations (v0.1)

- **`/stream` non-streaming mode is degraded.** Pi has no public API to hide a streaming message, so streaming stays visible — we only prepend `*thought for Xs*` to the final message. The "boîte noire" effect of the original ochat is not reproducible without a pi upstream patch.
- **Auto-suggest ghost line stays visible while you type.** Pi's `input` event fires on submit, not per-keystroke. The widget therefore persists below the editor until you submit a message. Tab acceptance from an empty editor still works as expected.
- **Ctrl+L/R/U/G unconditionally override pi defaults.** This is by design (parity with ochat's keymap), but if you valued the pi defaults bound to these keys (model select / session rename / delete-to-line-start / external editor), you can remove specific bindings by editing `src/shortcuts.ts`.
- **`/project` off depends on a deep import of pi internals.** The official `@earendil-works/pi-coding-agent` package does not re-export `buildSystemPrompt`. The extension walks `node_modules` to load it via absolute path. If pi's internal file layout changes, the `/project` toggle silently degrades to a no-op (a `console.warn` is emitted at module load in that case).
