#!/usr/bin/env python3
"""Bibimer's authenticated Termux PTY and structured chat bridge (stdlib only)."""

import argparse
import base64
import binascii
import collections
import contextlib
import fcntl
import hashlib
import heapq
import hmac
import http.server
import json
import os
from pathlib import Path
import secrets
import select
import shutil
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import termios
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

VERSION = "0.3.1"
PORT = 8765
BUFFER_LIMIT = 1024 * 1024
ACTIVE = {"running", "stopping"}


ERROR_MESSAGES = {
    "error_folder_access": "Could not open this folder. Check that it exists and Termux has access.",
    "error_folder_request": "The folder browsing request is invalid.",
    "error_project_missing": "This project is no longer registered. Refresh the project list.",
    "error_bridge_stopping": "The bridge is restarting. Reconnect shortly.",
    "error_chat_mode": "Chat mode requires Codex and an updated bridge. Other programs use Terminal mode.",
    "error_chat_start": "Could not initialize Codex Chat. Check the Codex installation and configuration in Termux.",
    "error_chat_busy": "Wait for the current response or interrupt it before sending another message.",
    "error_chat_transport": "The agent connection failed. Check the session before sending again.",
    "error_chat_request": "This request is no longer pending. Refresh the session.",
    "error_chat_answer": "Complete the requested answers or choose a valid decision.",
    "error_timeout": "The connection request timed out.",
    "error_android_required": "Connect from the Android app.",
    "error_request_failed": "Could not process the request.",
    "error_protocol": "Update the app and bridge to compatible versions.",
    "error_connection_failed": "Could not reach the Termux bridge. Check that it is running in Termux.",
    "error_input_busy": "Input is queued up. Please try again shortly.",
    "error_number_range": "Check the numeric value and its allowed range.",
    "error_request_id": "The request ID is invalid.",
    "error_cursor_changed": "The output position changed. Reconnect to the session.",
    "error_input_size": "Each input must contain 1 to 16384 bytes.",
    "error_input_conflict": "A request ID cannot be reused for different input.",
    "error_input_uncertain": "This input may have been delivered only partly. Check the output.",
    "error_session_not_running": "Input can only be sent to a running session.",
    "error_input_partial": "Only part of the input was delivered. Check the output and send smaller chunks.",
    "error_resize": "Could not resize the terminal.",
    "error_pairing_expired": "The pairing code expired. Generate a new code in Termux.",
    "error_pairing_invalid": "Check the pairing code. After five failed attempts, generate a new one.",
    "error_project_busy": "Stop the current session before changing projects.",
    "error_project_path": "Enter a project path in Termux.",
    "error_absolute_path": "Enter an absolute path or a path starting with ~/.",
    "error_project_access": "Choose a project folder with read and write access.",
    "error_program": "Choose a supported program to run.",
    "error_launch_conflict": "This launch request ID has already been used.",
    "error_session_exists": "A session is already running.",
    "error_project_required": "Add a project first.",
    "error_program_missing": "This program is not installed in Termux. Check the setup guide.",
    "error_launch_failed": "Could not start the process. Check the folder and program.",
    "error_session_missing": "This session is no longer accessible. Refresh its current state.",
    "error_http_request": "The request could not be handled.",
    "error_internal": "The bridge could not process the request.",
    "error_local_only": "Only the app's local connection is allowed.",
    "error_pairing_required": "Connect the app to Termux first.",
    "error_content_length": "The request length is invalid.",
    "error_json_required": "Only JSON requests are accepted.",
    "error_invalid_json": "The JSON request is invalid.",
    "error_route": "The requested endpoint was not found.",
    "error_cursor": "The output position is invalid.",
    "error_input_format": "The input format is invalid."
}

CLI_MESSAGES = {
    "restart_busy": ["Stop all active sessions in Bibimer before restarting the bridge.", "브리지를 재시작하기 전에 Bibimer에서 모든 실행 세션을 종료해 주세요."],
    "restart_unverified": ["Could not verify the old bridge process. Stop that bridge manually in Termux, then run start.", "이전 브리지 프로세스를 확인하지 못했습니다. Termux에서 해당 브리지를 수동 종료한 뒤 start를 실행하세요."],
    "state_symlink": [
        "The state folder cannot be a symbolic link.",
        "상태 폴더는 심볼릭 링크일 수 없습니다."
    ],
    "pairing_title": [
        "Bibimer pairing code",
        "Bibimer 연결 코드"
    ],
    "pairing_help": [
        "Enter it in the app. It can be used once within five minutes.",
        "앱의 연결 코드에 입력하세요. 5분 동안 한 번 사용할 수 있습니다."
    ],
    "pairing_terminal": [
        "Run the pair command in a Termux terminal to view your code.",
        "연결 코드는 Termux 터미널에서 pair 명령으로 확인해 주세요."
    ],
    "port_range": [
        "Choose a port from 1024 to 65535.",
        "포트는 1024~65535 사이여야 합니다."
    ],
    "bridge_available": [
        "Bridge is available",
        "브리지 연결 가능"
    ],
    "bridge_unavailable": [
        "Bridge is unavailable",
        "브리지 연결 불가"
    ],
    "start_first": [
        "Start the bridge with the start command first.",
        "먼저 브리지를 start 명령으로 시작해 주세요."
    ],
    "start_failed": [
        "Could not start the bridge. Check whether the port is already in use.",
        "브리지를 시작하지 못했습니다. 이미 사용 중인 포트인지 확인해 주세요."
    ],
    "start_unconfirmed": [
        "Could not confirm that the bridge started.",
        "브리지 시작을 확인하지 못했습니다."
    ],
    "bridge_ready": [
        "Bibimer bridge is ready (127.0.0.1:{port})",
        "Bibimer 브리지 준비 완료 (127.0.0.1:{port})"
    ],
    "bridge_exists": [
        "A bridge is already running with this state folder.",
        "이 상태 폴더의 브리지가 이미 실행 중입니다."
    ]
}
CLI_LANGUAGE = "en"


def cli(key, **values):
    return CLI_MESSAGES[key][1 if CLI_LANGUAGE == "ko" else 0].format(**values)


class Problem(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code
        self.message = ERROR_MESSAGES[code]


def private_dir(path):
    path = Path(path).expanduser()
    if path.is_symlink():
        raise RuntimeError(cli("state_symlink"))
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path, 0o700)
    return path


def save_json(path, value):
    fd, temporary = tempfile.mkstemp(prefix=".bibimer-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False)
        os.replace(temporary, path)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(temporary)


def read_json(path, default=None):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, encoding="utf-8") as stream:
            return json.load(stream)
    except FileNotFoundError:
        return default


def integer(value, low, high):
    if type(value) is not int or not low <= value <= high:
        raise Problem(400, "error_number_range")
    return value


def request_id(value):
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise Problem(400, "error_request_id") from None


def issue_pairing(state):
    # Only this hash is persisted. The CLI displays the short-lived code to /dev/tty.
    code = f"{secrets.randbelow(100_000_000):08d}"
    save_json(state / "pairing.json", {
        "digest": hashlib.sha256(code.encode()).hexdigest(),
        "expires": time.time() + 300, "attempts": 0,
    })
    return code


class Session:
    def __init__(self, project, agent, argv, cols, rows, launch_id, changed):
        self.id = str(uuid.uuid4())
        self.launch_id = launch_id
        self.project, self.agent = project.copy(), agent
        self.cols, self.rows = cols, rows
        self.state, self.exit_code = "running", None
        self.started_at = time.time()
        self.buffer = bytearray()
        self.offset = 0
        self.condition = threading.Condition(threading.RLock())
        self.io_lock = threading.Lock()
        self.inputs = collections.OrderedDict()
        self.changed = changed
        master, slave = os.openpty()
        self.master = master
        os.set_blocking(master, False)
        try:
            fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
            env = os.environ.copy()
            env.update(TERM="xterm-256color", COLORTERM="truecolor")
            # Avoid preexec_fn in the multithreaded HTTP server. The small child
            # entry point claims its controlling terminal before exec'ing the CLI.
            self.process = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "_child", *argv],
                cwd=project["path"], env=env, stdin=slave, stdout=slave, stderr=slave,
                start_new_session=True, close_fds=True,
            )
        except BaseException:
            os.close(master)
            raise
        finally:
            os.close(slave)

    def start_reading(self):
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()
        threading.Thread(target=self._watch, daemon=True).start()

    def snapshot(self):
        with self.condition:
            return {
                "id": self.id, "launch_id": self.launch_id, "project": self.project,
                "agent": self.agent, "state": self.state, "exit_code": self.exit_code,
                "mode": "terminal",
                "started_at": self.started_at, "cols": self.cols, "rows": self.rows,
                "output_start": self.offset, "output_end": self.offset + len(self.buffer),
            }

    def _read(self):
        try:
            while True:
                ready, _, _ = select.select([self.master], [], [], 0.25)
                if not ready:
                    if self.process.poll() is not None:
                        return
                    continue
                try:
                    chunk = os.read(self.master, 65536)
                except BlockingIOError:
                    continue
                if not chunk:
                    return
                with self.condition:
                    self.buffer.extend(chunk)
                    excess = max(0, len(self.buffer) - BUFFER_LIMIT)
                    if excess:
                        del self.buffer[:excess]
                        self.offset += excess
                    self.condition.notify_all()
        except (OSError, ValueError):
            return

    def _watch(self):
        code = self.process.wait()
        self._signal_members(signal.SIGKILL)
        self.reader.join(timeout=1)
        with self.io_lock:
            with contextlib.suppress(OSError):
                os.close(self.master)
        with self.condition:
            self.exit_code = code
            self.state = "exited"
            self.condition.notify_all()
        self.changed()

    def events(self, cursor, wait):
        with self.condition:
            end = self.offset + len(self.buffer)
            if cursor > end:
                raise Problem(409, "error_cursor_changed")
            if cursor == end and self.state in ACTIVE and wait:
                self.condition.wait(timeout=wait)
            gap = cursor < self.offset
            start = max(cursor, self.offset)
            chunk = bytes(self.buffer[start - self.offset:start - self.offset + 65536])
            return {"session": self.snapshot(), "data": base64.b64encode(chunk).decode(),
                    "cursor": start + len(chunk), "gap": gap}

    def write(self, data, key):
        if not data or len(data) > 16384:
            raise Problem(400, "error_input_size")
        digest = hashlib.sha256(data).digest()
        with self.io_lock:
            if key in self.inputs:
                old_digest, complete = self.inputs[key]
                if old_digest != digest:
                    raise Problem(409, "error_input_conflict")
                if not complete:
                    raise Problem(409, "error_input_uncertain")
                return
            if self.state != "running" or self.process.poll() is not None:
                raise Problem(409, "error_session_not_running")
            written = 0
            deadline = time.monotonic() + 2
            while written < len(data) and time.monotonic() < deadline:
                try:
                    written += os.write(self.master, data[written:written + 4096])
                except BlockingIOError:
                    select.select([], [self.master], [], 0.1)
                except OSError:
                    break
            # Do not replay partially accepted input on an HTTP retry.
            self.inputs[key] = (digest, written == len(data))
            if len(self.inputs) > 512:
                self.inputs.popitem(last=False)
            if written != len(data):
                raise Problem(409, "error_input_partial")

    def resize(self, cols, rows):
        with self.io_lock:
            if self.state != "running":
                return
            try:
                fcntl.ioctl(self.master, termios.TIOCSWINSZ,
                            struct.pack("HHHH", rows, cols, 0, 0))
                self.cols, self.rows = cols, rows
            except OSError:
                raise Problem(409, "error_resize") from None

    def stop(self):
        with self.condition:
            if self.state != "running":
                return
            self.state = "stopping"
            self.condition.notify_all()
        self.changed()
        threading.Thread(target=self._terminate, daemon=True).start()

    def _signal_members(self, sig):
        # Interactive shells create a different process group for each job.
        # Limit signals to members of this owned POSIX session, never a global
        # process-name match. Processes that deliberately setsid() leave it.
        groups = set()
        try:
            for item in Path("/proc").iterdir():
                if item.name.isdigit():
                    try:
                        pid = int(item.name)
                        if os.getsid(pid) == self.process.pid:
                            groups.add(os.getpgid(pid))
                    except (ProcessLookupError, PermissionError):
                        pass
        except OSError:
            pass
        if self.process.poll() is None:
            groups.add(self.process.pid)
        for group in groups:
            with contextlib.suppress(ProcessLookupError, PermissionError):
                os.killpg(group, sig)

    def _terminate(self):
        self._signal_members(signal.SIGTERM)
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self._signal_members(signal.SIGKILL)


class ChatSession(Session):
    """One Codex app-server over stdio. Display content stays only in memory.

    Reuses the PTY session's scoped process stop, but never opens a PTY or
    derives messages by scraping a terminal screen. No arbitrary RPC passthrough.
    """
    def __init__(self, project, agent, argv, cols, rows, launch_id, changed):
        self.id, self.launch_id = str(uuid.uuid4()), launch_id
        self.project, self.agent = project.copy(), agent
        self.cols, self.rows = cols, rows
        self.started_at = time.time()
        self.state, self.exit_code = "running", None
        self.turn_state, self.turn_id, self.thread_id = "initializing", None, None
        self.condition = threading.Condition(threading.RLock())
        self.io_lock = threading.Lock()
        self.changed = changed
        self.items, self.requests, self.inputs = collections.OrderedDict(), {}, collections.OrderedDict()
        self.revision, self.floor, self.total = 0, 0, 0
        self.rpc_serial, self.rpc_pending = 0, {}
        self.process = subprocess.Popen(argv + ["app-server", "--listen", "stdio://"],
            cwd=project["path"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)
        os.set_blocking(self.process.stdin.fileno(), False)

    def snapshot(self):
        # This is also persisted as metadata: no prompts, answers or tool output.
        with self.condition:
            return {"id": self.id, "launch_id": self.launch_id, "project": self.project,
                    "agent": self.agent, "mode": "chat", "state": self.state,
                    "ready": self.thread_id is not None,
                    "turn_state": self.turn_state, "exit_code": self.exit_code,
                    "started_at": self.started_at, "output_start": self.floor,
                    "output_end": self.revision}

    def _bump(self):
        self.revision += 1
        self.condition.notify_all()

    def _put(self, item):
        self._bump()
        item = dict(item, revision=self.revision)
        previous = self.items.get(item["id"])
        if previous:
            self.total -= len(json.dumps(previous).encode())
        self.items[item["id"]] = item
        self.total += len(json.dumps(item).encode())
        while self.total > BUFFER_LIMIT or len(self.items) > 200:
            _, removed = self.items.popitem(last=False)
            self.total -= len(json.dumps(removed).encode())
            self.floor = max(self.floor, removed["revision"])

    @staticmethod
    def _text(value):
        value = value if isinstance(value, str) else ""
        return value[:32768] + ("\n[…]" if len(value) > 32768 else "")

    def _send(self, message):
        wire = json.dumps(message, ensure_ascii=False).encode() + b"\n"
        with self.io_lock:
            offset, deadline = 0, time.monotonic() + 2
            while offset < len(wire):
                if time.monotonic() >= deadline:
                    raise Problem(409, "error_chat_transport")
                try:
                    offset += os.write(self.process.stdin.fileno(), wire[offset:offset + 4096])
                except BlockingIOError:
                    select.select([], [self.process.stdin], [], 0.05)
                except (OSError, ValueError):
                    raise Problem(409, "error_chat_transport") from None

    def _rpc(self, method, params, kind):
        self.rpc_serial += 1
        key = "bibimer-" + str(self.rpc_serial)
        self.rpc_pending[key] = kind
        self._send({"id": key, "method": method, "params": params})

    def start_reading(self):
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()
        threading.Thread(target=self._watch, daemon=True).start()
        try:
            with self.condition:
                self._rpc("initialize", {"clientInfo": {"name": "bibimer", "title": "Bibimer", "version": VERSION},
                          "capabilities": {"experimentalApi": True}}, "initialize")
        except Problem:
            self._fault("error_chat_start")
        threading.Thread(target=self._startup_deadline, daemon=True).start()

    def _startup_deadline(self):
        with self.condition:
            ready = self.condition.wait_for(lambda: self.thread_id is not None or self.state != "running", timeout=20)
        if not ready:
            self._fault("error_chat_start")

    def _fault(self, code):
        with self.condition:
            self._put({"id": "connection-error", "kind": "notice", "code": code})
        self.stop()

    def _watch(self):
        code = self.process.wait()
        self._signal_members(signal.SIGKILL)
        self.reader.join(timeout=1)
        with self.io_lock:
            self.process.stdin.close()
        with self.condition:
            if self.thread_id is None:
                self._put({"id": "connection-error", "kind": "notice", "code": "error_chat_start"})
            self.requests.clear()
            self.rpc_pending.clear()
            self.state, self.exit_code = "exited", code
            self._bump()
        self.changed()

    def _read(self):
        try:
            while True:
                line = self.process.stdout.readline(2 * 1024 * 1024 + 1)
                if not line:
                    if self.state == "running" and self.process.poll() is None:
                        self._fault("error_chat_transport")
                    return
                if len(line) > 2 * 1024 * 1024:
                    raise ValueError()
                message = json.loads(line)
                if not isinstance(message, dict):
                    raise ValueError()
                with self.condition:
                    self._handle(message)
        except (OSError, ValueError, TypeError, KeyError, AttributeError, Problem):
            self._fault("error_chat_transport")
        finally:
            self.process.stdout.close()

    def _handle(self, message):
        method, params = message.get("method"), message.get("params") or {}
        if not method:
            kind = self.rpc_pending.pop(message.get("id"), None)
            if not kind:
                return
            if "error" in message:
                self._put({"id": str(uuid.uuid4()), "kind": "notice", "code": "error_chat_start" if kind in {"initialize", "thread"} else "error_chat_transport",
                           "text": self._text(message["error"].get("message"))})
                if kind in {"initialize", "thread"} or (kind == "turn" and self.turn_id is None):
                    self.turn_state = "failed"
                self._bump()
                return
            result = message.get("result") or {}
            if kind == "initialize":
                self._send({"method": "initialized", "params": {}})
                # Inherit the user's model and permission settings; never disable
                # sandboxing to make an unsupported Android configuration work.
                self._rpc("thread/start", {"cwd": self.project["path"], "ephemeral": True}, "thread")
            elif kind == "thread":
                self.thread_id = result["thread"]["id"]
                self.turn_state = "ready"
                self._bump()
            elif kind == "turn" and self.turn_state == "sending":
                self.turn_id = result["turn"]["id"]
                self.turn_state = "running"
                self._bump()
            return
        if params.get("threadId") and self.thread_id and params["threadId"] != self.thread_id:
            if "id" in message:
                self._send({"id": message["id"], "error": {"code": -32602, "message": "Wrong thread"}})
            return
        if "id" in message:
            self._request(message)
        elif method == "turn/started":
            if self.turn_id != params["turn"]["id"]:
                self.requests.clear()
            self.turn_id = params["turn"]["id"]
            self.turn_state = "running"
            self._bump()
        elif method == "turn/completed":
            turn = params["turn"]
            if self.turn_id and turn["id"] != self.turn_id:
                return
            self.turn_state, self.turn_id = "ready", None
            self.requests.clear()
            self._put({"id": "turn-" + turn["id"], "kind": "turn", "status": turn.get("status", "completed"),
                       "text": self._text((turn.get("error") or {}).get("message"))})
        elif method == "serverRequest/resolved":
            for key, request in list(self.requests.items()):
                if request["rpc_id"] == params.get("requestId"):
                    del self.requests[key]
            if not self.requests and self.turn_id:
                self.turn_state = "running"
            self._bump()
        elif method in {"item/started", "item/completed"}:
            self._item(params["item"], params.get("turnId", ""), method == "item/completed")
        elif method in {"item/agentMessage/delta", "item/plan/delta", "item/commandExecution/outputDelta"}:
            key = params.get("turnId", "") + ":" + params["itemId"]
            item = dict(self.items.get(key, {"id": key, "kind": "command" if "outputDelta" in method else "assistant", "text": "", "status": "inProgress"}))
            item["text"] = self._text(item.get("text", "") + params.get("delta", ""))
            self._put(item)
        elif method == "turn/plan/updated":
            self._put({"id": "plan-" + params["turnId"], "kind": "plan",
                       "text": self._text("\n".join(("[x] " if step.get("status") == "completed" else "[ ] ") + step.get("step", "") for step in params.get("plan", [])))})
        elif method == "turn/diff/updated":
            self._put({"id": "diff-" + params["turnId"], "kind": "diff", "text": self._text(params.get("diff"))})
        elif method == "error":
            self._put({"id": str(uuid.uuid4()), "kind": "notice", "text": self._text((params.get("error") or {}).get("message"))})

    def _item(self, source, turn, complete):
        key, kind = turn + ":" + source["id"], source.get("type")
        item = {"id": key, "status": source.get("status", "completed" if complete else "inProgress")}
        if kind == "userMessage":
            item.update(kind="user", text=self._text("\n".join(x.get("text", "") for x in source.get("content", []) if x.get("type") == "text")))
        elif kind in {"agentMessage", "plan"}:
            item.update(kind="assistant" if kind == "agentMessage" else "plan", text=self._text(source.get("text")))
        elif kind == "commandExecution":
            item.update(kind="command", title=self._text(source.get("command")), text=self._text(source.get("aggregatedOutput")), exit_code=source.get("exitCode"))
        elif kind == "fileChange":
            item.update(kind="diff", text=self._text("\n".join(change.get("path", "") + "\n" + change.get("diff", "") for change in source.get("changes", []))))
        elif kind == "reasoning":
            # Display only summaries explicitly provided for clients, not raw reasoning.
            item.update(kind="plan", text=self._text("\n".join(source.get("summary", []))))
        else:
            item.update(kind="tool", title=self._text(source.get("tool") or kind),
                        text=self._text(json.dumps(source.get("result") or source.get("error") or source.get("query") or "", ensure_ascii=False)))
        self._put(item)

    def _request(self, message):
        params, method = message["params"], message["method"]
        supported = {"item/commandExecution/requestApproval": "command", "item/fileChange/requestApproval": "file",
                     "item/tool/requestUserInput": "questions"}
        if method not in supported or len(self.requests) >= 16:
            self._send({"id": message["id"], "error": {"code": -32601, "message": "This request is not supported by Bibimer"}})
            self._put({"id": str(uuid.uuid4()), "kind": "notice", "code": "chat_unsupported_request"})
            return
        if params.get("turnId") != self.turn_id:
            self._send({"id": message["id"], "error": {"code": -32602, "message": "Inactive turn"}})
            return
        if len(json.dumps(params).encode()) > 65536 or len(json.dumps(self.requests).encode()) > 256 * 1024:
            self._send({"id": message["id"], "error": {"code": -32602, "message": "Request too large to review"}})
            return
        key = str(uuid.uuid4())
        related = self.items.get(params["turnId"] + ":" + params.get("itemId", ""), {})
        self.requests[key] = {"id": key, "rpc_id": message["id"], "kind": supported[method], "params": params,
                              "preview": related.get("text", "")}
        self.turn_state = "waiting"
        self._bump()

    def events(self, cursor, wait):
        with self.condition:
            if cursor > self.revision:
                raise Problem(409, "error_cursor_changed")
            if cursor == self.revision and self.state in ACTIVE and wait:
                self.condition.wait(timeout=wait)
            gap = cursor < self.floor
            return {"session": self.snapshot(), "cursor": self.revision, "gap": gap,
                    "items": [dict(item) for item in self.items.values() if gap or item["revision"] > cursor],
                    "retained": list(self.items),
                    "requests": [{k: v for k, v in value.items() if k != "rpc_id"} for value in self.requests.values()]}

    def _duplicate(self, key, data):
        digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).digest()
        if key in self.inputs:
            previous, complete = self.inputs[key]
            if previous != digest:
                raise Problem(409, "error_input_conflict")
            if not complete:
                raise Problem(409, "error_input_uncertain")
            return digest, True
        return digest, False

    def _remember(self, key, digest, complete):
        self.inputs[key] = (digest, complete)
        if len(self.inputs) > 512:
            self.inputs.popitem(last=False)

    def message(self, data):
        key, text = request_id(data.get("request_id")), data.get("text")
        if not isinstance(text, str) or not text.strip() or len(text.encode()) > 16384:
            raise Problem(400, "error_input_size")
        with self.condition:
            digest, duplicate = self._duplicate(key, {"text": text})
            if duplicate:
                return
            if self.state != "running" or not self.thread_id:
                raise Problem(409, "error_session_not_running")
            if self.turn_state not in {"ready", "failed"}:
                raise Problem(409, "error_chat_busy")
            self._remember(key, digest, False)
            self.turn_state = "sending"
            self._bump()
            self._rpc("turn/start", {"threadId": self.thread_id, "input": [{"type": "text", "text": text}]}, "turn")
            self._remember(key, digest, True)

    def respond(self, data):
        key = request_id(data.get("request_id"))
        with self.condition:
            digest, duplicate = self._duplicate(key, data)
            if duplicate:
                return
            request = self.requests.get(data.get("prompt_id"))
            if self.state != "running" or not request or request["params"]["turnId"] != self.turn_id:
                raise Problem(409, "error_chat_request")
            if request["kind"] == "questions":
                answers = data.get("answers")
                if not isinstance(answers, dict):
                    raise Problem(400, "error_chat_answer")
                result = {"answers": {}}
                for question in request["params"]["questions"]:
                    answer = answers.get(question["id"])
                    if not isinstance(answer, str) or not answer.strip() or len(answer.encode()) > 8192:
                        raise Problem(400, "error_chat_answer")
                    result["answers"][question["id"]] = {"answers": [answer]}
            else:
                decision = data.get("decision")
                available = request["params"].get("availableDecisions")
                if decision not in {"accept", "decline"} or (available and decision not in available):
                    raise Problem(400, "error_chat_answer")
                result = {"decision": decision}
            self._remember(key, digest, False)
            self._send({"id": request["rpc_id"], "result": result})
            self._remember(key, digest, True)
            self.requests.pop(request["id"], None)
            self.turn_state = "waiting" if self.requests else "running"
            self._bump()

    def interrupt(self):
        with self.condition:
            if self.state == "running" and self.turn_id:
                self._rpc("turn/interrupt", {"threadId": self.thread_id, "turnId": self.turn_id}, "interrupt")

    def write(self, data, key):
        raise Problem(400, "error_chat_mode")

    def resize(self, cols, rows):
        raise Problem(400, "error_chat_mode")


class Bridge:
    def __init__(self, state):
        self.state = private_dir(state)
        state = self.state
        self.lock = threading.RLock()
        self.instance = str(uuid.uuid4())
        self.token = read_json(state / "token.json")
        if not self.token:
            self.token = secrets.token_urlsafe(32)
            save_json(state / "token.json", self.token)
        saved = read_json(state / "metadata.json", {})
        self.projects, self.sessions, self.previous_sessions = {}, {}, {}
        records = saved.get("projects") or ([saved["project"]] if saved.get("project") else [])
        for record in records:
            project = dict(record)
            project.setdefault("id", str(uuid.uuid4()))
            self.projects[project["id"]] = project
        self.active_project_id = saved.get("active_project_id")
        if self.active_project_id not in self.projects:
            self.active_project_id = next(iter(self.projects), None)
        previous = saved.get("sessions") or ([saved["session"]] if saved.get("session") else [])
        for record in previous:
            snapshot = dict(record)
            location = snapshot.get("project") or saved.get("project") or {}
            project_id = next((key for key, project in self.projects.items()
                               if key == location.get("id") or project["path"] == location.get("path")), None)
            if project_id is None:
                continue
            snapshot["project"] = dict(self.projects[project_id])
            snapshot["output_start"] = snapshot["output_end"] = 0
            if snapshot["state"] in ACTIVE:
                snapshot["state"], snapshot["exit_code"] = "lost", None
            self.previous_sessions[project_id] = snapshot
        self.closing = False
        self.persist()

    @property
    def project(self):
        return self.projects.get(self.active_project_id)

    @property
    def session(self):
        return self.sessions.get(self.active_project_id)

    @property
    def previous(self):
        return self.previous_sessions.get(self.active_project_id)

    def snapshot_for(self, project_id):
        session = self.sessions.get(project_id)
        return session.snapshot() if session else self.previous_sessions.get(project_id)

    def active_count(self):
        return sum(session.state in ACTIVE for session in self.sessions.values())

    def persist(self):
        with self.lock:
            save_json(self.state / "metadata.json", {
                "format": 2, "projects": list(self.projects.values()),
                "active_project_id": self.active_project_id,
                "sessions": [snapshot for key in self.projects if (snapshot := self.snapshot_for(key))],
                "project": self.project,
                "session": self.snapshot_for(self.active_project_id),
            })

    def agents(self):
        return [
            {"id": "shell", "name": "Terminal", "installed": bool(shutil.which("bash") or shutil.which("sh"))},
            {"id": "codex", "name": "Codex", "installed": bool(shutil.which("codex")), "modes": ["terminal", "chat"]},
            {"id": "claude", "name": "Claude Code", "installed": bool(shutil.which("claude"))},
        ]

    def health(self):
        with self.lock:
            return {"version": VERSION, "protocol": 1, "instance": self.instance,
                    "home": str(Path.home()), "project": self.project,
                    "projects": [dict(project, session=self.snapshot_for(key)) for key, project in self.projects.items()],
                    "features": ["multiple_projects", "browse_folders"], "active_sessions": self.active_count(),
                    "agents": self.agents(),
                    "session": self.snapshot_for(self.active_project_id)}

    def pair(self, code):
        with self.lock:
            pending = read_json(self.state / "pairing.json")
            if not pending or pending["expires"] < time.time() or pending["attempts"] >= 5:
                raise Problem(403, "error_pairing_expired")
            pending["attempts"] += 1
            save_json(self.state / "pairing.json", pending)
            if not isinstance(code, str) or not hmac.compare_digest(
                    hashlib.sha256(code.encode()).hexdigest(), pending["digest"]):
                raise Problem(403, "error_pairing_invalid")
            (self.state / "pairing.json").unlink()
            return {"token": self.token, "version": VERSION, "protocol": 1}

    def folders(self, data):
        raw = data.get("path", "~")
        after = data.get("after", "")
        hidden = data.get("hidden", False)
        if (not isinstance(raw, str) or not raw.strip() or "\0" in raw or
                not isinstance(after, str) or "/" in after or "\0" in after or
                not isinstance(hidden, bool)):
            raise Problem(400, "error_folder_request")
        try:
            path = Path(raw).expanduser()
            if not path.is_absolute():
                raise Problem(400, "error_absolute_path")
            path = path.resolve(strict=True)
            if not os.access(path, os.R_OK | os.X_OK):
                raise OSError()
            # Scan only one level, keep at most one page in memory, and never
            # read file contents. Symlinks resolve when their folder is opened.
            def names(entries):
                for entry in entries:
                    if (not hidden and entry.name.startswith(".")) or entry.name <= after:
                        continue
                    try:
                        if entry.is_dir():
                            yield entry.name
                    except OSError:
                        continue  # A child may disappear during enumeration.
            with os.scandir(path) as entries:
                page = heapq.nsmallest(101, names(entries))
        except (OSError, RuntimeError, ValueError):
            raise Problem(400, "error_folder_access") from None
        return {"path": str(path), "parent": str(path.parent) if path.parent != path else None,
                "entries": [{"name": name, "path": str(path / name)} for name in page[:100]],
                "next": page[99] if len(page) > 100 else None,
                "writable": os.access(path, os.R_OK | os.W_OK | os.X_OK)}

    def register(self, data):
        with self.lock:
            if "project_id" in data:
                key = data["project_id"]
                if not isinstance(key, str) or key not in self.projects:
                    raise Problem(404, "error_project_missing")
                self.active_project_id = key
                self.persist()
                return self.project
            # Old clients replace the displayed project and cannot switch back.
            # New clients explicitly add to the project list, keeping every job.
            if data.get("add") is not True and self.session and self.session.state in ACTIVE:
                raise Problem(409, "error_project_busy")
            raw = data.get("path")
            if not isinstance(raw, str) or not raw.strip() or "\0" in raw:
                raise Problem(400, "error_project_path")
            path = Path(raw).expanduser()
            if not path.is_absolute():
                raise Problem(400, "error_absolute_path")
            try:
                if data.get("create") is True:
                    path.mkdir(parents=True, exist_ok=True)
                path = path.resolve(strict=True)
                if not path.is_dir() or not os.access(path, os.R_OK | os.W_OK | os.X_OK):
                    raise OSError()
            except (OSError, RuntimeError):
                raise Problem(400, "error_project_access") from None
            key = next((key for key, project in self.projects.items() if project["path"] == str(path)), None)
            if key is None:
                key = str(uuid.uuid4())
                self.projects[key] = {"id": key, "name": path.name or str(path), "path": str(path)}
            self.active_project_id = key
            self.persist()
            return self.project

    def launch(self, data):
        key = request_id(data.get("request_id"))
        cols = integer(data.get("cols", 80), 20, 300)
        rows = integer(data.get("rows", 24), 4, 200)
        agent = data.get("agent")
        mode = data.get("mode", "terminal")
        if mode not in {"terminal", "chat"} or (mode == "chat" and agent != "codex"):
            raise Problem(400, "error_chat_mode")
        if agent not in {"shell", "codex", "claude"}:
            raise Problem(400, "error_program")
        with self.lock:
            if self.closing:
                raise Problem(409, "error_bridge_stopping")
            project_id = data.get("project_id", self.active_project_id)
            if project_id is not None and (not isinstance(project_id, str) or project_id not in self.projects):
                raise Problem(404, "error_project_missing")
            project = self.projects.get(project_id)
            current = self.snapshot_for(project_id)
            for key_id in self.projects:
                other = self.snapshot_for(key_id)
                if other and other.get("launch_id") == key and key_id != project_id:
                    raise Problem(409, "error_launch_conflict")
            if current and current.get("launch_id") == key:
                if current["agent"] != agent or current.get("mode", "terminal") != mode:
                    raise Problem(409, "error_launch_conflict")
                return current
            owned = self.sessions.get(project_id)
            if owned and owned.state in ACTIVE:
                raise Problem(409, "error_session_exists")
            if not project:
                raise Problem(400, "error_project_required")
            executable = shutil.which("bash") or shutil.which("sh") if agent == "shell" else shutil.which(agent)
            if not executable:
                raise Problem(400, "error_program_missing")
            argv = [executable, "-i"] if agent == "shell" else [executable]
            try:
                session = (ChatSession if mode == "chat" else Session)(project, agent, argv, cols, rows, key, self.persist)
            except OSError:
                raise Problem(400, "error_launch_failed") from None
            self.sessions[project_id] = session
            self.previous_sessions.pop(project_id, None)
            self.persist()
            session.start_reading()
            return session.snapshot()

    def get_session(self, session_id):
        with self.lock:
            for session in self.sessions.values():
                if session.id == session_id:
                    return session
            raise Problem(404, "error_session_missing")

    def session_events(self, session_id, cursor, wait):
        with self.lock:
            previous = next((snapshot for key, snapshot in self.previous_sessions.items()
                             if key not in self.sessions and snapshot["id"] == session_id), None)
            if previous:
                # Health retains the last session after a restart, but its output
                # only lived in the old process. Keep that snapshot readable so
                # clients can stay connected and launch their next session.
                snapshot = dict(previous)
                result = {"session": snapshot, "cursor": 0, "gap": cursor > 0}
                if snapshot.get("mode") == "chat":
                    result.update(items=[], retained=[], requests=[])
                else:
                    result["data"] = ""
                return result
            session = self.get_session(session_id)
        # Never hold the bridge lock during an active session's long poll.
        return session.events(cursor, wait)

    def begin_shutdown(self):
        with self.lock:
            if self.active_count():
                raise Problem(409, "error_session_exists")
            self.closing = True


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, bridge):
        if address[0] != "127.0.0.1":
            raise ValueError("Bridge only listens on IPv4 loopback")
        self.bridge = bridge
        self.slots = threading.BoundedSemaphore(16)
        super().__init__(address, Handler)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.slots.release()

    def handle_error(self, request, address):
        # Do not log requests, auth headers, session output, or exception bodies.
        pass


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "Bibimer/0.1"
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *args):
        pass

    def send_error(self, code, message=None, explain=None):
        self.reply(code, {"code": "error_http_request", "error": ERROR_MESSAGES["error_http_request"]})

    def reply(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.close_connection = True

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def route(self, method):
        try:
            self._route(method)
        except Problem as error:
            self.reply(error.status, {"code": error.code, "error": error.message})
        except (BrokenPipeError, ConnectionResetError, socket.timeout):
            pass
        except Exception:
            self.reply(500, {"code": "error_internal", "error": ERROR_MESSAGES["error_internal"]})

    def _route(self, method):
        host = f"127.0.0.1:{self.server.server_port}"
        if self.headers.get("Host") != host or "Origin" in self.headers:
            raise Problem(403, "error_local_only")
        parsed = urllib.parse.urlsplit(self.path)
        bridge = self.server.bridge
        if (method, parsed.path) != ("POST", "/v1/pair"):
            auth = self.headers.get("Authorization", "")
            if not hmac.compare_digest(auth.encode(), ("Bearer " + bridge.token).encode()):
                raise Problem(401, "error_pairing_required")
        data = {}
        if method == "POST":
            if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
                raise Problem(400, "error_content_length")
            if self.headers.get_content_type() != "application/json":
                raise Problem(415, "error_json_required")
            try:
                length = integer(int(self.headers["Content-Length"]), 2, 65536)
                raw = self.rfile.read(length)
                if len(raw) != length:
                    raise ValueError()
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError()
            except (ValueError, UnicodeError):
                raise Problem(400, "error_invalid_json") from None
        if method == "GET" and parsed.path == "/v1/health":
            result = bridge.health()
        elif method == "POST" and parsed.path == "/v1/pair":
            result = bridge.pair(data.get("code"))
        elif method == "POST" and parsed.path == "/v1/project":
            result = {"project": bridge.register(data)}
        elif method == "POST" and parsed.path == "/v1/folders":
            result = bridge.folders(data)
        elif method == "POST" and parsed.path == "/v1/sessions":
            result = {"session": bridge.launch(data)}
        elif method == "POST" and parsed.path == "/v1/shutdown":
            bridge.begin_shutdown()
            result = {"ok": True}
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        elif parsed.path.startswith("/v1/sessions/"):
            parts = parsed.path.strip("/").split("/")
            if len(parts) != 4:
                raise Problem(404, "error_route")
            action = parts[3]
            if method == "GET" and action == "events":
                query = urllib.parse.parse_qs(parsed.query)
                try:
                    cursor = integer(int(query.get("cursor", ["0"])[0]), 0, 2**53 - 1)
                    wait = integer(int(query.get("wait", ["20"])[0]), 0, 20)
                except ValueError:
                    raise Problem(400, "error_cursor") from None
                self.reply(200, bridge.session_events(parts[2], cursor, wait))
                return
            session = bridge.get_session(parts[2])
            if method == "POST" and action == "input":
                key = request_id(data.get("request_id"))
                try:
                    content = base64.b64decode(data.get("data", ""), validate=True)
                except (ValueError, TypeError, binascii.Error):
                    raise Problem(400, "error_input_format") from None
                session.write(content, key)
                result = {"ok": True}
            elif method == "POST" and action == "resize":
                session.resize(integer(data.get("cols"), 20, 300), integer(data.get("rows"), 4, 200))
                result = {"ok": True}
            elif method == "POST" and action == "stop":
                session.stop()
                result = {"session": session.snapshot()}
            elif method == "POST" and action in {"message", "respond", "interrupt"}:
                if not isinstance(session, ChatSession):
                    raise Problem(400, "error_chat_mode")
                if action == "message":
                    session.message(data)
                elif action == "respond":
                    session.respond(data)
                else:
                    session.interrupt()
                result = {"session": session.snapshot()}
            else:
                raise Problem(404, "error_route")
        else:
            raise Problem(404, "error_route")
        self.reply(200, result)


def default_state():
    return Path.home() / ".local" / "state" / "bibimer"


def bridge_health(state, port):
    try:
        token = read_json(state / "token.json")
        if not token:
            return None
        request = urllib.request.Request(f"http://127.0.0.1:{port}/v1/health",
                                         headers={"Authorization": "Bearer " + token})
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(request, timeout=0.5) as response:
            health = json.load(response)
            return health if health.get("protocol") == 1 else None
    except urllib.error.HTTPError as error:
        error.close()
        return None
    except (OSError, ValueError):
        return None


def is_running(state, port):
    return bridge_health(state, port) is not None


def owns_bridge_lock(pid, state):
    """Legacy upgrade only: identify this user's Python server by its state lock."""
    try:
        process = Path("/proc") / str(pid)
        if process.stat().st_uid != os.getuid():
            return False
        args = process.joinpath("cmdline").read_bytes().split(b"\0")
        if len(args) < 3 or Path(os.fsdecode(args[1])).name != "bibimer_bridge.py" or args[2] != b"serve":
            return False
        if not os.path.samefile(process / "exe", sys.executable):
            return False
        lock = (state / "bridge.lock").stat()
        for fd in (process / "fd").iterdir():
            with contextlib.suppress(OSError):
                candidate = fd.stat()
                if (candidate.st_dev, candidate.st_ino) == (lock.st_dev, lock.st_ino):
                    return True
    except (OSError, ValueError):
        pass
    return False


def pidfd_call(name, *arguments):
    # CPython's Android build omits these APIs although Bionic exposes them.
    # Use the public libc wrappers, never numeric syscalls or a PID-only fallback.
    import ctypes
    try:
        function = getattr(ctypes.CDLL(None, use_errno=True), name)
    except (AttributeError, OSError):
        raise RuntimeError(cli("restart_unverified")) from None
    function.argtypes = [ctypes.c_int, ctypes.c_uint] if name == "pidfd_open" else [ctypes.c_int, ctypes.c_int, ctypes.c_void_p, ctypes.c_uint]
    function.restype = ctypes.c_int
    result = function(*arguments)
    if result < 0:
        raise RuntimeError(cli("restart_unverified"))
    return result


def restart_bridge(state, port):
    def active(health):
        return health and (health.get("active_sessions", 0) > 0 or (health.get("session") or {}).get("state") in ACTIVE)
    health = bridge_health(state, port)
    if active(health):
        raise RuntimeError(cli("restart_busy"))
    if not health:
        return
    request = urllib.request.Request(f"http://127.0.0.1:{port}/v1/shutdown", data=b"{}",
        headers={"Authorization": "Bearer " + read_json(state / "token.json"), "Content-Type": "application/json"})
    try:
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=3):
            pass
    except urllib.error.HTTPError as error:
        error.close()
        if error.code == 409:
            raise RuntimeError(cli("restart_busy")) from None
        if error.code != 404:
            raise RuntimeError(cli("restart_unverified")) from None
        # Version 0.1.x has no shutdown API. Never match a process by name alone,
        # and use a pidfd so a recycled PID cannot signal an unrelated process.
        candidates = [int(item.name) for item in Path("/proc").iterdir()
                      if item.name.isdigit() and owns_bridge_lock(int(item.name), state)]
        if len(candidates) != 1:
            raise RuntimeError(cli("restart_unverified"))
        pid = candidates[0]
        try:
            fd = os.pidfd_open(pid) if hasattr(os, "pidfd_open") else pidfd_call("pidfd_open", pid, 0)
        except OSError:
            raise RuntimeError(cli("restart_unverified")) from None
        try:
            if not owns_bridge_lock(pid, state):
                raise RuntimeError(cli("restart_unverified"))
            if active(bridge_health(state, port)):
                raise RuntimeError(cli("restart_busy"))
            if hasattr(signal, "pidfd_send_signal"):
                signal.pidfd_send_signal(fd, signal.SIGTERM)
            else:
                pidfd_call("pidfd_send_signal", fd, signal.SIGTERM, None, 0)
        finally:
            os.close(fd)
    # Wait for the state lock, not just a closed socket, before starting again.
    deadline = time.monotonic() + 5
    with open(state / "bridge.lock", "a") as lock:
        while time.monotonic() < deadline:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                fcntl.flock(lock, fcntl.LOCK_UN)
                return
            except BlockingIOError:
                time.sleep(0.05)
    raise RuntimeError(cli("restart_unverified"))


def show_pairing(state):
    try:
        with open("/dev/tty", "w", encoding="utf-8") as terminal:
            code = issue_pairing(state)
            terminal.write(f"\n{cli('pairing_title')}: {code}\n{cli('pairing_help')}\n")
    except OSError:
        raise RuntimeError(cli("pairing_terminal")) from None


def main():
    global CLI_LANGUAGE
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        fcntl.ioctl(0, termios.TIOCSCTTY, 0)
        os.execvpe(sys.argv[2], sys.argv[2:], os.environ)
    parser = argparse.ArgumentParser(description="Bibimer Termux bridge")
    parser.add_argument("command", choices=["start", "serve", "pair", "status", "restart"], nargs="?", default="start")
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--state-dir", type=Path, default=default_state())
    parser.add_argument("--language", choices=["en", "ko"],
                        default="ko" if os.environ.get("BIBIMER_LANGUAGE") == "ko" else "en")
    args = parser.parse_args()
    CLI_LANGUAGE = args.language
    state = private_dir(args.state_dir)
    if not 1024 <= args.port <= 65535:
        parser.error(cli("port_range"))
    if args.command == "status":
        print(cli("bridge_available") if is_running(state, args.port) else cli("bridge_unavailable"))
        return
    if args.command == "pair":
        if not is_running(state, args.port):
            raise RuntimeError(cli("start_first"))
        show_pairing(state)
        return
    if args.command == "restart":
        restart_bridge(state, args.port)
        args.command = "start"
    if args.command == "start":
        if not is_running(state, args.port):
            child = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "serve", "--state-dir", str(state), "--port", str(args.port)],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                start_new_session=True, close_fds=True,
            )
            for _ in range(40):
                if is_running(state, args.port):
                    break
                if child.poll() is not None:
                    raise RuntimeError(cli("start_failed"))
                time.sleep(0.1)
            else:
                raise RuntimeError(cli("start_unconfirmed"))
        print(cli("bridge_ready", port=args.port))
        show_pairing(state)
        return
    with open(state / "bridge.lock", "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError(cli("bridge_exists")) from None
        bridge = Bridge(state)
        server = Server(("127.0.0.1", args.port), bridge)
        def shutdown(*_):
            threading.Thread(target=server.shutdown, daemon=True).start()
        signal.signal(signal.SIGTERM, shutdown)
        signal.signal(signal.SIGINT, shutdown)
        try:
            server.serve_forever(poll_interval=0.2)
        finally:
            for session in list(bridge.sessions.values()):
                session.stop()
            for session in list(bridge.sessions.values()):
                with contextlib.suppress(subprocess.TimeoutExpired):
                    session.process.wait(timeout=4)
            server.server_close()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as error:
        print(f"Bibimer: {error}", file=sys.stderr)
        sys.exit(1)
