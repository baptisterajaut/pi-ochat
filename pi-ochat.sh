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

# If the first arg is a pi maintenance subcommand (update, install, remove,
# uninstall, list, config), run pi directly without -e. Otherwise pi treats
# the subcommand as an initial chat prompt — `pi-ochat update` would send
# "update" to the LLM, which is a footgun (pi's own upgrade notice tells
# users to "run pi update", and the muscle-memory is to type that here).
case "${1:-}" in
  update|install|remove|uninstall|list|config)
    exec "$PI_BIN" "$@"
    ;;
esac

exec "$PI_BIN" -e "$REPO_DIR/src/index.ts" "$@"
