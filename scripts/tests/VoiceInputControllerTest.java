package app.bibimer;
import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.media.*;
import android.widget.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class VoiceInputControllerTest {
    static void check(boolean b){if(!b)throw new AssertionError();}
    static class Sink implements VoiceInputController.Listener {
        volatile String id,status,text,changed;long epoch;
        volatile java.util.concurrent.CountDownLatch done;
        public boolean current(long e){return e==DemoMode.epoch()&&!DemoMode.demo;}
        public void result(String i,String s,String t,long e){id=i;status=s;text=t;epoch=e;if(done!=null)done.countDown();}
        public void changed(String s){changed=s;}
    }
    static int uploads, responseCode=200;
    static class Connection extends java.net.HttpURLConnection {
        Connection(java.net.URL u){super(u);}
        public void connect(){}public boolean usingProxy(){return false;}public void disconnect(){}
        public OutputStream getOutputStream(){uploads++;return new ByteArrayOutputStream();}
        public int getResponseCode(){return VoiceInputControllerTest.responseCode;}
        public InputStream getInputStream(){return new ByteArrayInputStream("{\"text\":\"native API text\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));}
    }
    static void empty(Activity a){check(a.cache.list().length==0);}
    public static void main(String[] args)throws Exception{
        Activity a=new Activity();a.cache=Files.createTempDirectory("voice-native-test").toFile();
        Sink sink=new Sink();VoiceInputController c=new VoiceInputController(a,sink,new VoiceTranscription(url->new Connection(url)));
        try{
            check(c.state().getString("provider").equals("device"));
            c.start("device-1","{}");check(a.launched==1);check(a.permissionRequests==0);
            c.stop(); // Android hides our activity while the device recognizer is open.
            c.activityResult(Activity.RESULT_OK,new Intent("result").putExtra("results",new ArrayList<>(Arrays.asList(" device transcript "))));
            check(sink.id.equals("device-1")&&sink.text.equals("device transcript"));
            check(!c.configure("device:missing/Activity",""));
            a.packages.list.add(new ResolveInfo());check(c.configure("device:test/Speech","ko"));
            c.start("device-2","{}");check(a.last.component!=null&&a.last.extra.get("language").equals("ko"));
            c.activityResult(Activity.RESULT_CANCELED,null);check(sink.status.equals("cancelled"));
            a.packages.list.get(0).activityInfo.exported=false;check(!c.configure("device:test/Speech",""));
            c.start("gone","{}");check(sink.status.equals("unavailable"));
            check(c.configure("openai",""));check(!c.configure("openai","ko\r\ninjection"));
            c.start("no-key","{}");check(sink.status.equals("voice_key_required"));check(a.launched==2);
            c.editKey("openai","{}");AlertDialog key=AlertDialog.last;
            check((key.getWindow().flags&8192)!=0);
            EditText.last.setText("");key.yes();check(EditText.last.error!=null&&!c.state().getBoolean("openaiKey"));
            EditText.last.setText("native-test-only");key.yes();check(!key.shown&&EditText.last.getText().length()==0);
            check(c.state().getBoolean("openaiKey"));check(!c.state().toString().contains("native-test-only"));
            check(!c.state().getBoolean("elevenlabsKey"));
            a.grant=-1;c.start("permission-denied","{}");check(a.permissionRequests==1);check(MediaRecorder.starts==0);
            c.permissionResult();check(sink.status.equals("voice_permission"));empty(a);
            a.grant=0;c.start("record-1","{}");check(MediaRecorder.starts==1);check(MediaRecorder.last.duration==60000);
            check(AlertDialog.last.title.equals("voice_recording"));check(a.cache.list().length==1);
            check(!c.configure("elevenlabs",""));
            c.start("duplicate","{}");check(sink.id.equals("duplicate")&&sink.status.equals("failed"));
            AlertDialog.last.yes();check(MediaRecorder.last.released);check(AlertDialog.last.title.equals("voice_upload"));
            // Stopping a recording never uploads: only an independent confirmation can do that.
            AlertDialog.last.no();check(sink.id.equals("record-1")&&sink.status.equals("cancelled"));empty(a);
            c.start("background","{}");c.stop();check(sink.id.equals("background")&&sink.status.equals("cancelled"));check(MediaRecorder.last.released);empty(a);
            c.start("duration-limit","{}");MediaRecorder old=MediaRecorder.last;MediaRecorder.stopFails=true;old.info.onInfo(old,800,0);MediaRecorder.stopFails=false;
            check(AlertDialog.last.title.equals("voice_upload"));c.cancelRequest("wrong-id");check(AlertDialog.last.shown);
            c.cancelRequest("duration-limit");empty(a);check(sink.id.equals("duration-limit"));
            c.start("too-short","{}");MediaRecorder.stopFails=true;AlertDialog.last.yes();MediaRecorder.stopFails=false;
            check(sink.status.equals("voice_empty"));empty(a);
            c.start("stale-epoch","{}");DemoMode.serial++;AlertDialog.last.yes();empty(a);check(sink.status.equals("cancelled"));
            c.start("upload-success","{}");AlertDialog.last.yes();check(uploads==0);
            sink.done=new java.util.concurrent.CountDownLatch(1);AlertDialog.last.yes();
            check(sink.done.await(2,java.util.concurrent.TimeUnit.SECONDS));
            check(uploads==1&&sink.id.equals("upload-success")&&sink.status.equals("ok")&&sink.text.equals("native API text"));empty(a);
            responseCode=403;c.start("upload-denied","{}");AlertDialog.last.yes();
            sink.done=new java.util.concurrent.CountDownLatch(1);AlertDialog.last.yes();
            check(sink.done.await(2,java.util.concurrent.TimeUnit.SECONDS));
            check(uploads==2&&sink.status.equals("voice_forbidden")&&sink.text.isEmpty());empty(a);
            check(a.launched==2); // No fallback into Android recognition on API failure.
            c.removeKey("openai");check(!c.state().getBoolean("openaiKey"));check(sink.changed.equals("voice_key_removed"));
            DemoMode.demo=true;check(!c.configure("openai","ko"));c.start("demo","{}");check(sink.status.equals("failed"));
            DemoMode.demo=false;File leftover=new File(a.cache,"voice-crash.m4a");Files.write(leftover.toPath(),new byte[]{1});
            VoiceInputController second=new VoiceInputController(a,new Sink());empty(a);second.close();
        }finally{c.close();for(File f:a.cache.listFiles())f.delete();a.cache.delete();}
        System.out.println("PASS native voice controller: default/explicit/missing apps, native-only key entry/removal, permission denial, recording/confirmation, no upload on stop/limit, cancellation, cleanup, epoch/demo isolation");
    }
}
