"""TTS native lifecycle with Android shims and an in-memory provider transport."""
from pathlib import Path
import os,subprocess,tempfile
from test_voice_transcription import ROOT,JAR,main as prepare
from tts_android_stubs import write_stubs

def main():
    if not JAR.exists():prepare()
    with tempfile.TemporaryDirectory() as folder:
        root=Path(folder);write_stubs(root/'stubs')
        names=('VoiceTranscription.java','SpeechOutputApi.java','SpeechText.java','SpeechOutputController.java')
        subprocess.run(['javac','-encoding','UTF-8','-classpath',str(JAR),'-d',folder,*map(str,(root/'stubs').rglob('*.java')),*[str(ROOT/'android/app/src/main/java/app/bibimer'/n) for n in names],str(ROOT/'scripts/tests/SpeechOutputControllerTest.java')],check=True)
        subprocess.run(['java','-classpath',os.pathsep.join([folder,str(JAR)]),'app.bibimer.SpeechOutputControllerTest'],check=True)
if __name__=='__main__':main()
