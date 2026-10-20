#!/usr/bin/env python3
"""Guest-only original Gemini ACP/adapter tool roundtrip, synthetic local API.

Stage beside the lab's /extra-agents.py and /provider_gemini.py. This is a test
program, never an authentication shortcut or production agent configuration.
"""
import importlib.util
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading
import time


def configure_native_policy(config):
    config.mkdir(parents=True, exist_ok=True)
    policy = config / "fixture-permissions.toml"
    policy.write_text('''[[rule]]
toolName = "*"
decision = "deny"
priority = 50

[[rule]]
toolName = "read_file"
decision = "allow"
priority = 100

[[rule]]
toolName = "write_file"
decision = "ask_user"
priority = 100
''')
    (config / "settings.json").write_text(json.dumps({
        "policyPaths": [str(policy)],
        "security": {"auth": {"selectedType": "gemini-api-key"}, "folderTrust": {"enabled": False}},
        "general": {"enableAutoUpdate": False, "maxAttempts": 1},
        "telemetry": {"enabled": False}, "advanced": {"autoConfigureMemory": False}}))


def run_case(fixture, decision):
    work = fixture.BASE / ("runtime-gemini-acp-" + decision)
    work.mkdir(parents=True, exist_ok=True)
    (work / "input.txt").write_text(fixture.INPUT + "\n")
    (work / "output.txt").unlink(missing_ok=True)
    env = fixture.environment("gemini", work)
    config = Path(env["GEMINI_CLI_HOME"]) / ".gemini"
    # In 0.64.0 tools.core creates native ALLOW rules (priority 4.25),
    # which would bypass a user policy priority100 (4.1). Use only TOML.
    configure_native_policy(config)
    server = fixture.InferenceServer("gemini", work)
    if decision == "decline":
        class RejectionHandler(fixture.Handler):
            def gemini(self, data):
                results = [part["functionResponse"] for item in data.get("contents", [])
                           for part in item.get("parts", []) if "functionResponse" in part]
                denied = [result for result in results if result.get("name") == "write_file"]
                if not denied:
                    return super().gemini(data)
                if (work / "output.txt").exists() or not re.search(r"deni|reject|cancel", json.dumps(denied), re.I):
                    raise RuntimeError("Native write rejection was not preserved")
                server.rejection_seen = True
                payload = {"candidates": [{"index": 0, "content": {"role": "model", "parts": [{"text": fixture.FINAL}]},
                                           "finishReason": "STOP"}], "modelVersion": "gemini-2.5-flash"}
                if "streamGenerateContent" in self.path:
                    self.reply(("data: " + json.dumps(payload) + "\n\n").encode(), "text/event-stream")
                else:
                    self.reply(payload)
        server.RequestHandlerClass = RejectionHandler
    threading.Thread(target=server.serve_forever, daemon=True).start()
    env.update(GEMINI_API_KEY="bibimer-local-test-not-a-secret", GEMINI_MODEL="gemini-2.5-flash",
               GOOGLE_GEMINI_BASE_URL=f"http://127.0.0.1:{server.server_port}", GOOGLE_GENAI_API_VERSION="v1beta")
    adapter = Path("/opt/bibimer/ios/provider_gemini.py")
    if not adapter.is_file():
        adapter = Path("/provider_gemini.py")
    process = subprocess.Popen([sys.executable, str(adapter), str(fixture.cli_path("gemini"))],
        cwd=work, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        start_new_session=True, close_fds=True)
    events = queue.Queue()
    started = time.monotonic()
    approvals = 0
    answers = []

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

    def until(predicate, timeout=120):
        nonlocal approvals
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                value = events.get(timeout=min(1, deadline - time.monotonic()))
            except queue.Empty:
                continue
            if value is None:
                raise RuntimeError("Gemini adapter ended before explicit completion")
            if "error" in value:
                raise RuntimeError(str(value["error"]))
            if "id" in value and value.get("method", "").endswith("requestApproval"):
                # The isolated fake model only requests the fixture's write_file.
                # No arbitrary user project/model output reaches this test.
                if value["method"] != "item/fileChange/requestApproval":
                    raise RuntimeError("Unexpected synthetic permission request")
                if (work / "output.txt").exists():
                    raise RuntimeError("Native write happened before explicit approval")
                approvals += 1
                send({"id": value["id"], "result": {"decision": decision}})
            if value.get("method") == "item/completed":
                item = value.get("params", {}).get("item") or {}
                if item.get("type") == "agentMessage":
                    answers.append(item.get("text", ""))
            if predicate(value):
                return value
        raise TimeoutError("Gemini ACP roundtrip deadline")

    try:
        send({"id": 1, "method": "initialize", "params": {}})
        until(lambda value: value.get("id") == 1)
        send({"id": 2, "method": "thread/start", "params": {"cwd": str(work), "bibimerOptions": {"permission": "inherit"}}})
        thread = until(lambda value: value.get("id") == 2)["result"]["thread"]["id"]
        send({"id": 3, "method": "turn/start", "params": {"threadId": thread,
            "input": [{"type": "text", "text": "Read input.txt, write output.txt, and report completion."}],
            "bibimerOptions": {"permission": "inherit", "model": "gemini-2.5-flash"}}})
        completed = until(lambda value: value.get("method") == "turn/completed", timeout=240)
        if completed["params"]["turn"]["status"] != "completed":
            raise RuntimeError("ACP did not report successful native end_turn")
        if server.errors or not server.read_seen or (decision == "accept" and not server.write_seen):
            raise RuntimeError({"errors": server.errors, "requests": len(server.requests),
                                "readInput": server.read_seen, "wroteOutput": server.write_seen})
        if decision == "accept":
            if (work / "output.txt").read_text() != fixture.OUTPUT:
                raise RuntimeError("Native output file mismatch")
        elif (work / "output.txt").exists() or not getattr(server, "rejection_seen", False):
            raise RuntimeError("Native rejection did not preserve the original files")
        if fixture.FINAL not in "\n".join(answers):
            raise RuntimeError("Native final answer mismatch")
        if approvals < 1:
            raise RuntimeError("No explicit one-time native write decision was exercised")
        process.stdin.close()
        process.wait(timeout=15)
        if process.returncode != 0:
            raise RuntimeError("Adapter exit: " + str(process.returncode))
        print("GEMINI_ACP_RESULT", json.dumps({"agent": "gemini", "version": fixture.VERSIONS["gemini"],
            "transport": "native-acp", "inference": "synthetic-guest-local", "readInput": True,
            "wroteOutput": decision == "accept", "nativeCompletion": True,
            "explicitApprovals": approvals if decision == "accept" else 0,
            "explicitRejections": approvals if decision == "decline" else 0,
            "permissionCase": decision,
            "exitCode": 0, "durationSeconds": time.monotonic() - started}), flush=True)
    finally:
        fixture.terminate(process)
        server.shutdown()
        server.server_close()


def main():
    if not Path("/etc/alpine-release").is_file() or os.uname().machine != "aarch64":
        raise SystemExit("Execute only inside the bundled ARM64 Alpine guest")
    spec = importlib.util.spec_from_file_location("extra_agent_fixture", "/extra-agents.py")
    fixture = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fixture)
    for decision in ("accept", "decline"):
        run_case(fixture, decision)


if __name__ == "__main__":
    main()
