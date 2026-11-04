"""Native API protocol regression. No real keys, recording or provider requests.

Uses pinned JSON-java only for JVM tests; Android supplies org.json in production.
"""
from pathlib import Path
import hashlib
import os
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
JAR = ROOT / '.tools/json-20250517.jar'
DIGEST = '3ea61b2a06e31edf1c91134fe9106b0ebb16628be169f3db75bc7a2b06b45796'

def main():
    if not JAR.exists():
        JAR.parent.mkdir(exist_ok=True)
        data = urllib.request.urlopen('https://repo.maven.apache.org/maven2/org/json/json/20250517/json-20250517.jar', timeout=30).read()
        assert hashlib.sha256(data).hexdigest() == DIGEST
        JAR.write_bytes(data)
    assert hashlib.sha256(JAR.read_bytes()).hexdigest() == DIGEST
    with tempfile.TemporaryDirectory() as output:
        subprocess.run(['javac', '-encoding', 'UTF-8', '-classpath', str(JAR), '-d', output,
                        str(ROOT / 'android/app/src/main/java/app/bibimer/VoiceTranscription.java'),
                        str(ROOT / 'scripts/tests/VoiceTranscriptionTest.java')], check=True)
        subprocess.run(['java', '-classpath', os.pathsep.join([output, str(JAR)]),
                        'app.bibimer.VoiceTranscriptionTest'], check=True)

if __name__ == '__main__':
    main()
