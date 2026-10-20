#!/usr/bin/env python3
"""Original Claude CLI + matched SDK + original Bibimer provider in the guest.

All inference is synthetic guest-local HTTP. Only disposable test files are
read/written, after an explicit native permission reply. No provider account,
real API key, developer-Mac process or user project is used.
"""
import contextlib
import gzip
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import queue
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.parse

CLI_VERSION = "2.1.112"
SDK_VERSION = "0.2.112"
INPUT = "bibimer-claude-sdk-input-7319"
OUTPUT = "bibimer-claude-sdk-output-7319\n"
FINAL = "BIBIMER_CLAUDE_SDK_DONE"
COMMAND = 'cat input.txt; printf "bibimer-claude-sdk-output-7319\\n" > output.txt'
BASE = Path("/root/bibimer-probe")


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, work):
        super().__init__(("127.0.0.1", 0), Handler)
        self.work = work
        self.errors = []
        self.requests = 0
        self.read_seen = self.write_seen = False
        self.approved = threading.Event()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(20)

    def do_GET(self):
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def body(self):
        if self.headers.get("Transfer-Encoding", "").lower() == "chunked":
            chunks, size = [], 0
            while True:
                line = self.rfile.readline(130)
                if len(line) > 128 or not line.endswith(b"\r\n"):
                    raise ValueError("Invalid synthetic request chunk")
                length = int(line.split(b";", 1)[0], 16)
                if length == 0:
                    for _ in range(128):
                        trailer = self.rfile.readline(8194)
                        if trailer == b"\r\n":
                            break
                        if not trailer or len(trailer) > 8192:
                            raise ValueError("Invalid synthetic request trailer")
                    else:
                        raise ValueError("Too many synthetic request trailers")
                    break
                size += length
                if length < 0 or size > 16 * 1024 * 1024:
                    raise ValueError("Synthetic request exceeds limit")
                data = self.rfile.read(length)
                if len(data) != length or self.rfile.read(2) != b"\r\n":
                    raise ValueError("Truncated synthetic request chunk")
                chunks.append(data)
            raw = b"".join(chunks)
        else:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16 * 1024 * 1024:
                raise ValueError("Missing or oversized synthetic request body")
            raw = self.rfile.read(length)
            if len(raw) != length:
                raise ValueError("Truncated synthetic request body")
        if self.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return json.loads(raw)

    def reply(self, value):
        raw = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
        self.wfile.flush()

    def do_POST(self):
        try:
            data = self.body()
            path = urllib.parse.urlsplit(self.path).path
            if path == "/v1/messages/count_tokens":
                self.reply({"input_tokens": 1})
                return
            if path != "/v1/messages":
                self.do_GET()
                return
            self.server.requests += 1
            print("CLAUDE_SDK_HTTP", path, "request", self.server.requests, flush=True)
            results = [block for message in data.get("messages", []) if isinstance(message.get("content"), list)
                       for block in message["content"] if block.get("type") == "tool_result"]
            if not results:
                if "Bash" not in {tool.get("name") for tool in data.get("tools", [])}:
                    raise ValueError("Original CLI did not offer native Bash")
                content = {"type": "tool_use", "id": "toolu_bibimer_sdk", "name": "Bash",
                           "input": {"command": COMMAND, "description": "Read and write disposable SDK test files"}}
                reason = "tool_use"
            else:
                if not self.server.approved.is_set():
                    raise ValueError("Native tool executed without explicit SDK approval")
                if INPUT not in json.dumps(results):
                    raise ValueError("Native Bash result did not contain input file bytes")
                if (self.server.work / "output.txt").read_text() != OUTPUT:
                    raise ValueError("Native Bash did not write exact output file bytes")
                self.server.read_seen = self.server.write_seen = True
                content, reason = {"type": "text", "text": FINAL}, "end_turn"
            message = {"id": "msg_sdk_" + str(self.server.requests), "type": "message", "role": "assistant",
                       "model": data.get("model"), "content": [content], "stop_reason": reason,
                       "stop_sequence": None, "usage": {"input_tokens": 1, "output_tokens": 1}}
            if not data.get("stream"):
                self.reply(message)
                return
            start = {**content, "input": {}} if reason == "tool_use" else {"type": "text", "text": ""}
            delta = {"type": "input_json_delta", "partial_json": json.dumps(content["input"])} if reason == "tool_use" else {"type": "text_delta", "text": FINAL}
            events = [
                {"type": "message_start", "message": {**message, "content": [], "stop_reason": None}},
                {"type": "content_block_start", "index": 0, "content_block": start},
                {"type": "content_block_delta", "index": 0, "delta": delta},
                {"type": "content_block_stop", "index": 0},
                {"type": "message_delta", "delta": {"stop_reason": reason, "stop_sequence": None}, "usage": {"output_tokens": 1}},
                {"type": "message_stop"},
            ]
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()
            for event in events:
                # A real SSE stream: split across writes and flush before close.
                raw = ("event: " + event["type"] + "\ndata: " + json.dumps(event) + "\n\n").encode()
                middle = max(1, len(raw) // 2)
                for piece in (raw[:middle], raw[middle:]):
                    self.wfile.write((format(len(piece), "x") + "\r\n").encode() + piece + b"\r\n")
                    self.wfile.flush()
                    time.sleep(.01)
            self.wfile.write(b"0\r\n\r\n")
            self.wfile.flush()
        except Exception as error:
            self.server.errors.append(repr(error))
            self.close_connection = True


def stop(process):
    if process.poll() is None:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=15)


def install(prefix, package, env):
    result = subprocess.run(["npm", "install", "--prefix", str(prefix), "--ignore-scripts", "--omit=optional",
        "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", package], env=env, timeout=600)
    if result.returncode:
        raise RuntimeError("Official pinned package installation failed: " + package)


def main():
    if not Path("/etc/alpine-release").is_file() or os.uname().machine != "aarch64":
        raise SystemExit("Execute only inside the bundled ARM64 Alpine guest")
    work = BASE / "runtime-claude-sdk"
    work.mkdir(parents=True, exist_ok=True)
    (work / "input.txt").write_text(INPUT + "\n")
    (work / "output.txt").unlink(missing_ok=True)
    config = work / "claude-config"
    config.mkdir(exist_ok=True)
    (config / "settings.json").write_text(json.dumps({"permissions": {"defaultMode": "default", "ask": ["Bash"]}}))
    env = {key: value for key, value in os.environ.items() if key in {"HOME", "PATH", "LANG", "LC_ALL", "TERM", "NODE_OPTIONS"}}
    env.update(CI="1", DISABLE_AUTOUPDATER="1", DISABLE_TELEMETRY="1", DISABLE_ERROR_REPORTING="1",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1", CLAUDE_CODE_MAX_RETRIES="0", API_TIMEOUT_MS="20000",
        CLAUDE_CONFIG_DIR=str(config), SHELL="/bin/bash")
    if not Path("/bin/bash").is_file():
        subprocess.run(["apk", "add", "--no-cache", "bash"], env=env, check=True, timeout=180)
    cli_prefix, sdk_prefix = BASE / "claude-js", BASE / "claude-sdk-js"
    started = time.monotonic()
    install(cli_prefix, "@anthropic-ai/claude-code@" + CLI_VERSION, env)
    install(sdk_prefix, "@anthropic-ai/claude-agent-sdk@" + SDK_VERSION, env)
    print("CLAUDE_SDK_STAGE packages_installed", flush=True)
    executable = cli_prefix / "node_modules/.bin/claude"
    sdk = sdk_prefix / "node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs"
    provider = Path("/opt/bibimer/bridge/provider_claude.mjs")
    if not provider.is_file():
        provider = Path("/provider_claude.mjs")
    if not provider.is_file() or not sdk.is_file() or not executable.is_file():
        raise RuntimeError("Original provider, matched SDK and CLI must all be staged")
    server = Server(work)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    env.update(ANTHROPIC_BASE_URL=f"http://127.0.0.1:{server.server_port}", ANTHROPIC_API_KEY="bibimer-local-test-not-a-secret")
    process = subprocess.Popen([shutil.which("node"), str(provider), str(executable), str(sdk)], cwd=work, env=env,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)
    queue_events = queue.Queue()
    approvals, answers, command_results = [], [], []

    def capture():
        try:
            for line in process.stdout:
                queue_events.put(json.loads(line))
        finally:
            queue_events.put(None)

    threading.Thread(target=capture, daemon=True).start()

    def send(value):
        process.stdin.write((json.dumps(value) + "\n").encode())
        process.stdin.flush()

    def until(predicate, timeout=180):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                value = queue_events.get(timeout=max(.001, min(1, deadline - time.monotonic())))
            except queue.Empty:
                continue
            if value is None:
                raise RuntimeError("Original Claude provider ended before completion")
            if "error" in value:
                raise RuntimeError(str(value["error"]))
            if "id" in value and value.get("method", "").endswith("requestApproval"):
                params = value.get("params") or {}
                if value["method"] != "item/commandExecution/requestApproval" or params.get("command") != COMMAND or params.get("cwd") != str(work):
                    raise RuntimeError("Unexpected permission request outside the disposable fixture")
                if (work / "output.txt").exists():
                    raise RuntimeError("Native tool wrote its output before explicit SDK approval")
                approvals.append(value["id"])
                server.approved.set()
                print("CLAUDE_SDK_STAGE explicit_permission", len(approvals), flush=True)
                send({"id": value["id"], "result": {"decision": "accept"}})
            if value.get("method") == "bibimer/notice":
                raise RuntimeError("Native provider notice: " + str(value.get("params")))
            if value.get("method") == "item/completed":
                item = value.get("params", {}).get("item") or {}
                if item.get("type") == "agentMessage":
                    answers.append(item.get("text", ""))
                if item.get("type") == "commandExecution" and item.get("status") == "completed":
                    command_results.append(item.get("aggregatedOutput", ""))
            if predicate(value):
                return value
        raise TimeoutError("Original Claude SDK/provider roundtrip deadline")

    try:
        send({"id": 1, "method": "initialize", "params": {}})
        until(lambda value: value.get("id") == 1)
        print("CLAUDE_SDK_STAGE provider_initialized", flush=True)
        send({"method": "initialized", "params": {}})
        send({"id": 2, "method": "thread/start", "params": {"cwd": str(work), "bibimerOptions": {"permission": "default", "model": "claude-sonnet-4-6"}}})
        thread = until(lambda value: value.get("id") == 2)["result"]["thread"]["id"]
        print("CLAUDE_SDK_STAGE thread_started", flush=True)
        send({"id": 3, "method": "turn/start", "params": {"threadId": thread,
            "input": [{"type": "text", "text": "Read input.txt, write output.txt, and report completion."}],
            "bibimerOptions": {"permission": "default", "model": "claude-sonnet-4-6"}}})
        completed = until(lambda value: value.get("method") == "turn/completed", timeout=240)
        if completed["params"]["turn"]["status"] != "completed":
            raise RuntimeError("No successful original SDK native result")
        if server.errors or not server.read_seen or not server.write_seen or server.requests < 2:
            raise RuntimeError({"errors": server.errors, "requests": server.requests,
                "readInput": server.read_seen, "wroteOutput": server.write_seen})
        if not approvals or (work / "output.txt").read_text() != OUTPUT:
            raise RuntimeError("Missing explicit permission or exact native output file")
        if FINAL not in "\n".join(answers) or INPUT not in "\n".join(command_results):
            raise RuntimeError("Missing structured final answer or native tool result")
        process.stdin.close()
        process.wait(timeout=15)
        if process.returncode != 0:
            raise RuntimeError("Original provider exit: " + str(process.returncode))
        print("CLAUDE_SDK_RESULT", json.dumps({"agent": "claude", "version": CLI_VERSION, "sdkVersion": SDK_VERSION,
            "transport": "original-bibimer-provider", "inference": "synthetic-guest-local", "readInput": True,
            "wroteOutput": True, "explicitApprovals": len(approvals), "nativeCompletion": True,
            "exitCode": 0, "durationSeconds": time.monotonic() - started}), flush=True)
    finally:
        stop(process)
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
