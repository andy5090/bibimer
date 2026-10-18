#!/data/data/com.termux/files/usr/bin/bash
# Standalone Claude prerequisites. No bridge install/start/restart or shared storage.
set -eu
umask 077
case "${BIBIMER_LANGUAGE:-en}" in ko) BIBIMER_LANGUAGE=ko ;; *) BIBIMER_LANGUAGE=en ;; esac
export BIBIMER_LANGUAGE
say() {
    if [ "$BIBIMER_LANGUAGE" = ko ]; then printf '%s\n' "$2"; else printf '%s\n' "$1"; fi
}
if [ ! -d /data/data/com.termux/files/usr ]; then
    say 'Run this command in Termux on Android.' '이 명령은 Android의 Termux에서 실행해 주세요.'
    exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    pkg install -y nodejs-lts npm
fi
say 'Preparing the official Claude Agent SDK. A working Claude CLI is required separately.' '공식 Claude Agent SDK를 준비합니다. 실행 가능한 Claude CLI는 별도로 필요합니다.'
npm install --prefix "$HOME/.local/share/bibimer/claude" --ignore-scripts --omit=optional --no-audit --no-fund @anthropic-ai/claude-agent-sdk@__BIBIMER_CLAUDE_SDK_VERSION__
__BIBIMER_CLAUDE_REPAIR__
