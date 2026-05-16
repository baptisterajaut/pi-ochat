#!/usr/bin/env bash
# pi-ochat install: npm deps + optional pi extension symlink + optional launcher.
#
# Default (no flags): npm install + symlink into ~/.pi/agent/extensions/pi-ochat
#                     so every `pi` invocation auto-loads the extension.
# --launcher        : also drop a ~/bin/pi-ochat symlink to the launcher script.
# --launcher-only   : skip the extensions symlink, only create the launcher (keeps
#                     vanilla `pi` untouched; `pi-ochat` explicitly loads us).
# --bind-ochat-keys : also unbind the pi built-ins on ctrl+l, ctrl+r, ctrl+u, ctrl+g
#                     in ~/.pi/agent/keybindings.json so the ochat shortcuts work
#                     cleanly without 'Extension issues' warnings. Backs up any
#                     existing keybindings.json.
#
# Idempotent. Safe to re-run.

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(pwd)"

LAUNCHER=0
EXT_SYMLINK=1
BIND_KEYS=0
for arg in "$@"; do
  case "$arg" in
    --launcher)        LAUNCHER=1 ;;
    --launcher-only)   LAUNCHER=1 ; EXT_SYMLINK=0 ;;
    --bind-ochat-keys) BIND_KEYS=1 ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *) echo "Unknown flag: $arg" >&2 ; exit 2 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "Error: '$1' not found in PATH"; exit 1; }; }
need node
need npm

echo "==> npm install"
npm install --silent

if [ "$EXT_SYMLINK" = "1" ]; then
  EXT_PARENT="$HOME/.pi/agent/extensions"
  EXT_LINK="$EXT_PARENT/pi-ochat"
  mkdir -p "$EXT_PARENT"
  if [ -L "$EXT_LINK" ]; then
    if [ "$(readlink "$EXT_LINK")" = "$REPO_DIR" ]; then
      echo "==> extension symlink already points here: $EXT_LINK"
    else
      echo "==> updating extension symlink: $EXT_LINK -> $REPO_DIR"
      ln -sfn "$REPO_DIR" "$EXT_LINK"
    fi
  elif [ -e "$EXT_LINK" ]; then
    echo "Error: $EXT_LINK exists and is not a symlink. Remove it before continuing." >&2
    exit 1
  else
    ln -s "$REPO_DIR" "$EXT_LINK"
    echo "==> symlinked extension: $EXT_LINK -> $REPO_DIR"
  fi
fi

if [ "$LAUNCHER" = "1" ]; then
  mkdir -p "$HOME/bin"
  LAUNCHER_LINK="$HOME/bin/pi-ochat"
  if [ -L "$LAUNCHER_LINK" ] || [ -e "$LAUNCHER_LINK" ]; then
    rm -f "$LAUNCHER_LINK"
  fi
  ln -s "$REPO_DIR/pi-ochat.sh" "$LAUNCHER_LINK"
  echo "==> launcher installed: $LAUNCHER_LINK -> $REPO_DIR/pi-ochat.sh"
  case ":$PATH:" in
    *":$HOME/bin:"*) ;;
    *) echo "    note: ~/bin is not in your PATH. Add it (e.g. in ~/.zshrc): export PATH=\"\$HOME/bin:\$PATH\"" ;;
  esac
fi

if [ "$BIND_KEYS" = "1" ]; then
  KB_DIR="$HOME/.pi/agent"
  KB_FILE="$KB_DIR/keybindings.json"
  mkdir -p "$KB_DIR"
  if [ -e "$KB_FILE" ]; then
    BACKUP="$KB_FILE.bak.$(date +%Y%m%d-%H%M%S)"
    cp "$KB_FILE" "$BACKUP"
    echo "==> backed up existing keybindings to $BACKUP"
  fi
  node - "$KB_FILE" <<'JS'
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const path = process.argv[2];
const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const overrides = {
  "app.model.select": [],          // frees ctrl+l for ochat /clear
  "app.editor.external": [],       // frees ctrl+g for ochat /impersonate
  "app.session.rename": [],        // silences ctrl+r conflict warning
  "app.tree.filter.userOnly": [],  // silences ctrl+u conflict warning
};
const merged = { ...existing, ...overrides };
writeFileSync(path, JSON.stringify(merged, null, 2) + "\n");
JS
  echo "==> ochat keybindings written to $KB_FILE"
fi

echo ""
echo "Done."
if [ "$EXT_SYMLINK" = "1" ]; then
  echo "  - Run 'pi' to use it (extension auto-loaded)."
fi
if [ "$LAUNCHER" = "1" ]; then
  echo "  - Or run 'pi-ochat' to launch pi with this extension explicitly."
fi
if [ "$BIND_KEYS" = "1" ]; then
  echo "  - ctrl+l/r/u/g now belong to pi-ochat (pi built-ins unbound)."
fi
