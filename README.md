# pi-ochat

ochat workflow as a pi extension for [pi.dev](https://pi.dev/). Ports personalities, profiles, `/retry`/`/undo`, `/impersonate`, `/stats`, auto-suggest, and the double-press shortcut family on top of pi's native runtime (backends, sessions, compaction, AGENTS.md).

## Install (dev loop)

```bash
npm install
npm run dev  # equivalent to: pi -e ./src/index.ts
```

## Install (global)

```bash
ln -s "$(pwd)" ~/.pi/agent/extensions/pi-ochat
# or
pi install <git url>
```

## Config

- `~/.pi/agent/pi-ochat.json` — toggles, active personality, active profile
- `~/.pi/agent/personalities/*.md` — personality templates (bundled defaults copied on first run)
- `~/.pi/agent/profiles/*.json` — named `{model, personality, num_ctx?}` profiles

## Commands

`/p`, `/personality`, `/profile`, `/impersonate`, `/imp`, `/gen`, `/generate`, `/imps`, `/retry`, `/r`, `/undo`, `/u`, `/stats`, `/st`, `/suggest`, `/thinking`, `/stream`, `/project`, `/help`.

## Shortcuts

- `Ctrl+L` clear (double-press)
- `Ctrl+R` retry (double-press)
- `Ctrl+U` undo (double-press)
- `Ctrl+G` impersonate (single-press, no-op when editor has text)
