package app.bibimer;
import android.app.*;import android.os.*;import android.media.*;import android.speech.tts.*;import java.io.*;import java.net.*;import java.nio.file.*;import java.nio.charset.StandardCharsets;import java.util.concurrent.*;import org.json.*;
public final class SpeechOutputControllerTest{
 static void check(boolean b){if(!b)throw new AssertionError();}
 static class Sink implements SpeechOutputController.Listener{volatile String status;public boolean current(long e){return e==DemoMode.serial&&!DemoMode.demo;}public void changed(String s){status=s;}}
 static int requests;
 static class Connection extends HttpURLConnection{
  Connection(URL u){super(u);}public void connect(){}public boolean usingProxy(){return false;}public void disconnect(){}public OutputStream getOutputStream(){requests++;return new ByteArrayOutputStream();}public int getResponseCode(){return 200;}public String getContentType(){return "audio/mpeg";}public InputStream getInputStream(){return new ByteArrayInputStream(getURL().getPath().equals("/v2/voices")?"{\"voices\":[{\"voice_id\":\"voice123\",\"name\":\"Test voice\"}]}".getBytes(StandardCharsets.UTF_8):new byte[]{'I','D','3',1});}
 }
 static void await(SpeechOutputController c)throws Exception{for(int i=0;i<100;i++){if(MediaPlayer.last!=null&&MediaPlayer.last.playing)return;Thread.sleep(10);}throw new AssertionError("Playback never started");}
 public static void main(String[] args)throws Exception{
  Activity a=new Activity();a.cache=Files.createTempDirectory("tts-native").toFile();Sink sink=new Sink();SpeechOutputController c=new SpeechOutputController(a,sink,new SpeechOutputApi(url->new Connection(url)));
  try{
   check(!c.state().getBoolean("enabled"));check(TextToSpeech.creates==0&&requests==0);
   c.context("chat");c.read("chat","do not read",false);check(TextToSpeech.creates==0);
   check(c.configure("{\"enabled\":true}"));check(TextToSpeech.creates==0);
   android.provider.Settings.Secure.values.put("tts_default_rate",175);android.provider.Settings.Secure.values.put("tts_default_pitch",80);
   c.read("chat","answer",false,"turn:answer");check(c.state().getString("messageId").equals("turn:answer"));check(c.state().getString("readContext").equals("chat"));Handler.drain();check(TextToSpeech.spoken.size()==1);check(c.state().getBoolean("reading"));check(TextToSpeech.last.rate==1.75f&&TextToSpeech.last.pitch==0.8f);
   TextToSpeech.last.done();check(!c.state().getBoolean("reading"));check(c.state().getString("messageId").isEmpty());check(c.state().getString("readContext").isEmpty());check(AudioManager.requests==AudioManager.abandons);
   c.read("chat","first",false,"first");c.read("chat","second",false,"second");check(c.state().getString("messageId").equals("second"));c.stop();check(c.state().getString("messageId").isEmpty());
   android.provider.Settings.Secure.values.put("tts_default_rate",60);android.provider.Settings.Secure.values.put("tts_default_pitch",140);
   c.read("chat","changed defaults",false,"changed");check(TextToSpeech.last.rate==0.6f&&TextToSpeech.last.pitch==1.4f);c.stop();
   android.provider.Settings.Secure.values.clear();c.read("chat","unset defaults",false,"unset");check(TextToSpeech.last.rate==1f&&TextToSpeech.last.pitch==1f);c.stop();
   android.provider.Settings.Secure.values.put("tts_default_rate",0);android.provider.Settings.Secure.values.put("tts_default_pitch",-20);c.read("chat","invalid defaults",false,"invalid");check(TextToSpeech.last.rate==1f&&TextToSpeech.last.pitch==1f);c.stop();
   android.provider.Settings.Secure.denied=true;c.read("chat","unreadable defaults",false,"unreadable");check(TextToSpeech.last.rate==1f&&TextToSpeech.last.pitch==1f);c.stop();android.provider.Settings.Secure.denied=false;
   int before=TextToSpeech.spoken.size();c.read("other","wrong context",false);check(TextToSpeech.spoken.size()==before);
   check(c.configure("{\"mode\":\"summary\"}"));c.read("chat",String.join(" ",java.util.Collections.nCopies(50,"The project validation passed.")),false);
   check(TextToSpeech.spoken.get(TextToSpeech.spoken.size()-1).length()<=700);c.context("settings");check(!c.state().getBoolean("reading"));
   check(c.configure("{\"enabled\":false,\"mode\":\"full\"}"));android.provider.Settings.Secure.values.put("tts_default_rate",125);android.provider.Settings.Secure.values.put("tts_default_pitch",90);c.read("settings","preview",true);check(TextToSpeech.last.rate==1.25f&&TextToSpeech.last.pitch==0.9f);check(c.state().getBoolean("reading"));check(c.state().getString("messageId").isEmpty());c.pause();check(!c.state().getBoolean("reading"));
   check(!c.configure("{\"voice\":\"not-real\"}"));check(c.configure("{\"voice\":\"local\"}"));
   c.refresh(false);JSONArray voices=c.state().getJSONArray("voices");check(voices.length()==3);boolean missing=false;for(int i=0;i<voices.length();i++)if(voices.getJSONObject(i).getString("id").equals("missing"))missing=voices.getJSONObject(i).getBoolean("disabled");check(missing);
   c.read("settings",String.join("",java.util.Collections.nCopies(4500,"x")),true);check(c.state().getBoolean("reading"));
   int count=TextToSpeech.spoken.size();android.provider.Settings.Secure.values.put("tts_default_rate",150);TextToSpeech.last.done();check(TextToSpeech.spoken.size()==count+1);check(TextToSpeech.last.rate==1.5f);TextToSpeech.last.done();TextToSpeech.last.done();check(!c.state().getBoolean("reading"));
   c.read("settings","interrupt",true);AudioManager.listener.onAudioFocusChange(-1);check(!c.state().getBoolean("reading"));
   check(c.configure("{\"engine\":\"missing.engine\"}"));int creations=TextToSpeech.creates;c.refresh(false);check(TextToSpeech.creates==creations&&sink.status.equals("tts_unavailable"));
   check(!c.configure("{\"provider\":\"openai\"}"));check(c.configure("{\"provider\":\"elevenlabs\"}"));c.read("settings","missing-key",true);check(sink.status.equals("voice_key_required")&&requests==0);
   c.keyAction("elevenlabs","edit","{}");BibimerDialog key=BibimerDialog.last;
   check((key.getWindow().flags&8192)!=0);android.widget.EditText input=android.widget.EditText.last;
   input.setText("");key.yes();check(key.shown&&input.error!=null&&!c.state().getBoolean("elevenlabsKey"));
   input.setText("test-only");key.yes();check(!key.shown&&input.getText().length()==0&&c.state().getBoolean("elevenlabsKey"));
   c.keyAction("elevenlabs","edit","{}");input=android.widget.EditText.last;check(input.getText().length()==0);
   input.setText("cancelled-replacement");BibimerDialog.last.no();check(input.getText().length()==0&&TokenStore.keys.get("tts_elevenlabs").equals("test-only"));
   c.keyAction("elevenlabs","edit","{}");input=android.widget.EditText.last;input.setText("stale-replacement");DemoMode.serial++;BibimerDialog.last.yes();
   check(input.getText().length()==0&&TokenStore.keys.get("tts_elevenlabs").equals("test-only"));
   c.keyAction("elevenlabs","edit","{}");input=android.widget.EditText.last;input.setText("hidden-replacement");c.pause();
   check(input.getText().length()==0&&TokenStore.keys.get("tts_elevenlabs").equals("test-only"));
   TokenStore.keys.put("tts_elevenlabs","test-only");c.refresh(false);for(int i=0;i<100&&c.state().getBoolean("busy");i++)Thread.sleep(10);check(c.configure("{\"voice\":\"voice123\"}"));c.read("settings","external",true);await(c);check(requests==1);check(a.cache.list().length==1);MediaPlayer.last.done();check(a.cache.list().length==0&&!c.state().getBoolean("reading"));
   c.read("settings","cancel external",true);c.pause();Thread.sleep(100);check(a.cache.list().length==0&&!c.state().getBoolean("reading"));
   DemoMode.demo=true;check(!c.configure("{\"enabled\":true}"));c.read("settings","demo",true);check(!c.state().getBoolean("reading"));DemoMode.demo=false;
   check(!c.state().toString().contains("test-only"));c.keyAction("elevenlabs","remove","{}");check(!c.state().getBoolean("elevenlabsKey"));
   a.getSharedPreferences("speech_output",0).edit().putString("provider","openai").putBoolean("enabled",true).commit();
   SpeechOutputController migrated=new SpeechOutputController(a,sink,new SpeechOutputApi(url->new Connection(url)));
   check(!migrated.state().getBoolean("enabled")&&migrated.state().getString("provider").equals("android"));migrated.close();
  }finally{c.close();for(File file:a.cache.listFiles())file.delete();a.cache.delete();}
  System.out.println("PASS native TTS lifecycle: off/no startup calls, foreground context, local summary, engine/voice validation, chunk sequencing, focus loss, preview, external playback/cancellation cleanup and demo/key isolation");
 }
}
