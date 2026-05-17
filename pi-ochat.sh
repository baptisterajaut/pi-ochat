#!/usr/bin/env bash
# pi-ochat launcher: runs pi with this extension explicitly loaded.
# Intended to be symlinked into ~/bin/pi-ochat by install.sh --launcher.
#
# Uses the bundled pi binary in node_modules if present; falls back to system pi.

set -euo pipefail

REAL_SOURCE="${BASH_SOURCE[0]}"
while [ -L "$REAL_SOURCE" ]; do
  REAL_SOURCE="$(readlink "$REAL_SOURCE")"
done
REPO_DIR="$(cd "$(dirname "$REAL_SOURCE")" && pwd)"

PI_BIN="$REPO_DIR/node_modules/.bin/pi"
if [ ! -x "$PI_BIN" ]; then
  PI_BIN="$(command -v pi || true)"
  if [ -z "$PI_BIN" ]; then
    echo "Error: pi not found. Run 'npm install' inside $REPO_DIR first." >&2
    exit 1
  fi
fi

# If the first arg looks like a pi maintenance subcommand, don't load the
# extension — otherwise pi treats the subcommand as an initial chat prompt
# ("update" → sent to the LLM).
#
# `update` is special: pi's bundled-in-node_modules install can't self-update
# (pinned by package.json). The right action is to update pi-ochat itself,
# which bumps its bundled pi via `npm install`.
case "${1:-}" in
  update)
    if [ "$#" -gt 1 ]; then
      # `pi-ochat update <source>` still makes sense for individual extensions.
      exec "$PI_BIN" "$@"
    fi
    echo "==> updating pi-ochat in $REPO_DIR"
    cd "$REPO_DIR"
    git pull --ff-only
    # Force-bump pi packages to latest. package.json uses "latest" but npm
    # still pins the resolved version in package-lock.json; @latest rewrites
    # both. We don't pin pi: pi-ochat tracks whatever pi releases.
    npm install \
      @earendil-works/pi-coding-agent@latest \
      @earendil-works/pi-ai@latest \
      @earendil-works/pi-tui@latest
    echo "==> done. pi version now: $("$PI_BIN" --version)"
    exit 0
    ;;
  install|remove|uninstall|list|config)
    exec "$PI_BIN" "$@"
    ;;
esac

exec "$PI_BIN" -e "$REPO_DIR/src/index.ts" "$@"
