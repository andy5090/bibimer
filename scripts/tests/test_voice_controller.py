"""Controller lifecycle tests with Android API shims, no device microphone or provider traffic."""
from pathlib import Path
import os
import subprocess
import tempfile
from test_voice_transcription import JAR, ROOT, main as transport_test
from voice_android_stubs import write_stubs

def main():
    if not JAR.exists():
        transport_test()
    with tempfile.TemporaryDirectory() as folder:
        output=Path(folder)
        write_stubs(output/'stubs')
        subprocess.run(['javac','-encoding','UTF-8','-classpath',str(JAR),'-d',folder,
                        *map(str,(output/'stubs').rglob('*.java')),
                        str(ROOT/'android/app/src/main/java/app/bibimer/VoiceInputController.java'),
                        str(ROOT/'android/app/src/main/java/app/bibimer/VoiceTranscription.java'),
                        str(ROOT/'scripts/tests/VoiceInputControllerTest.java')],check=True)
        subprocess.run(['java','-classpath',os.pathsep.join([folder,str(JAR)]),'app.bibimer.VoiceInputControllerTest'],check=True)

if __name__=='__main__':main()
