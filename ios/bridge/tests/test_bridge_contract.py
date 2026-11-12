"""Keep iOS structured-agent expansion separate from native authentication."""
import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest


ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("ios_bridge_contract_entry", ROOT / "ios/bridge/run.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


class BridgeContractTests(unittest.TestCase):
    def setUp(self):
        self.base = entry.load_bridge(ROOT / "bridge/bibimer_bridge.py")

    def test_current_shared_source_retains_gemini_structured_import(self):
        imported = self.base.import_spec({"agent": "gemini", "mode": "chat",
            "source_thread_id": "native-gemini-thread", "import_mode": "resume"})
        self.assertEqual(imported, {"source_thread_id": "native-gemini-thread", "import_mode": "resume"})
        self.assertEqual(self.base.PERMISSION_MODES["gemini"], {"inherit"})

    def test_gemini_is_not_added_to_native_authentication_allowlists(self):
        with self.assertRaises(self.base.Problem) as failure:
            self.base.Bridge.launch(object(), {"agent": "shell", "mode": "terminal"}, authentication_agent="gemini")
        self.assertEqual(failure.exception.code, "error_connection_unsupported")
        bridge = SimpleNamespace(closing=False, agent_updates=SimpleNamespace(busy=lambda agent: False))
        connections = SimpleNamespace(closed=False, bridge=bridge)
        with self.assertRaises(self.base.Problem) as failure:
            self.base.AgentConnections._handle(connections, {"agent": "gemini", "action": "terminal"})
        self.assertEqual(failure.exception.code, "error_connection_unsupported")

    def test_unreviewed_structured_guard_still_fails_closed(self):
        text = (ROOT / "bridge/bibimer_bridge.py").read_text()
        text = text.replace('data.get("agent") not in {"codex", "claude", "opencode"}',
                            'data.get("agent") not in {"codex", "claude", "opencode", "unknown"}', 1)
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "bridge.py"
            source.write_text(text)
            with self.assertRaisesRegex(RuntimeError, "structured-agent contract changed"):
                entry.load_bridge(source)


if __name__ == "__main__":
    unittest.main()
