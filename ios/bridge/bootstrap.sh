#!/bin/sh
# Guest init: runs inside the app's Alpine Linux sandbox, never on the Mac.
set -eu
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export TERM=xterm-256color
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
export DISABLE_AUTOUPDATER=1
export DISABLE_TELEMETRY=1
export DISABLE_ERROR_REPORTING=1
export GEMINI_CLI_NO_RELAUNCH=1

test -f /etc/alpine-release || { printf 'Bundled Alpine Linux is required.\n' >&2; exit 1; }
test -n "${BIBIMER_TOKEN:-}" || { printf 'Missing app connection token.\n' >&2; exit 1; }
test -n "${BIBIMER_PORT:-}" || { printf 'Missing app connection port.\n' >&2; exit 1; }
# The pinned runtime preloads this file for jitless Node. Its llhttp parser
# supports streaming HTTP without enabling JIT. Never substitute the upstream
# fetch polyfill, which buffers responses and cannot carry agent SSE streams.
test -f /opt/bibimer/runtime/wasm-polyfill.js || { printf 'Missing bundled HTTP parser support.\n' >&2; exit 1; }
mkdir -p /lib
cp /opt/bibimer/runtime/wasm-polyfill.js /lib/wasm-polyfill.js
chmod 600 /lib/wasm-polyfill.js
if ! command -v python3 >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 || ! command -v bash >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1 || ! command -v rg >/dev/null 2>&1; then
    printf 'Preparing local development tools…\n'
    release=$(cut -d. -f1,2 /etc/alpine-release)
    case "$release" in 3.[0-9]|3.[0-9][0-9]) ;; *) exit 1 ;; esac
    printf 'https://dl-cdn.alpinelinux.org/alpine/v%s/main\nhttps://dl-cdn.alpinelinux.org/alpine/v%s/community\n' "$release" "$release" > /etc/apk/repositories
    apk add --no-cache ca-certificates python3 bash git nodejs npm curl jq sqlite github-cli ripgrep
fi
export SHELL=/bin/bash
mkdir -p /root/projects /root/.local/bin /root/.local/share/bibimer /root/.local/state/bibimer
# Token is consumed and removed from the Python/agent environment by run.py.
exec python3 /opt/bibimer/ios/run.py serve --port "$BIBIMER_PORT" --state-dir /root/.local/state/bibimer
