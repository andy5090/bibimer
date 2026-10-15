"""Pinned Google Play update SDK inputs for the project's non-Gradle compiler.

The lock is the declared Maven POM closure, using the highest requested version
per coordinate. No Kotlin/Activity Result convenience library is added. SDK AAR
manifests are audited against the entries merged explicitly in our manifest.
"""
import io
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET
import zipfile

ANDROID = "{http://schemas.android.com/apk/res/android}"
LOCK = Path(__file__).with_name("play_sdk_dependencies.json")
APPLICATION_ATTRIBUTES = {ANDROID + "appComponentFactory": "androidx.core.app.CoreComponentFactory"}
APPLICATION_ENTRIES = {
    ("meta-data", "com.google.android.gms.version"): {
        ANDROID + "name": "com.google.android.gms.version",
        ANDROID + "value": "@integer/google_play_services_version"},
    ("activity", "com.google.android.play.core.common.PlayCoreDialogWrapperActivity"): {
        ANDROID + "name": "com.google.android.play.core.common.PlayCoreDialogWrapperActivity",
        ANDROID + "exported": "false", ANDROID + "stateNotNeeded": "true",
        ANDROID + "theme": "@style/Theme.PlayCore.Transparent"},
}


def verify_manifest(library, application):
    """Fail closed if a new SDK manifest needs a merge our builder cannot do."""
    for node in library:
        if node.tag == "uses-sdk":
            if int(node.get(ANDROID + "minSdkVersion", "1")) > 26:
                raise ValueError("Play SDK dependency raises the minimum Android API")
            continue  # App's API 26/36 bounds take precedence over library defaults.
        if node.tag != "application":
            raise ValueError("Unhandled Play SDK manifest element: " + node.tag)
        for key, value in node.attrib.items():
            if APPLICATION_ATTRIBUTES.get(key) != value or application.get(key) != value:
                raise ValueError("Missing Play SDK application attribute: " + key)
        for child in node:
            key = (child.tag, child.get(ANDROID + "name"))
            if APPLICATION_ENTRIES.get(key) != child.attrib or list(child):
                raise ValueError("Unhandled Play SDK application entry: " + str(key))
            if not any(item.tag == child.tag and item.attrib == child.attrib for item in application):
                raise ValueError("Missing Play SDK application entry: " + str(key))


def prepare(fetch, tools, assets, manifest):
    """Return jar paths, resource directories and resource Java packages.

    Only checksum-verified archives are extracted. All dependency code remains
    in the ignored tools cache; license/provenance assets accompany both builds.
    """
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    tools.mkdir(parents=True, exist_ok=True)
    application = ET.parse(manifest).getroot().find("application")
    jars, resources, packages = [], [], []
    notices = assets / "vendor" / "play-sdk"
    if notices.exists():
        shutil.rmtree(notices)
    notices.mkdir(parents=True)
    (notices / "dependencies.json").write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    for artifact in lock["artifacts"]:
        name, version = artifact["artifact"], artifact["version"]
        coordinate = artifact["group"] + ":" + name + ":" + version
        basename = name + "-" + version
        url = (lock["repository"] + artifact["group"].replace(".", "/") + "/" + name
               + "/" + version + "/" + basename + "." + artifact["type"])
        data = fetch(url, artifact["sha256"], "sha256")
        target = tools / (artifact["group"] + "." + basename)
        if target.exists():
            shutil.rmtree(target)
        target.mkdir()
        if artifact["type"] == "jar":
            jar = target / "classes.jar"
            jar.write_bytes(data)
        else:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                library = ET.fromstring(archive.read("AndroidManifest.xml"))
                if library.get("package") != artifact["package"]:
                    raise ValueError("Play SDK manifest package mismatch: " + coordinate)
                verify_manifest(library, application)
                jar = target / "classes.jar"
                jar.write_bytes(archive.read("classes.jar"))
                packages.append(artifact["package"])
                for member in archive.namelist():
                    path = Path(member)
                    if path.is_absolute() or ".." in path.parts:
                        raise ValueError("Invalid Play SDK archive path")
                    if member.startswith("res/") and not member.endswith("/"):
                        destination = target / member
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(archive.read(member))
                    if path.name in ("LICENSE", "NOTICE", "third_party_licenses.txt", "third_party_licenses.json"):
                        destination = notices / (artifact["group"] + "." + basename) / path.name
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(archive.read(member))
                if (target / "res").exists():
                    resources.append(target / "res")
        jars.append(jar)
    return jars, resources, packages
