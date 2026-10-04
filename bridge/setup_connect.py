"""Private RUN_COMMAND result: start an installed bridge and issue a one-use code.

Stdout goes only to Bibimer's PendingIntent receiver, never to an install log.
Existing bridge files, tokens, projects and running sessions are left intact.
"""
import argparse
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def connect(path, state, port, installer=None):
    if state.is_symlink():
        raise RuntimeError("quick_bridge_failed")
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state / "setup.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("quick_busy") from None
        if not path.is_file():
            if not installer:
                raise RuntimeError("quick_install_failed")
            try:
                subprocess.run(["bash", str(installer)], env={**os.environ, "BIBIMER_SKIP_START": "1",
                               "BIBIMER_CLAUDE": "0", "BIBIMER_CLAUDE_TERMUX": "0"},
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               check=True, timeout=600)
            except (OSError, subprocess.SubprocessError):
                raise RuntimeError("quick_install_failed") from None
        return pair_installed(path, state, port)


def pair_installed(path, state, port):
    spec = importlib.util.spec_from_file_location("bibimer_installed", path)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    state = bridge.private_dir(state)
    if not bridge.is_running(state, port):
        # The interactive `start` command requires /dev/tty to show its code.
        # RUN_COMMAND background jobs use the same daemon path without a terminal.
        child = subprocess.Popen([sys.executable, str(path), "serve", "--state-dir", str(state), "--port", str(port)],
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True, close_fds=True)
        for _ in range(60):
            if bridge.is_running(state, port):
                break
            if child.poll() is not None:
                raise RuntimeError("quick_bridge_failed")
            time.sleep(.1)
        else:
            child.terminate()
            child.wait(timeout=5)
            raise RuntimeError("quick_bridge_failed")
    if not bridge.is_running(state, port):
        raise RuntimeError("Bridge unavailable")
    return {"protocol": 1, "code": bridge.issue_pairing(state)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bridge", type=Path, default=Path.home()/".local/share/bibimer/bibimer_bridge.py")
    parser.add_argument("--state-dir", type=Path, default=Path.home()/".local/state/bibimer")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--installer", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(connect(args.bridge, args.state_dir, args.port, args.installer)))
    except Exception as error:
        # Do not expose exceptions, process output, paths or credentials in results.
        code = str(error) if str(error) in {"quick_busy", "quick_install_failed"} else "quick_bridge_failed"
        print(json.dumps({"error": code}))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
