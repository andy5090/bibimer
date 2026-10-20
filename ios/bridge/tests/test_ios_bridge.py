import base64
import contextlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import signal
import stat
import subprocess
import sys
import tempfile
import threading
import time
import tomllib
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[3]
IOS = ROOT / "ios/bridge"


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


entry = module("bibimer_ios_entry", IOS / "run.py")
provider = module("bibimer_ios_gemini", IOS / "provider_gemini.py")


def wait_for(predicate, timeout=5):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        value = predicate()
        if value:
            return value
        time.sleep(.01)
    raise AssertionError("Timed out waiting for explicit test condition")


class BootstrapTests(unittest.TestCase):
    def run_bootstrap(self, include_parser, missing_rg_only=False):
        # Relocate only the guest's absolute mount paths into a temporary test
        # filesystem. The actual script's guards, copy and startup order run.
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "opt/bibimer"
            (bundle / "runtime").mkdir(parents=True)
            (bundle / "ios").mkdir()
            (root / "etc").mkdir()
            (root / "etc/apk").mkdir()
            (root / "etc/alpine-release").write_text("3.21.0\n")
            source = bundle / "runtime/wasm-polyfill.js"
            if include_parser:
                source.write_text("// parser support fixture\n")
            executable = root / "bin"
            executable.mkdir()
            (executable / "python3").write_text("#!/bin/sh\nexec " + shlex.quote(sys.executable) + ' "$@"\n')
            (executable / "python3").chmod(0o700)
            # With npm intentionally missing, the setup branch must copy the
            # helper before even asking apk to prepare Node/npm.
            parser = root / "lib/wasm-polyfill.js"
            apk_marker, run_marker = root / "apk-started", root / "bridge-started"
            (executable / "apk").write_text("#!/bin/sh\n[ -f " + shlex.quote(str(parser)) + " ] || exit 43\nprintf '%s\\n' \"$@\" > " + shlex.quote(str(apk_marker)) + "\n")
            (executable / "apk").chmod(0o700)
            (bundle / "ios/run.py").write_text("from pathlib import Path\nimport os\nassert os.environ['SHELL'] == '/bin/bash'\nassert Path(" + repr(str(parser)) + ").read_text() == '// parser support fixture\\n'\nPath(" + repr(str(run_marker)) + ").write_text('ready')\n")
            script = (IOS / "bootstrap.sh").read_text()
            for before, after in [("/opt/bibimer", str(bundle)), ("/etc/alpine-release", str(root / "etc/alpine-release")),
                                  ("/etc/apk/repositories", str(root / "etc/apk/repositories")),
                                  ("/lib", str(root / "lib")), ("/root/", str(root / "root") + "/")]:
                script = script.replace(before, after)
            script = re.sub(r"^export PATH=.*$", "export PATH=" + shlex.quote(str(executable) + ":/usr/bin:/bin:/usr/sbin:/sbin"), script, flags=re.MULTILINE)
            if missing_rg_only:
                # Model an upgraded rootfs with all old prerequisites present.
                script = script.replace("set -eu\n", "set -eu\ncommand() { case \"$2\" in python3|npm|bash|git) return 0 ;; rg) return 1 ;; *) return 127 ;; esac; }\n", 1)
            path = root / "bootstrap.sh"
            path.write_text(script)
            result = subprocess.run(["/bin/sh", str(path)], env={**os.environ, "BIBIMER_TOKEN": "a" * 64, "BIBIMER_PORT": "51234"},
                                    capture_output=True, text=True, timeout=10)
            return {"code": result.returncode, "stderr": result.stderr, "apk": apk_marker.exists(), "started": run_marker.exists(),
                    "apk_args": apk_marker.read_text().splitlines() if apk_marker.exists() else [],
                    "parser": parser.read_text() if parser.exists() else None,
                    "mode": stat.S_IMODE(parser.stat().st_mode) if parser.exists() else None}

    def test_http_parser_is_copied_before_tool_setup_and_bridge(self):
        result = self.run_bootstrap(True)
        self.assertEqual(result["code"], 0, result["stderr"])
        self.assertTrue(result["apk"])
        self.assertTrue(result["started"])
        self.assertEqual(result["parser"], "// parser support fixture\n")
        self.assertEqual(result["mode"], 0o600)

    def test_missing_bundled_parser_stops_before_tools_or_bridge(self):
        result = self.run_bootstrap(False)
        self.assertNotEqual(result["code"], 0)
        self.assertIn("Missing bundled HTTP parser support", result["stderr"])
        self.assertFalse(result["apk"])
        self.assertFalse(result["started"])
        self.assertIsNone(result["parser"])

    def test_existing_rootfs_without_rg_installs_signed_alpine_ripgrep(self):
        result = self.run_bootstrap(True, missing_rg_only=True)
        self.assertEqual(result["code"], 0, result["stderr"])
        self.assertTrue(result["apk"])
        self.assertEqual(result["apk_args"][:2], ["add", "--no-cache"])
        self.assertIn("ripgrep", result["apk_args"])
        self.assertTrue(result["started"])


class StdioRetentionTests(unittest.TestCase):
    def test_diagnostic_trace_records_only_counts_without_changing_flow(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary).resolve()
            trace = folder / "stdio-trace.jsonl"
            loader = folder / "stdio-retention-trace.cjs"
            source = (IOS / "tests/stdio-retention-trace.cjs").read_text()
            source = source.replace("'/experimental-stdio-retention.cjs'", json.dumps(str(IOS / "experimental-stdio-retention.cjs")))
            source = source.replace("'/root/bibimer-probe/runtime-opencode-provider/stdio-trace.jsonl'", json.dumps(str(trace)))
            loader.write_text(source)
            script = '''
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const child = spawn(process.execPath, ['-e', 'process.stdout.write("PRIVATE_NATIVE_OUTPUT_8462");process.stderr.write("PRIVATE_NATIVE_ERROR_8462");process.exitCode=7', 'PRIVATE_COMMAND_ARGUMENT_8462'], {stdio:['ignore','pipe','pipe'],env:{...process.env,PRIVATE_CREDENTIAL_8462:'PRIVATE_ENV_VALUE_8462'}});
assert.equal(process.env.BUN_INSPECT_PRELOAD, undefined);
assert.notEqual(child.stdout,child.stdio[1]);
assert.equal(child.stdout.listenerCount('data'),0);
assert.equal(child.stdout.listenerCount('readable'),0);
assert.equal(child.stdio[1].listenerCount('data'),1);
const done = new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
const collect = async stream => {const chunks=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks).toString();};
(async()=>{const exit=await done;await new Promise(resolve=>setTimeout(resolve,25));assert.equal(exit.code,7);assert.equal(exit.signal,null);const [out,err]=await Promise.all([collect(child.stdout),collect(child.stderr)]);assert.equal(out,'PRIVATE_NATIVE_OUTPUT_8462');assert.equal(err,'PRIVATE_NATIVE_ERROR_8462');console.log('trace_host_ok');})().catch(error=>{console.error(error);process.exitCode=1;});
'''
            result = subprocess.run(["node", "--require", str(loader), "-e", script],
                                    env={**os.environ, "BUN_INSPECT_PRELOAD": str(loader)},
                                    capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "trace_host_ok")
            self.assertEqual(result.stderr, "")
            text = trace.read_text()
            self.assertNotIn("PRIVATE_", text)
            self.assertLessEqual(trace.stat().st_size, 128 * 1024)
            self.assertEqual(stat.S_IMODE(trace.stat().st_mode), 0o600)
            rows = [json.loads(line) for line in text.splitlines()]
            self.assertEqual(rows[0]["event"], "load")
            self.assertTrue(rows[0]["helperMarker"])
            spawns = [row for row in rows if row["event"] == "spawn"]
            self.assertEqual(len(spawns), 1)
            self.assertNotIn("/", spawns[0]["executable"])
            self.assertFalse(spawns[0]["stdoutEqualsStdio"])
            self.assertFalse(spawns[0]["stderrEqualsStdio"])
            for name, count in (("publicStdout", len("PRIVATE_NATIVE_OUTPUT_8462")),
                                ("publicStderr", len("PRIVATE_NATIVE_ERROR_8462"))):
                self.assertEqual(max(row.get(name, {}).get("returnedBytes", 0) for row in rows), count, name + ": " + text)
            closed = [row for row in rows if row["event"] == "child_close"]
            self.assertEqual(closed[0]["exitCode"], 7)
            for name in ("nativeStdout", "nativeStderr"):
                self.assertTrue(closed[0][name]["readWrapped"])
                self.assertGreater(closed[0][name]["readCalls"], 0)
            self.assertEqual(closed[0]["publicStdout"]["readableLength"], len("PRIVATE_NATIVE_OUTPUT_8462"))

    def test_compiled_inspect_preload_is_not_a_network_inspector(self):
        fixture = module("compiled_preload_environment_fixture", IOS / "tests/probe_bun_process.py")
        loader = Path("/isolated/compiled-loader.cjs")
        for profile, jit in (("interpreter", "0"), ("baseline", "1")):
            env = fixture.compiled_preload_environment(profile, loader, "inspect")
            self.assertEqual(env["BUN_INSPECT_PRELOAD"], str(loader))
            self.assertEqual(env["JSC_useJIT"], jit)
            self.assertNotIn("BUN_BE_BUN", env)
            self.assertNotIn("BUN_OPTIONS", env)
            self.assertNotIn("BUN_INSPECT", env)
            self.assertNotIn("BUN_INSPECT_CONNECT_TO", env)
        env = fixture.compiled_preload_environment("interpreter", loader, "options")
        self.assertEqual(env["BUN_OPTIONS"], "--preload " + str(loader))
        self.assertNotIn("BUN_INSPECT_PRELOAD", env)
        self.assertNotIn("BUN_BE_BUN", env)
        with self.assertRaises(ValueError):
            fixture.compiled_preload_environment("interpreter", loader, "arbitrary")

    def test_compiled_loader_sentinel_requires_actual_helper_and_marker(self):
        fixture = module("compiled_preload_loader_fixture", IOS / "tests/probe_bun_process.py")
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            wrong = folder / "wrong.cjs"
            wrong.write_text("// No marker: the loader must fail before the sentinel.\n")
            for helper, expected in ((IOS / "experimental-stdio-retention.cjs", True),
                                     (folder / "nonexistent.cjs", False), (wrong, False)):
                source = fixture.compiled_preload_loader(helper)
                self.assertNotIn(fixture.COMPILED_PRELOAD_SENTINEL, source)
                loader = folder / "loader.cjs"
                loader.write_text(source)
                result = subprocess.run(["node", "--require", str(loader), "-e", 'console.log("MAIN_MUST_NOT_RUN")'],
                                        capture_output=True, text=True, timeout=10)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(fixture.COMPILED_PRELOAD_SENTINEL in result.stderr, expected)
                self.assertNotIn("MAIN_MUST_NOT_RUN", result.stdout)

    def test_experimental_preload_preserves_late_real_bytes_and_process_semantics(self):
        for command, marker in ((["node", str(IOS / "tests/stdio_retention_regression.cjs"), "--control"],
                                 "STDIO_RETENTION_CONTROL late_subscriber_lost_native_bytes PASS"),
                                (["node", "--require", str(IOS / "experimental-stdio-retention.cjs"),
                                  str(IOS / "tests/stdio_retention_regression.cjs")],
                                 "STDIO_RETENTION_CHECK own_preload_suffix_only_and_no_child_inheritance PASS")):
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                       start_new_session=True, close_fds=True)
            try:
                stdout, stderr = process.communicate(timeout=20)
                self.assertEqual(process.returncode, 0, stderr)
                self.assertIn(marker, stdout)
            finally:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait(timeout=5)


class InstallerTests(unittest.TestCase):
    @contextlib.contextmanager
    def opencode_install_fixture(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            executable = root / "bin"
            executable.mkdir()
            calls = root / "calls.jsonl"
            logger = "import json,os,sys\nfrom pathlib import Path\ndef log(value):\n with open(" + repr(str(calls)) + ", 'a') as stream: stream.write(json.dumps(value)+'\\n')\n"
            npm = executable / "npm"
            npm.write_text("#!" + sys.executable + "\n" + logger + "log({'stage':'npm','args':sys.argv[1:]})\n")
            npm.chmod(0o700)
            cli = root / "root/.local/share/bibimer/agents/opencode/node_modules/opencode-linux-arm64-musl/bin/opencode"
            cli.parent.mkdir(parents=True)
            cli.write_text("#!" + sys.executable + "\n" + logger + "assert Path(__file__).name == 'opencode-ios' or Path(__file__).name.startswith('.opencode-ios-')\nvalue={'stage':'cli','filename':Path(__file__).name,'args':sys.argv[1:],'flags':{k:v for k,v in os.environ.items() if k.startswith(('JSC_','OPENCODE_'))},'bunOptions':os.environ.get('BUN_OPTIONS'),'inspectPreload':os.environ.get('BUN_INSPECT_PRELOAD'),'bunPreload':os.environ.get('BUN_PRELOAD')}\nlog(value)\nprint(json.dumps(value))\nif sys.argv[1:] == ['--version'] and os.environ.get('FAKE_VERSION_FAIL') == '1': sys.exit(29)\n")
            cli.chmod(0o700)
            patcher = root / "opencode_compat.py"
            patcher.write_text(logger + "import shutil\nassert len(sys.argv)==4 and sys.argv[2]=='--output'\nassert Path(sys.argv[1]).name=='opencode' and Path(sys.argv[3]).name.startswith('.opencode-ios-')\nlog({'stage':'patch'})\nif os.environ.get('FAKE_PATCH_FAIL')=='1': sys.exit(37)\nshutil.copy2(sys.argv[1],sys.argv[3])\n")
            source = (IOS / "install-agents.sh").read_text().replace("/root/", str(root / "root") + "/")
            source = source.replace("/opt/bibimer/ios/opencode_compat.py", str(patcher))
            source = re.sub(r"^export PATH=.*$", "export PATH=" + shlex.quote(str(executable) + ":/usr/bin:/bin:/usr/sbin:/sbin"), source, flags=re.MULTILINE)
            script = root / "install.sh"
            script.write_text(source)
            env = {k: v for k, v in os.environ.items() if not k.startswith(("JSC_", "OPENCODE_", "BUN_", "FAKE_"))}
            env["BUN_OPTIONS"] = "--smol --preload /user/owned-options.cjs  "
            yield root, script, env, calls

    def test_opencode_wrapper_keeps_pin_and_disables_only_unsupported_watcher(self):
        with self.opencode_install_fixture() as (root, script, env, calls):
            installed = subprocess.run(["/bin/sh", str(script), "opencode"], env=env, capture_output=True, text=True, timeout=10)
            self.assertEqual(installed.returncode, 0, installed.stderr)
            arguments = ["serve", "literal with spaces", "$(touch should-never-execute)"]
            wrapper = root / "root/.local/bin/opencode"
            launched = subprocess.run([str(wrapper), *arguments], env=env, capture_output=True, text=True, timeout=10)
            self.assertEqual(launched.returncode, 0, launched.stderr)
            result = json.loads(launched.stdout)
            self.assertEqual(result["args"], arguments)
            self.assertEqual(result["flags"], {"JSC_useJIT": "0", "OPENCODE_DISABLE_AUTOUPDATE": "true",
                                               "OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER": "true"})
            self.assertEqual(result["bunOptions"], env["BUN_OPTIONS"])
            self.assertIsNone(result["inspectPreload"])
            self.assertIsNone(result["bunPreload"])
            rows = [json.loads(line) for line in calls.read_text().splitlines()]
            self.assertEqual([row["stage"] for row in rows], ["npm", "patch", "cli", "cli"])
            self.assertIn("opencode-linux-arm64-musl@1.19.3", rows[0]["args"])
            self.assertIn("--ignore-scripts", rows[0]["args"])
            self.assertEqual(rows[2]["args"], ["--version"])
            self.assertTrue(rows[2]["filename"].startswith(".opencode-ios-"))
            self.assertEqual(rows[3]["filename"], "opencode-ios")
            self.assertEqual(rows[2]["flags"], result["flags"])
            self.assertEqual(rows[2]["bunOptions"], env["BUN_OPTIONS"])
            self.assertIsNone(rows[2]["inspectPreload"])
            self.assertNotIn("BUN_", wrapper.read_text())
            self.assertFalse((Path.cwd() / "should-never-execute").exists())

    def test_opencode_patch_or_version_failure_does_not_publish_public_wrapper(self):
        for failed_stage in ("PATCH", "VERSION"):
            with self.subTest(stage=failed_stage), self.opencode_install_fixture() as (root, script, env, calls):
                wrapper = root / "root/.local/bin/opencode"
                wrapper.parent.mkdir(parents=True)
                wrapper.write_bytes(b"existing wrapper must remain unchanged")
                retained = root / "root/.local/share/bibimer/agents/opencode/opencode-ios"
                retained.write_bytes(b"existing verified executable")
                env["FAKE_" + failed_stage + "_FAIL"] = "1"
                installed = subprocess.run(["/bin/sh", str(script), "opencode"], env=env, capture_output=True, text=True, timeout=10)
                self.assertNotEqual(installed.returncode, 0)
                self.assertEqual(wrapper.read_bytes(), b"existing wrapper must remain unchanged")
                self.assertEqual(list(wrapper.parent.glob(".bibimer-agent-*")), [])
                stages = [json.loads(line)["stage"] for line in calls.read_text().splitlines()]
                self.assertEqual(stages, ["npm", "patch"] if failed_stage == "PATCH" else ["npm", "patch", "cli"])
                self.assertEqual(retained.read_bytes(), b"existing verified executable")
                self.assertEqual(list(retained.parent.glob(".opencode-ios-*")), [])

    def test_opencode_product_fixture_removes_only_bypasses_and_preserves_baseline_trial(self):
        fixture = module("opencode_environment_fixture", IOS / "tests/probe_opencode_runtime.py")
        original = {"JSC_useJIT": "1", "JSC_useDFGJIT": "0", "JSC_useFTLJIT": "0", "JSC_useConcurrentJIT": "0",
                    "OPENCODE_DISABLE_FFF": "1", "OPENCODE_DISABLE_MODELS_FETCH": "1", "OPENCODE_DISABLE_TERMINAL_TITLE": "1",
                    "XDG_CONFIG_HOME": "/isolated/config"}
        stub = type("Fixture", (), {"environment": staticmethod(lambda agent, work: dict(original))})
        with patch.dict(os.environ, {"BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS": "1"}):
            result = fixture.probe_environment(stub, Path("/isolated/work"))
        self.assertTrue(all(result[key] == value for key, value in original.items() if not key.startswith("OPENCODE_DISABLE_")))
        for flag in ("OPENCODE_DISABLE_FFF", "OPENCODE_DISABLE_MODELS_FETCH", "OPENCODE_DISABLE_TERMINAL_TITLE"):
            self.assertNotIn(flag, result)
        self.assertEqual(result["OPENCODE_DISABLE_AUTOUPDATE"], "true")
        self.assertEqual(result["OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER"], "true")
        with patch.dict(os.environ, {"BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS": "0"}):
            result = fixture.probe_environment(stub, Path("/isolated/work"))
        self.assertEqual(result["OPENCODE_DISABLE_FFF"], "1")
        self.assertEqual(result["OPENCODE_DISABLE_MODELS_FETCH"], "1")
        self.assertEqual(result["OPENCODE_DISABLE_TERMINAL_TITLE"], "1")

    def test_opencode_search_fixture_requires_both_verified_native_tools(self):
        fixture = module("opencode_native_search_fixture", IOS / "tests/probe_opencode_runtime.py")
        server = type("Server", (), {})()
        with patch.dict(os.environ, {"BIBIMER_TEST_OPENCODE_SEARCH": "0"}):
            self.assertEqual(fixture.verified_search(server), {})
        with patch.dict(os.environ, {"BIBIMER_TEST_OPENCODE_SEARCH": "1"}):
            with self.assertRaisesRegex(RuntimeError, "native glob and grep"):
                fixture.verified_search(server)
            server.glob_seen, server.grep_seen = True, False
            with self.assertRaisesRegex(RuntimeError, "native glob and grep"):
                fixture.verified_search(server)
            server.grep_seen = True
            self.assertEqual(fixture.verified_search(server), {"nativeSearch": {"glob": True, "grep": True}})

    def test_opencode_trace_fixture_uses_only_the_fixed_isolated_loader(self):
        fixture = module("opencode_trace_environment_fixture", IOS / "tests/probe_opencode_runtime.py")
        stub = type("Fixture", (), {"BASE": Path("/root/bibimer-probe"),
                                   "environment": staticmethod(lambda agent, work: {"JSC_useJIT": "0"})})
        with patch.dict(os.environ, {"BIBIMER_TEST_OPENCODE_STDIO_TRACE": "1"}), patch.object(Path, "is_file", return_value=True):
            env = fixture.probe_environment(stub, stub.BASE / "runtime-opencode-provider")
            self.assertEqual(env["BUN_INSPECT_PRELOAD"], "/stdio-retention-trace.cjs")
            self.assertNotIn("BUN_OPTIONS", env)
            stub.BASE = Path("/arbitrary")
            with self.assertRaisesRegex(RuntimeError, "fixed original-CLI synthetic fixture"):
                fixture.probe_environment(stub, stub.BASE / "runtime-opencode-provider")

    def test_gemini_wrapper_uses_verified_guest_wasm_profile_and_literal_args(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            executable = root / "bin"
            executable.mkdir()
            log = root / "node-calls.jsonl"
            (executable / "npm").write_text("#!/bin/sh\nexit 0\n")
            (executable / "npm").chmod(0o700)
            (executable / "node").write_text("#!" + sys.executable + "\nimport json,os,sys\nwith open(" + repr(str(log)) + ",'a') as output: output.write(json.dumps({'args':sys.argv[1:],'skip':os.environ.get('ISH_NODE_NO_ARG_INJECTION'),'relaunch':os.environ.get('GEMINI_CLI_NO_RELAUNCH')})+'\\n')\nprint('0.64.0')\n")
            (executable / "node").chmod(0o700)
            cli = root / "root/.local/share/bibimer/agents/gemini/node_modules/.bin/gemini"
            cli.parent.mkdir(parents=True)
            cli.write_text("// Original package entrypoint fixture\n")
            source = (IOS / "install-agents.sh").read_text().replace("/root/", str(root / "root") + "/")
            source = re.sub(r"^export PATH=.*$", "export PATH=" + shlex.quote(str(executable) + ":/usr/bin:/bin:/usr/sbin:/sbin"), source, flags=re.MULTILINE)
            script = root / "install.sh"
            script.write_text(source)
            installed = subprocess.run(["/bin/sh", str(script), "gemini"], capture_output=True, text=True, timeout=10)
            self.assertEqual(installed.returncode, 0, installed.stderr)
            wrapper = root / "root/.local/bin/gemini"
            arguments = ["--experimental-acp", "literal with spaces", "$(touch should-never-execute)"]
            launched = subprocess.run([str(wrapper), *arguments], env={**os.environ, "PATH": str(executable) + os.pathsep + os.environ.get("PATH", "")}, capture_output=True, text=True, timeout=10)
            self.assertEqual(launched.returncode, 0, launched.stderr)
            calls = [json.loads(line) for line in log.read_text().splitlines()]
            expected = ["--no-opt", "--no-sparkplug", "--single-threaded", "--no-wasm-tier-up", "--liftoff-only", "--no-lazy", "--max-old-space-size=512", str(cli)]
            self.assertEqual(len(calls), 2)
            self.assertEqual(calls[0]["args"], expected + ["--version"])
            self.assertEqual(calls[1]["args"], expected + arguments)
            self.assertTrue(all(call["skip"] == "1" and call["relaunch"] == "1" for call in calls))
            self.assertFalse((Path.cwd() / "should-never-execute").exists())


class ClaudeReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name).resolve()
        self.state = self.folder / "state"
        self.state.mkdir(mode=0o700)
        self.base = entry.load_bridge(ROOT / "bridge/bibimer_bridge.py")
        prefix = self.folder / ".local/share/bibimer/agents/claude/node_modules"
        package = prefix / "@anthropic-ai/claude-code"
        package.mkdir(parents=True)
        self.cli = package / "cli.js"
        self.cli.write_text("#!" + sys.executable + "\nprint('2.1.112 (Claude Code)')\n")
        self.cli.chmod(0o700)
        (package / "package.json").write_text(json.dumps({"version": "2.1.112"}))
        (prefix / ".bin").mkdir()
        launcher = prefix / ".bin/claude"
        launcher.symlink_to(self.cli)
        sdk = self.folder / ".local/share/bibimer/claude/node_modules/@anthropic-ai/claude-agent-sdk"
        sdk.mkdir(parents=True)
        (sdk / "sdk.mjs").write_text("// SDK fixture\n")
        self.sdk_package = sdk / "package.json"
        self.sdk_package.write_text(json.dumps({"version": "0.2.112"}))
        self.wrapper = self.folder / ".local/bin/claude"
        self.wrapper.parent.mkdir()
        self.wrapper.write_text('#!/bin/sh\nexec "' + str(launcher) + '" "$@"\n')
        self.wrapper.chmod(0o700)

    def tearDown(self):
        self.temp.cleanup()

    def test_receipt_requires_real_version_and_rejects_changed_installation(self):
        self.assertFalse(entry.claude_installation_ready(self.base, self.state, self.wrapper, self.folder))
        entry.record_claude_installation(self.state, self.folder)
        with patch.object(entry.subprocess, "run", side_effect=AssertionError("health must not execute the CLI")):
            self.assertTrue(entry.claude_installation_ready(self.base, self.state, self.wrapper, self.folder))
        receipt = json.loads((self.state / "agents/claude.json").read_text())
        self.assertNotIn("authenticated", receipt)
        self.assertNotIn("model_access", receipt)
        self.cli.write_text(self.cli.read_text() + "# changed\n")
        self.assertFalse(entry.claude_installation_ready(self.base, self.state, self.wrapper, self.folder))

    def test_wrong_version_and_sdk_never_become_ready(self):
        self.cli.write_text("#!" + sys.executable + "\nprint('wrong version')\n")
        with self.assertRaisesRegex(RuntimeError, "version execution did not succeed"):
            entry.record_claude_installation(self.state, self.folder)
        self.assertFalse((self.state / "agents/claude.json").exists())
        self.sdk_package.write_text(json.dumps({"version": "0.3.283"}))
        self.assertFalse(entry.claude_installation_ready(self.base, self.state, self.wrapper, self.folder))

    def test_managed_claude_health_uses_receipt_without_slow_subprocess(self):
        entry.record_claude_installation(self.state, self.folder)
        base = entry.adapt(self.base)
        bridge = base.Bridge(self.state)
        try:
            with patch.object(entry.Path, "home", return_value=self.folder), patch.object(base.shutil, "which", side_effect=lambda name: str(self.wrapper) if name == "claude" else "/usr/bin/node" if name == "node" else None), patch.object(entry.subprocess, "run", side_effect=AssertionError("health must not spawn --version")):
                claude = next(row for row in bridge.agents() if row["id"] == "claude")
                self.assertTrue(claude["available"])
                self.assertIn("chat", claude["modes"])
        finally:
            bridge.linked_files.close()
            bridge.github.close()
            bridge.worktree_creation.close()


class GeminiTests(unittest.TestCase):
    def test_guest_permission_fixture_uses_native_toml_without_core_autoallow(self):
        fixture = module("gemini_fixture_policy", IOS / "tests/probe_gemini_runtime.py")
        with tempfile.TemporaryDirectory() as folder:
            config = Path(folder) / ".gemini"
            fixture.configure_native_policy(config)
            settings = json.loads((config / "settings.json").read_text())
            self.assertNotIn("tools", settings)
            self.assertEqual(settings["policyPaths"], [str(config / "fixture-permissions.toml")])
            rules = tomllib.loads((config / "fixture-permissions.toml").read_text())["rule"]
            self.assertEqual(rules, [
                {"toolName": "*", "decision": "deny", "priority": 50},
                {"toolName": "read_file", "decision": "allow", "priority": 100},
                {"toolName": "write_file", "decision": "ask_user", "priority": 100}])

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name)
        self.cwd = Path.cwd()
        os.chdir(self.folder)
        self.peer = IOS / "tests/fake_gemini.py"
        self.peer.chmod(0o700)
        self.adapter = provider.Adapter(str(self.peer))
        self.events = []
        self.adapter.emit = self.events.append
        self.assertEqual(self.adapter.call("initialize", {}), {"capabilities": {"steer": False}})
        self.thread = self.adapter.call("thread/start", {})["thread"]["id"]

    def tearDown(self):
        self.adapter.close()
        os.chdir(self.cwd)
        self.temp.cleanup()

    def start(self, text):
        self.adapter.handle({"id": 10, "method": "turn/start", "params": {"threadId": self.thread,
            "input": [{"type": "text", "text": text}], "bibimerOptions": {"permission": "inherit"}}})

    def completed(self):
        return wait_for(lambda: next((row for row in self.events if row.get("method") == "turn/completed"), None))

    def test_explicit_completion_streaming_and_no_thought_leak(self):
        self.start("hello")
        self.assertEqual(self.completed()["params"]["turn"]["status"], "completed")
        self.assertNotIn("PRIVATE-THOUGHT", json.dumps(self.events))
        answer = [row for row in self.events if row.get("method") == "item/completed" and row["params"]["item"]["type"] == "agentMessage"]
        self.assertEqual(answer[-1]["params"]["item"]["text"], "hello world")
        self.assertEqual(self.events[0]["id"], 10, "acceptance must precede worker events")

    def test_token_limit_is_failed_not_success(self):
        self.start("limit")
        self.assertEqual(self.completed()["params"]["turn"]["status"], "failed")

    def test_permission_not_autoapproved_and_accept_once(self):
        self.start("approval")
        request = wait_for(lambda: next((row for row in self.events if row.get("method") == "item/fileChange/requestApproval"), None))
        self.assertFalse((self.folder / "approved.txt").exists())
        self.assertEqual(request["params"]["availableDecisions"], ["accept", "decline"])
        self.adapter.respond({"id": request["id"], "result": {"decision": "accept"}})
        self.assertEqual(self.completed()["params"]["turn"]["status"], "completed")
        self.assertEqual((self.folder / "approved.txt").read_text(), "explicitly approved")

    def test_decline_preserves_files(self):
        self.start("approval")
        request = wait_for(lambda: next((row for row in self.events if row.get("method") == "item/fileChange/requestApproval"), None))
        self.adapter.respond({"id": request["id"], "result": {"decision": "decline"}})
        self.completed()
        self.assertFalse((self.folder / "approved.txt").exists())

    def test_cancel_requires_native_cancelled_response(self):
        self.start("wait")
        # The fake peer only completes after seeing ACP's cancellation notification.
        time.sleep(.05)
        self.assertFalse(any(row.get("method") == "turn/completed" for row in self.events))
        self.adapter.call("turn/interrupt", {"threadId": self.thread, "turnId": self.adapter.turn})
        self.assertEqual(self.completed()["params"]["turn"]["status"], "interrupted")

    def test_catalog_is_native_and_history_is_explicitly_unsupported(self):
        rows = self.adapter.call("model/list", {})["data"]
        self.assertEqual(rows[0]["id"], "fixture-model")
        self.assertEqual(rows[0]["supportedReasoningEfforts"], [])
        with self.assertRaisesRegex(RuntimeError, "error_history_unsupported"):
            self.adapter.call("thread/list", {})


class BridgeTests(unittest.TestCase):
    def setUp(self):
        (IOS / "tests/fake_gemini.py").chmod(0o700)
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name)
        self.base = entry.adapt(entry.load_bridge(ROOT / "bridge/bibimer_bridge.py"))
        self.bridge = self.base.Bridge(self.folder / "state")
        self.project = self.bridge.register({"path": str(self.folder), "create": False})
        self.server = self.base.Server(("127.0.0.1", 0), self.bridge)
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        for session in self.bridge.sessions.values():
            session.stop()
            session.process.wait(timeout=5)
        self.bridge.linked_files.close()
        self.bridge.github.close()
        self.bridge.worktree_creation.close()
        self.temp.cleanup()

    def request(self, body, token=None, origin=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        headers = {"Content-Type": "application/json"}
        if token is not None:
            headers["Authorization"] = "Bearer " + token
        if origin:
            headers["Origin"] = origin
        connection.request("POST", "/v1/ios/agents", json.dumps(body), headers)
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_native_setup_endpoint_auth_origin_and_fixed_action_validation(self):
        data = {"action": "version", "agent": "gemini", "project_id": self.project["id"], "request_id": str(uuid.uuid4())}
        self.assertEqual(self.request(data)[0], 401)
        self.assertEqual(self.request(data, self.bridge.token, "https://evil.invalid")[0], 403)
        self.assertEqual(self.request(dict(data, agent="gemini; touch bad"), self.bridge.token)[0], 400)
        self.assertEqual(self.request(dict(data, action="exec"), self.bridge.token)[0], 400)

    def test_version_action_real_pty_and_idempotency(self):
        fixture = IOS / "tests/fake_gemini.py"
        with patch.object(self.bridge, "agent_executable", return_value=str(fixture)):
            data = {"action": "version", "agent": "gemini", "project_id": self.project["id"], "request_id": str(uuid.uuid4())}
            status, first = self.request(data, self.bridge.token)
            self.assertEqual(status, 200)
            second = self.request(data, self.bridge.token)[1]
            self.assertEqual(first["session"]["id"], second["session"]["id"])
            session = self.bridge.get_session(first["session"]["id"])
            wait_for(lambda: session.state == "exited")
            output = self.bridge.session_events(session.id, 0, 0)
            self.assertIn(b"fixture-gemini", base64.b64decode(output["data"]))
            self.assertEqual(session.exit_code, 0)
            self.assertEqual(first["session"]["mode"], "terminal")
            self.assertEqual(first["session"]["setup_action"], {"action": "version", "agent": "gemini"})
            self.assertEqual(self.request(dict(data, action="login"), self.bridge.token)[0], 409)

    def test_gemini_chat_uses_native_adapter_and_capability_flags(self):
        rows = self.bridge.agents()
        gemini = next(row for row in rows if row["id"] == "gemini")
        self.assertEqual(gemini["modes"], ["terminal", "chat"])
        self.assertFalse(gemini["capabilities"]["history"])
        self.assertFalse(gemini["capabilities"]["steer"])
        command = self.base.provider_command("/usr/bin/gemini", "gemini")
        self.assertEqual(command[1:], [str(IOS / "provider_gemini.py"), "/usr/bin/gemini"])

    def test_ios_claude_steer_is_not_advertised(self):
        target = entry.prepare_claude_provider(self.folder, ROOT / "bridge/provider_claude.mjs")
        text = target.read_text()
        self.assertIn("capabilities:{steer:false}", text)
        self.assertNotIn("capabilities:{steer:true}", text)
        original = (ROOT / "bridge/provider_claude.mjs").read_text()
        self.assertEqual(text.replace("capabilities:{steer:false}", "capabilities:{steer:true}"), original)
        self.assertNotIn("claude_steer", self.bridge.health()["features"])

    def test_ios_opencode_clone_extends_only_bounded_observation_deadlines(self):
        source = ROOT / "bridge/provider_opencode.py"
        target = entry.prepare_opencode_provider(self.folder, source)
        original = source.read_text()
        changed_text = target.read_text()
        self.assertEqual(changed_text.count("timeout=observation_timeout()"), 4)
        self.assertIn("return max(5, observation_deadline - time.monotonic())", changed_text)
        self.assertIn("observation_turn, observation_deadline = turn, time.monotonic() + 180", changed_text)
        recovered = changed_text.replace("time.monotonic() + 120", "time.monotonic() + 7")
        recovered = recovered.replace("        observation_turn, observation_deadline = None, 0\n", "")
        recovered = recovered.replace("                if turn != observation_turn:\n                    observation_turn, observation_deadline = turn, time.monotonic() + 180\n                def observation_timeout():\n                    return max(5, observation_deadline - time.monotonic())\n", "")
        recovered = recovered.replace("timeout=observation_timeout(), limit=50", "limit=50").replace(", timeout=observation_timeout()", "")
        self.assertEqual(recovered, original)
        fixture = module("opencode_fixture_source", IOS / "tests/probe_opencode_runtime.py")
        self.assertEqual(fixture.opencode_provider_source(original), changed_text)
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)
        base = entry.adapt(entry.load_bridge(ROOT / "bridge/bibimer_bridge.py"), opencode_provider=target)
        self.assertEqual(base.provider_command("/usr/bin/opencode", "opencode")[1], str(target))
        changed = self.folder / "changed-provider.py"
        changed.write_text(original + "\n# time.monotonic() + 7\n")
        with self.assertRaisesRegex(RuntimeError, "startup contract changed"):
            entry.prepare_opencode_provider(self.folder, changed)

    def test_opencode_cold_observation_budget_expires_without_reset_on_retry(self):
        target = entry.prepare_opencode_provider(self.folder, ROOT / "bridge/provider_opencode.py")
        adapter_module = module("opencode_budget_test", target)
        adapter = adapter_module.Adapter.__new__(adapter_module.Adapter)
        adapter.closed = type("Closed", (), {"wait": lambda _self, _: next(waits)})()
        adapter.process = type("Process", (), {"poll": lambda _: None})()
        adapter.lock = threading.RLock()
        adapter.turn, adapter.thread = "turn", "ses_test"
        waits = iter([False, False, True])
        calls = []
        def http(*args, **kwargs):
            calls.append(kwargs["timeout"])
            raise TimeoutError("synthetic cold server")
        adapter.http = http
        with patch.object(adapter_module.time, "monotonic", side_effect=[100, 100, 281]):
            adapter.monitor()
        self.assertEqual(calls, [180, 5])

    def test_codex_app_sandbox_is_explicit_chat_only_and_not_a_linux_mode_alias(self):
        self.assertEqual(self.base.agent_options("codex")["permission"], "inherit")
        for permission in ("read-only", "workspace-write"):
            with self.assertRaises(self.base.Problem) as error:
                self.bridge.launch({"agent": "codex", "mode": "chat", "options": {"permission": permission}})
            self.assertEqual(error.exception.code, "error_ios_codex_sandbox")
        with self.assertRaises(self.base.Problem) as error:
            self.bridge.launch({"agent": "codex", "mode": "terminal", "options": {"permission": "app-sandbox"}})
        self.assertEqual(error.exception.code, "error_ios_codex_terminal_policy")
        self.assertNotIn("sandbox", self.base._ios_codex_initial_options({"permission": "inherit"}))

    def test_codex_app_sandbox_thread_turn_options_and_persistence(self):
        fixture = IOS / "tests/fake_codex_ios.py"
        fixture.chmod(0o700)
        with patch.object(self.bridge, "agent_executable", return_value=str(fixture)):
            snapshot = self.bridge.launch({"project_id": self.project["id"], "agent": "codex", "mode": "chat",
                "request_id": str(uuid.uuid4()), "new_session": True, "options": {"permission": "app-sandbox"}})
        session = self.bridge.get_session(snapshot["id"])
        wait_for(lambda: session.snapshot()["ready"])
        requests = self.folder / "codex-requests.jsonl"
        thread = json.loads(requests.read_text().splitlines()[0])["params"]
        self.assertEqual(thread["sandbox"], "read-only")
        self.assertEqual(thread["approvalPolicy"], "on-request")
        self.assertEqual(thread["approvalsReviewer"], "user")
        session.message({"text": "fixture policy", "request_id": str(uuid.uuid4())})
        wait_for(lambda: any(item.get("kind") == "turn" for item in session.events(0, 0)["items"]))
        turn = [json.loads(line)["params"] for line in requests.read_text().splitlines() if json.loads(line)["method"] == "turn/start"][0]
        self.assertEqual(turn["sandboxPolicy"], {"type": "externalSandbox", "networkAccess": "enabled"})
        self.assertEqual(turn["approvalPolicy"], "on-request")
        self.assertEqual(turn["approvalsReviewer"], "user")
        session.configure({"request_id": str(uuid.uuid4()), "options": {"permission": "inherit"}})
        self.assertEqual(session.snapshot()["options"]["permission"], "inherit")
        session.configure({"request_id": str(uuid.uuid4()), "options": {"permission": "app-sandbox"}})
        saved = json.loads((self.folder / "state/metadata.json").read_text())
        self.assertEqual(saved["sessions"][0]["options"]["permission"], "app-sandbox")
        with self.assertRaises(self.base.Problem) as error:
            session.configure({"request_id": str(uuid.uuid4()), "options": {"permission": "workspace-write"}})
        self.assertEqual(error.exception.code, "error_ios_codex_sandbox")
        self.assertEqual(session.snapshot()["options"]["permission"], "app-sandbox")

    def test_gemini_bridge_chat_session_structured_completion(self):
        fixture = IOS / "tests/fake_gemini.py"
        with patch.object(self.bridge, "agent_executable", return_value=str(fixture)):
            snapshot = self.bridge.launch({"project_id": self.project["id"], "agent": "gemini", "mode": "chat",
                "request_id": str(uuid.uuid4()), "new_session": True})
        session = self.bridge.get_session(snapshot["id"])
        wait_for(lambda: session.snapshot()["ready"])
        self.assertFalse(session.snapshot()["history_persisted"])
        self.assertFalse(session.snapshot()["can_steer"])
        session.message({"text": "hello", "request_id": str(uuid.uuid4())})
        wait_for(lambda: any(item.get("kind") == "turn" and item.get("status") == "completed" for item in session.events(0, 0)["items"]))
        events = session.events(0, 0)
        self.assertTrue(any(item.get("kind") == "assistant" and item.get("text") == "hello world" for item in events["items"]))
        self.assertNotIn("PRIVATE-THOUGHT", json.dumps(events))
        self.assertEqual(len(self.bridge.completions(self.bridge.instance, 0, 0)["events"]), 1)

    def test_gemini_catalog_uses_bounded_readonly_native_metadata(self):
        fixture = IOS / "tests/fake_gemini.py"
        with patch.object(self.bridge, "agent_executable", return_value=str(fixture)):
            catalog = self.bridge.models({"project_id": self.project["id"], "agent": "gemini"})
        self.assertEqual(catalog["models"][0]["id"], "fixture-model")
        self.assertEqual(catalog["models"][0]["efforts"], [])
        self.assertFalse((self.folder / "approved.txt").exists())

    def test_explicit_setup_can_create_first_project(self):
        self.bridge.projects = {}
        self.bridge.active_project_id = None
        fixture = IOS / "tests/fake_gemini.py"
        with patch.object(self.bridge, "agent_executable", return_value=str(fixture)), patch.object(entry.Path, "home", return_value=self.folder):
            result = self.bridge.agent_action({"agent": "gemini", "action": "version", "project_id": None, "request_id": str(uuid.uuid4())})
        self.assertEqual(result["session"]["project"]["path"], str((self.folder / "projects").resolve()))
        self.assertTrue((self.folder / "projects").is_dir())


if __name__ == "__main__":
    unittest.main()
