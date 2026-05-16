# pi-ochat

ochat workflow as a pi extension: personalities, profiles, `/retry`, `/undo`, `/impersonate`, `/stats`, double-press destructive shortcuts. Designed for pi v0.74+.

## Install

```bash
git clone git@github.com:baptisterajaut/pi-ochat.git pi-ochat
cd pi-ochat
./install.sh              # npm install + symlink into ~/.pi/agent/extensions/pi-ochat
```

After `./install.sh`, every `pi` invocation auto-loads the extension. The script is idempotent and safe to re-run after `git pull`.

### Variants

```bash
./install.sh --launcher           # also drop ~/bin/pi-ochat that calls `pi -e ./src/index.ts`
./install.sh --launcher-only      # skip the global symlink; only create the launcher.
                                  # Useful when you want vanilla `pi` for some sessions and `pi-ochat` for others.
./install.sh --bind-ochat-keys    # unbind pi built-ins on ctrl+l/r/u/g (6 keybinding ids:
                                  # app.model.select, app.tree.filter.labeledOnly,
                                  # app.tree.filter.userOnly, tui.editor.deleteToLineStart,
                                  # app.editor.external, app.session.rename) AND set
                                  # quietStartup=true to hide pi's [Context]/[Extensions]
                                  # boot banners. Merges into ~/.pi/agent/{keybindings,settings}.json,
                                  # backs up both before modifying.
```

### Dev loop (without symlink)

```bash
git clone git@github.com:baptisterajaut/pi-ochat.git /tmp/pi-ochat
cd /tmp/pi-ochat && npm install
./node_modules/.bin/pi -e ./src/index.ts
```

## Files

- `~/.pi/agent/pi-ochat.json` — toggles, active personality, active profile.
- `~/.pi/agent/personalities/*.md` — personality templates (bundled defaults copied on first run).
- `~/.pi/agent/profiles/*.json` — `{model, personality?, num_ctx?}` profiles. `model` is `"provider/modelId"` (e.g. `ollama-local/qwen3-coder:30b`).

## UI

- **ASCII-art "ochat" header** with a purple→pink gradient and a subtitle line `backend · model · personality: X · profile: Y`, installed via `ctx.ui.setHeader` on session start. Refreshes on `/p`, `/profile`, `/config`, and model switches.
- **Live TPS status** (`TTFT 320ms · ~42 t/s · ~1.2k tok`) is pushed to the status bar via `ctx.ui.setStatus("ochat-stats", …)` during streaming (throttled at 250ms). On message end the line becomes the committed measurement (`42.5 t/s · ctx 31%`).

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

`Ctrl+L` clear, `Ctrl+R` retry, `Ctrl+U` undo — all require a double-press within 2 seconds. `Ctrl+G` triggers `/impersonate` when the editor is empty.

Pi reserves several of these keys. `ctrl+l` is bound to both `app.model.select` and `app.tree.filter.labeledOnly`, `ctrl+u` to both `app.tree.filter.userOnly` and `tui.editor.deleteToLineStart`, `ctrl+g` to `app.editor.external`, `ctrl+r` to `app.session.rename`. Out of the box, the reserved-override ones silently drop our shortcuts and the others log a startup warning. Run `./install.sh --bind-ochat-keys` to unbind all six pi built-ins in `~/.pi/agent/keybindings.json`. After that, all four ochat shortcuts work and the warnings disappear.

## Migrating from ochat (Python)

1. Copy `~/.config/ochat/personalities/*.md` → `~/.pi/agent/personalities/`.
2. Rename project-local `agent.md` / `system.md` → `AGENTS.md`.
3. Declare backends in `~/.pi/agent/models.json` if you do not run Ollama / llama.cpp on default ports (otherwise pi-ochat auto-detects them).

## Known limitations (v0.1)

- **`/stream` non-streaming mode is degraded.** Pi has no public API to hide a streaming message, so streaming stays visible — we only prepend `*thought for Xs*` to the final message. The "boîte noire" effect of the original ochat is not reproducible without a pi upstream patch.
- **Auto-suggest ghost line stays visible while you type.** Pi's `input` event fires on submit, not per-keystroke. The widget therefore persists below the editor until you submit a message. Tab acceptance from an empty editor still works as expected.
- **Ctrl+L and Ctrl+G are reserved by pi.** Out of the box, our bindings for clear (`ctrl+l`) and impersonate (`ctrl+g`) are silently dropped because pi marks `app.model.select` and `app.editor.external` as `restrictOverride: true`. Run `./install.sh --bind-ochat-keys` to unbind them in `~/.pi/agent/keybindings.json`. `ctrl+r` and `ctrl+u` work either way, but the same flag also silences their warning logs.
- **`/project` off depends on a deep import of pi internals.** The official `@earendil-works/pi-coding-agent` package does not re-export `buildSystemPrompt`. The extension walks `node_modules` to load it via absolute path. If pi's internal file layout changes, the `/project` toggle silently degrades to a no-op (a `console.warn` is emitted at module load in that case).
- **`/thinking off` on Ollama is best-effort.** Auto-detected local backends register models with `thinkingFormat: "qwen-chat-template"`, so `/thinking off` sends `chat_template_kwargs.enable_thinking: false` on the same route ochat used. llama.cpp honors it (Qwen3/DeepSeek-style templates). Ollama's OpenAI-compat endpoint may ignore the field — Ollama's native `think` parameter lives on `/api/chat`, which pi-ai cannot reach (no native Ollama provider yet). If you need guaranteed thinking-off on Ollama, declare a custom provider in `~/.pi/agent/models.json`.
