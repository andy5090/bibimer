#!/usr/bin/env python3
"""Guest-only subprocess diagnostics for OpenCode's original embedded Bun.

No model, credentials or user project is involved. Run with --profile baseline
to isolate baseline JIT, or --profile both to compare against default JSC0.
API contracts: https://bun.sh/docs/runtime/child-process and
https://bun.sh/docs/bundler/executables#act-as-the-bun-cli .
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time


BASE = Path("/root/bibimer-probe")
PACKAGE = BASE / "opencode/node_modules/opencode-linux-arm64-musl"
INPUT = "bibimer-bun-spawn-input-8462\n"
OUTPUT = "bibimer-bun-spawn-output-8462\n"
STDOUT = "bibimer-bun-stdout-8462\n"
STDERR = "bibimer-bun-stderr-8462\n"
STDIO_PRELOAD_PATHS = (Path("/experimental-stdio-retention.cjs"), Path("/stdio-retention-preload.cjs"),
                       Path("/opt/bibimer/ios/experimental-stdio-retention.cjs"))
COMPILED_PRELOAD_SENTINEL = "BIBIMER_COMPILED_STDIO_PRELOAD_BEFORE_MAIN_8462"
COMMON = '''import assert from "node:assert/strict";
const stage = (name, data = {}) => console.log("BUN_PROCESS_STAGE", JSON.stringify({name, ...data}));
const command = ["/bin/sh", "-c", "printf 'bibimer-bun-stdout-8462\\n'; printf 'bibimer-bun-stderr-8462\\n' >&2; exit 7"];
const options = {stdin: "ignore", stdout: "pipe", stderr: "pipe"};
const check = (stdout, stderr, exitCode) => {
  assert.equal(stdout, "bibimer-bun-stdout-8462\\n");
  assert.equal(stderr, "bibimer-bun-stderr-8462\\n");
  assert.equal(exitCode, 7);
};
stage("runtime", {version: Bun.version});
'''
SCRIPTS = {
    "bun_spawn_sync": COMMON + '''
stage("before_spawn_sync");
const result = Bun.spawnSync(command, options);
stage("after_spawn_sync", {exitCode: result.exitCode, success: result.success});
check(Buffer.from(result.stdout).toString(), Buffer.from(result.stderr).toString(), result.exitCode);
assert.equal(result.success, false);
stage("verified", {childExitCode: result.exitCode});
''',
    "bun_spawn_async": COMMON + '''
stage("before_spawn");
const child = Bun.spawn(command, options);
stage("after_spawn", {pid: child.pid});
const exited = child.exited.then(code => {stage("exit_resolved", {exitCode: code}); return code;});
stage("before_stdout_stderr_read");
const stdout = new Response(child.stdout).text().then(text => {stage("stdout_eof", {bytes: text.length}); return text;});
const stderr = new Response(child.stderr).text().then(text => {stage("stderr_eof", {bytes: text.length}); return text;});
const result = await Promise.all([stdout, stderr, exited]);
stage("after_streams_and_exit");
check(...result);
stage("verified", {childExitCode: result[2]});
''',
    "bun_spawn_read_after_exit": COMMON + '''
stage("before_spawn");
const child = Bun.spawn(command, options);
stage("after_spawn", {pid: child.pid});
const code = await child.exited;
stage("exit_before_read", {exitCode: code});
const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
stage("after_delayed_streams", {stdoutBytes: stdout.length, stderrBytes: stderr.length});
check(stdout, stderr, code);
stage("verified", {childExitCode: code});
''',
    "node_child_process": COMMON + '''
import {spawn} from "node:child_process";
stage("before_spawn");
const child = spawn(command[0], command.slice(1), {stdio: ["ignore", "pipe", "pipe"]});
stage("after_spawn", {pid: child.pid});
let stdout = "", stderr = "";
child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
child.stdout.on("data", data => {stdout += data; stage("stdout_data", {bytes: data.length});});
child.stderr.on("data", data => {stderr += data; stage("stderr_data", {bytes: data.length});});
child.stdout.on("end", () => stage("stdout_eof"));
child.stderr.on("end", () => stage("stderr_eof"));
const closed = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => stage("exit_event", {exitCode: code, signal}));
  child.once("close", (code, signal) => {stage("close_event", {exitCode: code, signal}); resolve({code, signal});});
});
stage("before_close_wait");
const result = await closed;
stage("after_close_wait");
assert.equal(result.signal, null);
check(stdout, stderr, result.code);
stage("verified", {childExitCode: result.code});
''',
    "node_lazy_merged_pull": COMMON + '''
import {spawn} from "node:child_process";
const snapshot = readable => ({ended: readable.readableEnded, length: readable.readableLength, closed: readable.closed});
// Mirror platform-node-shared 4.0.0-beta.83's initial readableEnded guard,
// readable/read()/end pull sequence, and lazy evaluation after spawn settles.
function pull(readable, name) {
  stage("pull_evaluate", {stream: name, ...snapshot(readable)});
  if (readable.readableEnded) return Promise.resolve(Buffer.alloc(0));
  return new Promise((resolve, reject) => {
    const chunks = []; let ended = false, queued = false, finished = false;
    const schedule = () => {if (!queued) {queued = true; queueMicrotask(drain);}};
    const onEnd = () => {ended = true; stage("pull_end", {stream: name, ...snapshot(readable)}); schedule();};
    function drain() {
      queued = false; if (finished) return;
      try {
        let item; while ((item = readable.read()) !== null) chunks.push(Buffer.from(item));
        if (!ended) return;
        finished = true; readable.off("readable", schedule); readable.off("end", onEnd); readable.off("error", reject);
        const result = Buffer.concat(chunks); stage("pull_eof", {stream: name, bytes: result.length}); resolve(result);
      } catch (error) {reject(error);}
    }
    readable.on("readable", schedule); readable.once("error", reject); readable.once("end", onEnd); drain();
  });
}
stage("before_spawn");
const child = spawn(command[0], command.slice(1), {stdio: ["pipe", "pipe", "pipe"], detached: true});
stage("child_created", {pid: child.pid});
let exit;
const closed = new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code, signal) => {exit = {code, signal}; stage("exit_event", exit);});
  child.on("close", (code, signal) => {stage("close_event", {code, signal}); resolve(exit || {code, signal});});
});
await new Promise((resolve, reject) => {child.once("spawn", resolve); child.once("error", reject);});
stage("spawn_callback_resolved", {pid: child.pid});
const delay = Number(process.env.BIBIMER_BUN_READ_DELAY_MS || 0);
if (delay) await new Promise(resolve => setTimeout(resolve, delay));
stage("before_lazy_merged_collect", {delayMs: delay});
const chunks = [];
const consume = (stream, name) => pull(stream, name).then(data => {chunks.push(data);});
const [,, result] = await Promise.all([consume(child.stdout, "stdout"), consume(child.stderr, "stderr"), closed]);
const merged = Buffer.concat(chunks).toString();
stage("after_lazy_merged_collect", {bytes: merged.length, exitCode: result.code});
assert.deepEqual(merged.trimEnd().split("\\n").sort(), ["bibimer-bun-stdout-8462", "bibimer-bun-stderr-8462"].sort());
assert.equal(result.code, 7); assert.equal(result.signal, null);
stage("verified", {childExitCode: result.code});
''',
    "bash_file_roundtrip": COMMON + '''
import {readFileSync} from "node:fs";
const bashCommand = ["/bin/bash", "-c", "cat input.txt; printf 'bibimer-bun-spawn-output-8462\\n' > output.txt; printf 'bibimer-bun-stderr-8462\\n' >&2; exit 7"];
stage("before_bash_spawn");
const child = Bun.spawn(bashCommand, options);
stage("after_bash_spawn", {pid: child.pid});
const exited = child.exited.then(code => {stage("exit_resolved", {exitCode: code}); return code;});
stage("before_stdout_stderr_read");
const stdout = new Response(child.stdout).text().then(text => {stage("stdout_eof", {bytes: text.length}); return text;});
const stderr = new Response(child.stderr).text().then(text => {stage("stderr_eof", {bytes: text.length}); return text;});
const result = await Promise.all([stdout, stderr, exited]);
stage("after_streams_and_exit");
assert.equal(result[0], "bibimer-bun-spawn-input-8462\\n");
assert.equal(result[1], "bibimer-bun-stderr-8462\\n");
assert.equal(result[2], 7);
assert.equal(readFileSync("output.txt", "utf8"), "bibimer-bun-spawn-output-8462\\n");
stage("verified", {childExitCode: result[2], readInput: true, wroteOutput: true});
''',
}

# Optional: requires only explicitly staged, pinned test dependencies. No
# installer or production package changes are performed by this diagnostic.
EFFECT_SCRIPT = COMMON + '''
import {createRequire} from "node:module";
const require = createRequire(process.env.BIBIMER_BUN_EFFECT_PREFIX + "/package.json");
const {Effect, Stream, Deferred, Exit} = require("effect");
const {NodeStream} = require("@effect/platform-node");
const launch = require("cross-spawn");
stage("effect_loaded");
const run = Effect.scoped(Effect.gen(function* () {
  const [child, signal] = yield* Effect.callback(resume => {
    const signal = Deferred.makeUnsafe();
    stage("before_spawn");
    const proc = launch(command[0], command.slice(1), {stdio: ["pipe", "pipe", "pipe"], detached: true});
    stage("child_created", {pid: proc.pid});
    let exit;
    proc.on("error", error => resume(Effect.fail(error)));
    proc.on("exit", (...args) => {exit = args; stage("exit_event", {exitCode: args[0], signal: args[1]});});
    proc.on("close", (...args) => {stage("close_event"); Deferred.doneUnsafe(signal, Exit.succeed(exit || args));});
    proc.on("spawn", () => resume(Effect.succeed([proc, signal])));
    return Effect.sync(() => proc.kill("SIGTERM"));
  });
  stage("spawn_callback_resolved", {pid: child.pid});
  const stdout = NodeStream.fromReadable({evaluate: () => {stage("effect_stdout_evaluate", {ended: child.stdout.readableEnded, length: child.stdout.readableLength}); return child.stdout;}});
  const stderr = NodeStream.fromReadable({evaluate: () => {stage("effect_stderr_evaluate", {ended: child.stderr.readableEnded, length: child.stderr.readableLength}); return child.stderr;}});
  const merged = Stream.merge(stdout, stderr);
  const collect = Stream.runFold(merged, () => [], (chunks, chunk) => {chunks.push(Buffer.from(chunk)); return chunks;});
  stage("before_effect_merged_collect");
  const [chunks, [code, signalCode]] = yield* Effect.all([collect, Deferred.await(signal)], {concurrency: "unbounded"});
  const text = Buffer.concat(chunks).toString();
  stage("after_effect_merged_collect", {bytes: text.length, exitCode: code});
  assert.deepEqual(text.trimEnd().split("\\n").sort(), ["bibimer-bun-stdout-8462", "bibimer-bun-stderr-8462"].sort());
  assert.equal(code, 7); assert.equal(signalCode, null);
}));
await Effect.runPromise(run);
stage("verified", {childExitCode: 7});
'''

STDIO_PRELOAD_SCRIPT = COMMON + '''
import {spawn} from "node:child_process";
assert.equal(globalThis[Symbol.for("bibimer.experimental.stdio-retention.v1")]?.version, 1);
stage("preload_memory_marker_confirmed");
const child = spawn(command[0], command.slice(1), {stdio: ["ignore", "pipe", "pipe"]});
const closed = new Promise((resolve, reject) => {child.once("error", reject); child.once("close", (code, signal) => resolve({code, signal}));});
const result = await closed;
await new Promise(resolve => setTimeout(resolve, 25));
assert.notEqual(child.stdout, child.stdio[1]); assert.notEqual(child.stderr, child.stdio[2]);
const chunks = async stream => {const parts = []; for await (const part of stream) parts.push(Buffer.from(part)); return Buffer.concat(parts).toString();};
const [stdout, stderr] = await Promise.all([chunks(child.stdout), chunks(child.stderr)]);
check(stdout, stderr, result.code); assert.equal(result.signal, null);
assert.ok(!(process.env.BUN_OPTIONS || "").includes("--preload /stdio-retention-preload.cjs"));
assert.ok(!(process.env.BUN_OPTIONS || "").includes("--preload /experimental-stdio-retention.cjs"));
assert.ok(!(process.env.BUN_OPTIONS || "").includes("--preload /opt/bibimer/ios/experimental-stdio-retention.cjs"));
stage("verified", {childExitCode: result.code, preloadMarker: true, delayedRead: true});
'''


def environment(profile, read_delay_ms=0, effect_prefix=None, stdio_preload=None):
    env = {key: value for key, value in os.environ.items()
           if key in ("HOME", "PATH", "LANG", "LC_ALL", "TERM")}
    env.update(BUN_BE_BUN="1", JSC_useJIT="0", SHELL="/bin/bash")
    env["BIBIMER_BUN_READ_DELAY_MS"] = str(read_delay_ms)
    if effect_prefix:
        env["BIBIMER_BUN_EFFECT_PREFIX"] = str(effect_prefix)
    if stdio_preload:
        existing = os.environ.get("BUN_OPTIONS", "")
        env["BUN_OPTIONS"] = (existing + " " if existing else "") + "--preload " + str(stdio_preload)
    if profile == "baseline":
        env.update(JSC_useJIT="1", JSC_useDFGJIT="0", JSC_useFTLJIT="0", JSC_useConcurrentJIT="0")
    return env


def run_case(program, work, profile, name, source, read_delay_ms=0, effect_prefix=None, stdio_preload=None):
    directory = work / (profile + "-" + name)
    directory.mkdir()
    (directory / "input.txt").write_text(INPUT)
    script = directory / "probe.mjs"
    script.write_text(source)
    print("BUN_PROCESS_START", json.dumps({"case": name, "profile": profile, "timeoutSeconds": 45}), flush=True)
    started = time.monotonic()
    process = subprocess.Popen([str(program), str(script)], cwd=directory, env=environment(profile, read_delay_ms, effect_prefix, stdio_preload),
                               stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               start_new_session=True, close_fds=True)
    printed = [0, 0]
    detached_children = set()
    def report(streams):
        for index, raw in enumerate(streams):
            raw = raw or b""
            if len(raw) > 128 * 1024:
                raise RuntimeError("Bun diagnostics exceeded the per-stream limit")
            if index == 0:
                for line in raw.splitlines():
                    if line.startswith(b"BUN_PROCESS_STAGE "):
                        try:
                            stage = json.loads(line.split(b" ", 1)[1])
                        except ValueError:
                            continue
                        pid = stage.get("pid")
                        if stage.get("name") == "child_created" and type(pid) is int and pid > 1:
                            detached_children.add(pid)
            fresh = raw[printed[index]:]
            if fresh:
                print("BUN_PROCESS_" + ("STDOUT" if index == 0 else "STDERR"), name,
                      fresh.decode(errors="replace"), end="" if fresh.endswith(b"\n") else "\n", flush=True)
                printed[index] = len(raw)
    failure, stdout, stderr = None, b"", b""
    try:
        while True:
            remaining = 45 - (time.monotonic() - started)
            if remaining <= 0:
                raise TimeoutError("45-second subprocess deadline")
            try:
                stdout, stderr = process.communicate(timeout=min(1, remaining))
                report((stdout, stderr))
                break
            except subprocess.TimeoutExpired as pending:
                report((pending.output, pending.stderr))
        stages = [json.loads(line.split(" ", 1)[1]) for line in stdout.decode().splitlines()
                  if line.startswith("BUN_PROCESS_STAGE ")]
        if process.returncode != 0 or not stages or stages[-1].get("name") != "verified":
            raise RuntimeError("Bun did not verify the real child output and exit: " + str(process.returncode))
        if name == "bash_file_roundtrip" and (directory / "output.txt").read_text() != OUTPUT:
            raise RuntimeError("Python did not observe the exact native Bash output file")
    except Exception as error:
        failure = type(error).__name__ + ": " + str(error)
    finally:
        # Signal only the process group created for this test, including children
        # after a parent exits. Never rely on the runtime being diagnosed to kill.
        for group in [*detached_children, process.pid]:
            try:
                if group == process.pid or os.getpgid(group) == group:
                    os.killpg(group, signal.SIGKILL)
            except ProcessLookupError:
                pass
        try:
            stdout, stderr = process.communicate(timeout=5)
            report((stdout, stderr))
        except subprocess.TimeoutExpired:
            raise RuntimeError("Owned Bun process group could not be reaped after SIGKILL") from None
    result = {"case": name, "profile": profile, "passed": failure is None, "exitCode": process.returncode,
              "durationSeconds": time.monotonic() - started}
    if failure:
        result["error"] = failure
    print("BUN_PROCESS_RESULT", json.dumps(result), flush=True)
    return result


def compiled_preload_loader(helper):
    return ('"use strict";\nrequire(' + json.dumps(str(helper)) + ');\n'
            'if (globalThis[Symbol.for("bibimer.experimental.stdio-retention.v1")]?.version !== 1) '
            'throw new Error("Experimental helper memory marker missing");\n'
            # Bun prints source context on errors. Do not put the complete
            # sentinel literally in source: a preceding require/marker failure
            # must not appear to satisfy the expected thrown-message check.
            'throw new Error(' + json.dumps(COMPILED_PRELOAD_SENTINEL.split("_")) + '.join("_"));\n')


def compiled_preload_environment(profile, loader, transport):
    env = environment(profile)
    env.pop("BUN_BE_BUN", None)
    if transport == "options":
        env["BUN_OPTIONS"] = "--preload " + str(loader)
    elif transport == "inspect":
        # Bun 1.3.14 Arguments.zig:763-776 adds this to ctx.preloads;
        # bun.js.zig:60 carries ctx.preloads to bootStandalone's VM.
        # This does NOT set BUN_INSPECT/CONNECT_TO or any --inspect option.
        # Debugger activation is separate (Arguments.zig:926 onward).
        env["BUN_INSPECT_PRELOAD"] = str(loader)
    else:
        raise ValueError("Unknown compiled preload transport")
    return env


def verify_compiled_preload(program, work, profile, helper, transport="options"):
    """Prove the selected preload transport runs before original ELF --version."""
    loader = work / ("compiled-preload-loader-" + profile + "-" + transport + ".cjs")
    loader.write_text(compiled_preload_loader(helper))
    env = compiled_preload_environment(profile, loader, transport)
    print("BUN_COMPILED_PRELOAD_START", json.dumps({"profile": profile, "mode": "original-compiled-main",
          "transport": transport, "command": [str(program), "--version"], "timeoutSeconds": 45}), flush=True)
    process = subprocess.Popen([str(program), "--version"], cwd=work, env=env, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True, close_fds=True)
    started, failure = time.monotonic(), None
    stdout, stderr = b"", b""
    try:
        stdout, stderr = process.communicate(timeout=45)
    except subprocess.TimeoutExpired:
        failure = "Original compiled preload deadline"
    finally:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            stdout, stderr = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            raise RuntimeError("Owned original compiled process could not be reaped after SIGKILL") from None
    if len(stdout) > 128 * 1024 or len(stderr) > 128 * 1024:
        failure = "Original compiled diagnostics exceeded the per-stream limit"
    print("BUN_COMPILED_PRELOAD_STDOUT", stdout[-8192:].decode(errors="replace"), flush=True)
    print("BUN_COMPILED_PRELOAD_STDERR", stderr[-8192:].decode(errors="replace"), flush=True)
    sentinel = COMPILED_PRELOAD_SENTINEL.encode() in stderr
    passed = failure is None and process.returncode != 0 and sentinel
    result = {"passed": passed, "profile": profile, "mode": "original-compiled-main", "bunBeBun": False,
              "transport": transport, "inspectorRequested": False,
              "exitCode": process.returncode, "sentinelSeen": sentinel, "helperSHA256": hashlib.sha256(helper.read_bytes()).hexdigest(),
              "durationSeconds": time.monotonic() - started}
    if failure:
        result["error"] = failure
    print("BUN_COMPILED_PRELOAD_RESULT", json.dumps(result), flush=True)
    if not passed:
        raise RuntimeError("Original compiled main did not prove pre-entrypoint helper loading")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=("interpreter", "baseline", "both"), default="interpreter")
    parser.add_argument("--read-delay-ms", type=int, choices=(0, 25, 250), default=0)
    parser.add_argument("--effect-prefix", type=Path, help="Guest-only prefix with pinned Effect test packages already staged")
    parser.add_argument("--stdio-preload", type=Path, choices=STDIO_PRELOAD_PATHS,
                        help="Opt in to the experimental helper already staged at a fixed guest path")
    parser.add_argument("--compiled-preload-only", action="store_true",
                        help="Run original ELF --version without BUN_BE_BUN; require the loader's expected sentinel failure")
    parser.add_argument("--compiled-preload-transport", choices=("options", "inspect"), default="options",
                        help="Select one source-backed preload path; inspect means only BUN_INSPECT_PRELOAD, never a debugger port")
    args = parser.parse_args()
    if os.uname().sysname != "Linux" or os.uname().machine != "aarch64" or not Path("/etc/alpine-release").is_file():
        raise SystemExit("Run only inside the bundled ARM64 Alpine guest")
    program = PACKAGE / "bin/opencode"
    if json.loads((PACKAGE / "package.json").read_text())["version"] != "1.19.3":
        raise RuntimeError("The original OpenCode 1.19.3 package is required")
    with program.open("rb") as executable:
        if executable.read(4) != b"\x7fELF":
            raise RuntimeError("The package payload must be the original ELF, not a wrapper")
    if not Path("/bin/bash").is_file():
        raise RuntimeError("The guest's base Bash package must be installed before this probe")
    scripts = dict(SCRIPTS)
    if args.stdio_preload:
        if not args.stdio_preload.is_file():
            raise RuntimeError("The experimental stdio preload must already be staged")
        scripts["stdio_preload_loaded"] = STDIO_PRELOAD_SCRIPT
    if args.effect_prefix:
        for package, version in (("effect", "4.0.0-beta.83"), ("@effect/platform-node", "4.0.0-beta.83"), ("cross-spawn", "7.0.6")):
            if json.loads((args.effect_prefix / "node_modules" / package / "package.json").read_text())["version"] != version:
                raise RuntimeError("Effect probe dependencies must match the original OpenCode pins")
        scripts["effect_app_process_merge"] = EFFECT_SCRIPT
    work = Path(tempfile.mkdtemp(prefix="bun-process-", dir=BASE))
    profiles = ("interpreter", "baseline") if args.profile == "both" else (args.profile,)
    if args.compiled_preload_only:
        if not args.stdio_preload:
            parser.error("--compiled-preload-only requires --stdio-preload")
        for profile in profiles:
            verify_compiled_preload(program, work, profile, args.stdio_preload, args.compiled_preload_transport)
        print("bun_compiled_preload_ok", flush=True)
        return
    results = [run_case(program, work, profile, name, source, args.read_delay_ms, args.effect_prefix, args.stdio_preload)
               for profile in profiles for name, source in scripts.items()]
    if not all(result["passed"] for result in results):
        raise RuntimeError("At least one original Bun subprocess check failed")
    print("bun_process_ok", flush=True)


if __name__ == "__main__":
    main()
