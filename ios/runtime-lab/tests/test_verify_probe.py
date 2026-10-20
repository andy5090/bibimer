"""Parser unit tests only; these are not iOS runtime compatibility evidence."""

import json
import unittest

from verify_probe import EXPECTED_CHECKS, ProbeFailure, verify


def complete_output(tier="basic"):
    lines = [f"BIBIMER_CHECK\t{name}\tPASS" for name in sorted(EXPECTED_CHECKS[tier])]
    evidence = ""
    if tier == "auth-network":
        evidence = "".join("AUTH_NETWORK " + json.dumps({"stage": "codex-tls", "mode": mode,
            "exitCode": 1, "httpResponseReceived": True, "transportSendFailed": False,
            "panicked": False, "nativeAuthPromptSeen": False}) + "\n"
            for mode in ("default", "explicit-ca", "ipv4-host", "cert-dir", "native-debug"))
    return "ordinary guest output\n" + evidence + "\n".join(lines) + f"\nBIBIMER_SUMMARY\t{tier}\tPASS\t{len(lines)}\n"


class VerifyProbeTests(unittest.TestCase):
    def setUp(self):
        self.output = complete_output()
        self.result = {"exitCode": 0, "durationSeconds": 1.25}

    def reject(self, output=None, result=None, tier="basic"):
        with self.assertRaises(ProbeFailure):
            verify(self.output if output is None else output,
                   self.result if result is None else result, tier)

    def test_each_complete_tier(self):
        for tier in EXPECTED_CHECKS:
            with self.subTest(tier=tier):
                self.assertEqual(verify(complete_output(tier), self.result, tier)["status"], "PASS")

    def test_missing_check(self):
        self.reject(self.output.replace("BIBIMER_CHECK\tarchitecture\tPASS\n", ""))

    def test_truncated_output(self):
        self.reject(self.output[:self.output.index("BIBIMER_SUMMARY")])

    def test_duplicate_check(self):
        self.reject("BIBIMER_CHECK\tarchitecture\tPASS\n" + self.output)

    def test_duplicate_summary(self):
        self.reject(self.output + "BIBIMER_SUMMARY\tbasic\tPASS\t8\n")

    def test_failed_and_skipped_checks(self):
        for status in ("FAIL", "SKIP"):
            with self.subTest(status=status):
                self.reject(self.output.replace("architecture\tPASS", f"architecture\t{status}"))

    def test_nonzero_native_exit(self):
        for code in (1, 137, -9, None, False, "0"):
            with self.subTest(code=code):
                self.reject(result={**self.result, "exitCode": code})

    def test_invalid_duration(self):
        for duration in (-1, float("inf"), float("nan"), True, "1", None):
            with self.subTest(duration=duration):
                self.reject(result={**self.result, "durationSeconds": duration})

    def test_wrong_tier(self):
        self.reject(tier="packages")
        self.reject(result={**self.result, "tier": "packages"})

    def test_wrong_count(self):
        self.reject(self.output.replace("basic\tPASS\t8", "basic\tPASS\t7"))

    def test_unknown_or_malformed_marker(self):
        for marker in ("BIBIMER_CHECK\textra\tPASS", "BIBIMER_CHECK\tarchitecture", "BIBIMER_OTHER"):
            with self.subTest(marker=marker):
                self.reject(marker + "\n" + self.output)

    def test_check_after_summary(self):
        self.reject(self.output + "BIBIMER_CHECK\tarchitecture\tPASS\n")

    def test_failed_summary(self):
        self.reject(self.output.replace("basic\tPASS\t8", "basic\tFAIL\t8"))

    def test_only_a_single_pass_is_insufficient(self):
        self.reject("BIBIMER_CHECK\tarchitecture\tPASS\n")

    def test_runtime_fault_rejects_successful_guest_checks(self):
        markers = (
            "SAFETY-VALVE blocked execution", "NETDIAG unsupported syscall",
            "Assertion failed: state", "EXC_BAD_ACCESS", "EXC_CRASH",
            "SIGSEGV", "SIGABRT", "V8_SIGABRT: pc=0x100", "V8_SIGSEGV: pc=0x100", "Segmentation fault: 11", "Abort trap: 6",
            "host crash detected", "fatal error in runtime", "uncaught exception",
            "BIBIMER_RUNTIME_SHUTDOWN_INCOMPLETE survivors=2",
        )
        for marker in markers:
            with self.subTest(marker=marker):
                self.reject(self.output + marker + "\n")
                with self.assertRaisesRegex(ProbeFailure, "host console"):
                    verify(self.output, self.result, "basic", host_console=marker)

    def test_ordinary_host_console_is_allowed(self):
        verified = verify(self.output, self.result, "basic", "App started\nGuest exited: 0\n")
        self.assertEqual(verified["status"], "PASS")

    def test_package_tier_requires_pty_and_signals(self):
        for name in ("python_pty", "python_signals"):
            with self.subTest(name=name):
                output = complete_output("packages").replace(f"BIBIMER_CHECK\t{name}\tPASS\n", "")
                self.reject(output, tier="packages")

    def test_shutdown_requires_prompt_native_completion(self):
        output = complete_output("shutdown")
        verified = verify(output, {**self.result, "durationSeconds": 11.99}, "shutdown")
        self.assertEqual(verified["status"], "PASS")
        for duration in (12, 30):
            with self.subTest(duration=duration):
                self.reject(output, {**self.result, "durationSeconds": duration}, tier="shutdown")

    def test_shutdown_cannot_pass_on_guest_markers_without_native_result(self):
        self.reject(complete_output("shutdown"), result={}, tier="shutdown")

    def test_exact_recovered_connect_is_never_clean_pass(self):
        diagnostic = "NETDIAG connect(pid=42 comm=curl fd=3) errno=65"
        for tier in ("auth-network", "packages", "agents", "claude-js", "claude-sdk", "codex-external", "gemini-acp", "gemini-runtime", "opencode-provider", "opencode-search", "opencode-preload-search", "opencode-inspect-preload-search", "opencode-stdio-trace", "opencode-compat-search", "opencode-shell-edges", "opencode-117-search", "opencode-1313-search", "opencode-legacy-provider"):
            with self.subTest(tier=tier):
                verified = verify(complete_output(tier), self.result, tier, diagnostic)
                self.assertEqual(verified["status"], "PASS_WITH_WARNINGS")
                self.assertEqual(len(verified["warnings"]), 1)
                self.assertIn(diagnostic, verified["warnings"][0])

    def test_connect_exception_does_not_apply_to_other_tiers(self):
        diagnostic = "NETDIAG connect(pid=42 comm=curl fd=3) errno=65"
        for tier in ("basic", "persistence", "shutdown"):
            with self.subTest(tier=tier), self.assertRaises(ProbeFailure):
                verify(complete_output(tier), self.result, tier, diagnostic)

    def test_recovered_connect_cannot_hide_failed_or_missing_checks(self):
        diagnostic = "NETDIAG connect(pid=42 comm=curl fd=3) errno=65"
        for output in (
            complete_output("packages").replace("https\tPASS", "https\tFAIL"),
            complete_output("packages").replace("BIBIMER_CHECK\thttps\tPASS\n", ""),
        ):
            with self.subTest(output=output), self.assertRaises(ProbeFailure):
                verify(output, self.result, "packages", diagnostic)

    def test_auth_connect_warning_requires_every_original_codex_tls_profile(self):
        output = complete_output("auth-network")
        diagnostic = "NETDIAG connect(pid=42 comm=curl fd=3) errno=65"
        rows = output.splitlines(keepends=True)
        native = next(line for line in rows if line.startswith("AUTH_NETWORK "))
        invalid = [output.replace('"httpResponseReceived": true', '"httpResponseReceived": false', 1),
                   output.replace('"panicked": false', '"panicked": true', 1),
                   output.replace('"exitCode": 1', '"exitCode": 0', 1),
                   output.replace(native, "", 1), native + output]
        for value in invalid:
            with self.subTest(evidence=value), self.assertRaises(ProbeFailure):
                verify(value, self.result, "auth-network", diagnostic)

    def test_bounded_process_name_with_spaces_is_preserved(self):
        diagnostic = "NETDIAG connect(pid=17 comm=npm install @an fd=31) errno=65"
        result = verify(complete_output("claude-sdk"), self.result, "claude-sdk", diagnostic)
        self.assertEqual(result["status"], "PASS_WITH_WARNINGS")
        self.assertIn(diagnostic, result["warnings"][0])
        for invalid in (diagnostic + " extra fault", diagnostic.replace("npm install @an", "a" * 17)):
            with self.assertRaises(ProbeFailure):
                verify(complete_output("claude-sdk"), self.result, "claude-sdk", invalid)

    def test_cli_connect_warning_requires_native_tool_check(self):
        diagnostic = "NETDIAG connect(pid=16 comm=libuv-worker fd=19) errno=65"
        for output in (complete_output("claude-js").replace("claude_js_runtime\tPASS", "claude_js_runtime\tFAIL"),
                       "BIBIMER_SUMMARY\tclaude-js\tPASS\t0\n"):
            with self.subTest(output=output), self.assertRaises(ProbeFailure):
                verify(output, self.result, "claude-js", diagnostic)
        with self.assertRaises(ProbeFailure):
            verify(complete_output("claude-js"), self.result, "claude-js", diagnostic + " SAFETY-VALVE")

    def test_opencode_connect_warning_requires_completed_original_tools(self):
        diagnostic = "NETDIAG connect(pid=16 comm=libuv-worker fd=19) errno=65"
        for tier, name in (("opencode-provider", "opencode_provider_runtime"),
                           ("opencode-search", "opencode_search_runtime"),
                           ("opencode-preload-search", "opencode_preload_search_runtime"),
                           ("opencode-inspect-preload-search", "opencode_inspect_preload_search_runtime"),
                           ("opencode-stdio-trace", "opencode_stdio_trace_runtime"),
                           ("opencode-compat-search", "opencode_compat_search_runtime"),
                           ("opencode-shell-edges", "opencode_shell_edges_runtime"),
                           ("opencode-117-search", "opencode_117_search_runtime"),
                           ("opencode-1313-search", "opencode_1313_search_runtime"),
                           ("opencode-legacy-provider", "opencode_legacy_provider_runtime")):
            with self.subTest(tier=tier), self.assertRaises(ProbeFailure):
                verify(complete_output(tier).replace(name + "\tPASS", name + "\tFAIL"),
                       self.result, tier, diagnostic)
            with self.subTest(tier=tier), self.assertRaises(ProbeFailure):
                verify(complete_output(tier), {**self.result, "exitCode": 1}, tier, diagnostic)
            with self.subTest(tier=tier), self.assertRaises(ProbeFailure):
                verify(complete_output(tier), self.result, tier, diagnostic + " V8_SIGABRT")

    def test_other_netdiag_and_extra_faults_remain_fatal(self):
        diagnostic = "NETDIAG connect(pid=42 comm=curl fd=3) errno=65"
        for console in (
            diagnostic.replace("errno=65", "errno=60"),
            "NETDIAG deadline exceeded",
            diagnostic + " deadline exceeded",
            diagnostic + " SAFETY-VALVE",
            diagnostic + "\nSAFETY-VALVE",
            diagnostic + "\nNETDIAG unexpected runtime state",
        ):
            with self.subTest(console=console), self.assertRaises(ProbeFailure):
                verify(complete_output("packages"), self.result, "packages", console)

    def test_stub_syscall_preserves_explicit_warning(self):
        diagnostic = "69(ffmpeg) stub syscall 236"
        verified = verify(complete_output("packages"), self.result, "packages", diagnostic)
        self.assertEqual(verified["status"], "PASS_WITH_WARNINGS")
        self.assertIn("unsupported syscall observed", verified["warnings"][0])
        self.assertIn(diagnostic, verified["warnings"][0])


if __name__ == "__main__":
    unittest.main()
