#!/usr/bin/env python3
"""Install a pinned official CLI beside Bibimer on an existing arm64 Termux/glibc setup."""
import argparse
import base64
import hashlib
import os
from pathlib import Path
import platform
import shlex
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

VERSION = "2.1.283"
URL = f"https://registry.npmjs.org/@anthropic-ai/claude-code-linux-arm64/-/claude-code-linux-arm64-{VERSION}.tgz"
INTEGRITY = "1hGh4eQHoxNJSfA/0/id5lXFdO5yRScwtUlBNMu1fPxUSwiFosLQjPDv/KdgfVZ3xjVtqJWPbjtKQ1TsxfpcDg=="
PREFIX = Path("/data/data/com.termux/files/usr")


def text(english, korean):
    return korean if os.environ.get("BIBIMER_LANGUAGE") == "ko" else english


def launcher(binary, prefix=PREFIX):
    quote = lambda value: shlex.quote(str(value))
    return (f"#!{prefix}/bin/sh\n"
            "# Bibimer-managed runtime; keep the user's CLI and credentials intact.\n"
            "unset LD_PRELOAD LD_LIBRARY_PATH\n"
            "export DISABLE_AUTOUPDATER=1\n"
            "export USE_BUILTIN_RIPGREP=0\n"
            f'export TMPDIR="${{TMPDIR:-{prefix}/tmp}}"\n'
            'export CLAUDE_CODE_TMPDIR="${CLAUDE_CODE_TMPDIR:-$TMPDIR}"\n'
            f"exec {quote(prefix / 'glibc/lib/ld-linux-aarch64.so.1')} "
            f"--library-path {quote(prefix / 'glibc/lib')} {quote(binary)} \"$@\"\n")


def install(target, archive=None):
    if platform.machine() not in {"aarch64", "arm64"} or not PREFIX.is_dir():
        raise RuntimeError(text("This repair requires arm64 Termux on Android.", "이 복구는 Android의 arm64 Termux에서만 사용할 수 있습니다."))
    if not (PREFIX / "glibc/lib/ld-linux-aarch64.so.1").is_file():
        raise RuntimeError(text("An existing Termux glibc runtime is required; see Bibimer docs/setup.md.", "Termux의 glibc 실행 환경이 먼저 필요합니다. Bibimer 설치 안내를 확인하세요."))
    if not shutil.which("rg"):
        raise RuntimeError(text("Install Termux ripgrep first: pkg install ripgrep", "Termux에서 ripgrep을 먼저 설치하세요: pkg install ripgrep"))
    target = target.expanduser().resolve()
    target.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(prefix=".repair-", dir=target) as temporary:
        folder = Path(temporary)
        package = folder / "package.tgz"
        if archive:
            shutil.copyfile(archive, package)
        else:
            with urllib.request.urlopen(URL, timeout=60) as response, package.open("wb") as output:
                shutil.copyfileobj(response, output)
        with package.open("rb") as source:
            digest = base64.b64encode(hashlib.file_digest(source, "sha512").digest()).decode()
        if digest != INTEGRITY:
            raise RuntimeError(text("Claude package integrity check failed.", "Claude 패키지 무결성 확인에 실패했습니다."))
        binary = folder / "claude-native"
        # Extract only the expected regular executable; never unpack arbitrary paths.
        with tarfile.open(package, "r:gz") as bundle:
            entry = bundle.getmember("package/claude")
            if not entry.isfile():
                raise RuntimeError(text("Claude package has no regular executable.", "Claude 패키지에 정상 실행 파일이 없습니다."))
            with bundle.extractfile(entry) as source, binary.open("wb") as output:
                shutil.copyfileobj(source, output)
        binary.chmod(0o700)
        probe = folder / "claude"
        probe.write_text(launcher(binary))
        probe.chmod(0o700)
        result = subprocess.run([str(probe), "--version"], stdin=subprocess.DEVNULL,
                                capture_output=True, text=True, timeout=20)
        if result.returncode or result.stdout.strip() != f"{VERSION} (Claude Code)":
            raise RuntimeError(text("Claude could not run on this device; the current launcher was kept.", "이 기기에서 Claude를 실행하지 못했습니다. 기존 실행 파일은 유지했습니다."))
        # Content-addressed binaries avoid replacing an executable still in use.
        with binary.open("rb") as source:
            identity = hashlib.file_digest(source, "sha256").hexdigest()[:16]
        installed = target / f"claude-{VERSION}-{identity}"
        if not installed.exists():
            binary.replace(installed)
        probe.write_text(launcher(installed))
        probe.replace(target / "claude")
    print(text(f"Claude {VERSION} runtime ready: {target / 'claude'}", f"Claude {VERSION} 실행 환경 준비 완료: {target / 'claude'}"))
    print(text("Bibimer uses this runtime when the default Claude command cannot run.", "기본 Claude 명령을 실행할 수 없을 때 Bibimer가 이 실행 환경을 사용합니다."))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path, default=Path.home() / ".local/share/bibimer/claude-runtime")
    parser.add_argument("--archive", type=Path, help="Previously downloaded official package (integrity checked)")
    args = parser.parse_args()
    try:
        install(args.target, args.archive)
    except (OSError, RuntimeError, subprocess.TimeoutExpired, tarfile.TarError, KeyError) as error:
        parser.exit(1, text("Claude repair failed: ", "Claude 복구 실패: ") + str(error) + "\n")


if __name__ == "__main__":
    main()
