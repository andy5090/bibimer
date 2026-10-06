#!/usr/bin/env python3
"""Build a real Android APK on Termux using AAPT2, javac, D8 and apksigner."""
import base64
import zlib
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / ".tools"
BUILD = ROOT / "android" / "app" / "build"
SRC = ROOT / "android" / "app" / "src" / "main"
SDK_URL = "https://dl.google.com/android/repository/platform-36_r02.zip"
SDK_SHA1 = "2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576"
VENDORS = [
    ("https://registry.npmjs.org/marked/-/marked-15.0.12.tgz",
     "8dD6FusOQSrpv9Z1rdNMdlSgQOIP880DHqnohobOmYLElGEqAL/JvxvuxZO16r4HtjTlfPRDC1hbvxC9dPN2nA==",
     {"package/lib/marked.umd.js": "marked.js", "package/LICENSE.md": "marked-LICENSE.txt"}),
    ("https://registry.npmjs.org/@highlightjs/cdn-assets/-/cdn-assets-11.11.1.tgz",
     "VEPdHzwelZ12hEX18BHduqxMZGolcUsrbeokHYxOUIm8X2+M7nx5QPtPeQgRxR9XjhdLv4/7DD5BWOlSrJ3k7Q==",
     {"package/highlight.min.js": "highlight.js", "package/LICENSE": "highlight-LICENSE.txt"}),
    ("https://registry.npmjs.org/@xterm/xterm/-/xterm-5.5.0.tgz",
     "hqJHYaQb5OptNunnyAnkHyM8aCjZ1MEIDTQu1iIbbTD/xops91NB5yq1ZK/dC2JDbVWtF23zUtl9JE2NqwT87A==",
     {"package/lib/xterm.js": "xterm.js", "package/css/xterm.css": "xterm.css", "package/LICENSE": "xterm-LICENSE.txt"}),
    ("https://registry.npmjs.org/@xterm/addon-fit/-/addon-fit-0.10.0.tgz",
     "UFYkDm4HUahf2lnEyHvio51TNGiLK66mqP2JoATy7hRZeXaGMRDr00JiSF7m63vR5WKATF605yEggJKsw0JpMQ==",
     {"package/lib/addon-fit.js": "addon-fit.js", "package/LICENSE": "addon-fit-LICENSE.txt"}),
]


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True, cwd=ROOT)


def fetch(url, expected, algorithm):
    target = TOOLS / url.rsplit("/", 1)[-1]
    if not target.exists():
        print("다운로드:", target.name, flush=True)
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
    else:
        data = target.read_bytes()
    digest = hashlib.new(algorithm, data).digest()
    actual = base64.b64encode(digest).decode() if algorithm == "sha512" else digest.hex()
    if actual != expected:
        raise RuntimeError("도구 파일 체크섬 불일치: " + target.name)
    target.write_bytes(data)
    return data


def installer():
    source = (ROOT / "bridge" / "bibimer_bridge.py").read_bytes()
    encoded = base64.b64encode(zlib.compress(source, 9)).decode()
    digest = hashlib.sha256(source).hexdigest()
    adapters = {name: {"data": base64.b64encode(zlib.compress((ROOT / "bridge" / name).read_bytes(), 9)).decode(),
                       "sha256": hashlib.sha256((ROOT / "bridge" / name).read_bytes()).hexdigest()}
                for name in ("provider_opencode.py", "provider_claude.mjs", "repair_claude_termux.py")}
    # No token or account credentials are embedded in this distributable script.
    script = '''#!/data/data/com.termux/files/usr/bin/bash
set -eu
case "${BIBIMER_LANGUAGE:-en}" in ko) BIBIMER_LANGUAGE=ko ;; *) BIBIMER_LANGUAGE=en ;; esac
export BIBIMER_LANGUAGE
say() {
    if [ "$BIBIMER_LANGUAGE" = ko ]; then printf '%s\\n' "$2"; else printf '%s\\n' "$1"; fi
}
if [ ! -d /data/data/com.termux/files/usr ]; then
    say 'Run this setup file in Termux on Android.' '이 설정 파일은 Android의 Termux에서 실행해 주세요.'
    exit 1
fi
say 'Bibimer setup: prepare Python and install the bridge in your Termux home.' 'Bibimer 브리지 설치: Python을 준비하고 사용자 홈에 브리지를 설치합니다.'
if ! command -v python >/dev/null 2>&1; then
    pkg install -y python
fi
python - <<'BIBIMER_PYTHON'
import base64, hashlib, os, zlib
from pathlib import Path
is_korean = os.environ.get("BIBIMER_LANGUAGE") == "ko"
data = zlib.decompress(base64.b64decode("PAYLOAD"))
if hashlib.sha256(data).hexdigest() != "DIGEST":
    raise SystemExit("설정 파일이 손상되었습니다." if is_korean else "The setup file is damaged.")
folder = Path.home() / ".local" / "share" / "bibimer"
folder.mkdir(parents=True, exist_ok=True, mode=0o700)
target = folder / "bibimer_bridge.py"
temporary = folder / ".bibimer_bridge.py.new"
temporary.write_bytes(data)
temporary.chmod(0o700)
temporary.replace(target)
for name, entry in ADAPTER_PAYLOAD.items():
    content = zlib.decompress(base64.b64decode(entry["data"]))
    if hashlib.sha256(content).hexdigest() != entry["sha256"]:
        raise SystemExit("어댑터 설정 파일이 손상되었습니다." if is_korean else "The adapter setup file is damaged.")
    pending = folder / ("." + name + ".new")
    pending.write_bytes(content)
    pending.chmod(0o700)
    pending.replace(folder / name)
commands = Path.home() / ".local" / "bin"
commands.mkdir(parents=True, exist_ok=True)
launcher = commands / "bibimer-bridge"
launcher.write_text('#!/data/data/com.termux/files/usr/bin/sh\\nexec python "$HOME/.local/share/bibimer/bibimer_bridge.py" "$@"\\n')
launcher.chmod(0o700)
print("브리지 설치 완료" if is_korean else "Bridge installed")
BIBIMER_PYTHON
if [ "${BIBIMER_CLAUDE:-0}" = 1 ] || [ "${BIBIMER_CLAUDE_TERMUX:-0}" = 1 ]; then
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        pkg install -y nodejs-lts
    fi
    say 'Preparing the official Claude Agent SDK. A working Claude CLI is required separately.' '공식 Claude Agent SDK를 준비합니다. 실행 가능한 Claude CLI는 별도로 필요합니다.'
    npm install --prefix "$HOME/.local/share/bibimer/claude" --ignore-scripts --omit=optional --no-audit --no-fund @anthropic-ai/claude-agent-sdk@0.3.283
fi
if [ "${BIBIMER_CLAUDE_TERMUX:-0}" = 1 ]; then
    python "$HOME/.local/share/bibimer/repair_claude_termux.py"
fi
if [ "${BIBIMER_SKIP_START:-0}" != 1 ]; then
    "$HOME/.local/bin/bibimer-bridge" start
fi
'''.replace("ADAPTER_PAYLOAD", repr(adapters)).replace("PAYLOAD", encoded).replace("DIGEST", digest)
    (SRC / "assets" / "bibimer-setup.sh").write_text(script)
    (SRC / "assets" / "setup-connect.py").write_bytes((ROOT / "bridge" / "setup_connect.py").read_bytes())
    return script


def prepare_inputs():
    """Prepare the same pinned SDK, web assets and bridge for APK and AAB builds."""
    TOOLS.mkdir(exist_ok=True)
    vendor = SRC / "assets" / "vendor"
    vendor.mkdir(parents=True, exist_ok=True)
    android_jar = TOOLS / "android-36.jar"
    archive = fetch(SDK_URL, SDK_SHA1, "sha1")
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        member = next(name for name in bundle.namelist() if name.endswith("/android.jar"))
        android_jar.write_bytes(bundle.read(member))
    for url, checksum, entries in VENDORS:
        with tarfile.open(fileobj=io.BytesIO(fetch(url, checksum, "sha512")), mode="r:gz") as bundle:
            for member, filename in entries.items():
                (vendor / filename).write_bytes(bundle.extractfile(member).read())
    return android_jar, installer()


def compile_android(android_jar, build, proto=False):
    build.mkdir(parents=True, exist_ok=True)
    for directory in ("classes", "generated", "dex"):
        target = build / directory
        if target.exists():
            shutil.rmtree(target)
        target.mkdir()
    print("Android 리소스 및 Java 컴파일", flush=True)
    run("aapt2", "compile", "--dir", SRC / "res", "-o", build / "resources.zip")
    run("aapt2", "link", *(["--proto-format"] if proto else []),
        "-o", build / "unsigned.apk", "--manifest", SRC / "AndroidManifest.xml",
        "-I", android_jar, "--java", build / "generated", "-A", SRC / "assets",
        "--min-sdk-version", "26", "--target-sdk-version", "36", build / "resources.zip")
    sources = sorted((SRC / "java").rglob("*.java")) + sorted((build / "generated").rglob("*.java"))
    run("javac", "-encoding", "UTF-8", "--release", "8", "-classpath", android_jar,
        "-d", build / "classes", *sources)
    run("jar", "cf", build / "classes.jar", "-C", build / "classes", ".")
    run("d8", "--lib", android_jar, "--min-api", "26", "--output", build / "dex", build / "classes.jar")


def main():
    for tool in ("java", "javac", "jar", "keytool", "aapt2", "d8", "apksigner"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} 필요: pkg install openjdk-21 aapt2 d8 apksigner")
    android_jar, setup = prepare_inputs()
    compile_android(android_jar, BUILD)
    with zipfile.ZipFile(BUILD / "unsigned.apk", "a", compression=zipfile.ZIP_DEFLATED) as apk:
        for dex in sorted((BUILD / "dex").glob("*.dex")):
            apk.write(dex, dex.name)
    key = TOOLS / "bibimer-debug.keystore"
    if not key.exists():
        run("keytool", "-genkeypair", "-keystore", key, "-storepass", "android", "-keypass", "android",
            "-alias", "bibimerdebug", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
            "-dname", "CN=Bibimer Local Development")
        key.chmod(0o600)
    distribution = ROOT / "dist"
    distribution.mkdir(exist_ok=True)
    output = distribution / "bibimer-debug.apk"
    run("apksigner", "sign", "--ks", key, "--ks-pass", "pass:android", "--key-pass", "pass:android",
        "--out", output, BUILD / "unsigned.apk")
    run("apksigner", "verify", "--verbose", output)
    (distribution / "bibimer-setup.sh").write_text(setup)
    checksums = {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                 for path in (output, distribution / "bibimer-setup.sh")}
    (distribution / "checksums.json").write_text(json.dumps(checksums, indent=2) + "\n")
    print("완료:", output)


if __name__ == "__main__":
    main()
