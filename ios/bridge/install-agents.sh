#!/bin/sh
# Fixed, pinned installers. No user text is evaluated as a command.
set -eu
umask 077
export PATH=/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export DISABLE_AUTOUPDATER=1 DISABLE_TELEMETRY=1 DISABLE_ERROR_REPORTING=1
export OPENCODE_DISABLE_AUTOUPDATE=true
case "${1:-}" in codex|claude|opencode|gemini) agent=$1 ;; *) printf 'Choose codex, claude, opencode or gemini.\n' >&2; exit 2 ;; esac
root=/root/.local/share/bibimer/agents
mkdir -p "$root/$agent" /root/.local/bin /root/.local/state/bibimer/agents
# No credential files or host environment are copied into this guest.
case "$agent" in
    codex) package='@openai/codex@0.163.0'; executable=codex ;;
    claude) package='@anthropic-ai/claude-code@2.1.112'; executable=claude ;;
    opencode) package='opencode-linux-arm64-musl@1.19.3'; executable=opencode ;;
    gemini) package='@google/gemini-cli@0.64.0'; executable=gemini ;;
esac
printf 'Installing %s inside this iOS app…\n' "$package"
if [ "$agent" = opencode ]; then
    # Install the exact musl payload. The metapackage's postinstall invokes the
    # binary before we can observe it in our owned terminal and can hang.
    npm install --prefix "$root/$agent" --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org "$package"
    package_command="$root/$agent/node_modules/opencode-linux-arm64-musl/bin/opencode"
    opencode_stage=$(mktemp "$root/$agent/.opencode-ios-XXXXXX")
    trap 'if [ -n "$opencode_stage" ]; then rm -f -- "$opencode_stage"; fi' 0
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    command_path="$opencode_stage"
    # Preserve npm's upstream payload and stage the exact ShellTool output
    # drain copy. Publish it only after its real guest --version succeeds.
    python3 /opt/bibimer/ios/opencode_compat.py "$package_command" --output "$command_path"
    export JSC_useJIT=0
    # The ARM64 compatibility kernel does not deliver inotify events.
    export OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER=true
elif [ "$agent" = gemini ] || [ "$agent" = claude ]; then
    npm install --prefix "$root/$agent" --ignore-scripts --omit=optional --no-audit --no-fund --registry=https://registry.npmjs.org "$package"
    command_path="$root/$agent/node_modules/.bin/$executable"
else
    npm install --prefix "$root/$agent" --no-audit --no-fund --registry=https://registry.npmjs.org "$package"
    command_path="$root/$agent/node_modules/.bin/$executable"
fi
if [ "$agent" = claude ]; then
    npm install --prefix /root/.local/share/bibimer/claude --ignore-scripts --omit=optional --no-audit --no-fund --registry=https://registry.npmjs.org @anthropic-ai/claude-agent-sdk@0.2.112
fi
# Install the public wrapper only after the actual guest executable starts.
if [ "$agent" = gemini ]; then
    # Keep JavaScript in Ignition, but allow actual guest ARM64 WebAssembly
    # Liftoff code. The outer iOS engine interprets that guest code.
    ISH_NODE_NO_ARG_INJECTION=1 GEMINI_CLI_NO_RELAUNCH=1 node --no-opt --no-sparkplug --single-threaded --no-wasm-tier-up --liftoff-only --no-lazy --max-old-space-size=512 "$command_path" --version
else
    "$command_path" --version
fi
if [ "$agent" = opencode ]; then
    mv "$command_path" "$root/$agent/opencode-ios"
    command_path="$root/$agent/opencode-ios"
    opencode_stage=
fi
temporary=$(mktemp /root/.local/bin/.bibimer-agent-XXXXXX)
if [ "$agent" = opencode ]; then
    printf '#!/bin/sh\nexport JSC_useJIT=0 OPENCODE_DISABLE_AUTOUPDATE=true OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER=true\nexec "%s" "$@"\n' "$command_path" > "$temporary"
elif [ "$agent" = gemini ]; then
    printf '#!/bin/sh\nexport ISH_NODE_NO_ARG_INJECTION=1 GEMINI_CLI_NO_RELAUNCH=1\nexec node --no-opt --no-sparkplug --single-threaded --no-wasm-tier-up --liftoff-only --no-lazy --max-old-space-size=512 "%s" "$@"\n' "$command_path" > "$temporary"
else
    printf '#!/bin/sh\nexec "%s" "$@"\n' "$command_path" > "$temporary"
fi
chmod 700 "$temporary"
mv "$temporary" "/root/.local/bin/$agent"
if [ "$agent" = claude ]; then
    python3 /opt/bibimer/ios/run.py record-install claude
fi
printf 'Installed. Provider sign-in is required before model requests.\n'
