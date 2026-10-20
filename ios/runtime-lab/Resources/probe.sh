#!/bin/sh
# Executed inside the isolated Alpine guest, never on the host.
# Every required check emits one machine-readable record, even after failure.
set -u
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HOME=/root
export LC_ALL=C
tier=${BIBIMER_PROBE_TIER:-basic}
failures=0
checks=0
record() {
    checks=$((checks + 1))
    printf 'BIBIMER_CHECK\t%s\t%s\n' "$1" "$2"
    [ "$2" = PASS ] || failures=$((failures + 1))
}
check() {
    name=$1
    shift
    if "$@"; then record "$name" PASS; else record "$name" FAIL; fi
}
bounded() { /bin/busybox timeout -s KILL "$@"; }
finish() {
    status=PASS
    [ "$failures" -eq 0 ] || status=FAIL
    printf 'BIBIMER_SUMMARY\t%s\t%s\t%s\n' "$tier" "$status" "$checks"
    [ "$failures" -eq 0 ]
}
if [ ! -f /etc/alpine-release ] || [ ! -x /bin/busybox ]; then
    printf 'This probe must run inside the bundled Alpine Linux guest.\n' >&2
    exit 2
fi
mkdir -p /root/bibimer-probe
cd /root/bibimer-probe || exit 2

basic() {
    check architecture sh -c '[ "$(uname -m)" = aarch64 ]'
    check file_io sh -c 'printf "bibimer file data\n" > roundtrip && [ "$(cat roundtrip)" = "bibimer file data" ]'
    check pipes sh -c '[ "$(printf "one\ntwo\n" | grep two | tr a-z A-Z)" = TWO ]'
    check child_exit sh -c 'sh -c "exit 23"; [ "$?" -eq 23 ]'
    check parallel_children bounded 20 sh -c '
        (sleep 1; printf first > child-one) & one=$!
        (sleep 1; printf second > child-two) & two=$!
        wait "$one" && wait "$two" && [ "$(cat child-one child-two)" = firstsecond ]'
    check proc sh -c 'test -r /proc/self/stat && test -r /proc/cpuinfo && cat /proc/self/stat'
    check dev sh -c 'test -c /dev/null && test -c /dev/urandom && dd if=/dev/urandom of=random.bin bs=16 count=1 && [ "$(wc -c < random.bin)" -eq 16 ]'
    check persistence_write sh -c 'printf "bibimer-persistence-v1\n" > persistence-marker && sync && [ "$(cat persistence-marker)" = bibimer-persistence-v1 ]'
}
packages() {
    version=$(cut -d. -f1,2 /etc/alpine-release)
    case "$version" in
        3.[0-9]|3.[0-9][0-9]) ;;
        *) printf 'Unsupported Alpine release: %s\n' "$version" >&2; record apk_install FAIL; return ;;
    esac
    printf 'https://dl-cdn.alpinelinux.org/alpine/v%s/main\nhttps://dl-cdn.alpinelinux.org/alpine/v%s/community\n' "$version" "$version" > /etc/apk/repositories
    # apk verifies repository/package signatures and TLS; never disable either.
    check apk_install bounded 600 apk add --no-cache ca-certificates git curl jq python3 nodejs npm sqlite ffmpeg
    check git_worktree bounded 45 sh -c '
        mkdir -p git-project && cd git-project &&
        git init && git config user.name "Bibimer Probe" && git config user.email "probe@example.invalid" &&
        printf "probe\n" > file.txt && git add file.txt && git commit --allow-empty -m "Runtime capability probe" &&
        branch="probe-$(date +%s)-$$" && git worktree add -b "$branch" "../worktree-$branch" &&
        test -f "../worktree-$branch/file.txt" && git worktree list --porcelain'
    check https bounded 45 curl --fail --silent --show-error --max-time 35 https://alpinelinux.org/ -o https.html
    check json bounded 20 sh -c 'test "$(printf '\''{"value":42}'\'' | jq -r .value)" = 42'
    check python_subprocess bounded 30 python3 -c 'import subprocess; p = subprocess.run(["/bin/sh", "-c", "printf child; exit 7"], capture_output=True); assert (p.returncode, p.stdout) == (7, b"child"); print("python subprocess OK")'
    check python_pty bounded 45 python3 -c '
import errno, os, select, subprocess, time
master, slave = os.openpty()
child = None
try:
    child = subprocess.Popen(["/bin/sh", "-c", "test -t 0 && test -t 1 && printf '\''pty-ready\\n'\''; exit 7"], stdin=slave, stdout=slave, stderr=slave)
    os.close(slave)
    slave = -1
    data = b""
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        readable, _, _ = select.select([master], [], [], 0.2)
        if readable:
            try:
                chunk = os.read(master, 4096)
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                raise
            if not chunk:
                break
            data += chunk
        elif child.poll() is not None:
            break
    code = child.wait(timeout=5)
    assert code == 7 and data.replace(b"\r", b"") == b"pty-ready\n", (code, data)
    print("PTY child I/O and exit OK")
finally:
    if child is not None and child.poll() is None:
        child.kill()
        child.wait(timeout=5)
    os.close(master)
    if slave >= 0:
        os.close(slave)
'
    check python_signals bounded 40 python3 -c '
import select, signal, subprocess, time
for attempt in range(3):
    for mode in ("immediate-term", "delayed-term", "direct-kill"):
        child = subprocess.Popen(["/bin/sh", "-c", "printf ready; exec /bin/sleep 30"], stdout=subprocess.PIPE)
        try:
            if mode != "immediate-term":
                readable, _, _ = select.select([child.stdout], [], [], 3)
                assert readable and child.stdout.read(5) == b"ready", (attempt, mode, "readiness")
                if mode == "delayed-term":
                    time.sleep(0.2)
            expected = signal.SIGKILL if mode == "direct-kill" else signal.SIGTERM
            child.send_signal(expected)
            code = child.wait(timeout=3)
            assert code == -expected, (attempt, mode, code, -expected)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait(timeout=3)
            child.stdout.close()
print("Child immediate/delayed SIGTERM and SIGKILL: 3 repetitions each OK")
'
    check node_subprocess_stream bounded 45 node -e '
        const {spawn}=require("node:child_process");
        const p=spawn("/bin/sh",["-c","printf first; sleep 1; printf second; exit 7"]);
        let data="", events=0;
        p.stdout.on("data",chunk=>{data+=chunk;events++});
        p.on("error",e=>{console.error(e);process.exit(1)});
        p.on("close",code=>{console.log(JSON.stringify({code,data,events}));process.exit(code===7&&data==="firstsecond"&&events>=2?0:1)});'
    check sqlite bounded 20 sh -c 'test "$(sqlite3 :memory: "create table x(v); insert into x values (42); select v from x;")" = 42'
    check ffmpeg bounded 90 sh -c 'ffmpeg -hide_banner -loglevel error -f lavfi -i "sine=frequency=1000:duration=0.1" -y tone.wav && test -s tone.wav && ffprobe -v error -show_entries stream=codec_name -of default=nw=1 tone.wav'
    # Preserve actual package versions in evidence; APK packages follow signed release repos.
    apk info -v
}
agents() {
    # Exact versions resolved from the public npm registry when this lab was created.
    # npm artifacts run only inside the guest. No auth, prompts, or model requests.
    export CI=1
    export DISABLE_AUTOUPDATER=1
    export DISABLE_TELEMETRY=1
    export DISABLE_ERROR_REPORTING=1
    check agent_prerequisites bounded 20 sh -c 'node --version && npm --version'
    check codex_install bounded 600 npm install --prefix /root/bibimer-probe/codex --no-audit --no-fund --registry=https://registry.npmjs.org @openai/codex@0.163.0
    check codex_version bounded 90 /root/bibimer-probe/codex/node_modules/.bin/codex --version
    check claude_install bounded 600 npm install --prefix /root/bibimer-probe/claude --no-audit --no-fund --registry=https://registry.npmjs.org @anthropic-ai/claude-code@2.1.303
    check claude_version bounded 90 /root/bibimer-probe/claude/node_modules/.bin/claude --version
}
shutdown() {
    # Leave real guest children behind when init exits. The host must reap them
    # and observe stdout EOF before producing its native completion record.
    # One child explicitly ignores TERM, so cleanup must escalate to guest KILL.
    rm -f shutdown-ready
    sleep 30 &
    sleeper=$!
    sh -c 'trap "" TERM; printf ready > shutdown-ready; while :; do sleep 30; done' &
    resistant=$!
    check shutdown_children_started bounded 5 sh -c '
        while [ ! -f shutdown-ready ]; do sleep 0.1; done
        [ "$(cat shutdown-ready)" = ready ] && kill -0 "$1" && kill -0 "$2"
    ' sh "$sleeper" "$resistant"
}
case "$tier" in
    basic) basic ;;
    packages) packages ;;
    agents) agents ;;
    agent-runtime)
        check codex_runtime bounded 240 python3 /agent-runtime.py codex
        check claude_runtime bounded 240 python3 /agent-runtime.py claude
        ;;
    kernel-runtime) check parent_death_signal bounded 45 python3 /kernel-runtime.py ;;
    bridge-pty) check bridge_pty bounded 100 python3 /bridge-pty.py ;;
    node-network) check node_network bounded 60 python3 /node-network.py ;;
    node-wasm) check node_wasm bounded 350 python3 /node-network.py wasm ;;
    claude-runtime) check claude_runtime bounded 240 python3 /agent-runtime.py claude ;;
    claude-js) check claude_js_runtime bounded 550 python3 /agent-runtime.py claude-js ;;
    codex-external) check codex_external_runtime bounded 240 python3 /agent-runtime.py codex-external ;;
    extra-install)
        check opencode_install bounded 950 python3 /extra-agents.py opencode-install
        check opencode_version bounded 200 python3 /extra-agents.py opencode-version
        check gemini_install bounded 950 python3 /extra-agents.py gemini-install
        check gemini_version bounded 200 python3 /extra-agents.py gemini-version
        ;;
    extra-runtime)
        check opencode_runtime bounded 300 python3 /extra-agents.py opencode-runtime
        check gemini_runtime bounded 300 python3 /extra-agents.py gemini-runtime
        ;;
    gemini-acp) check gemini_acp_runtime bounded 350 python3 /probe-gemini-acp.py ;;
    bun-process) check bun_process bounded 460 python3 /probe-bun-process.py --profile both ;;
    bun-preload) check bun_preload bounded 700 python3 /probe-bun-process.py --profile both --read-delay-ms 25 --stdio-preload /experimental-stdio-retention.cjs ;;
    bun-compiled-preload) check bun_compiled_preload bounded 120 python3 /probe-bun-process.py --compiled-preload-only --profile both --stdio-preload /experimental-stdio-retention.cjs ;;
    bun-compiled-inspect) check bun_compiled_preload bounded 120 python3 /probe-bun-process.py --compiled-preload-only --compiled-preload-transport inspect --profile both --stdio-preload /experimental-stdio-retention.cjs ;;
    memory-fault) check memory_fault bounded 120 python3 /memory-fault.py ;;
    signal-stack) check signal_stack bounded 90 python3 /signal-stack.py ;;
    arm64-fp) check arm64_fp bounded 90 python3 /arm64-fp.py ;;
    bun-math) check bun_math bounded 220 python3 /bun-math.py ;;
    compute-signal) check compute_signal bounded 65 python3 /compute-signal.py ;;
    epoll-runtime) check epoll_runtime bounded 100 python3 /epoll-runtime.py ;;
    claude-sdk) check claude_sdk_runtime bounded 1000 python3 /probe-claude-sdk.py ;;
    opencode-provider) check opencode_provider_runtime bounded 650 python3 /probe-opencode-provider.py ;;
    opencode-inspect) check opencode_inspect bounded 60 python3 /extra-agents.py opencode-inspect ;;
    opencode-search) check opencode_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 python3 /probe-opencode-provider.py ;;
    opencode-preload-search) check opencode_preload_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 BIBIMER_TEST_OPENCODE_STDIO_PRELOAD=1 python3 /probe-opencode-provider.py ;;
    opencode-inspect-preload-search) check opencode_inspect_preload_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 BIBIMER_TEST_OPENCODE_STDIO_PRELOAD=1 BIBIMER_TEST_OPENCODE_STDIO_TRANSPORT=inspect python3 /probe-opencode-provider.py ;;
    opencode-stdio-trace) check opencode_stdio_trace_runtime bounded 950 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 BIBIMER_TEST_OPENCODE_STDIO_TRACE=1 python3 /probe-opencode-provider.py ;;
    opencode-compat-search) check opencode_compat_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 BIBIMER_TEST_OPENCODE_COMPAT_JOIN=1 python3 /probe-opencode-provider.py ;;
    opencode-shell-edges) check opencode_shell_edges_runtime bounded 1100 env BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 python3 /probe-opencode-shell-edges.py ;;
    opencode-117-search) check opencode_117_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_VERSION=1.17.0 BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 python3 /probe-opencode-provider.py ;;
    opencode-1313-search) check opencode_1313_search_runtime bounded 950 env BIBIMER_TEST_OPENCODE_VERSION=1.3.13 BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1 BIBIMER_TEST_OPENCODE_SEARCH=1 python3 /probe-opencode-provider.py ;;
    opencode-version) check opencode_version bounded 220 python3 /extra-agents.py opencode-version ;;
    opencode-legacy) check opencode_legacy_runtime bounded 950 env BIBIMER_TEST_OPENCODE_VERSION=1.2.27 python3 /extra-agents.py opencode-runtime ;;
    opencode-legacy-provider) check opencode_legacy_provider_runtime bounded 950 env BIBIMER_TEST_OPENCODE_VERSION=1.2.27 python3 /probe-opencode-provider.py ;;
    opencode-baseline) check opencode_guest_baseline_runtime bounded 420 env BIBIMER_TEST_GUEST_JSC_JIT=1 BIBIMER_TEST_GUEST_JSC_BASELINE=1 python3 /extra-agents.py opencode-runtime ;;
    opencode-jit) check opencode_guest_jit_runtime bounded 420 env BIBIMER_TEST_GUEST_JSC_JIT=1 python3 /extra-agents.py opencode-runtime ;;
    opencode-runtime) check opencode_runtime bounded 400 python3 /extra-agents.py opencode-runtime ;;
    gemini-version) check gemini_version bounded 220 python3 /extra-agents.py gemini-version ;;
    gemini-runtime) check gemini_runtime bounded 400 python3 /extra-agents.py gemini-runtime ;;
    shutdown) shutdown ;;
    persistence) check persistence_read sh -c '[ "$(cat persistence-marker)" = bibimer-persistence-v1 ]' ;;
    *) printf 'Unknown probe tier: %s\n' "$tier" >&2; exit 2 ;;
esac
finish
