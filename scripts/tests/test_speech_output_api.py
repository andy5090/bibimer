"""Native TTS API and local text processing; no provider traffic or keys."""
from pathlib import Path
import os,subprocess,tempfile
from test_voice_transcription import ROOT,JAR,main as prepare

def main():
    if not JAR.exists():prepare()
    with tempfile.TemporaryDirectory() as output:
        sources=[ROOT/'android/app/src/main/java/app/bibimer'/name for name in ('VoiceTranscription.java','SpeechOutputApi.java','SpeechText.java')]
        subprocess.run(['javac','-encoding','UTF-8','-classpath',str(JAR),'-d',output,*map(str,sources),str(ROOT/'scripts/tests/SpeechOutputApiTest.java')],check=True)
        subprocess.run(['java','-classpath',os.pathsep.join([output,str(JAR)]),'app.bibimer.SpeechOutputApiTest'],check=True)
if __name__=='__main__':main()
