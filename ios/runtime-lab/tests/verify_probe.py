#!/usr/bin/env python3
"""Verify captured guest output and the native app's completion record.

Usage: python3 verify_probe.py --tier basic --documents /path/to/app/Documents
This validates evidence; it does not itself execute or emulate guest commands.
"""

import argparse
import json
import math
import re
from pathlib import Path


EXPECTED_CHECKS = {
    "basic": {
        "architecture", "file_io", "pipes", "child_exit", "parallel_children",
        "proc", "dev", "persistence_write",
    },
    "packages": {
        "apk_install", "git_worktree", "https", "json", "python_subprocess",
        "python_pty", "python_signals", "node_subprocess_stream", "sqlite", "ffmpeg",
    },
    "agents": {
        "agent_prerequisites", "codex_install", "codex_version",
        "claude_install", "claude_version",
    },
    "agent-runtime": {"codex_runtime", "claude_runtime"},
    "claude-runtime": {"claude_runtime"},
    "claude-js": {"claude_js_runtime"},
    "codex-external": {"codex_external_runtime"},
    "kernel-runtime": {"parent_death_signal"},
    "bridge-pty": {"bridge_pty"},
    "node-network": {"node_network"},
    "node-wasm": {"node_wasm"},
    "extra-install": {"opencode_install", "opencode_version", "gemini_install", "gemini_version"},
    "extra-runtime": {"opencode_runtime", "gemini_runtime"},
    "gemini-acp": {"gemini_acp_runtime"},
    'bun-process': {'bun_process'},
    'bun-preload': {'bun_preload'},
    'bun-compiled-preload': {'bun_compiled_preload'},
    'bun-compiled-inspect': {'bun_compiled_preload'},
    'memory-fault': {'memory_fault'},
    'signal-stack': {'signal_stack'},
    'arm64-fp': {'arm64_fp'},
    'bun-math': {'bun_math'},
    'compute-signal': {'compute_signal'},
    'epoll-runtime': {'epoll_runtime'},
    'claude-sdk': {'claude_sdk_runtime'},
    'opencode-provider': {'opencode_provider_runtime'},
    'opencode-inspect': {'opencode_inspect'},
    'opencode-search': {'opencode_search_runtime'},
    'opencode-preload-search': {'opencode_preload_search_runtime'},
    'opencode-inspect-preload-search': {'opencode_inspect_preload_search_runtime'},
    'opencode-stdio-trace': {'opencode_stdio_trace_runtime'},
    'opencode-compat-search': {'opencode_compat_search_runtime'},
    'opencode-shell-edges': {'opencode_shell_edges_runtime'},
    'opencode-117-search': {'opencode_117_search_runtime'},
    'opencode-1313-search': {'opencode_1313_search_runtime'},
    'opencode-version': {'opencode_version'},
    'opencode-legacy': {'opencode_legacy_runtime'},
    'opencode-legacy-provider': {'opencode_legacy_provider_runtime'},
    'opencode-baseline': {'opencode_guest_baseline_runtime'},
    'opencode-jit': {'opencode_guest_jit_runtime'},
    'opencode-runtime': {'opencode_runtime'},
    'gemini-version': {'gemini_version'},
    'gemini-runtime': {'gemini_runtime'},
    "persistence": {"persistence_read"},
    "shutdown": {"shutdown_children_started"},
}


class ProbeFailure(ValueError):
    """The collected artifacts do not prove a completed, successful tier."""


FAULT_MARKER = re.compile(
    r"SAFETY[- ]VALVE|NETDIAG|\bassertion\b|EXC_BAD_ACCESS|EXC_CRASH|"
    r"V8_SIGSEGV|V8_SIGABRT|\bSIGSEGV\b|\bSIGABRT\b|segmentation fault|abort trap|"
    r"host crash|fatal error|uncaught exception|BIBIMER_RUNTIME_SHUTDOWN_INCOMPLETE",
    re.IGNORECASE,
)
RECOVERABLE_CONNECT = re.compile(
    r"NETDIAG connect\(pid=\d+ comm=[A-Za-z0-9_@./ +:\-]{1,16} fd=\d+\) errno=65"
)
STUB_SYSCALL = re.compile(r"\bstub syscall\b", re.IGNORECASE)


def verify(output, result, tier, host_console=""):
    if tier not in EXPECTED_CHECKS:
        raise ProbeFailure(f"Unknown tier: {tier}")
    if not isinstance(result, dict):
        raise ProbeFailure("Native result must be an object")
    if type(result.get("exitCode")) is not int or result["exitCode"] != 0:
        raise ProbeFailure(f"Native exit code is not zero: {result.get('exitCode')!r}")
    duration = result.get("durationSeconds")
    if type(duration) not in (float, int) or not math.isfinite(duration) or duration < 0:
        raise ProbeFailure("Native durationSeconds is missing or invalid")
    if tier == "shutdown" and duration >= 12:
        raise ProbeFailure("Shutdown exceeded 12 seconds; guest children were not promptly reaped")
    if "tier" in result and result["tier"] != tier:
        raise ProbeFailure("Native result tier does not match the requested tier")
    checks = {}
    summary = None
    for line in output.splitlines():
        if not line.startswith("BIBIMER_"):
            continue
        fields = line.split("\t")
        if fields[0] == "BIBIMER_CHECK" and len(fields) == 3:
            _, name, status = fields
            if summary is not None:
                raise ProbeFailure("Check appeared after completion summary")
            if name not in EXPECTED_CHECKS[tier]:
                raise ProbeFailure(f"Unexpected check: {name}")
            if name in checks:
                raise ProbeFailure(f"Duplicate check: {name}")
            if status not in {"PASS", "FAIL", "SKIP"}:
                raise ProbeFailure(f"Invalid check status: {status}")
            checks[name] = status
        elif fields[0] == "BIBIMER_SUMMARY" and len(fields) == 4:
            if summary is not None:
                raise ProbeFailure("Duplicate completion summary")
            summary = fields[1:]
        else:
            raise ProbeFailure(f"Malformed probe marker: {line!r}")

    missing = EXPECTED_CHECKS[tier] - checks.keys()
    if missing:
        raise ProbeFailure(f"Missing checks: {', '.join(sorted(missing))}")
    if summary != [tier, "PASS", str(len(checks))]:
        raise ProbeFailure(f"Missing or unsuccessful completion summary: {summary!r}")
    unsuccessful = {name: status for name, status in checks.items() if status != "PASS"}
    if unsuccessful:
        raise ProbeFailure(f"Required checks did not pass: {unsuccessful}")

    warnings = []
    for source, content in (("guest output", output), ("host console", host_console)):
        for line in content.splitlines():
            # A connect error may recover through client address fallback. Do
            # not infer an address family: only completed network/package tiers
            # with every required check PASS can downgrade this exact diagnostic.
            # Preserve it as a warning; never report this run as clean PASS.
            if tier in {"packages", "agents", "claude-js", "claude-sdk", "codex-external", "gemini-acp", "gemini-runtime", "opencode-provider", "opencode-search", "opencode-preload-search", "opencode-inspect-preload-search", "opencode-stdio-trace", "opencode-compat-search", "opencode-shell-edges", "opencode-117-search", "opencode-1313-search", "opencode-legacy-provider"} and RECOVERABLE_CONNECT.fullmatch(line):
                warnings.append(f"{source}: recovered connect diagnostic: {line}")
                continue
            fault = FAULT_MARKER.search(line)
            if fault:
                raise ProbeFailure(f"Runtime fault in {source}: {fault.group(0)}")
            if STUB_SYSCALL.search(line):
                warnings.append(f"{source}: unsupported syscall observed: {line}")
    return {
        "tier": tier, "checks": checks, "durationSeconds": duration,
        "status": "PASS_WITH_WARNINGS" if warnings else "PASS", "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tier", choices=EXPECTED_CHECKS, required=True)
    parser.add_argument("--documents", type=Path, required=True)
    args = parser.parse_args()
    try:
        output = (args.documents / "probe-output.txt").read_text(encoding="utf-8")
        result = json.loads((args.documents / "probe-result.json").read_text(encoding="utf-8"))
        host_path = args.documents / "host-console.txt"
        host_console = host_path.read_text(encoding="utf-8") if host_path.exists() else ""
        verified = verify(output, result, args.tier, host_console)
    except (OSError, UnicodeError, ValueError) as error:
        parser.exit(1, f"Probe verification FAILED: {error}\n")
    print(json.dumps(verified, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
