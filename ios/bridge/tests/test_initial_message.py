"""First-message launch through the actual iOS bridge adaptation, with local peers."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("ios_first_message_entry", ROOT / "ios/bridge/run.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


class IOSInitialMessageTests(unittest.TestCase):
    def run_agent(self, agent, options):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            base = entry.adapt(entry.load_bridge(ROOT / "bridge/bibimer_bridge.py"))
            bridge = base.Bridge(root / "state")
            project = bridge.register({"path": str(root), "create": False})
            peer = root / agent
            fixture = ROOT / ("ios/bridge/tests/fake_gemini.py" if agent == "gemini" else "bridge/tests/fake_codex.py")
            peer.write_text("#!" + sys.executable + "\n" + fixture.read_text().split("\n", 1)[1])
            peer.chmod(0o700)
            try:
                payload = {"project_id": project["id"], "agent": agent, "mode": "chat", "new_session": True,
                           "request_id": str(uuid.uuid4()), "options": options,
                           "initial_message": {"text": "PRIVATE_IOS_FIRST_MESSAGE"}}
                with patch.object(bridge, "agent_executable", return_value=str(peer)):
                    first = bridge.launch(payload)
                    self.assertEqual(first["id"], bridge.launch(payload)["id"])
                session = bridge.get_session(first["id"])
                deadline = time.monotonic() + 5
                event = {}
                while time.monotonic() < deadline:
                    event = bridge.session_events(session.id, 0, 0)
                    if any(item["kind"] == "turn" for item in event["items"]) and event["session"]["turn_state"] == "ready":
                        break
                    time.sleep(.02)
                else:
                    self.fail("No structured first-message completion from " + agent)
                self.assertEqual(1, sum(item["kind"] == "user" for item in event["items"]))
                self.assertIn("initial_chat_message", bridge.health()["features"])
                self.assertNotIn("PRIVATE_IOS_FIRST_MESSAGE", (root / "state/metadata.json").read_text())
            finally:
                for session in bridge.sessions.values():
                    session.stop()
                    session.process.wait(timeout=5)
                    session.reader.join(timeout=2)
                bridge.linked_files.close()
                bridge.github.close()
                bridge.worktree_creation.close()

    def test_codex_initial_message_uses_ios_adaptation(self):
        self.run_agent("codex", {"permission": "inherit"})

    def test_gemini_initial_message_uses_ios_native_acp(self):
        self.run_agent("gemini", {"permission": "inherit"})
