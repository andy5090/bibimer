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
import html
import http.server
import json
import os
from pathlib import Path
import re
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

VERSION = "0.11.0"
PORT = 8765
BUFFER_LIMIT = 1024 * 1024
ACTIVE = {"running", "stopping"}


ERROR_MESSAGES = {
    "error_agent_start": "Could not start the agent. Check its installation and setup in Termux.",
    "error_agent_transport": "The agent connection failed. Check the agent in Termux before trying again.",
    "error_agent_turn": "The agent could not complete this response. Check its login, model and configuration in Termux.",
    "error_program_unavailable": "The CLI was found but could not run. Repair its installation in Termux.",
    "error_claude_sdk": "Prepare the Claude adapter from Setup to enable chat and saved sessions.",
    "error_history_large": "This saved session is too large to preview. Open it in the agent CLI.",
    "error_history": "Could not load saved sessions. Check the selected agent in Termux and try again.",
    "error_history_unsupported": "Update the selected agent in Termux to use saved sessions.",
    "error_import_invalid": "Choose a saved session and an import mode.",
    "error_import_project": "This session belongs to another project. Open its project before importing.",
    "error_import_active": "This session is already in use. Import a copy or return to its running session.",
    "error_import_failed": "Could not import this session. Check the agent and saved session in Termux.",
    "history_preview_unavailable": "Session context restored, but its history preview is unavailable.",
    "history_imported": "Saved context restored. Only recent history is shown; previous approval requests are not active.",
    "error_folder_access": "Could not open this folder. Check that it exists and Termux has access.",
    "error_folder_request": "The folder browsing request is invalid.",
    "error_project_missing": "This project is no longer registered. Refresh the project list.",
    "error_project_action": "Enter a project name of up to 120 characters or choose a valid action.",
    "error_project_delete_active": "End all sessions in this project, including archived sessions, before removing it.",
    "error_bridge_stopping": "The bridge is restarting. Reconnect shortly.",
    "error_chat_mode": "This agent or interface is not supported by the bridge. Check Setup.",
    "error_agent_options": "Invalid settings for this agent.",
    "error_models": "Could not load models. Check the agent in Termux and try again.",
    "error_model_selection": "This model or reasoning level is unavailable. Refresh the model list and choose again.",
    "error_model_default": "Restore the OpenCode agent default model in a new session. You can switch to any listed model here.",
    "error_effort_terminal": "Select OpenCode reasoning levels in Chat. In Terminal, use OpenCode's own controls.",
    "error_permission_default": "OpenCode can switch between Ask and Bypass during a chat. Restore Agent default in a new session.",
    "error_chat_start": "Could not initialize Chat. Check the agent installation and configuration in Termux.",
    "error_chat_busy": "Wait for the current response or interrupt it before sending another message.",
    "error_queue_full": "The queue is full. Remove a pending message before adding another.",
    "error_queue_entry": "This message is no longer waiting in the queue.",
    "error_queue_action": "Choose a valid queue action.",
    "error_queue_send": "The queued message was not accepted. Review it and resume the queue.",
    "error_queue_steer_rejected": "Steer was not accepted. The message is kept and the queue is paused.",
    "error_steer_unavailable": "Steer is available only for an active Codex response. You can queue this message instead.",
    "error_steer_rejected": "The agent did not accept this steer. Your draft is kept; you can queue it instead.",
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
    "error_session_action": "Choose a valid session action.",
    "error_session_delete_active": "End this session before removing it from BIBIMER.",
    "error_worktree": "This working folder is no longer available in the project's Git worktrees.",
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


PERMISSION_MODES = {
    "shell": {"inherit"},
    "codex": {"inherit", "read-only", "workspace-write", "yolo"},
    "claude": {"inherit", "default", "acceptEdits", "plan", "bypassPermissions"},
    "opencode": {"inherit", "ask", "allow"},
}


def agent_options(agent, value=None):
    value = {} if value is None else value
    if not isinstance(value, dict) or set(value) - {"permission", "fast", "model", "effort"}:
        raise Problem(400, "error_agent_options")
    mode = value.get("permission", "inherit")
    if not isinstance(mode, str) or mode not in PERMISSION_MODES[agent]:
        raise Problem(400, "error_agent_options")
    if "fast" in value and (agent != "codex" or type(value["fast"]) is not bool):
        raise Problem(400, "error_agent_options")
    for name in ("model", "effort"):
        if name in value and (agent == "shell" or not isinstance(value[name], str) or
                len(value[name]) > 256 or any(ord(c) < 32 for c in value[name])):
            raise Problem(400, "error_agent_options")
    if value.get("effort") and not value.get("model"):
        raise Problem(400, "error_model_selection")
    return {"permission": mode, **{key: value[key] for key in ("fast", "model", "effort") if key in value}}


def validate_model_selection(options, catalog):
    if not options.get("model"):
        return
    model = next((row for row in catalog if row["id"] == options["model"]), None)
    if not model or (options.get("effort") and options["effort"] not in {row["id"] for row in model["efforts"]}):
        raise Problem(400, "error_model_selection")


def codex_options(options):
    result = {}
    mode = options["permission"]
    if mode != "inherit":
        result.update(sandbox="danger-full-access" if mode == "yolo" else mode,
                      approvalPolicy="never" if mode == "yolo" else "on-request",
                      approvalsReviewer="user")
    if "fast" in options:
        result.update(serviceTier="fast" if options["fast"] else "default", config={"features.fast_mode": True})
    return result


def launch_environment(agent, options):
    env = os.environ.copy()
    if agent == "opencode" and options["permission"] != "inherit":
        env["OPENCODE_PERMISSION"] = json.dumps({"*": options["permission"]})
    return env


def terminal_command(argv, agent, options):
    result = list(argv)
    mode = options["permission"]
    if agent == "codex":
        if mode == "yolo":
            result += ["--dangerously-bypass-approvals-and-sandbox"]
        elif mode != "inherit":
            result += ["--sandbox", mode, "--ask-for-approval", "on-request"]
        if mode != "inherit":
            result += ["-c", 'approvals_reviewer="user"']
        if "fast" in options:
            result += ["-c", 'service_tier="fast"' if options["fast"] else 'service_tier="default"', "-c", "features.fast_mode=true"]
    elif agent == "claude" and mode != "inherit":
        result += ["--permission-mode", mode]
        if mode == "bypassPermissions":
            result += ["--dangerously-skip-permissions"]
    if options.get("model"):
        result += ["--model", options["model"]]
    if options.get("effort"):
        if agent == "codex":
            result += ["-c", "model_reasoning_effort=" + json.dumps(options["effort"])]
        elif agent == "claude":
            result += ["--effort", options["effort"]]
        elif agent == "opencode":
            raise Problem(400, "error_effort_terminal")
    return result


class Session:
    def __init__(self, project, agent, argv, cols, rows, launch_id, changed, options=None):
        self.id = str(uuid.uuid4())
        self.launch_id = launch_id
        self.project, self.agent = project.copy(), agent
        self.options = agent_options(agent, options)
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
            env = launch_environment(agent, self.options)
            env.update(TERM="xterm-256color", COLORTERM="truecolor")
            # Avoid preexec_fn in the multithreaded HTTP server. The small child
            # entry point claims its controlling terminal before exec'ing the CLI.
            self.process = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "_child", *terminal_command(argv, agent, self.options)],
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
                "mode": "terminal", "options": self.options.copy(),
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


def claude_sdk_path():
    return Path(os.environ.get("BIBIMER_CLAUDE_SDK_PATH") or
                Path.home() / ".local/share/bibimer/claude/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs")


def provider_command(executable, agent):
    if agent == "codex":
        return [executable, "app-server", "--listen", "stdio://"]
    if agent == "opencode":
        return [sys.executable, str(Path(__file__).with_name("provider_opencode.py")), executable]
    if agent == "claude":
        node = shutil.which("node")
        if not node or not claude_sdk_path().is_file():
            raise Problem(400, "error_claude_sdk")
        return [node, str(Path(__file__).with_name("provider_claude.mjs")), executable, str(claude_sdk_path())]
    raise Problem(400, "error_program")


class HistoryClient:
    """Short-lived, read-only app-server RPC. Never starts or resumes a thread."""
    def __init__(self, executable, cwd, agent="codex"):
        self.process = subprocess.Popen(provider_command(executable, agent),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            cwd=cwd, start_new_session=True, close_fds=True)
        self.buffer, self.serial = b"", 0

    def __enter__(self):
        try:
            self.call("initialize", {"clientInfo": {"name": "bibimer-history", "version": VERSION},
                      "capabilities": {"experimentalApi": True}})
            self.process.stdin.write(b'{"method":"initialized","params":{}}\n')
            self.process.stdin.flush()
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def call(self, method, params):
        if method not in {"initialize", "thread/list", "thread/read", "model/list"}:
            raise Problem(400, "error_import_invalid")
        try:
            self.serial += 1
            self.process.stdin.write((json.dumps({"id": self.serial, "method": method, "params": params}) + "\n").encode())
            self.process.stdin.flush()
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                if b"\n" not in self.buffer:
                    if not select.select([self.process.stdout], [], [], 0.1)[0]:
                        continue
                    chunk = os.read(self.process.stdout.fileno(), 65536)
                    if not chunk or len(self.buffer) + len(chunk) > 2 * 1024 * 1024:
                        break
                    self.buffer += chunk
                    continue
                line, self.buffer = self.buffer.split(b"\n", 1)
                response = json.loads(line)
                if response.get("id") != self.serial or "method" in response:
                    continue
                if "error" in response:
                    code = "error_history_unsupported" if response["error"].get("code") == -32601 else "error_history"
                    if response["error"].get("message") in {"error_import_project", "error_import_invalid", "error_history_large", "error_import_active"}:
                        code = response["error"]["message"]
                    raise Problem(400, code)
                return response["result"]
        except (OSError, ValueError, KeyError, TypeError):
            pass
        raise Problem(400, "error_history")

    def __exit__(self, *_):
        with contextlib.suppress(OSError):
            self.process.stdin.close()
        try:
            self.process.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(self.process.pid, signal.SIGTERM)
            try:
                self.process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait(timeout=1)
        # A helper may exit before its native server finishes shutting down.
        # Its process group was created exclusively for this catalog request.
        with contextlib.suppress(ProcessLookupError):
            os.killpg(self.process.pid, signal.SIGKILL)
        self.process.stdout.close()


def import_spec(data):
    thread_id, mode = data.get("source_thread_id"), data.get("import_mode")
    if thread_id is None and mode is None:
        return None
    if (not isinstance(thread_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", thread_id) or
            not isinstance(mode, str) or mode not in {"resume", "fork"} or data.get("agent") not in {"codex", "claude", "opencode"} or data.get("mode") != "chat"):
        raise Problem(400, "error_import_invalid")
    return {"source_thread_id": thread_id, "import_mode": mode}


def response_preview(value):
    """Plain-text excerpt of a structured assistant answer, never tool output."""
    text = value[:32768] if isinstance(value, str) else ""
    text = re.sub(r"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)", "", text)
    text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", text)
    text = re.sub(r"(?m)^\s{0,3}(?:`{3,}|~{3,})[^\n]*$", "", text)
    text = re.sub(r"(?m)^\s{0,3}\[[^\]\n]+\]:[^\n]*$", "", text)
    text = re.sub(r"!?\[([^\]\n]*)\]\([^\n)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]\n]+)\]\[[^\]\n]*\]", r"\1", text)
    text = re.sub(r"<[^>\n]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"(?m)^\s*(?:#{1,6}\s+|>\s*|[-+*]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)", "", text)
    text = re.sub(r"(?m)^\s*(?:[-=_*]\s*){3,}$", "", text)
    text = re.sub(r"(`+)(.*?)\1", r"\2", text)
    text = re.sub(r"(\*\*|__|~~)(.*?)\1", r"\2", text, flags=re.S)
    text = re.sub(r"(?<!\w)([*_])(\S(?:.*?\S)?)\1(?!\w)", r"\2", text)
    text = re.sub(r"[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069\ud800-\udfff]", " ", text)
    text = " ".join(text.split())
    return text if len(text) <= 180 else text[:179].rstrip() + "…"


class ChatSession(Session):
    """One Codex app-server or provider adapter over stdio. Output stays in memory.

    Reuses the PTY session's scoped process stop, but never opens a PTY or
    derives messages by scraping a terminal screen. No arbitrary RPC passthrough.
    """
    def __init__(self, project, agent, argv, cols, rows, launch_id, changed, imported=None, options=None, catalog=None, completed=None):
        self.id, self.launch_id = str(uuid.uuid4()), launch_id
        self.project, self.agent = project.copy(), agent
        self.options = agent_options(agent, options)
        self.launch_options = self.options.copy()
        self.default_policy = {}
        self.model_catalog = catalog or []
        self.default_model, self.default_effort = None, None
        self.completed = completed
        self.response_preview, self.response_preview_final = "", False
        self.cols, self.rows = cols, rows
        self.started_at = time.time()
        self.state, self.exit_code = "running", None
        self.turn_state, self.turn_id, self.thread_id = "initializing", None, None
        self.history_persisted = False
        self.imported, self.history_pending, self.persist_thread = imported, bool(imported), False
        self.condition = threading.Condition(threading.RLock())
        self.io_lock = threading.Lock()
        self.changed = changed
        self.items, self.requests, self.inputs = collections.OrderedDict(), {}, collections.OrderedDict()
        self.revision, self.floor, self.total = 0, 0, 0
        self.rpc_serial, self.rpc_pending = 0, {}
        self.queue = collections.OrderedDict()
        self.queue_paused, self.queue_inflight = False, None
        self.steer_errors = collections.OrderedDict()
        self.process = subprocess.Popen(provider_command(argv[0], agent),
            cwd=project["path"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)
        os.set_blocking(self.process.stdin.fileno(), False)

    def snapshot(self):
        # This is also persisted as metadata: no prompts, answers or tool output.
        with self.condition:
            return {"id": self.id, "launch_id": self.launch_id, "project": self.project,
                    "agent": self.agent, "mode": "chat", "state": self.state,
                    "options": self.options.copy(), "launch_options": self.launch_options.copy(),
                    "default_model": self.default_model, "default_effort": self.default_effort,
                    "ready": self.thread_id is not None and not self.history_pending,
                    "external_thread_id": self.thread_id, "history_persisted": self.history_persisted, **(self.imported or {}),
                    "turn_state": self.turn_state, "active_turn_id": self.turn_id,
                    "queued_count": len(self.queue), "queue_paused": self.queue_paused,
                    "can_steer": self.agent == "codex", "exit_code": self.exit_code,
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
        return key

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
            ready = self.condition.wait_for(lambda: (self.thread_id is not None and not self.history_pending) or self.state != "running", timeout=20)
        if not ready:
            self._fault("error_import_failed" if self.imported else "error_chat_start")

    def _fault(self, code):
        with self.condition:
            self._put({"id": "connection-error", "kind": "notice", "code": code})
            if self.state != "running":
                return
            self.state = "stopping"
        # _handle may own the condition. Persist outside that lock to preserve
        # the bridge -> session lock order used by health and launch.
        def finish():
            self.changed()
            self._terminate()
        threading.Thread(target=finish, daemon=True).start()

    def _watch(self):
        code = self.process.wait()
        self._signal_members(signal.SIGKILL)
        self.reader.join(timeout=1)
        with self.io_lock:
            self.process.stdin.close()
        with self.condition:
            if self.thread_id is None and "connection-error" not in self.items:
                self._put({"id": "connection-error", "kind": "notice", "code": "error_chat_start"})
            self.requests.clear()
            self.rpc_pending.clear()
            self.queue.clear()
            self.queue_inflight = None
            self.state, self.exit_code = "exited", code
            self._bump()
        self.changed()

    def _read(self):
        try:
            while True:
                line = self.process.stdout.readline(8 * 1024 * 1024 + 1)
                if not line:
                    if self.state == "running" and self.process.poll() is None:
                        self._fault("error_chat_transport")
                    return
                if len(line) > 8 * 1024 * 1024:
                    raise ValueError()
                message = json.loads(line)
                if not isinstance(message, dict):
                    raise ValueError()
                with self.condition:
                    self._handle(message)
                    self._drain_queue()
                if self.persist_thread:
                    self.persist_thread = False
                    self.changed()
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
            if isinstance(kind, tuple):
                if kind[0] == "steer":
                    _, key, digest, expected, entry_id = kind
                    error = "error_steer_rejected" if "error" in message else (
                        "error_input_uncertain" if (message.get("result") or {}).get("turnId") != expected else None)
                    if entry_id:
                        if error == "error_steer_rejected":
                            error = "error_queue_steer_rejected"
                        self._finish_queue_steer(entry_id, error)
                    if error:
                        self.steer_errors[key] = error
                        if len(self.steer_errors) > 512:
                            self.steer_errors.popitem(last=False)
                    self._remember(key, digest, True)
                elif kind[0] == "queue":
                    entry = self.queue.get(kind[1])
                    self.queue_inflight = None
                    if entry:
                        if "error" in message:
                            entry.update(state="failed", code="error_queue_send")
                            self.queue_paused = True
                            if not self.turn_id:
                                self.turn_state = "failed"
                        else:
                            self.queue.pop(kind[1])
                            if self.turn_state == "sending":
                                self.turn_id = message["result"]["turn"]["id"]
                                self.turn_state = "running"
                self._bump()
                return
            if "error" in message:
                if kind == "turn":
                    self.queue_paused = True
                if kind == "import":
                    self._fault("error_import_failed")
                    return
                if kind == "history":
                    self.history_pending, self.turn_state = False, "ready"
                    self._put({"id": "history-preview", "kind": "notice", "code": "history_preview_unavailable"})
                    return
                self._put({"id": str(uuid.uuid4()), "kind": "notice", "code": "error_chat_start" if kind in {"initialize", "thread"} else "error_chat_transport",
                           **({"text": self._text(message["error"].get("message"))} if self.agent == "codex" else
                              {"code": message["error"].get("message") if message["error"].get("message") in ERROR_MESSAGES else "error_agent_transport"})})
                if kind in {"initialize", "thread"} or (kind == "turn" and self.turn_id is None):
                    self.turn_state = "failed"
                self._bump()
                return
            result = message.get("result") or {}
            if kind == "initialize":
                self._send({"method": "initialized", "params": {}})
                # Capture the native permission defaults before the first turn.
                # Explicit choices are applied at every turn, including restores
                # to Agent default after switching away from it.
                overrides = codex_options({**self.options, "permission": "inherit"}) if self.agent == "codex" else {"bibimerOptions": self.options}
                if self.imported:
                    self._rpc("thread/" + self.imported["import_mode"],
                        {"threadId": self.imported["source_thread_id"], "excludeTurns": True, **overrides}, "import")
                else:
                    self._rpc("thread/start", {"cwd": self.project["path"], **({"ephemeral": False} if self.agent == "codex" else {}), **overrides}, "thread")
            elif kind in {"thread", "import"}:
                if kind == "import" and Path(result["thread"].get("cwd") or "/").resolve() != Path(self.project["path"]).resolve():
                    self._fault("error_import_project")
                    return
                self.thread_id = result["thread"]["id"]
                if self.agent == "codex":
                    self.default_model, self.default_effort = result.get("model"), result.get("reasoningEffort")
                    self.default_policy = {key: result[source] for key, source in
                        [("approvalPolicy", "approvalPolicy"), ("approvalsReviewer", "approvalsReviewer"), ("sandboxPolicy", "sandbox")]
                        if source in result}
                    if not {"sandboxPolicy", "approvalPolicy"}.issubset(self.default_policy):
                        self._fault("error_chat_start")
                        return
                self.history_persisted = result["thread"].get("ephemeral") is False
                self.persist_thread = True
                if kind == "import":
                    self._rpc("thread/items/list", {"threadId": self.thread_id, "sortDirection": "desc", "limit": 50}, "history")
                else:
                    self.turn_state = "ready"
                self._bump()
            elif kind == "history":
                for entry in reversed(result.get("data", [])):
                    source = dict(entry["item"])
                    if source.get("status") == "inProgress":
                        source["status"] = "interrupted"
                    self._item(source, entry["turnId"], True)
                self.history_pending, self.turn_state = False, "ready"
                self._put({"id": "history-preview", "kind": "notice", "code": "history_imported"})
            elif kind == "turn" and self.turn_state == "sending":
                self.turn_id = result["turn"]["id"]
                self.turn_state = "running"
                self._bump()
            return
        if params.get("threadId") and self.thread_id and params["threadId"] != self.thread_id:
            if "id" in message:
                self._send({"id": message["id"], "error": {"code": -32602, "message": "Wrong thread"}})
            return
        if method == "bibimer/notice" and self.agent != "codex":
            self._put({"id": str(uuid.uuid4()), "kind": "notice", "code": params.get("code") if params.get("code") in ERROR_MESSAGES else "error_agent_transport"})
        elif "id" in message:
            self._request(message)
        elif method == "turn/started":
            if self.turn_id != params["turn"]["id"]:
                self.requests.clear()
                self.response_preview, self.response_preview_final = "", False
            self.turn_id = params["turn"]["id"]
            self.turn_state = "running"
            self._bump()
        elif method == "turn/completed":
            turn = params["turn"]
            if self.turn_id and turn["id"] != self.turn_id:
                return
            notify_complete = self.turn_id == turn["id"] and turn.get("status") == "completed"
            self.turn_state, self.turn_id = "ready", None
            if turn.get("status", "completed") != "completed":
                self.queue_paused = True
            self.requests.clear()
            self._put({"id": "turn-" + turn["id"], "kind": "turn", "status": turn.get("status", "completed"),
                       "text": self._text((turn.get("error") or {}).get("message"))})
            if notify_complete and self.completed:
                self.completed(self.id, self.project["id"], self.agent, self.response_preview)
            self.response_preview, self.response_preview_final = "", False
        elif method == "serverRequest/resolved":
            for key, request in list(self.requests.items()):
                if request["rpc_id"] == params.get("requestId"):
                    del self.requests[key]
            if not self.requests and self.turn_id:
                self.turn_state = "running"
            self._bump()
        elif method in {"item/started", "item/completed"}:
            source = params["item"]
            self._item(source, params.get("turnId", ""), method == "item/completed")
            response_turn = params.get("responseTurnId", params.get("turnId"))
            if (method == "item/completed" and self.turn_id and response_turn == self.turn_id and
                    source.get("type") == "agentMessage" and source.get("status", "completed") == "completed"):
                item = self.items.get(params.get("turnId", "") + ":" + source["id"], {})
                phase = source.get("phase") or item.get("phase")
                if phase == "final_answer" or (phase is None and not self.response_preview_final):
                    self.response_preview = response_preview(source.get("text"))
                    self.response_preview_final = phase == "final_answer"
        elif method in {"item/agentMessage/delta", "item/plan/delta", "item/commandExecution/outputDelta"}:
            key = params.get("turnId", "") + ":" + params["itemId"]
            item = dict(self.items.get(key, {"id": key, "kind": "command" if "outputDelta" in method else "assistant", "text": "", "status": "inProgress"}))
            item["text"] = self._text(item.get("text", "") + params.get("delta", ""))
            self._put(item)
        elif method == "turn/plan/updated":
            self._put({"id": "plan-" + params["turnId"], "kind": "plan",
                       "steps": [{"step": self._text(step.get("step")), "status": step.get("status", "pending")} for step in params.get("plan", [])[:100]],
                       "explanation": self._text(params.get("explanation")),
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
            if kind == "agentMessage":
                phase = source.get("phase") or self.items.get(key, {}).get("phase")
                if phase in {"commentary", "final_answer"}:
                    item["phase"] = phase
            item.update(kind="assistant" if kind == "agentMessage" else "plan", text=self._text(source.get("text")))
        elif kind == "commandExecution":
            item.update(kind="command", title=self._text(source.get("command")), text=self._text(source.get("aggregatedOutput")), exit_code=source.get("exitCode"))
        elif kind == "fileChange":
            changes, remaining = [], 32768
            truncated = len(source.get("changes", [])) > 100
            for change in source.get("changes", [])[:100]:
                path = self._text(change.get("path"))[:4096]
                raw_diff = change.get("diff") if isinstance(change.get("diff"), str) else ""
                remaining = max(0, remaining - len(path))
                diff = raw_diff[:remaining]
                truncated = truncated or len(raw_diff) > remaining
                changes.append({"path": path, "diff": diff})
                remaining -= len(diff)
                if remaining <= 0:
                    truncated = True
                    break
            item.update(kind="diff", changes=changes, truncated=truncated, text=self._text("\n".join(change["path"] + "\n" + change["diff"] for change in changes)))
        elif kind == "reasoning":
            # Display only summaries explicitly provided for clients, not raw reasoning.
            item.update(kind="plan", summary=True, text=self._text("\n".join(source.get("summary", []))))
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
                    "queue": [dict(entry) for entry in self.queue.values()],
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

    def configure(self, data, catalog=None):
        key = request_id(data.get("request_id"))
        change = data.get("options")
        if not isinstance(change, dict) or not change:
            raise Problem(400, "error_agent_options")
        with self.condition:
            options = agent_options(self.agent, {**self.options, **change})
            digest, duplicate = self._duplicate(key, {"action": "options", "options": change})
            if duplicate:
                return
            validate_model_selection(options, catalog if catalog is not None else self.model_catalog)
            if self.state != "running" or not self.thread_id or self.history_pending:
                raise Problem(409, "error_session_not_running")
            if self.agent == "opencode" and options["permission"] == "inherit" and self.options["permission"] != "inherit":
                raise Problem(400, "error_permission_default")
            if self.agent == "opencode" and "model" in change and not options.get("model") and self.options.get("model"):
                raise Problem(400, "error_model_default")
            self.options = options
            if catalog is not None:
                self.model_catalog = catalog
            self._remember(key, digest, True)
            self._bump()
        # Persist outside the session lock (bridge -> session lock ordering).
        self.changed()

    def turn_options(self, chosen):
        if self.agent != "codex":
            return {"bibimerOptions": chosen}
        mode = chosen["permission"]
        if mode == "inherit":
            policy = self.default_policy.copy()
        else:
            policy = {"approvalPolicy": "never" if mode == "yolo" else "on-request", "approvalsReviewer": "user",
                      "sandboxPolicy": {"type": {"yolo": "dangerFullAccess", "read-only": "readOnly", "workspace-write": "workspaceWrite"}[mode]}}
        if "fast" in chosen:
            policy["serviceTier"] = "fast" if chosen["fast"] else "default"
        if "model" in chosen:
            model = chosen["model"] or self.default_model
            if model:
                policy["model"] = model
            row = next((row for row in self.model_catalog if row["id"] == model), {})
            effort = chosen.get("effort") or (self.default_effort if not chosen["model"] else None) or row.get("default_effort")
            if effort:
                policy["effort"] = effort
        return policy

    def message(self, data):
        key, text = request_id(data.get("request_id")), data.get("text")
        if "fast" in data and (self.agent != "codex" or type(data["fast"]) is not bool):
            raise Problem(400, "error_agent_options")
        if not isinstance(text, str) or not text.strip() or len(text.encode()) > 16384:
            raise Problem(400, "error_input_size")
        with self.condition:
            speed = {"fast": data["fast"]} if "fast" in data else {}
            digest, duplicate = self._duplicate(key, {"text": text, **speed})
            if duplicate:
                return
            if self.state != "running" or not self.thread_id:
                raise Problem(409, "error_session_not_running")
            if self.turn_state not in {"ready", "failed"} or self.queue:
                raise Problem(409, "error_chat_busy")
            self._remember(key, digest, False)
            self.turn_state = "sending"
            self._bump()
            chosen = {**self.options, **speed}
            self._rpc("turn/start", {"threadId": self.thread_id, "input": [{"type": "text", "text": text}], **self.turn_options(chosen)}, "turn")
            self.options.update(speed)
            self._remember(key, digest, True)

    def _drain_queue(self):
        # Caller owns the condition. Prompts live only in memory, never snapshot metadata.
        if (not self.queue or self.queue_paused or self.queue_inflight or self.requests or
                any(entry["state"] in {"steering", "uncertain"} for entry in self.queue.values()) or
                self.state != "running" or not self.thread_id or self.history_pending or
                self.turn_state not in {"ready", "failed"} or
                "turn" in self.rpc_pending.values()):
            return
        entry = next(iter(self.queue.values()))
        entry["state"] = "sending"
        self.queue_inflight = entry["id"]
        self.turn_state = "sending"
        self._bump()
        try:
            self._rpc("turn/start", {"threadId": self.thread_id,
                "input": [{"type": "text", "text": entry["text"]}], **self.turn_options(self.options)}, ("queue", entry["id"]))
        except Problem:
            entry.update(state="uncertain", code="error_input_uncertain")
            self.queue_paused = True
            self._fault("error_chat_transport")

    def queue_action(self, data):
        key, action = request_id(data.get("request_id")), data.get("action")
        if not isinstance(action, str) or action not in {"add", "remove", "resume", "steer"}:
            raise Problem(400, "error_queue_action")
        if action == "steer":
            return self.steer(data, from_queue=True)
        payload = {"action": "queue_" + action}
        if action == "add":
            value = data.get("text")
            if not isinstance(value, str) or not value.strip() or len(value.encode()) > 16384:
                raise Problem(400, "error_input_size")
            payload["text"] = value
        elif action == "remove":
            payload["entry_id"] = request_id(data.get("entry_id"))
        with self.condition:
            digest, duplicate = self._duplicate(key, payload)
            if duplicate:
                return
            if self.state != "running" or not self.thread_id or self.history_pending:
                raise Problem(409, "error_session_not_running")
            if action == "add":
                if len(self.queue) >= 16:
                    raise Problem(409, "error_queue_full")
                if not self.queue and self.turn_state in {"ready", "failed"}:
                    self.queue_paused = False
                self.queue[key] = {"id": key, "text": value, "state": "queued"}
            elif action == "remove":
                entry = self.queue.get(payload["entry_id"])
                if not entry or entry["state"] in {"sending", "steering"}:
                    raise Problem(409, "error_queue_entry")
                del self.queue[entry["id"]]
            else:
                if any(entry["state"] == "uncertain" for entry in self.queue.values()):
                    raise Problem(409, "error_input_uncertain")
                if any(entry["state"] == "steering" for entry in self.queue.values()):
                    raise Problem(409, "error_chat_busy")
                self.queue_paused = False
                for entry in self.queue.values():
                    if entry["state"] == "failed":
                        entry["state"] = "queued"
                        entry.pop("code", None)
            self._remember(key, digest, True)
            self._bump()
            self._drain_queue()

    def _finish_queue_steer(self, entry_id, error):
        # Called under the condition, before queue draining can begin a new turn.
        entry = self.queue.get(entry_id)
        if not entry:
            return
        if error:
            entry.update(state="uncertain" if error == "error_input_uncertain" else "failed", code=error)
            self.queue_paused = True
        else:
            del self.queue[entry_id]
        self._bump()

    def steer(self, data, from_queue=False):
        key, text, expected = request_id(data.get("request_id")), data.get("text"), data.get("turn_id")
        entry_id = request_id(data.get("entry_id")) if from_queue else None
        if not from_queue and (not isinstance(text, str) or not text.strip() or len(text.encode()) > 16384):
            raise Problem(400, "error_input_size")
        if not isinstance(expected, str) or not expected or len(expected) > 200:
            raise Problem(400, "error_steer_unavailable")
        with self.condition:
            payload = {"action": "queue_steer" if from_queue else "steer", "turn_id": expected,
                       **({"entry_id": entry_id} if from_queue else {"text": text})}
            digest, duplicate = self._duplicate(key, payload)
            if not duplicate:
                if (self.agent != "codex" or self.state != "running" or self.turn_id != expected or
                        self.turn_state not in {"running", "waiting"}):
                    raise Problem(409, "error_steer_unavailable")
                if from_queue:
                    entry = self.queue.get(entry_id)
                    if not entry or entry["state"] not in {"queued", "failed"}:
                        raise Problem(409, "error_queue_entry")
                    text = entry["text"]
                    entry["state"] = "steering"
                    entry.pop("code", None)
                    self._bump()
                self._remember(key, digest, False)
                try:
                    rpc_id = self._rpc("turn/steer", {"threadId": self.thread_id, "expectedTurnId": expected,
                        "input": [{"type": "text", "text": text}]}, ("steer", key, digest, expected, entry_id))
                except Problem:
                    if from_queue:
                        self._finish_queue_steer(entry_id, "error_input_uncertain")
                    self._fault("error_chat_transport")
                    raise
                self.condition.wait_for(lambda: self.inputs.get(key, (None, False))[1] or self.state != "running", timeout=4)
                if not self.inputs.get(key, (None, False))[1]:
                    # Never replay an unconfirmed steer. A queue entry stays
                    # paused/uncertain; a composer steer does not hold the queue.
                    self.rpc_pending.pop(rpc_id, None)
                    if from_queue:
                        self._finish_queue_steer(entry_id, "error_input_uncertain")
                    raise Problem(409, "error_input_uncertain")
            if key in self.steer_errors:
                raise Problem(409, self.steer_errors[key])

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
                    values = answer if question.get("multiple") and isinstance(answer, list) else [answer]
                    if not values or len(values) > 100 or any(not isinstance(value, str) or not value.strip() for value in values) or len(json.dumps(values).encode()) > 8192:
                        raise Problem(400, "error_chat_answer")
                    if question.get("isOther") is False and any(value not in {option.get("label") for option in question.get("options", [])} for value in values):
                        raise Problem(400, "error_chat_answer")
                    result["answers"][question["id"]] = {"answers": values}
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
            self.queue_paused = True
            self._bump()
            if self.state == "running" and self.turn_id:
                self._rpc("turn/interrupt", {"threadId": self.thread_id, "turnId": self.turn_id}, "interrupt")

    def write(self, data, key):
        raise Problem(400, "error_chat_mode")

    def resize(self, cols, rows):
        raise Problem(400, "error_chat_mode")


class CompletionFeed:
    """Bounded metadata and answer excerpts; never persisted or logged. No reverse lock acquisition."""
    def __init__(self, instance):
        self.instance = instance
        self.condition = threading.Condition()
        self.cursor = 0
        self.entries = collections.deque(maxlen=512)

    def publish(self, session_id, project_id, agent, preview=""):
        with self.condition:
            self.cursor += 1
            self.entries.append({"id": self.cursor, "session_id": session_id, "project_id": project_id,
                                 "agent": agent, "completed_at": time.time(), "preview": preview[:180]})
            self.condition.notify_all()

    def read(self, instance, cursor, wait):
        with self.condition:
            if instance != self.instance or cursor > self.cursor:
                return {"instance": self.instance, "cursor": self.cursor, "reset": True, "gap": False, "events": []}
            if cursor == self.cursor and wait:
                self.condition.wait_for(lambda: cursor != self.cursor, timeout=wait)
            floor = self.entries[0]["id"] - 1 if self.entries else self.cursor
            return {"instance": self.instance, "cursor": self.cursor, "reset": False, "gap": cursor < floor,
                    "events": [dict(row) for row in self.entries if row["id"] > cursor]}


class Bridge:
    def __init__(self, state):
        self.state = private_dir(state)
        state = self.state
        self.lock = threading.RLock()
        self.history_lock = threading.Lock()
        self.model_locks = {}
        self.model_cache = {}
        self.program_checks = {}
        self.instance = str(uuid.uuid4())
        self.completion_feed = CompletionFeed(self.instance)
        self.token = read_json(state / "token.json")
        if not self.token:
            self.token = secrets.token_urlsafe(32)
            save_json(state / "token.json", self.token)
        saved = read_json(state / "metadata.json", {})
        self.projects, self.sessions, self.previous_sessions = {}, {}, {}
        self.selected_agents = dict(saved.get("selected_agents") or {})
        self.selected_sessions = dict(saved.get("selected_sessions") or {})
        self.session_labels = dict(saved.get("session_labels") or {})
        self.deleted_launches = list(saved.get("deleted_launches") or [])[-1024:]
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
            snapshot["project"] = dict(self.projects[project_id], path=location.get("path") or self.projects[project_id]["path"])
            snapshot["output_start"] = snapshot["output_end"] = 0
            if snapshot.get("mode") == "chat":
                snapshot.update(queued_count=0, queue_paused=False, active_turn_id=None)
            if snapshot["state"] in ACTIVE:
                snapshot["state"], snapshot["exit_code"] = "lost", None
            agent = snapshot.get("agent", "shell")
            self.previous_sessions[snapshot["id"]] = snapshot
            self.selected_sessions.setdefault(project_id, {}).setdefault(agent, snapshot["id"])
            self.selected_agents.setdefault(project_id, agent)
        self.closing = False
        self.persist()

    @property
    def project(self):
        return self.projects.get(self.active_project_id)

    @property
    def session(self):
        return self.sessions.get(self.selected_id(self.active_project_id))

    @property
    def previous(self):
        return self.previous_sessions.get(self.selected_id(self.active_project_id))

    def selected_id(self, project_id, agent=None):
        return self.selected_sessions.get(project_id, {}).get(agent or self.selected_agents.get(project_id, "shell"))

    def describe(self, snapshot):
        if not snapshot:
            return None
        project = snapshot["project"]
        registered = self.projects.get(project["id"])
        if registered:
            project = dict(project, name=registered["name"])
        return dict(snapshot, project=project, **self.session_labels.get(snapshot["id"], {}))

    def snapshot_by_id(self, session_id):
        session = self.sessions.get(session_id)
        return self.describe(session.snapshot() if session else self.previous_sessions.get(session_id))

    def snapshot_for(self, project_id, agent=None):
        return self.snapshot_by_id(self.selected_id(project_id, agent))

    def snapshots(self, project_id=None):
        records = [self.snapshot_by_id(key) for key in self.sessions.keys() | self.previous_sessions.keys()]
        return sorted((row for row in records if project_id is None or row["project"]["id"] == project_id),
                      key=lambda row: (row.get("started_at", 0), row["id"]), reverse=True)

    def select_session(self, data):
        with self.lock:
            key, session_id = data.get("project_id"), data.get("session_id")
            if not isinstance(key, str) or key not in self.projects:
                raise Problem(404, "error_project_missing")
            snapshot = self.snapshot_by_id(session_id) if isinstance(session_id, str) else None
            if session_id is not None and (not snapshot or snapshot["project"]["id"] != key):
                raise Problem(404, "error_session_missing")
            agent = snapshot["agent"] if snapshot else data.get("agent", self.selected_agents.get(key, "shell"))
            if not isinstance(agent, str) or agent not in PERMISSION_MODES:
                raise Problem(400, "error_program")
            self.active_project_id = key
            self.selected_agents[key] = agent
            self.selected_sessions.setdefault(key, {})[agent] = session_id
            self.persist()
            return {"project_id": key, "agent": agent, "session": snapshot}

    def manage_session(self, session_id, data):
        with self.lock:
            snapshot = self.snapshot_by_id(session_id)
            if not snapshot:
                raise Problem(404, "error_session_missing")
            action = data.get("action")
            if action == "delete":
                if snapshot["state"] in ACTIVE:
                    raise Problem(409, "error_session_delete_active")
                self.deleted_launches = (self.deleted_launches + [snapshot["launch_id"]])[-1024:]
                self.sessions.pop(session_id, None)
                self.previous_sessions.pop(session_id, None)
                self.session_labels.pop(session_id, None)
                for choices in self.selected_sessions.values():
                    for agent in choices:
                        if choices[agent] == session_id:
                            choices[agent] = None
            elif action in {"archive", "restore"}:
                self.session_labels.setdefault(session_id, {})["archived"] = action == "archive"
            elif action == "rename":
                title = data.get("title")
                if not isinstance(title, str) or not title.strip() or len(title) > 120 or any(ord(c) < 32 for c in title):
                    raise Problem(400, "error_session_action")
                self.session_labels.setdefault(session_id, {})["title"] = title.strip()
            else:
                raise Problem(400, "error_session_action")
            self.persist()
            return {"session": self.snapshot_by_id(session_id)}

    def manage_project(self, data):
        with self.lock:
            key, action = data.get("project_id"), data.get("action")
            if not isinstance(key, str) or key not in self.projects:
                raise Problem(404, "error_project_missing")
            if action == "rename":
                name = data.get("name")
                if not isinstance(name, str) or not name.strip() or len(name) > 120 or any(ord(c) < 32 for c in name):
                    raise Problem(400, "error_project_action")
                self.projects[key] = dict(self.projects[key], name=name.strip())
            elif action == "delete":
                records = self.snapshots(key)
                if any(row["state"] in ACTIVE for row in records):
                    raise Problem(409, "error_project_delete_active")
                # Unregister only: never touch project folders or native history.
                for row in records:
                    self.deleted_launches.append(row.get("launch_id", row["id"]))
                    self.sessions.pop(row["id"], None)
                    self.previous_sessions.pop(row["id"], None)
                    self.session_labels.pop(row["id"], None)
                self.deleted_launches = self.deleted_launches[-1024:]
                self.selected_agents.pop(key, None)
                self.selected_sessions.pop(key, None)
                self.projects.pop(key)
                self.model_cache = {cache_key: value for cache_key, value in self.model_cache.items() if cache_key[0] != key}
                if self.active_project_id == key:
                    self.active_project_id = next(iter(self.projects), None)
            else:
                raise Problem(400, "error_project_action")
            self.persist()
            return {"project": self.projects.get(key), "removed_project_id": key if action == "delete" else None,
                    "active_project_id": self.active_project_id}

    def worktrees(self, data):
        with self.lock:
            key = data.get("project_id")
            if not isinstance(key, str) or key not in self.projects:
                raise Problem(404, "error_project_missing")
            project = dict(self.projects[key])
        root = project["path"]
        entries = [{"path": root, "name": project["name"], "primary": True, "available": Path(root).is_dir()}]
        try:
            # NUL delimiters preserve spaces/newlines; never execute Git hooks or a shell.
            result = subprocess.run(["git", "-C", root, "worktree", "list", "--porcelain", "-z"],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=3)
            if result.returncode == 0 and len(result.stdout) <= BUFFER_LIMIT:
                for block in result.stdout.decode("utf-8", "replace").split("\0\0")[:128]:
                    fields = dict(line.split(" ", 1) if " " in line else (line, True) for line in block.split("\0") if line)
                    path = fields.get("worktree")
                    if not isinstance(path, str) or fields.get("bare"):
                        continue
                    path = str(Path(path).resolve())
                    branch = str(fields.get("branch", "")).removeprefix("refs/heads/")
                    if path == root:
                        entries[0]["branch"] = branch
                    else:
                        entries.append({"path": path, "name": Path(path).name, "branch": branch,
                                        "primary": False, "available": Path(path).is_dir() and not fields.get("prunable")})
        except (OSError, subprocess.TimeoutExpired):
            pass
        return {"project_id": key, "worktrees": entries}

    def working_project(self, data):
        key = data.get("project_id", self.active_project_id)
        with self.lock:
            if not isinstance(key, str) or key not in self.projects:
                raise Problem(404, "error_project_missing")
            project = dict(self.projects[key])
        path = data.get("worktree_path", project["path"])
        if not isinstance(path, str) or "\0" in path:
            raise Problem(400, "error_worktree")
        if path != project["path"] and not any(row["path"] == path and row["available"] for row in self.worktrees({"project_id": key})["worktrees"]):
            raise Problem(400, "error_worktree")
        project["path"] = path
        return project

    def select_agent(self, data):
        with self.lock:
            key, agent = data.get("project_id"), data.get("agent")
            if not isinstance(key, str) or key not in self.projects:
                raise Problem(404, "error_project_missing")
            if not isinstance(agent, str) or agent not in PERMISSION_MODES:
                raise Problem(400, "error_program")
            self.selected_agents[key] = agent
            self.persist()
            return {"project_id": key, "agent": agent, "session": self.snapshot_for(key)}

    def active_count(self):
        return sum(session.state in ACTIVE for session in self.sessions.values())

    def completions(self, instance, cursor, wait):
        result = self.completion_feed.read(instance, cursor, wait)
        # Resolve current labels after releasing the feed lock; no transcript is read.
        with self.lock:
            result["events"] = [dict(row, project_name=self.projects[row["project_id"]]["name"][:120],
                session_title=self.session_labels.get(row["session_id"], {}).get("title", ""))
                for row in result["events"] if row["project_id"] in self.projects and
                (row["session_id"] in self.sessions or row["session_id"] in self.previous_sessions)]
        return result

    def persist(self):
        with self.lock:
            save_json(self.state / "metadata.json", {
                "format": 4, "projects": list(self.projects.values()),
                "active_project_id": self.active_project_id,
                "selected_agents": self.selected_agents,
                "selected_sessions": self.selected_sessions,
                "session_labels": self.session_labels,
                "deleted_launches": self.deleted_launches,
                "sessions": self.snapshots(),
                "project": self.project,
                "session": self.snapshot_for(self.active_project_id),
            })

    def agents(self):
        claude = self.agent_executable("claude")
        available = self.check_program("claude", claude) if claude else False
        sdk = bool(shutil.which("node") and claude_sdk_path().is_file())
        return [
            {"id": "shell", "name": "Terminal", "installed": bool(shutil.which("bash") or shutil.which("sh"))},
            {"id": "codex", "name": "Codex", "installed": bool(shutil.which("codex")), "modes": ["terminal", "chat"]},
            {"id": "claude", "name": "Claude Code", "installed": bool(claude), "available": available,
             "modes": ["terminal", "chat"] if sdk else ["terminal"],
             "issue": "error_program_unavailable" if claude and not available else "error_claude_sdk" if not sdk else None},
            {"id": "opencode", "name": "OpenCode", "installed": bool(shutil.which("opencode")), "modes": ["terminal", "chat"]},
        ]

    def agent_executable(self, agent):
        executable = shutil.which(agent)
        if agent != "claude":
            return executable
        override = os.environ.get("BIBIMER_CLAUDE_EXECUTABLE")
        if override:
            return shutil.which(override)
        if executable and self.check_program(agent, executable):
            return executable
        managed = Path.home() / ".local/share/bibimer/claude-runtime/claude"
        return str(managed) if managed.is_file() and os.access(managed, os.X_OK) else executable

    def check_program(self, agent, executable):
        now = time.monotonic()
        key = (agent, executable)
        previous = self.program_checks.get(key)
        if previous and previous[0] == executable and now - previous[1] < 60:
            return previous[2]
        try:
            result = subprocess.run([executable, "--version"], stdin=subprocess.DEVNULL,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
            ready = result.returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            ready = False
        self.program_checks[key] = executable, now, ready
        return ready

    def health(self):
        with self.lock:
            return {"version": VERSION, "protocol": 1, "instance": self.instance,
                    "home": str(Path.home()), "project": self.project,
                    "projects": [dict(project, agent=self.selected_agents.get(key, "shell"), session=self.snapshot_for(key),
                                      sessions=self.snapshots(key)) for key, project in self.projects.items()],
                    "features": ["multiple_projects", "browse_folders", "import_codex_session", "import_agent_session", "persistent_codex_sessions", "agent_options", "live_agent_options", "chat_queue", "codex_steer", "queue_steer", "model_options", "agent_sessions", "session_library", "git_worktrees", "project_management", "response_notifications"], "active_sessions": self.active_count(),
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

    def history_call(self, project, method, params, agent="codex"):
        if agent not in {"codex", "claude", "opencode"}:
            raise Problem(400, "error_program")
        executable = self.agent_executable(agent)
        if not executable:
            raise Problem(400, "error_program_missing")
        # A catalog request must not hold up session input, events or health.
        if not self.history_lock.acquire(blocking=False):
            raise Problem(409, "error_history")
        try:
            with HistoryClient(executable, project["path"], agent) as client:
                return client.call(method, params)
        except OSError:
            raise Problem(400, "error_history") from None
        finally:
            self.history_lock.release()

    def session_history(self, data):
        project = self.working_project(data)
        project_id = project["id"]
        search, cursor = data.get("search", ""), data.get("cursor")
        if (not isinstance(search, str) or len(search) > 200 or
                (cursor is not None and (not isinstance(cursor, str) or len(cursor) > 2048))):
            raise Problem(400, "error_import_invalid")
        params = {"cwd": project["path"], "limit": 25, "sortKey": "updated_at",
                  "sortDirection": "desc", "sourceKinds": ["cli", "vscode", "appServer"],
                  "archived": False, "modelProviders": []}
        if search.strip():
            params["searchTerm"] = search.strip()
        if cursor:
            params["cursor"] = cursor
        result = self.history_call(project, "thread/list", params, data.get("agent", "codex"))
        entries = []
        for entry in result.get("data", [])[:25]:
            # Read only saved threads for this project, even if an older server
            # ignores the filter. Send a bounded preview, never a full rollout.
            if (entry.get("ephemeral") or not isinstance(entry.get("id"), str) or
                    not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", entry["id"]) or
                    Path(entry.get("cwd") or "/").resolve() != Path(project["path"]).resolve()):
                continue
            entries.append({"id": entry["id"], "title": (entry.get("name") or entry.get("preview") or "")[:240],
                            "updated_at": entry.get("updatedAt"), "source": entry.get("source")})
        return {"sessions": entries, "next_cursor": result.get("nextCursor"), "project_id": project_id}

    def models(self, data):
        key, agent = data.get("project_id"), data.get("agent")
        project = self.working_project(data)
        if not isinstance(agent, str) or agent not in {"codex", "claude", "opencode"}:
            raise Problem(400, "error_program")
        cache_key = (key, project["path"], agent)
        with self.lock:
            model_lock = self.model_locks.setdefault(cache_key, threading.Lock())
        cached = self.model_cache.get(cache_key)
        if cached and not data.get("refresh") and time.monotonic() - cached[0] < 120:
            return {"project_id": key, "agent": agent, "models": cached[1]}
        if not model_lock.acquire(timeout=10):
            raise Problem(409, "error_models")
        try:
            # Share a just-completed lookup with a concurrent launch/options request.
            cached = self.model_cache.get(cache_key)
            if cached and not data.get("refresh") and time.monotonic() - cached[0] < 120:
                return {"project_id": key, "agent": agent, "models": cached[1]}
            executable = self.agent_executable(agent)
            if not executable:
                raise Problem(400, "error_program_missing")
            rows, cursor, cursors = [], None, set()
            with HistoryClient(executable, project["path"], agent) as client:
                for _ in range(10):
                    result = client.call("model/list", {"limit": 100, "includeHidden": False, "cursor": cursor})
                    rows.extend(result.get("data", [])[:1000 - len(rows)])
                    cursor = result.get("nextCursor")
                    if not cursor or cursor in cursors or len(rows) >= 1000:
                        break
                    cursors.add(cursor)
            catalog, seen = [], set()
            def clean(value, limit=256):
                return value if isinstance(value, str) and 0 < len(value) <= limit and not any(ord(c) < 32 for c in value) else ""
            for row in rows:
                identity = clean(row.get("model") or row.get("id"))
                if not identity or identity.startswith("-") or identity in seen or row.get("hidden"):
                    continue
                seen.add(identity)
                efforts, levels = [], set()
                for choice in row.get("supportedReasoningEfforts", [])[:64]:
                    level = clean(choice.get("reasoningEffort"))
                    if level and not level.startswith("-") and level not in levels:
                        efforts.append({"id": level, "description": clean(choice.get("description"), 600)})
                        levels.add(level)
                default = row.get("defaultReasoningEffort")
                catalog.append({"id": identity, "name": clean(row.get("displayName")) or identity,
                    "description": clean(row.get("description"), 600), "efforts": efforts,
                    "default_effort": default if default in levels else "", "is_default": row.get("isDefault") is True})
            self.model_cache[cache_key] = time.monotonic(), catalog
            return {"project_id": key, "agent": agent, "models": catalog}
        except (Problem, OSError, ValueError, KeyError, TypeError, AttributeError):
            raise Problem(400, "error_models") from None
        finally:
            model_lock.release()

    def configure_session(self, session, data):
        # Native catalog reads run outside all session/bridge locks.
        with session.condition:
            options = agent_options(session.agent, {**session.options, **data.get("options", {})}) if isinstance(data.get("options"), dict) else None
        if options is None:
            raise Problem(400, "error_agent_options")
        catalog = self.models({"project_id": session.project["id"], "worktree_path": session.project["path"], "agent": session.agent})["models"] if options.get("model") else None
        session.configure(data, catalog)

    def launch(self, data):
        key = request_id(data.get("request_id"))
        cols = integer(data.get("cols", 80), 20, 300)
        rows = integer(data.get("rows", 24), 4, 200)
        agent = data.get("agent")
        mode = data.get("mode", "terminal")
        if mode not in {"terminal", "chat"} or (mode == "chat" and agent not in {"codex", "claude", "opencode"}):
            raise Problem(400, "error_chat_mode")
        if agent not in {"shell", "codex", "claude", "opencode"}:
            raise Problem(400, "error_program")
        imported = import_spec(data)
        options = agent_options(agent, data.get("options"))
        if "new_session" in data and not isinstance(data["new_session"], bool):
            raise Problem(400, "error_session_action")
        if mode == "terminal" and agent == "opencode" and options.get("effort"):
            raise Problem(400, "error_effort_terminal")
        with self.lock:
            project_id = data.get("project_id", self.active_project_id)
            if project_id is None:
                raise Problem(400, "error_project_required")
        data = dict(data, project_id=project_id)
        working = self.working_project(data)

        def target():
            if self.closing:
                raise Problem(409, "error_bridge_stopping")
            project_id = data.get("project_id", self.active_project_id)
            if project_id is not None and (not isinstance(project_id, str) or project_id not in self.projects):
                raise Problem(404, "error_project_missing")
            project = working
            if key in self.deleted_launches:
                raise Problem(409, "error_launch_conflict")
            current = next((row for row in self.snapshots() if row.get("launch_id") == key), None)
            if current and current.get("launch_id") == key:
                if (current["project"] != project or current["agent"] != agent or current.get("mode", "terminal") != mode or
                        current.get("launch_options", current.get("options", {"permission": "inherit"})) != options or
                        any(current.get(field) != (imported or {}).get(field) for field in ("source_thread_id", "import_mode"))):
                    raise Problem(409, "error_launch_conflict")
                return project_id, project, current
            if not data.get("new_session") and any(row["agent"] == agent and row["state"] in ACTIVE for row in self.snapshots(project_id)):
                raise Problem(409, "error_session_exists")
            if imported and imported["import_mode"] == "resume" and any(
                    row["agent"] == agent and row["state"] in ACTIVE and
                    (row.get("external_thread_id") == imported["source_thread_id"] or
                     (row.get("import_mode") == "resume" and row.get("source_thread_id") == imported["source_thread_id"]))
                    for row in self.snapshots()):
                raise Problem(409, "error_import_active")
            if not project:
                raise Problem(400, "error_project_required")
            return project_id, project, None

        with self.lock:
            project_id, project, current = target()
            if current:
                return current
            # Pin the selected project while a separate read-only process validates
            # the source. A later UI project switch cannot redirect this launch.
            data = dict(data, project_id=project_id)
            project = dict(project)
        catalog = self.models({"project_id": project_id, "worktree_path": project["path"], "agent": agent})["models"] if options.get("model") else []
        validate_model_selection(options, catalog)
        if imported:
            result = self.history_call(project, "thread/read", {"threadId": imported["source_thread_id"], "includeTurns": False}, agent)
            source = result.get("thread", {})
            if source.get("id") != imported["source_thread_id"] or source.get("ephemeral"):
                raise Problem(400, "error_import_invalid")
            if Path(source.get("cwd") or "/").resolve() != Path(project["path"]).resolve():
                raise Problem(400, "error_import_project")
            if imported["import_mode"] == "resume" and (source.get("status") or {}).get("type") == "active":
                raise Problem(409, "error_import_active")
        with self.lock:
            project_id, project, current = target()
            if current:
                return current
            executable = shutil.which("bash") or shutil.which("sh") if agent == "shell" else self.agent_executable(agent)
            if not executable:
                raise Problem(400, "error_program_missing")
            if agent == "claude" and not self.check_program(agent, executable):
                raise Problem(400, "error_program_unavailable")
            argv = [executable, "-i"] if agent == "shell" else [executable]
            try:
                session = (ChatSession if mode == "chat" else Session)(project, agent, argv, cols, rows, key, self.persist,
                    options=options, **({"imported": imported, "catalog": catalog, "completed": self.completion_feed.publish} if mode == "chat" else {}))
            except OSError:
                raise Problem(400, "error_launch_failed") from None
            self.sessions[session.id] = session
            self.selected_sessions.setdefault(project_id, {})[agent] = session.id
            self.selected_agents[project_id] = agent
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
                snapshot = self.describe(previous)
                result = {"session": snapshot, "cursor": 0, "gap": cursor > 0}
                if snapshot.get("mode") == "chat":
                    result.update(items=[], retained=[], requests=[], queue=[])
                else:
                    result["data"] = ""
                return result
            session = self.get_session(session_id)
        # Never hold the bridge lock during an active session's long poll.
        result = session.events(cursor, wait)
        with self.lock:
            result["session"] = self.describe(result["session"])
        return result

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
        elif method == "GET" and parsed.path == "/v1/completions":
            query = urllib.parse.parse_qs(parsed.query)
            try:
                instance = query.get("instance", ["none"])[0]
                if instance != "none" and not re.fullmatch(r"[a-f0-9-]{36}", instance):
                    raise ValueError()
                cursor = integer(int(query.get("cursor", ["0"])[0]), 0, 2**53 - 1)
                wait = integer(int(query.get("wait", ["0"])[0]), 0, 20)
            except ValueError:
                raise Problem(400, "error_invalid_json") from None
            result = bridge.completions(instance, cursor, wait)
        elif method == "POST" and parsed.path == "/v1/pair":
            result = bridge.pair(data.get("code"))
        elif method == "POST" and parsed.path == "/v1/project":
            result = {"project": bridge.register(data)}
        elif method == "POST" and parsed.path == "/v1/project/manage":
            result = bridge.manage_project(data)
        elif method == "POST" and parsed.path == "/v1/folders":
            result = bridge.folders(data)
        elif method == "POST" and parsed.path == "/v1/session-history":
            result = bridge.session_history(data)
        elif method == "POST" and parsed.path == "/v1/models":
            result = bridge.models(data)
        elif method == "POST" and parsed.path == "/v1/project-agent":
            result = bridge.select_agent(data)
        elif method == "POST" and parsed.path == "/v1/project-session":
            result = bridge.select_session(data)
        elif method == "POST" and parsed.path == "/v1/worktrees":
            result = bridge.worktrees(data)
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
            if method == "POST" and action == "manage":
                self.reply(200, bridge.manage_session(parts[2], data))
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
            elif method == "POST" and action in {"message", "respond", "interrupt", "options", "queue", "steer"}:
                if not isinstance(session, ChatSession):
                    raise Problem(400, "error_chat_mode")
                if action == "message":
                    session.message(data)
                elif action == "respond":
                    session.respond(data)
                elif action == "options":
                    bridge.configure_session(session, data)
                elif action == "queue":
                    session.queue_action(data)
                elif action == "steer":
                    session.steer(data)
                else:
                    session.interrupt()
                result = {"session": session.snapshot()}
                if action == "queue":
                    # Same revision for both queue and session, without persisted text.
                    event = session.events(0, 0)
                    result = {"session": event["session"], "queue": event["queue"]}
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
