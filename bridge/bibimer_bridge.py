#!/usr/bin/env python3
"""Bibimer's loopback-only, authenticated Termux PTY bridge (stdlib only)."""

import argparse
import base64
import binascii
import collections
import contextlib
import fcntl
import hashlib
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

VERSION = "0.1.1"
PORT = 8765
BUFFER_LIMIT = 1024 * 1024
ACTIVE = {"running", "stopping"}


ERROR_MESSAGES = {
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
        self.project, self.previous = saved.get("project"), saved.get("session")
        if self.previous:
            self.previous["output_start"] = self.previous["output_end"] = 0
            if self.previous["state"] in ACTIVE:
                self.previous["state"] = "lost"
                self.previous["exit_code"] = None
        self.session = None
        self.persist()

    def persist(self):
        with self.lock:
            save_json(self.state / "metadata.json", {
                "project": self.project,
                "session": self.session.snapshot() if self.session else self.previous,
            })

    def agents(self):
        return [
            {"id": "shell", "name": "Terminal", "installed": bool(shutil.which("bash") or shutil.which("sh"))},
            {"id": "codex", "name": "Codex", "installed": bool(shutil.which("codex"))},
            {"id": "claude", "name": "Claude Code", "installed": bool(shutil.which("claude"))},
        ]

    def health(self):
        with self.lock:
            return {"version": VERSION, "protocol": 1, "instance": self.instance,
                    "home": str(Path.home()), "project": self.project,
                    "agents": self.agents(),
                    "session": self.session.snapshot() if self.session else self.previous}

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

    def register(self, data):
        with self.lock:
            if self.session and self.session.state in ACTIVE:
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
            self.project = {"name": path.name or str(path), "path": str(path)}
            self.persist()
            return self.project

    def launch(self, data):
        key = request_id(data.get("request_id"))
        cols = integer(data.get("cols", 80), 20, 300)
        rows = integer(data.get("rows", 24), 4, 200)
        agent = data.get("agent")
        if agent not in {"shell", "codex", "claude"}:
            raise Problem(400, "error_program")
        with self.lock:
            current = self.session.snapshot() if self.session else self.previous
            if current and current.get("launch_id") == key:
                if current["agent"] != agent:
                    raise Problem(409, "error_launch_conflict")
                return current
            if self.session and self.session.state in ACTIVE:
                raise Problem(409, "error_session_exists")
            if not self.project:
                raise Problem(400, "error_project_required")
            executable = shutil.which("bash") or shutil.which("sh") if agent == "shell" else shutil.which(agent)
            if not executable:
                raise Problem(400, "error_program_missing")
            argv = [executable, "-i"] if agent == "shell" else [executable]
            try:
                session = Session(self.project, agent, argv, cols, rows, key, self.persist)
            except OSError:
                raise Problem(400, "error_launch_failed") from None
            self.session = session
            self.persist()
            session.start_reading()
            return session.snapshot()

    def get_session(self, session_id):
        with self.lock:
            if not self.session or self.session.id != session_id:
                raise Problem(404, "error_session_missing")
            return self.session


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
        elif method == "POST" and parsed.path == "/v1/sessions":
            result = {"session": bridge.launch(data)}
        elif parsed.path.startswith("/v1/sessions/"):
            parts = parsed.path.strip("/").split("/")
            if len(parts) != 4:
                raise Problem(404, "error_route")
            session = bridge.get_session(parts[2])
            action = parts[3]
            if method == "GET" and action == "events":
                query = urllib.parse.parse_qs(parsed.query)
                try:
                    cursor = integer(int(query.get("cursor", ["0"])[0]), 0, 2**53 - 1)
                    wait = integer(int(query.get("wait", ["20"])[0]), 0, 20)
                except ValueError:
                    raise Problem(400, "error_cursor") from None
                result = session.events(cursor, wait)
            elif method == "POST" and action == "input":
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
            else:
                raise Problem(404, "error_route")
        else:
            raise Problem(404, "error_route")
        self.reply(200, result)


def default_state():
    return Path.home() / ".local" / "state" / "bibimer"


def is_running(state, port):
    try:
        token = read_json(state / "token.json")
        if not token:
            return False
        request = urllib.request.Request(f"http://127.0.0.1:{port}/v1/health",
                                         headers={"Authorization": "Bearer " + token})
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(request, timeout=0.5) as response:
            return json.load(response).get("protocol") == 1
    except (OSError, ValueError):
        return False


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
    parser.add_argument("command", choices=["start", "serve", "pair", "status"], nargs="?", default="start")
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
            if bridge.session:
                bridge.session.stop()
                with contextlib.suppress(subprocess.TimeoutExpired):
                    bridge.session.process.wait(timeout=4)
            server.server_close()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as error:
        print(f"Bibimer: {error}", file=sys.stderr)
        sys.exit(1)
