"""iOS interpreter startup budgets; no provider authentication or model turns."""
import io
import json
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_ios_bridge import ROOT, entry


class CodexDeadlineTests(unittest.TestCase):
    def setUp(self):
        self.base = entry.adapt(entry.load_bridge(ROOT / "bridge/bibimer_bridge.py"))
        self.clock = 0
        self.process = Mock(pid=123456)
        self.process.stdin = io.BytesIO()
        self.process.stdout.fileno.return_value = 91
        self.process.wait.return_value = 0
        self.process.poll.return_value = None

    def requests(self):
        return [json.loads(line) for line in self.process.stdin.getvalue().splitlines()]

    def delayed_ready(self, readers, *_):
        self.clock += 9
        return readers, [], []

    def response(self, *_):
        request = next(row for row in reversed(self.requests()) if "id" in row)
        result = {"data": [{"model": "fixture-codex", "supportedReasoningEfforts": []}]} if request["method"] == "model/list" else {}
        return (json.dumps({"id": request["id"], "result": result}) + "\n").encode()

    def test_codex_accepts_late_initialization_and_model_reply_without_a_turn(self):
        with patch.object(self.base.subprocess, "Popen", return_value=self.process), \
                patch.object(entry.time, "monotonic", side_effect=lambda: self.clock), \
                patch.object(entry.select, "select", side_effect=self.delayed_ready), \
                patch.object(entry.os, "read", side_effect=self.response):
            client = self.base.HistoryClient("fixture-codex", "/fixture", "codex")
            client.__enter__()
            result = client.call("model/list", {"limit": 100, "includeHidden": False})
            self.assertEqual(result["data"][0]["model"], "fixture-codex")
            self.assertEqual(self.clock, 18)
            self.assertEqual([row["method"] for row in self.requests()], ["initialize", "initialized", "model/list"])
            before = self.process.stdin.getvalue()
            with self.assertRaises(self.base.Problem) as error:
                client.call("turn/start", {})
            self.assertEqual(error.exception.code, "error_import_invalid")
            self.assertEqual(self.process.stdin.getvalue(), before)

    def test_codex_metadata_has_one_total_budget_across_rpc_calls(self):
        with patch.object(self.base.subprocess, "Popen", return_value=self.process), \
                patch.object(entry.time, "monotonic", side_effect=lambda: self.clock), \
                patch.object(entry.select, "select", side_effect=self.delayed_ready), \
                patch.object(entry.os, "read", side_effect=self.response):
            client = self.base.HistoryClient("fixture-codex", "/fixture", "codex")
            client.__enter__()
            self.clock = 124
            with self.assertRaises(self.base.Problem) as error:
                client.call("model/list", {})
            self.assertEqual(error.exception.code, "error_history")
            self.assertEqual(client.metadata_deadline, 125)

    def test_timed_out_initialization_cleans_only_the_owned_process_group(self):
        def never_ready(*_):
            self.clock += 126
            return [], [], []

        with patch.object(self.base.subprocess, "Popen", return_value=self.process), \
                patch.object(entry.time, "monotonic", side_effect=lambda: self.clock), \
                patch.object(entry.select, "select", side_effect=never_ready), \
                patch.object(self.base.os, "killpg") as kill:
            with self.assertRaises(self.base.Problem):
                with self.base.HistoryClient("fixture-codex", "/fixture", "codex"):
                    self.fail("An uninitialized client must not become usable")
            self.assertTrue(kill.called)
            self.assertEqual({call.args[0] for call in kill.call_args_list}, {self.process.pid})
            self.assertTrue(self.process.stdin.closed)
            self.process.stdout.close.assert_called_once()

    def test_codex_chat_waits_for_interpreter_startup_without_changing_policy(self):
        session = object.__new__(self.base.ChatSession)
        session.agent = "codex"
        session.condition = threading.Condition()
        session._fault = Mock()
        with patch.object(session.condition, "wait_for", return_value=True) as wait:
            session._startup_deadline()
        self.assertEqual(wait.call_args.kwargs["timeout"], 135)
        session._fault.assert_not_called()
        with patch.object(session.condition, "wait_for", return_value=False):
            session.imported = False
            session._startup_deadline()
        session._fault.assert_called_once_with("error_chat_start")


if __name__ == "__main__":
    unittest.main()
