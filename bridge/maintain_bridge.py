"""App-bundled, fixed bridge maintenance. Never stop an active session or issue pairing codes."""
import base64
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import zlib


class MaintenanceError(Exception):
    def __init__(self, code):
        self.code = code


def maintain(action, payload, state=None, folder=None, port=8765, recovery=None):
    if action not in {"update", "restart"}:
        raise MaintenanceError("bridge_maintenance_failed")
    state = state or Path.home() / ".local/state/bibimer"
    folder = folder or Path.home() / ".local/share/bibimer"
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    with open(state / "maintenance.lock", "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise MaintenanceError("bridge_maintenance_running") from None
        # Validate the complete bundled release before stopping or changing anything.
        release = {}
        for name, entry in payload.items():
            if name not in {"bibimer_bridge.py", "provider_opencode.py", "provider_claude.mjs", "repair_claude_termux.py", "browser_tools.py", "maintenance_recovery.py"}:
                raise MaintenanceError("bridge_maintenance_failed")
            content = zlib.decompress(base64.b64decode(entry["data"], validate=True))
            if hashlib.sha256(content).hexdigest() != entry["sha256"]:
                raise MaintenanceError("bridge_maintenance_failed")
            if name.endswith(".py"):
                compile(content, name, "exec")
            release[name] = content
        if "bibimer_bridge.py" not in release:
            raise MaintenanceError("bridge_maintenance_failed")
        # Use the bundled shutdown implementation even when the installed bridge is older.
        with tempfile.TemporaryDirectory(dir=state, prefix="maintenance-") as temporary:
            helper = Path(temporary) / "bibimer_bridge.py"
            for name, content in release.items():
                (Path(temporary) / name).write_bytes(content)
            spec = importlib.util.spec_from_file_location("bibimer_maintenance_runtime", helper)
            runtime = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(runtime)
            if action == "restart" and not (folder / "bibimer_bridge.py").is_file():
                raise MaintenanceError("bridge_maintenance_failed")
            before = runtime.bridge_health(state, port)
            if before and action == "update":
                installed_version = tuple(int(part) for part in before["version"].split("."))
                bundled_version = tuple(int(part) for part in runtime.VERSION.split("."))
                if len(installed_version) != 3 or installed_version > bundled_version:
                    raise MaintenanceError("bridge_maintenance_failed")
            if before and (before.get("active_sessions", 0) or any(
                row.get("state") in {"running", "stopping"}
                for project in before.get("projects", []) for row in project.get("sessions", [])
            )):
                raise MaintenanceError("bridge_maintenance_busy")
            recovery_id = None
            if recovery is not None:
                if action != "update":
                    raise MaintenanceError("bridge_maintenance_failed")
                # The instance is verified before restart; metadata is loaded by
                # the old health response, which contains only stopped targets.
                try:
                    recovery_id = runtime.maintenance_recovery.prepare(state, before, recovery)
                except (ValueError, TypeError, KeyError, OSError):
                    raise MaintenanceError("bridge_maintenance_failed") from None
            # Fail closed if the state is locked but its authenticated server cannot be checked.
            if not before:
                with open(state / "bridge.lock", "a") as bridge_lock:
                    try:
                        fcntl.flock(bridge_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    except BlockingIOError:
                        raise MaintenanceError("bridge_maintenance_failed") from None
            else:
                try:
                    runtime.restart_bridge(state, port)
                except RuntimeError:
                    health = runtime.bridge_health(state, port)
                    raise MaintenanceError("bridge_maintenance_busy" if health and health.get("active_sessions", 0) else "bridge_maintenance_failed") from None
            # Hold the bridge state lock while replacing the complete release.
            with open(state / "bridge.lock", "a") as bridge_lock:
                try:
                    fcntl.flock(bridge_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    raise MaintenanceError("bridge_maintenance_failed") from None
                folder.mkdir(parents=True, exist_ok=True, mode=0o700)
                previous = {name: (folder / name).read_bytes() if (folder / name).exists() else None for name in release}

                def replace(name, content):
                    fd, pending = tempfile.mkstemp(dir=folder, prefix=".maintenance-")
                    try:
                        with os.fdopen(fd, "wb") as output:
                            output.write(content)
                            output.flush()
                            os.fsync(output.fileno())
                        os.chmod(pending, 0o700)
                        os.replace(pending, folder / name)
                    finally:
                        if os.path.exists(pending):
                            os.unlink(pending)

                def start(reopen=False):
                    # No pairing and no terminal/output capture.
                    return subprocess.Popen([sys.executable, str(folder / "bibimer_bridge.py"), "serve",
                        "--state-dir", str(state), "--port", str(port),
                        *(["--recover-maintenance", recovery_id] if reopen and recovery_id else [])], stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)

                try:
                    if action == "update":
                        for name, content in release.items():
                            replace(name, content)
                    if not (folder / "bibimer_bridge.py").is_file():
                        raise MaintenanceError("bridge_maintenance_failed")
                except Exception:
                    for name, content in previous.items():
                        if content is not None:
                            replace(name, content)
                        else:
                            (folder / name).unlink(missing_ok=True)
                    fcntl.flock(bridge_lock, fcntl.LOCK_UN)
                    if before and previous.get("bibimer_bridge.py") is not None:
                        start()
                    raise
                # Release only once all files form a complete release.
                fcntl.flock(bridge_lock, fcntl.LOCK_UN)
                child = start(reopen=True)
                deadline = time.monotonic() + 8
                while time.monotonic() < deadline:
                    health = runtime.bridge_health(state, port)
                    if health and (not before or health.get("instance") != before.get("instance")):
                        if action != "update" or health.get("version") == runtime.VERSION:
                            return "bridge_maintenance_done"
                    if child.poll() is not None:
                        break
                    time.sleep(0.1)
                # Only roll back a failed child. Never signal an unverified or active server.
                if child.poll() is not None and action == "update":
                    with open(state / "bridge.lock", "a") as recovery_lock:
                        try:
                            fcntl.flock(recovery_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        except BlockingIOError:
                            raise MaintenanceError("bridge_maintenance_failed") from None
                        for name, content in previous.items():
                            if content is None:
                                (folder / name).unlink(missing_ok=True)
                            else:
                                replace(name, content)
                        fcntl.flock(recovery_lock, fcntl.LOCK_UN)
                        if previous.get("bibimer_bridge.py") is not None:
                            start()
                raise MaintenanceError("bridge_maintenance_failed")


def main(action, payload):
    try:
        encoded = os.environ.pop("BIBIMER_MAINTENANCE_REOPEN", None)
        if encoded and len(encoded) > 16000:
            raise ValueError("Invalid recovery size")
        recovery = json.loads(base64.b64decode(encoded, validate=True)) if encoded else None
        code = maintain(action, payload, recovery=recovery)
    except MaintenanceError as error:
        code = error.code
    except Exception:
        code = "bridge_maintenance_failed"
    # Fixed status only: no token, pairing code, project path, or subprocess output.
    print(json.dumps({"status": code}))
    return 0 if code == "bridge_maintenance_done" else 1
