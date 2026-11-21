"""Optional telemetry is disabled without replacing security/user settings."""
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import textwrap
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("ios_entry_privacy", Path(__file__).parents[1] / "run.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


class PrivacySettingsTests(unittest.TestCase):
    def test_gemini_private_override_preserves_security_and_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            original = root / "enterprise.json"
            data = {"security": {"auth": {"selectedType": "oauth-personal"}},
                    "tools": {"sandbox": True}, "privacy": {"usageStatisticsEnabled": True, "other": "keep"},
                    "telemetry": {"enabled": True, "target": "local"}}
            original.write_text(json.dumps(data))
            raw = original.read_bytes()
            output = root / "private"
            def private_dir(_):
                output.mkdir(exist_ok=True)
                return output
            def save_json(path, value):
                path.write_text(json.dumps(value))
            base = types.SimpleNamespace(private_dir=private_dir, save_json=save_json)
            environment = {"GEMINI_CLI_SYSTEM_SETTINGS_PATH": str(original)}
            actual = Path(entry.private_gemini_settings(base, environment))
            saved = json.loads(actual.read_text())
            self.assertFalse(saved["privacy"]["usageStatisticsEnabled"])
            self.assertFalse(saved["telemetry"]["enabled"])
            self.assertEqual(saved["security"], data["security"])
            self.assertEqual(saved["tools"], data["tools"])
            self.assertEqual(saved["privacy"]["other"], "keep")
            self.assertEqual(saved["telemetry"]["target"], "local")
            self.assertEqual(original.read_bytes(), raw)
            self.assertEqual(environment, {"GEMINI_CLI_SYSTEM_SETTINGS_PATH": str(original)})

    def test_invalid_or_missing_enterprise_policy_is_not_silently_replaced(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "settings.json"
            base = types.SimpleNamespace()
            with self.assertRaises(RuntimeError):
                entry.private_gemini_settings(base, {"GEMINI_CLI_SYSTEM_SETTINGS_PATH": str(source)})
            for raw in ["[]", "{bad", '{"privacy":true}']:
                source.write_text(raw)
                with self.assertRaises(RuntimeError):
                    entry.private_gemini_settings(base, {"GEMINI_CLI_SYSTEM_SETTINGS_PATH": str(source)})
                self.assertEqual(source.read_text(), raw)

    def test_child_environment_override_is_ios_only_and_keeps_approval_policy(self):
        source = Path(entry.__file__).read_text()
        start = source.index("    def launch_environment(agent, options):", source.index("def adapt("))
        end = source.index("    base.launch_environment = launch_environment", start)
        code = source[start:end]
        env = {"SAFE_SECURITY_SETTING": "keep", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "0"}
        box = {"original_launch_environment": lambda agent, options: dict(env),
               "private_gemini_settings": lambda base, environment: "/private/settings.json", "base": object()}
        exec(textwrap.dedent(code), box)
        launch = box["launch_environment"]
        claude = launch("claude", {"permission": "inherit"})
        self.assertEqual(claude["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"], "1")
        self.assertEqual(claude["DISABLE_TELEMETRY"], "1")
        self.assertEqual(claude["SAFE_SECURITY_SETTING"], "keep")
        self.assertEqual(env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"], "0")
        self.assertEqual(launch("gemini", {})["GEMINI_CLI_SYSTEM_SETTINGS_PATH"], "/private/settings.json")
        self.assertEqual(launch("codex", {}), env)


if __name__ == "__main__":
    unittest.main()
