#!/usr/bin/env python3
"""iOS guest entry point and bounded native setup actions.

The stable Android bridge is loaded from its bundled source. Explicit agent
allowlists are extended for Gemini; all existing implementations stay in that
module, including its private PTY child entry point.
"""
import hmac
import json
import os
from pathlib import Path
import re
import select
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import types
import urllib.parse


HERE = Path(__file__).resolve().parent
AGENTS = ("codex", "claude", "opencode", "gemini")
SOURCE = HERE.parent / "bridge" / "bibimer_bridge.py"
CLAUDE_VERSION = "2.1.112"
CLAUDE_SDK_VERSION = "0.2.112"


def load_bridge(source=SOURCE):
    text = source.read_text(encoding="utf-8")
    changes = {
        'if agent not in {"shell", "codex", "claude", "opencode"}:':
            'if agent not in {"shell", "codex", "claude", "opencode", "gemini"}:',
        "if agent not in {'shell','codex','claude','opencode'} or mode not in {'terminal','chat'} or (agent == 'shell' and mode != 'terminal'):":
            "if agent not in {'shell','codex','claude','opencode','gemini'} or mode not in {'terminal','chat'} or (agent == 'shell' and mode != 'terminal'):",
        'codex_options({**self.options, "permission": "inherit"})':
            '_ios_codex_initial_options(self.options)',
    }
    for before, after in changes.items():
        if text.count(before) != 1:
            raise RuntimeError("Bundled bridge contract changed; review iOS adaptation")
        text = text.replace(before, after)
    structured = '{"codex", "claude", "opencode"}'
    if text.count(structured) != 6:
        raise RuntimeError("Bundled structured-agent contract changed; review iOS adaptation")
    text = text.replace(structured, '{"codex", "claude", "opencode", "gemini"}')
    module = types.ModuleType("bibimer_guest_base")
    module.__file__ = str(source)
    sys.modules[module.__name__] = module
    exec(compile(text, str(source), "exec"), module.__dict__)
    module.PERMISSION_MODES["gemini"] = {"inherit"}
    module.PERMISSION_MODES["codex"].add("app-sandbox")
    return module


def private_provider(state, name, text):
    target = state / name
    descriptor, temporary = tempfile.mkstemp(prefix=".ios-provider-", dir=state)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(text)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return target


def prepare_claude_provider(state, source=SOURCE.with_name("provider_claude.mjs")):
    """Keep iOS Steer disabled until its native acceptance has been verified."""
    text = source.read_text(encoding="utf-8")
    before = "capabilities:{steer:true}"
    if text.count(before) != 1:
        raise RuntimeError("Bundled Claude capability contract changed")
    return private_provider(state, "provider_claude_ios.mjs", text.replace(before, "capabilities:{steer:false}"))


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


def prepare_opencode_provider(state, source=SOURCE.with_name("provider_opencode.py")):
    return private_provider(state, "provider_opencode_ios.py", opencode_provider_source(source.read_text(encoding="utf-8")))


def claude_installation(home=None):
    home = (home or Path.home()).resolve()
    prefix = home / ".local/share/bibimer/agents/claude/node_modules"
    sdk_prefix = home / ".local/share/bibimer/claude/node_modules/@anthropic-ai/claude-agent-sdk"
    paths = {"wrapper": home / ".local/bin/claude", "cli": prefix / "@anthropic-ai/claude-code/cli.js",
             "cli_package": prefix / "@anthropic-ai/claude-code/package.json", "sdk": sdk_prefix / "sdk.mjs", "sdk_package": sdk_prefix / "package.json"}
    launcher = prefix / ".bin/claude"
    if launcher.resolve(strict=True) != paths["cli"]:
        raise RuntimeError("Claude launcher does not match the managed Node CLI")
    for key, version in (("cli_package", CLAUDE_VERSION), ("sdk_package", CLAUDE_SDK_VERSION)):
        if json.loads(paths[key].read_text())["version"] != version:
            raise RuntimeError("Claude package version does not match the verified runtime")
    expected = '#!/bin/sh\nexec "' + str(launcher) + '" "$@"\n'
    if paths["wrapper"].read_text() != expected or not os.access(paths["wrapper"], os.X_OK):
        raise RuntimeError("Claude wrapper does not match the managed executable")
    files = {}
    for key, path in paths.items():
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode):
            raise RuntimeError("Claude installation contains an unexpected file type")
        files[key] = {"size": info.st_size, "mtime_ns": info.st_mtime_ns, "inode": info.st_ino, "device": info.st_dev}
    return {"format": 1, "agent": "claude", "version": CLAUDE_VERSION, "sdk_version": CLAUDE_SDK_VERSION,
            "executable": str(paths["wrapper"]), "launcher": str(launcher), "files": files}


def record_claude_installation(state, home=None):
    installation = claude_installation(home)
    try:
        result = subprocess.run([installation["launcher"], "--version"], stdin=subprocess.DEVNULL,
                                capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Managed Claude version verification timed out") from None
    if result.returncode != 0 or result.stdout.strip() != CLAUDE_VERSION + " (Claude Code)":
        raise RuntimeError("Managed Claude version execution did not succeed")
    if claude_installation(home) != installation:
        raise RuntimeError("Claude installation changed during verification")
    directory = state / "agents"
    if directory.is_symlink():
        raise RuntimeError("Agent receipt folder cannot be a symbolic link")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_provider(directory, "claude.json", json.dumps(installation) + "\n")


def claude_installation_ready(base, state, executable, home=None):
    try:
        installation = claude_installation(home)
        return str(executable) == installation["executable"] and base.read_json(state / "agents/claude.json") == installation
    except (OSError, ValueError, KeyError, TypeError, RuntimeError):
        return False


def adapt(base, claude_provider=None, opencode_provider=None):
    original_provider_command = base.provider_command
    original_codex_options = base.codex_options
    original_terminal_command = base.terminal_command
    base.ERROR_MESSAGES.update(
        error_ios_codex_sandbox="This Linux sandbox mode is unavailable in the embedded iOS runtime. Explicitly choose a supported policy.",
        error_ios_codex_terminal_policy="App sandbox with approvals is available in Chat only. Choose the terminal agent's native policy explicitly.")

    def validate_codex_policy(mode, terminal=False):
        if not isinstance(mode, str):
            return  # The original option validator supplies the typed error.
        if mode in {"read-only", "workspace-write"}:
            raise base.Problem(400, "error_ios_codex_sandbox")
        if terminal and mode == "app-sandbox":
            raise base.Problem(400, "error_ios_codex_terminal_policy")

    def codex_options(options):
        if options["permission"] == "app-sandbox":
            return original_codex_options(dict(options, permission="read-only"))
        return original_codex_options(options)

    def initial_codex_options(options):
        return codex_options(dict(options, permission="app-sandbox" if options["permission"] == "app-sandbox" else "inherit"))

    def terminal_command(argv, agent, options):
        if agent == "codex":
            validate_codex_policy(options["permission"], terminal=True)
        return original_terminal_command(argv, agent, options)

    base.codex_options = codex_options
    base._ios_codex_initial_options = initial_codex_options
    base.terminal_command = terminal_command

    def provider_command(executable, agent):
        if agent == "gemini":
            return [sys.executable, str(HERE / "provider_gemini.py"), executable]
        result = original_provider_command(executable, agent)
        if agent == "claude" and claude_provider is not None:
            result[1] = str(claude_provider)
        if agent == "opencode" and opencode_provider is not None:
            result[1] = str(opencode_provider)
        return result

    base.provider_command = provider_command

    class HistoryClient(base.HistoryClient):
        def __init__(self, executable, cwd, agent="codex"):
            self.agent = agent
            self.metadata_deadline = time.monotonic() + 125
            super().__init__(executable, cwd, agent)

        def call(self, method, params):
            if self.agent not in {"codex", "gemini", "opencode"}:
                return super().call(method, params)
            if method not in {"initialize", "thread/list", "thread/read", "model/list", "skills/list", "commands/list"}:
                raise base.Problem(400, "error_import_invalid")
            try:
                self.serial += 1
                self.process.stdin.write((json.dumps({"id": self.serial, "method": method, "params": params}) + "\n").encode())
                self.process.stdin.flush()
                # Interpreter cold starts can exceed Android's eight-second
                # RPC limit, including Codex. Share one bounded budget across
                # initialization and paginated read-only metadata requests.
                deadline = self.metadata_deadline
                while time.monotonic() < deadline:
                    if b"\n" not in self.buffer:
                        if not select.select([self.process.stdout], [], [], .1)[0]:
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
                        raise base.Problem(400, "error_history_unsupported" if response["error"].get("code") == -32601 else "error_history")
                    return response["result"]
            except (OSError, ValueError, KeyError, TypeError):
                pass
            raise base.Problem(400, "error_history")

    class ChatSession(base.ChatSession):
        def turn_options(self, chosen):
            if self.agent == "codex":
                validate_codex_policy(chosen["permission"])
                if chosen["permission"] == "app-sandbox":
                    policy = super().turn_options(dict(chosen, permission="read-only"))
                    policy.update(sandboxPolicy={"type": "externalSandbox", "networkAccess": "enabled"},
                                  approvalPolicy="on-request", approvalsReviewer="user")
                    return policy
            return super().turn_options(chosen)

        def configure(self, data, catalog=None):
            change = data.get("options")
            if self.agent == "codex" and isinstance(change, dict):
                validate_codex_policy(change.get("permission", self.options["permission"]))
            return super().configure(data, catalog)

        def _startup_deadline(self):
            if self.agent not in {"codex", "gemini", "opencode"}:
                return super()._startup_deadline()
            with self.condition:
                ready = self.condition.wait_for(lambda: (self.thread_id is not None and not self.history_pending) or self.state != "running", timeout=245 if self.agent == "gemini" else 135)
            if not ready:
                self._fault("error_import_failed" if self.imported else "error_chat_start")

    base.HistoryClient, base.ChatSession = HistoryClient, ChatSession

    class Bridge(base.Bridge):
        def check_program(self, agent, executable):
            if agent == "claude" and str(executable) == str(Path.home() / ".local/bin/claude"):
                return claude_installation_ready(base, self.state, executable)
            return super().check_program(agent, executable)

        def launch(self, data, continuation=None, select=True):
            options = data.get("options")
            if data.get("agent") == "codex" and isinstance(options, dict):
                validate_codex_policy(options.get("permission", "inherit"), terminal=data.get("mode", "terminal") == "terminal")
            return super().launch(data, continuation, select)

        def agents(self):
            rows = super().agents()
            for row in rows:
                if row["id"] != "shell":
                    row["setup_actions"] = ["install", "login", "version"]
            rows.append({"id": "gemini", "name": "Gemini CLI", "installed": bool(shutil.which("gemini")),
                         "modes": ["terminal", "chat"], "setup_actions": ["install", "login", "version"],
                         "capabilities": {"history": False, "steer": False, "native_acp": True}})
            return rows

        def health(self):
            result = super().health()
            result.update(platform="ios", runtime="embedded-arm64-linux")
            # OS notifications/file viewers are native capabilities, not a guest
            # guarantee. The app decides which native facilities are available.
            result["features"] = [feature for feature in result["features"] if feature not in {"response_notifications", "claude_steer", "agent_connections"}]
            result["features"].append("ios_agent_setup")
            return result

        def commands(self, data, private=False):
            if data.get("agent") == "gemini":
                self.working_project(data)
                return {"project_id": data.get("project_id"), "agent": "gemini", "commands": []}
            return super().commands(data, private)

        def agent_action(self, data):
            agent, action = data.get("agent"), data.get("action")
            if agent not in AGENTS or action not in {"install", "login", "version"}:
                raise base.Problem(400, "error_program")
            key = base.request_id(data.get("request_id"))
            # Setup is usable before the user has registered a first project.
            # This happens only on the explicit setup action, not on health reads.
            with self.lock:
                if data.get("project_id") is None and self.active_project_id is None:
                    self.register({"path": str(Path.home() / "projects"), "create": True, "add": True})
            if data.get("project_id") is None:
                data = dict(data)
                data.pop("project_id", None)
            project = self.working_project(data)
            if action == "install":
                argv = ["/bin/sh", str(HERE / "install-agents.sh"), agent]
            else:
                executable = self.agent_executable(agent)
                if not executable:
                    raise base.Problem(400, "error_program_missing")
                args = {"codex": ["login", "--device-auth"], "claude": ["auth", "login"],
                        "opencode": ["auth", "login"], "gemini": []}
                argv = [executable, *(args[agent] if action == "login" else ["--version"])]
            with self.lock:
                if self.closing:
                    raise base.Problem(409, "error_bridge_stopping")
                existing = next((row for row in self.snapshots() if row.get("launch_id") == key), None)
                identity = {"agent": agent, "action": action}
                if existing:
                    if existing.get("setup_action") != identity or existing["project"] != project:
                        raise base.Problem(409, "error_launch_conflict")
                    return {"session": existing}
                if key in self.deleted_launches:
                    raise base.Problem(409, "error_launch_conflict")
                # The fixed installer/login is a PTY session. It never appears as
                # structured chat, and its terminal output is never translated.
                session = base.Session(project, agent, argv, 80, 24, key, self.persist)
                original_snapshot = session.snapshot
                session.snapshot = lambda: dict(original_snapshot(), setup_action=identity)
                self.sessions[session.id] = session
                self.selected_sessions.setdefault(project["id"], {})[agent] = session.id
                self.selected_agents[project["id"]] = agent
                self.persist()
                session.start_reading()
                return {"session": session.snapshot()}

    class Handler(base.Handler):
        def _route(self, method):
            parsed = urllib.parse.urlsplit(self.path)
            if parsed.path != "/v1/ios/agents":
                return super()._route(method)
            if self.headers.get("Host") != f"127.0.0.1:{self.server.server_port}" or "Origin" in self.headers:
                raise base.Problem(403, "error_local_only")
            auth = self.headers.get("Authorization", "")
            if not hmac.compare_digest(auth.encode(), ("Bearer " + self.server.bridge.token).encode()):
                raise base.Problem(401, "error_pairing_required")
            if method != "POST" or parsed.query:
                raise base.Problem(404, "error_route")
            if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
                raise base.Problem(400, "error_content_length")
            if self.headers.get_content_type() != "application/json":
                raise base.Problem(415, "error_json_required")
            try:
                length = base.integer(int(self.headers["Content-Length"]), 2, 65536)
                raw = self.rfile.read(length)
                if len(raw) != length:
                    raise ValueError()
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError()
            except (ValueError, UnicodeError):
                raise base.Problem(400, "error_invalid_json") from None
            self.reply(200, self.server.bridge.agent_action(data))

    base.Bridge, base.Handler = Bridge, Handler
    return base


def main():
    # Consume the token before constructing any child process. It is never an
    # argument, HTTP response field, log line or agent environment variable.
    token = os.environ.pop("BIBIMER_TOKEN", "")
    if sys.argv[1:] == ["record-install", "claude"]:
        base = load_bridge()
        state = base.private_dir(Path.home() / ".local/state/bibimer")
        record_claude_installation(state)
        print("Verified the managed Claude CLI and SDK installation. Provider sign-in is separate.")
        return
    if not re.fullmatch(r"[a-f0-9]{64}", token):
        raise RuntimeError("Invalid app connection token")
    base = load_bridge()
    state = base.private_dir(Path.home() / ".local/state/bibimer")
    base.save_json(state / "token.json", token)
    base = adapt(base, prepare_claude_provider(state), prepare_opencode_provider(state))
    os.environ["PATH"] = str(Path.home() / ".local/bin") + os.pathsep + os.environ.get("PATH", "")
    base.main()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as error:
        print("Bibimer iOS: " + str(error), file=sys.stderr)
        sys.exit(1)
