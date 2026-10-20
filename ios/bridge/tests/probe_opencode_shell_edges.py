#!/usr/bin/env python3
"""Guest-only OpenCode output-join edge cases; --self-test never runs a CLI.

Stage with /extra-agents.py, /probe-opencode-provider.py, /opencode-compat.py,
and the original provider. Requires the already installed official 1.19.3 ELF.
One server/session runs four explicit turns using only synthetic loopback API.
"""
import importlib.util
import json
import os
from pathlib import Path
import queue
import re
import signal
import subprocess
import sys
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest


MODEL = "bibimer_local/bibimer-local-test"
FINAL = "BIBIMER_SHELL_EDGE_DONE_"
CASES = {
    "exit7": {"command": "printf 'EDGE_STDOUT_7319\\n'; printf 'EDGE_STDERR_7319\\n' >&2; exit 7", "exit": 7},
    "large": {"command": "python3 -c 'import sys; sys.stdout.write(\"X\"*65537); sys.stdout.flush(); sys.stderr.write(\"Y\"*65539); sys.stderr.flush()'", "exit": 0},
    "timeout": {"command": "echo $$ > timeout.pid; sleep 30; printf forbidden > timeout-forbidden", "timeout": 2000, "exit": None},
    "abort": {"command": "echo $$ > abort.pid; sleep 30; printf forbidden > abort-forbidden", "timeout": 60000, "exit": None},
}


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_result(name, result, work):
    """Validate actual model-facing tool content, never command/terminal text."""
    content = result.get("content")
    if not isinstance(content, str):
        # OpenAI-compatible content may also use typed text blocks.
        if not isinstance(content, list) or not all(isinstance(x, dict) and x.get("type") == "text" for x in content):
            raise AssertionError("Missing native textual tool result")
        content = "\n".join(x.get("text", "") for x in content)
    if name == "exit7":
        assert "EDGE_STDOUT_7319" in content and "EDGE_STDERR_7319" in content, "stdout/stderr missing from model tool result"
    elif name == "large":
        assert "...output truncated..." in content, "Native truncation marker missing"
        match = re.search(r"^Full output saved to: (.+)$", content, re.MULTILINE)
        assert match, "Native full-output path missing"
        path = Path(match[1])
        root = (work / "profile" / ".local" / "share" / "opencode" / "tool-output").resolve()
        assert path.is_absolute() and path.resolve().is_relative_to(root), "Output path escaped disposable profile"
        assert not path.is_symlink() and path.is_file(), "Missing regular full-output file"
        assert path.stat().st_size == 65537 + 65539, "Full-output byte length mismatch"
        output = path.read_bytes()
        assert output.count(b"X") == 65537 and output.count(b"Y") == 65539, "Full-output byte contents mismatch"
    elif name == "timeout":
        assert "<shell_metadata>" in content and "exceeding timeout 2000 ms" in content, "Native timeout metadata missing"
        assert not (work / "timeout-forbidden").exists(), "Timed-out command continued"
    else:
        raise AssertionError("Aborted turn must not require a synthetic model completion")


def inference_handler(fixture):
    class Handler(fixture.Handler):
        def opencode(self, data):
            name = self.server.case
            assert name in CASES, "Inference outside an explicit test turn"
            identity = "call_edge_" + name
            results = {m.get("tool_call_id"): m for m in data.get("messages", []) if m.get("role") == "tool"}
            tools = [t.get("function", {}).get("name") for t in data.get("tools", [])]
            if identity in results:
                validate_result(name, results[identity], self.server.work)
                self.server.verified.add(name)
                delta, reason = {"role": "assistant", "content": FINAL + name}, "stop"
            elif "bash" not in tools:
                delta, reason = {"role": "assistant", "content": "Disposable shell edge probe"}, "stop"
            else:
                if name in self.server.issued:
                    raise AssertionError("Repeated native tool request without its result")
                self.server.issued.add(name)
                arguments = {"command": CASES[name]["command"], "description": "Disposable " + name + " regression", "timeout": CASES[name].get("timeout", 30000)}
                delta = {"role": "assistant", "tool_calls": [{"index": 0, "id": identity, "type": "function", "function": {"name": "bash", "arguments": json.dumps(arguments)}}]}
                reason = "tool_calls"
            common = {"id": "chatcmpl_edge_" + str(len(self.server.requests)), "created": 1, "model": "bibimer-local-test"}
            if not data.get("stream"):
                message = dict(delta)
                if "tool_calls" in message:
                    message["tool_calls"] = [{k: v for k, v in t.items() if k != "index"} for t in message["tool_calls"]]
                self.reply({**common, "object": "chat.completion", "choices": [{"index": 0, "message": message, "finish_reason": reason}], "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}})
                return
            events = [{**common, "object": "chat.completion.chunk", "choices": [{"index": 0, "delta": delta, "finish_reason": None}]},
                      {**common, "object": "chat.completion.chunk", "choices": [{"index": 0, "delta": {}, "finish_reason": reason}], "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}}]
            self.reply(("".join("data: " + json.dumps(event) + "\n\n" for event in events) + "data: [DONE]\n\n").encode(), "text/event-stream")
    return Handler


def process_identity(pid):
    try:
        # comm can contain spaces/parentheses. Fields after the last ')' start
        # at state(3); starttime(22) prevents cleanup of a reused guest PID.
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return fields[19], fields[0], int(fields[1]), int(fields[2])
    except FileNotFoundError:
        return None


def owned_pid(work, name, provider_pid):
    path = work / (name + ".pid")
    if not path.exists():
        return None
    raw = path.read_text().strip()
    assert raw.isdecimal() and int(raw) > 1, "Invalid owned Bash PID"
    pid = int(raw)
    identity = process_identity(pid)
    if identity is None or identity[1] == "Z":
        return None
    ancestor, seen = pid, set()
    while ancestor != provider_pid:
        assert ancestor > 1 and ancestor not in seen, "Bash PID is not a descendant of this provider"
        seen.add(ancestor)
        parent = process_identity(ancestor)
        assert parent, "Bash ancestry disappeared before ownership check"
        ancestor = parent[2]
    return pid, identity[0], identity[3]


def alive(record):
    current = process_identity(record[0])
    return current is not None and current[0] == record[1] and current[1] != "Z"


def main():
    if os.uname().sysname != "Linux" or os.uname().machine != "aarch64" or not Path("/etc/alpine-release").is_file():
        raise SystemExit("Execute only inside the bundled ARM64 Alpine guest")
    fixture = load_module("edge_fixture", "/extra-agents.py")
    provider_probe = load_module("edge_provider_probe", "/probe-opencode-provider.py")
    assert fixture.VERSIONS["opencode"] == "1.19.3" and fixture.BASE == Path("/root/bibimer-probe"), "Only fixed original 1.19.3 fixture allowed"
    original = fixture.cli_path("opencode")
    assert original.is_file() and Path("/bin/bash").is_file(), "Stage/install the fixed CLI and Bash before this probe"
    fixture.BASE.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="runtime-opencode-shell-edges-", dir=fixture.BASE))
    env = provider_probe.probe_environment(fixture, work)
    assert not any(key in env for key in ("BUN_INSPECT_PRELOAD", "BUN_OPTIONS", "NODE_OPTIONS")), "Edge proof requires no preload or injected JS options"
    patched = work / "opencode-output-join"
    subprocess.run([sys.executable, "/opencode-compat.py", str(original), "--output", str(patched)], check=True, timeout=90)
    server = fixture.InferenceServer("opencode", work)
    server.RequestHandlerClass = inference_handler(fixture)
    server.case, server.verified, server.issued = None, set(), set()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    config = {"$schema": "https://opencode.ai/config.json", "model": MODEL, "small_model": MODEL,
              "autoupdate": False, "permission": "ask", "share": "disabled", "snapshot": False,
              "provider": {"bibimer_local": {"npm": "@ai-sdk/openai-compatible", "name": "Disposable local inference",
              "options": {"baseURL": f"http://127.0.0.1:{server.server_port}/v1", "apiKey": "bibimer-local-test-not-a-secret"},
              "models": {"bibimer-local-test": {"name": "Disposable local model", "limit": {"context": 32000, "output": 4096}}}}}}
    config_path = work / "opencode.json"
    config_path.write_text(json.dumps(config))
    env["OPENCODE_CONFIG"] = str(config_path)
    source = Path("/opt/bibimer/bridge/provider_opencode.py")
    if not source.is_file():
        source = Path("/provider_opencode.py")
    provider = work / "provider_opencode_ios.py"
    provider.write_text(provider_probe.opencode_provider_source(source.read_text()))
    provider.chmod(0o600)
    events, owned, checks = queue.Queue(), [], []
    process = None
    log = (work / "provider-stderr.log").open("wb")
    try:
        process = subprocess.Popen([sys.executable, str(provider), str(patched)], cwd=work, env=env,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log,
                                   text=True, start_new_session=True, close_fds=True)

        def read_events():
            try:
                for line in process.stdout:
                    events.put(json.loads(line))
            except Exception as error:
                events.put({"readerError": repr(error)})
            finally:
                events.put(None)
        threading.Thread(target=read_events, daemon=True).start()

        def send(value):
            process.stdin.write(json.dumps(value) + "\n")
            process.stdin.flush()

        def next_event(deadline):
            nonlocal turn_id
            while time.monotonic() < deadline:
                if server.errors:
                    raise AssertionError("Synthetic API rejected native results: " + repr(server.errors))
                try:
                    value = events.get(timeout=min(.2, max(.001, deadline - time.monotonic())))
                except queue.Empty:
                    return None
                assert value is not None, "Provider exited before expected event"
                assert not value.get("error") and not value.get("readerError"), value
                assert value.get("method") != "bibimer/notice", value
                if value.get("method") == "turn/started":
                    assert value["params"].get("threadId") == thread_id
                    turn_id = value["params"]["turn"]["id"]
                if value.get("method", "").endswith("requestApproval"):
                    params = value["params"]
                    assert value["method"] == "item/commandExecution/requestApproval" and params.get("cwd") == str(work), "Unexpected approval scope"
                    assert params.get("threadId") == thread_id and params.get("turnId") == turn_id, "Approval belongs to another turn"
                    approvals.add(value["id"])
                    send({"id": value["id"], "result": {"decision": "accept"}})
                return value
            raise TimeoutError("Bounded provider event deadline exceeded")

        def response(identity, deadline):
            while True:
                value = next_event(deadline)
                if value and value.get("id") == identity:
                    return value["result"]

        thread_id, turn_id, approvals = None, None, set()
        send({"id": 1, "method": "initialize", "params": {}})
        response(1, time.monotonic() + 180)
        send({"method": "initialized", "params": {}})
        send({"id": 2, "method": "thread/start", "params": {"cwd": str(work), "bibimerOptions": {"permission": "ask"}}})
        thread_id = response(2, time.monotonic() + 30)["thread"]["id"]
        for index, name in enumerate(CASES):
            server.case = name
            approvals, items, answers = set(), [], []
            turn_id = None
            deadline, started = time.monotonic() + 180, time.monotonic()
            request_id = 10 + index * 10
            send({"id": request_id, "method": "turn/start", "params": {"threadId": thread_id,
                  "input": [{"type": "text", "text": "Run disposable shell edge " + name}],
                  "bibimerOptions": {"permission": "ask", "model": MODEL}}})
            turn_id = response(request_id, deadline)["turn"]["id"]
            record, interrupted = None, False
            while True:
                if name in {"timeout", "abort"} and record is None:
                    record = owned_pid(work, name, process.pid)
                    if record:
                        owned.append(record)
                if name == "abort" and record and not interrupted:
                    assert approvals, "Command ran before explicit approval"
                    send({"id": request_id + 1, "method": "turn/interrupt", "params": {"threadId": thread_id, "turnId": turn_id}})
                    interrupted = True
                value = next_event(deadline)
                if not value:
                    continue
                params = value.get("params", {})
                if value.get("method") == "item/completed" and params.get("responseTurnId") == turn_id:
                    item = params.get("item", {})
                    if item.get("type") == "commandExecution":
                        items.append(item)
                    elif item.get("type") == "agentMessage":
                        answers.append(item.get("text", ""))
                if value.get("method") == "turn/completed" and params.get("turn", {}).get("id") == turn_id:
                    status = params["turn"]["status"]
                    break
            assert approvals, "No explicit native Bash approval"
            if name == "abort":
                assert interrupted and record and status == "interrupted", "Missing structured user interruption"
            else:
                assert status == "completed" and name in server.verified, "Native completion without validated model-facing tool result"
                assert FINAL + name in answers, "Final native answer missing"
                matching = [item for item in items if item.get("command") == CASES[name]["command"]]
                assert matching and matching[-1].get("status") == "completed", "Native Bash item not completed"
                assert "exitCode" in matching[-1] and matching[-1]["exitCode"] == CASES[name]["exit"], "Native Bash exit code mismatch"
            if name in {"timeout", "abort"}:
                assert (work / (name + ".pid")).is_file(), "Bash never started"
                if record is None:
                    # Do not infer death merely because a fast timeout beat
                    # the polling loop's live-PID ownership observation.
                    pid = int((work / (name + ".pid")).read_text().strip())
                    state = process_identity(pid)
                    assert state is None or state[1] == "Z", "Unobserved Bash PID remains alive"
                stop = min(deadline, time.monotonic() + 10)
                while record and alive(record) and time.monotonic() < stop:
                    time.sleep(.1)
                assert not record or not alive(record), "Bash survived timeout/interruption"
                assert not (work / (name + "-forbidden")).exists(), "Command continued after timeout/interruption"
            checks.append(name)
            print("OPENCODE_SHELL_EDGE", json.dumps({"case": name, "status": status, "nativeExitCode": CASES[name]["exit"], "approvals": len(approvals), "durationSeconds": time.monotonic() - started}), flush=True)
        process.stdin.close()
        process.wait(timeout=15)
        assert process.returncode == 0, "Provider did not shut down cleanly"
        assert not server.errors
    finally:
        # Only identities captured through ancestry under our provider qualify.
        for record in owned:
            if alive(record):
                try:
                    if record[2] == record[0]:
                        os.killpg(record[0], signal.SIGKILL)
                    else:
                        os.kill(record[0], signal.SIGKILL)
                except ProcessLookupError:
                    pass
        try:
            if process:
                fixture.terminate(process)
                # Also clean any remaining members after an early leader exit.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        finally:
            log.close()
            server.shutdown()
            server.server_close()
    print("OPENCODE_SHELL_EDGES_RESULT", json.dumps({"checks": checks, "count": len(checks), "preload": False, "originalUnmodified": True, "work": str(work)}), flush=True)
    print("opencode_shell_edges_ok", flush=True)


def self_test():
    class ResultTests(unittest.TestCase):
        def test_exit_requires_both_native_streams(self):
            validate_result("exit7", {"content": "EDGE_STDOUT_7319\nEDGE_STDERR_7319"}, Path("/unused"))
            for text in ("", "(no output)", "EDGE_STDOUT_7319", "EDGE_STDERR_7319"):
                with self.assertRaises(AssertionError):
                    validate_result("exit7", {"content": text}, Path("/unused"))

        def test_large_checks_actual_bytes_and_confines_path(self):
            with tempfile.TemporaryDirectory() as directory:
                work = Path(directory)
                output = work / "profile/.local/share/opencode/tool-output/tool_test"
                output.parent.mkdir(parents=True)
                output.write_bytes(b"X" * 65537 + b"Y" * 65539)
                content = "...output truncated...\n\nFull output saved to: " + str(output) + "\n\nXY"
                validate_result("large", {"content": content}, work)
                output.write_bytes(b"X" * (65537 + 65539))
                with self.assertRaises(AssertionError):
                    validate_result("large", {"content": content}, work)
                with self.assertRaises(AssertionError):
                    validate_result("large", {"content": content.replace(str(output), "/etc/passwd")}, work)

        def test_timeout_requires_native_metadata_and_no_side_effect(self):
            with tempfile.TemporaryDirectory() as directory:
                work = Path(directory)
                content = "<shell_metadata>\nshell tool terminated command after exceeding timeout 2000 ms.\n</shell_metadata>"
                validate_result("timeout", {"content": content}, work)
                with self.assertRaises(AssertionError):
                    validate_result("timeout", {"content": "completed"}, work)
                (work / "timeout-forbidden").touch()
                with self.assertRaises(AssertionError):
                    validate_result("timeout", {"content": content}, work)

        def test_abort_cannot_be_reported_as_model_success(self):
            with self.assertRaises(AssertionError):
                validate_result("abort", {"content": FINAL + "abort"}, Path("/unused"))

        def test_handler_uses_current_native_tool_result_only(self):
            handler_type = inference_handler(SimpleNamespace(Handler=object))
            handler = handler_type()
            handler.server = SimpleNamespace(case="exit7", work=Path("/unused"), verified=set(), issued=set(), requests=[])
            replies = []
            handler.reply = lambda *args: replies.append(args[0])
            # Auxiliary titles do not count as issuing/completing a tool.
            handler.opencode({"messages": [], "tools": []})
            self.assertFalse(handler.server.issued)
            request = {"messages": [{"role": "user", "content": "EDGE_STDOUT_7319 EDGE_STDERR_7319"}],
                       "tools": [{"function": {"name": "bash"}}]}
            handler.opencode(request)
            call = replies[-1]["choices"][0]["message"]["tool_calls"][0]
            self.assertEqual(call["id"], "call_edge_exit7")
            self.assertEqual(json.loads(call["function"]["arguments"])["command"], CASES["exit7"]["command"])
            self.assertFalse(handler.server.verified)
            with self.assertRaises(AssertionError):
                handler.opencode({**request, "messages": [{"role": "tool", "tool_call_id": "call_edge_exit7", "content": "(no output)"}]})
            handler.opencode({**request, "messages": [{"role": "tool", "tool_call_id": "call_edge_exit7", "content": "EDGE_STDOUT_7319 EDGE_STDERR_7319"}]})
            self.assertEqual(handler.server.verified, {"exit7"})
            self.assertEqual(replies[-1]["choices"][0]["message"]["content"], FINAL + "exit7")
            handler.server.case = "timeout"
            handler.opencode({**request, "messages": [{"role": "tool", "tool_call_id": "call_edge_exit7", "content": "EDGE_STDOUT_7319 EDGE_STDERR_7319"}]})
            self.assertEqual(replies[-1]["choices"][0]["message"]["tool_calls"][0]["id"], "call_edge_timeout")
            self.assertNotIn("timeout", handler.server.verified)

    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ResultTests))
    if not result.wasSuccessful():
        raise SystemExit(1)


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        self_test()
    elif sys.argv[1:]:
        raise SystemExit("Usage: probe_opencode_shell_edges.py [--self-test]")
    else:
        main()
