#!/usr/bin/env python3
"""Guest-only original OpenCode server/provider and synthetic local inference."""
import importlib.util
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
import time


# Keep this isolated lab adaptation identical to the product clone; host tests compare both.
def opencode_provider_source(text):
    before = "time.monotonic() + 7"
    if text.count(before) != 1:
        raise RuntimeError("Bundled OpenCode startup contract changed")
    text = text.replace(before, "time.monotonic() + 120")
    start, end = "    def monitor(self):\n", "    def response(self, value):\n"
    if text.count(start) != 1 or text.count(end) != 1:
        raise RuntimeError("Bundled OpenCode monitor contract changed")
    prefix, monitor = text.split(start)
    monitor, suffix = monitor.split(end)
    changes = {
        "        failures, saw_busy = 0, False\n":
            "        failures, saw_busy = 0, False\n        observation_turn, observation_deadline = None, 0\n",
        "                    turn, key = self.turn, self.thread\n":
            "                    turn, key = self.turn, self.thread\n                if turn != observation_turn:\n                    observation_turn, observation_deadline = turn, time.monotonic() + 180\n                def observation_timeout():\n                    return max(5, observation_deadline - time.monotonic())\n",
        "self.http('GET', '/session/' + key + '/message', limit=50)":
            "self.http('GET', '/session/' + key + '/message', timeout=observation_timeout(), limit=50)",
        "self.http('GET', '/session/status')": "self.http('GET', '/session/status', timeout=observation_timeout())",
        "self.http('GET', '/permission')": "self.http('GET', '/permission', timeout=observation_timeout())",
        "self.http('GET', '/question')": "self.http('GET', '/question', timeout=observation_timeout())",
    }
    for before, after in changes.items():
        if monitor.count(before) != 1:
            raise RuntimeError("Bundled OpenCode monitor contract changed")
        monitor = monitor.replace(before, after)
    return prefix + start + monitor + end + suffix


def probe_environment(fixture, work):
    env = fixture.environment("opencode", work)
    # Preserve the fixture's explicit baseline-JIT experiment. Its normal
    # profile is JSC0, matching the product; never silently override a trial.
    env["SHELL"] = "/bin/bash"
    env["OPENCODE_DISABLE_AUTOUPDATE"] = "true"
    env["OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER"] = "true"
    if os.environ.get("BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS") == "1":
        for flag in ("OPENCODE_DISABLE_FFF", "OPENCODE_DISABLE_MODELS_FETCH", "OPENCODE_DISABLE_TERMINAL_TITLE"):
            env.pop(flag, None)
    if os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRACE") == "1":
        trace = Path("/stdio-retention-trace.cjs")
        if not trace.is_file() or not Path("/experimental-stdio-retention.cjs").is_file():
            raise RuntimeError("The fixed experimental stdio trace and helper must already be staged")
        if fixture.BASE != Path("/root/bibimer-probe"):
            raise RuntimeError("Stdio tracing is restricted to the fixed original-CLI synthetic fixture")
        env["BUN_INSPECT_PRELOAD"] = str(trace)
    elif os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_PRELOAD") == "1":
        preload = Path("/experimental-stdio-retention.cjs")
        if not preload.is_file():
            raise RuntimeError("The experimental stdio preload must already be staged")
        transport = os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRANSPORT", "options")
        if transport == "options":
            existing = os.environ.get("BUN_OPTIONS", "")
            env["BUN_OPTIONS"] = (existing + " " if existing else "") + "--preload " + str(preload)
        elif transport == "inspect":
            # Synthetic fixture only. The helper removes only its exact path
            # from child environments. Product use still needs real CLI proof
            # and explicit handling of an existing user preload conflict.
            env["BUN_INSPECT_PRELOAD"] = str(preload)
        else:
            raise RuntimeError("Unknown experimental stdio preload transport")
    return env


def verified_search(server):
    if os.environ.get("BIBIMER_TEST_OPENCODE_SEARCH") != "1":
        return {}
    if not getattr(server, "glob_seen", False) or not getattr(server, "grep_seen", False):
        raise RuntimeError("Original OpenCode did not return verified native glob and grep results")
    return {"nativeSearch": {"glob": True, "grep": True}}


def main():
    if not Path("/etc/alpine-release").is_file() or os.uname().machine != "aarch64":
        raise SystemExit("Execute only inside the bundled ARM64 Alpine guest")
    spec = importlib.util.spec_from_file_location("extra_agent_fixture", "/extra-agents.py")
    fixture = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fixture)
    fixture.BASE.mkdir(parents=True, exist_ok=True)
    fixture.install("opencode")
    work = fixture.BASE / "runtime-opencode-provider"
    work.mkdir(parents=True, exist_ok=True)
    if os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRACE") == "1":
        (work / "stdio-trace.jsonl").unlink(missing_ok=True)
    (work / "input.txt").write_text(fixture.INPUT + "\n")
    (work / "output.txt").unlink(missing_ok=True)
    env = probe_environment(fixture, work)
    if not Path("/bin/bash").is_file():
        subprocess.run(["apk", "add", "--no-cache", "bash"], env=env, check=True, timeout=180)
    server = fixture.InferenceServer("opencode", work)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    config = {"$schema": "https://opencode.ai/config.json", "model": "bibimer_local/bibimer-local-test",
        "small_model": "bibimer_local/bibimer-local-test", "autoupdate": False,
        "permission": "ask", "share": "disabled", "snapshot": False,
        "provider": {"bibimer_local": {"npm": "@ai-sdk/openai-compatible", "name": "Disposable local inference",
            "options": {"baseURL": f"http://127.0.0.1:{server.server_port}/v1", "apiKey": "bibimer-local-test-not-a-secret"},
            "models": {"bibimer-local-test": {"name": "Disposable local model", "limit": {"context": 32000, "output": 4096}}}}}}
    (work / "opencode.json").write_text(json.dumps(config))
    env["OPENCODE_CONFIG"] = str(work / "opencode.json")
    provider = Path("/opt/bibimer/bridge/provider_opencode.py")
    if not provider.is_file():
        provider = Path("/provider_opencode.py")
    if not provider.is_file():
        raise RuntimeError("The original OpenCode provider must be staged")
    text = provider.read_text()
    text = opencode_provider_source(text)
    diagnostic = "            except Exception:\n                failures += 1"
    if text.count(diagnostic) != 1 or text.count("stderr=subprocess.DEVNULL") != 1:
        raise RuntimeError("Original OpenCode diagnostic contract changed")
    text = text.replace(diagnostic, "            except Exception as diagnostic_error:\n                print('OPENCODE_MONITOR_ERROR', type(diagnostic_error).__name__, repr(diagnostic_error), file=sys.stderr, flush=True)\n                failures += 1")
    text = text.replace("stderr=subprocess.DEVNULL", "stderr=open(" + repr(str(work / "server-stderr.log")) + ", 'wb')")
    provider = work / "provider_opencode_ios.py"
    provider.write_text(text)
    provider.chmod(0o600)
    command_path = fixture.cli_path("opencode")
    if os.environ.get("BIBIMER_TEST_OPENCODE_COMPAT_JOIN") == "1":
        patched = work / "opencode-output-join"
        subprocess.run([sys.executable, "/opencode-compat.py", str(command_path),
                        "--output", str(patched)], check=True, timeout=90)
        command_path = patched
    # The provider owns OpenCode's stdout PIPE and separate stderr DEVNULL.
    # Do not merge its stream FDs: that would hide duplicate-fd epoll bugs.
    diagnostics = (work / "provider-stderr.log").open("wb")
    process = subprocess.Popen([sys.executable, str(provider), str(command_path)],
        cwd=work, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=diagnostics,
        start_new_session=True, close_fds=True)
    events = queue.Queue()
    answers, approvals = [], []
    started = time.monotonic()
    successful = False

    def capture():
        try:
            for raw in process.stdout:
                events.put(json.loads(raw))
        finally:
            events.put(None)

    threading.Thread(target=capture, daemon=True).start()

    def send(value):
        process.stdin.write((json.dumps(value) + "\n").encode())
        process.stdin.flush()

    def until(predicate, timeout=180):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if server.errors:
                raise RuntimeError("Synthetic local inference rejected native tool results: " + str(server.errors))
            try:
                value = events.get(timeout=max(.001, min(1, deadline - time.monotonic())))
            except queue.Empty:
                continue
            if value is None:
                raise RuntimeError("Original OpenCode provider ended before completion")
            if "error" in value:
                raise RuntimeError(str(value["error"]))
            if value.get("method") == "bibimer/notice":
                raise RuntimeError("Original OpenCode provider notice: " + str(value.get("params")))
            if "id" in value and value.get("method", "").endswith("requestApproval"):
                params = value.get("params") or {}
                if value["method"] != "item/commandExecution/requestApproval" or params.get("cwd") != str(work):
                    raise RuntimeError("Unexpected permission outside the disposable command fixture")
                if (work / "output.txt").exists():
                    raise RuntimeError("Native tool wrote before explicit approval")
                approvals.append(value["id"])
                send({"id": value["id"], "result": {"decision": "accept"}})
            if value.get("method") == "item/completed":
                item = value.get("params", {}).get("item") or {}
                if item.get("type") == "agentMessage":
                    answers.append(item.get("text", ""))
            if predicate(value):
                return value
        raise TimeoutError("Original OpenCode provider roundtrip deadline")

    try:
        send({"id": 1, "method": "initialize", "params": {}})
        until(lambda value: value.get("id") == 1)
        print("OPENCODE_PROVIDER_STAGE initialized", flush=True)
        send({"method": "initialized", "params": {}})
        send({"id": 2, "method": "thread/start", "params": {"cwd": str(work), "bibimerOptions": {"permission": "ask"}}})
        thread = until(lambda value: value.get("id") == 2)["result"]["thread"]["id"]
        print("OPENCODE_PROVIDER_STAGE thread_started", flush=True)
        send({"id": 3, "method": "turn/start", "params": {"threadId": thread,
            "input": [{"type": "text", "text": "Read input.txt, write output.txt, and report completion."}],
            "bibimerOptions": {"permission": "ask", "model": "bibimer_local/bibimer-local-test"}}})
        print("OPENCODE_PROVIDER_STAGE turn_requested", flush=True)
        completed = until(lambda value: value.get("method") == "turn/completed",
                          timeout=600 if os.environ.get("BIBIMER_TEST_OPENCODE_SEARCH") == "1" else 420)
        if completed["params"]["turn"]["status"] != "completed":
            raise RuntimeError("No successful original OpenCode completion")
        if server.errors or not server.read_seen or not server.write_seen:
            raise RuntimeError({"errors": server.errors, "requests": len(server.requests),
                                "readInput": server.read_seen, "wroteOutput": server.write_seen})
        if not approvals or (work / "output.txt").read_text() != fixture.OUTPUT or fixture.FINAL not in "\n".join(answers):
            raise RuntimeError("Missing explicit native permission, output bytes or structured answer")
        search = verified_search(server)
        process.stdin.close()
        process.wait(timeout=15)
        if process.returncode != 0:
            raise RuntimeError("Original provider exit: " + str(process.returncode))
        successful = True
        print("OPENCODE_PROVIDER_RESULT", json.dumps({"agent": "opencode", "version": fixture.VERSIONS["opencode"],
            "transport": "original-bibimer-provider", "inference": "synthetic-guest-local", "readInput": True,
            "wroteOutput": True, "explicitApprovals": len(approvals), "nativeCompletion": True,
            "productFlags": os.environ.get("BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS") == "1",
            "jitProfile": "interpreter" if env.get("JSC_useJIT") == "0" else "experimental",
            "experimentalStdioRetention": os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_PRELOAD") == "1",
            "stdioTransport": "inspect-trace" if os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRACE") == "1" else (os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRANSPORT", "options") if os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_PRELOAD") == "1" else None),
            "compatibilityPatch": "shell-output-join-v1" if os.environ.get("BIBIMER_TEST_OPENCODE_COMPAT_JOIN") == "1" else None,
            "experimentalStdioTrace": os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRACE") == "1",
            **search,
            "exitCode": 0, "durationSeconds": time.monotonic() - started}), flush=True)
    finally:
        try:
            fixture.terminate(process)
        finally:
            diagnostics.close()
            try:
                if not successful:
                    for name in ("provider-stderr.log", "server-stderr.log"):
                        path = work / name
                        if path.exists():
                            with path.open("rb") as stream:
                                stream.seek(max(0, path.stat().st_size - 8192))
                                print("OPENCODE_PROVIDER_DIAGNOSTIC", name, stream.read().decode(errors="replace"), flush=True)
                if os.environ.get("BIBIMER_TEST_OPENCODE_STDIO_TRACE") == "1":
                    trace = work / "stdio-trace.jsonl"
                    if trace.is_file() and not trace.is_symlink():
                        with trace.open("rb") as stream:
                            raw = stream.read(128 * 1024)
                        print("OPENCODE_STDIO_TRACE", raw.decode(errors="replace"), flush=True)
                    else:
                        print("OPENCODE_STDIO_TRACE missing", flush=True)
            finally:
                server.shutdown()
                server.server_close()


if __name__ == "__main__":
    main()
