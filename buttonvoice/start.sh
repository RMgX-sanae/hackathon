#!/bin/sh
set -eu
cd "$(dirname "$0")"
buttonvoice_node="$(command -v node || true)"
if [ -z "$buttonvoice_node" ]; then
  buttonvoice_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$buttonvoice_node" ] || [ ! -f node_modules/vite/bin/vite.js ]; then
  echo '请安装 Node.js，并在 buttonvoice 目录运行 npm install。'
  exit 1
fi
exec "$buttonvoice_node" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174
