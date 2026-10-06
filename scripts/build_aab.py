#!/usr/bin/env python3
"""Prepare Google Play bundles on Termux; never creates keys or uploads releases."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

import build_apk as apk

BUNDLETOOL_VERSION = "1.18.3"
BUNDLETOOL_URL = ("https://github.com/google/bundletool/releases/download/"
                  f"{BUNDLETOOL_VERSION}/bundletool-all-{BUNDLETOOL_VERSION}.jar")
# Digest published on the official GitHub release asset.
BUNDLETOOL_SHA256 = "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29"
# Both languages must remain available after a Play install, irrespective of OS locale.
BUNDLE_CONFIG = {"optimizations": {"splitsConfig": {"splitDimension": [
    {"value": "LANGUAGE", "negate": True}
]}}}
ANDROID = "{http://schemas.android.com/apk/res/android}"


def manifest_info():
    root = ET.parse(apk.SRC / "AndroidManifest.xml").getroot()
    sdk, application = root.find("uses-sdk"), root.find("application")
    info = {"package": root.get("package"), "versionName": root.get(ANDROID + "versionName"),
            "versionCode": int(root.get(ANDROID + "versionCode")),
            "minSdk": int(sdk.get(ANDROID + "minSdkVersion")),
            "targetSdk": int(sdk.get(ANDROID + "targetSdkVersion"))}
    if info["package"] != "app.bibimer" or not 0 < info["versionCode"] <= 2100000000:
        raise ValueError("패키지 이름 또는 versionCode를 확인하세요.")
    if info["minSdk"] != 26 or info["targetSdk"] != 36:
        raise ValueError("Manifest와 공통 컴파일러의 SDK 설정(26/36)을 함께 갱신하세요.")
    if application.get(ANDROID + "debuggable", "false") != "false":
        raise ValueError("출시 AAB는 debuggable 앱을 허용하지 않습니다.")
    return info


def signing_config():
    names = ("BIBIMER_UPLOAD_KEYSTORE", "BIBIMER_UPLOAD_ALIAS", "BIBIMER_STORE_PASSWORD")
    if any(not os.environ.get(name) for name in names):
        raise ValueError("출시 서명에 필요한 환경 변수: " + ", ".join(names))
    key = Path(os.environ[names[0]]).expanduser().resolve()
    if not key.is_file() or key.is_relative_to(apk.ROOT):
        raise ValueError("업로드 키는 저장소 밖의 기존 파일을 지정하세요.")
    if key.stat().st_mode & 0o077:
        raise ValueError("업로드 키의 다른 사용자 접근 권한을 제거하세요(chmod 600).")
    alias = os.environ[names[1]]
    result = subprocess.run([
        "keytool", "-J-Duser.language=en", "-list", "-v", "-keystore", str(key),
        "-alias", alias, "-storepass:env", "BIBIMER_STORE_PASSWORD"
    ], capture_output=True, text=True)
    # Do not echo tool output: configuration failures may include private paths.
    if result.returncode or "PrivateKeyEntry" not in result.stdout:
        raise ValueError("업로드 키·별칭·암호를 확인하세요. 키 도구 출력은 기록하지 않습니다.")
    if any(label in result.stdout.lower() for label in ("android debug", "bibimer local development")):
        raise ValueError("개발 인증서로 Play 출시 파일을 서명할 수 없습니다.")
    return key, alias


def pack_module(resources, dex_dir, output):
    with zipfile.ZipFile(resources) as source:
        names = source.namelist()
        if "AndroidManifest.xml" not in names or "resources.pb" not in names or "resources.arsc" in names:
            raise ValueError("AAB에는 AAPT2 --proto-format 출력이 필요합니다.")
        dex_files = sorted(dex_dir.glob("*.dex"))
        if not dex_files or not (dex_dir / "classes.dex").is_file():
            raise ValueError("컴파일된 classes.dex가 없습니다.")
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as target:
            for entry in source.infolist():
                if entry.is_dir():
                    continue
                name = entry.filename
                if name == "AndroidManifest.xml":
                    name = "manifest/AndroidManifest.xml"
                elif name != "resources.pb" and not name.startswith(("res/", "assets/", "lib/")):
                    raise ValueError("모듈에 예상하지 못한 항목이 있습니다: " + name)
                target.writestr(name, source.read(entry))
            for dex in dex_files:
                target.write(dex, "dex/" + dex.name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="설정만 확인, 다운로드·컴파일·서명 없음")
    parser.add_argument("--unsigned", action="store_true", help="검증용 미서명 AAB (Play 제출 불가)")
    args = parser.parse_args()
    required = ["java", "javac", "jar", "aapt2", "d8"]
    if not args.unsigned:
        required += ["keytool", "jarsigner"]
    for command in required:
        if not shutil.which(command):
            raise ValueError("빌드 도구가 없습니다: " + command)
    info = manifest_info()
    signing = None if args.unsigned else signing_config()
    if args.check:
        print(json.dumps({**info, "mode": "unsigned" if args.unsigned else "signed",
                          "configuration": "ok", "bundleBuilt": False}, ensure_ascii=False, indent=2))
        return

    android_jar, setup = apk.prepare_inputs()
    apk.fetch(BUNDLETOOL_URL, BUNDLETOOL_SHA256, "sha256")
    tool = apk.TOOLS / BUNDLETOOL_URL.rsplit("/", 1)[-1]
    distribution = apk.ROOT / "dist" / "play"
    distribution.mkdir(parents=True, exist_ok=True)
    apk.BUILD.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="aab-", dir=apk.BUILD) as folder:
        build = Path(folder)
        apk.compile_android(android_jar, build, proto=True)
        module = build / "base.zip"
        pack_module(build / "unsigned.apk", build / "dex", module)
        config = build / "BundleConfig.json"
        config.write_text(json.dumps(BUNDLE_CONFIG))
        bundle = build / "app.aab"
        apk.run("java", "-jar", tool, "build-bundle", f"--modules={module}",
                f"--config={config}", f"--output={bundle}")
        if signing:
            key, alias = signing
            command = ["jarsigner", "-keystore", str(key), "-storepass:env", "BIBIMER_STORE_PASSWORD"]
            if os.environ.get("BIBIMER_KEY_PASSWORD"):
                command += ["-keypass:env", "BIBIMER_KEY_PASSWORD"]
            else:
                command += ["-keypass:env", "BIBIMER_STORE_PASSWORD"]
            command += [str(bundle), alias]
            result = subprocess.run(command, capture_output=True)
            if result.returncode:
                raise ValueError("AAB 서명 실패. 키 설정을 확인하세요. 비공개 도구 출력은 기록하지 않습니다.")
            verified = subprocess.run(["jarsigner", "-J-Duser.language=en", "-verify", str(bundle)],
                                      capture_output=True, text=True)
            if verified.returncode or "jar verified." not in verified.stdout:
                raise ValueError("AAB 서명 검증 실패")
        apk.run("java", "-jar", tool, "validate", f"--bundle={bundle}")
        suffix = "release" if signing else "unsigned"
        output = distribution / f"bibimer-{info['versionName']}-{info['versionCode']}-{suffix}.aab"
        shutil.copyfile(bundle, output)
        (distribution / "bibimer-setup.sh").write_text(setup)
        report = {**info, "signed": bool(signing), "bundletool": BUNDLETOOL_VERSION,
                  "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "file": output.name}
        output.with_suffix(".json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print("완료:", output)
        if not signing:
            print("미서명 검증용 파일입니다. Google Play에 제출할 수 없습니다.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from None
