package app.bibimer;

import android.app.*;
import android.content.*;
import android.media.*;
import android.os.*;
import android.speech.tts.*;
import android.text.InputType;
import android.view.WindowManager;
import android.widget.EditText;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Foreground speech only. No answer, summary or audio is persisted beyond private temporary playback. */
final class SpeechOutputController {
    interface Listener { boolean current(long epoch); void changed(String status); }
    private final Activity activity;
    private final Listener listener;
    private final SharedPreferences prefs;
    private final TokenStore eleven;
    private final SpeechOutputApi api;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private volatile long generation;
    private volatile boolean busy,reading;
    private volatile String context="",status="",engineLoaded="";
    private volatile JSONArray voices=new JSONArray(),engines=new JSONArray(),elevenVoices=new JSONArray();
    private volatile String nextPage="";
    private volatile boolean more,elevenLoaded;
    private TextToSpeech androidTts;
    private boolean androidReady,initializing,focusHeld;
    private MediaPlayer player;
    private volatile File audio;
    private AlertDialog keyDialog;
    private final AudioManager audioManager;
    private AudioFocusRequest focus;
    private List<String> parts=Collections.emptyList();
    private int part;
    private long readEpoch,readGeneration;
    private String readContext="";

    SpeechOutputController(Activity activity,Listener listener){this(activity,listener,new SpeechOutputApi());}
    SpeechOutputController(Activity activity,Listener listener,SpeechOutputApi api){
        this.api=api;
        this.activity=activity;this.listener=listener;
        prefs=activity.getSharedPreferences("speech_output",Activity.MODE_PRIVATE);
        if(!Arrays.asList("android","elevenlabs").contains(provider()))prefs.edit().putString("provider","android").putBoolean("enabled",false).commit();
        eleven=new TokenStore(activity,"tts_elevenlabs","bibimer.tts.elevenlabs");
        audioManager=activity.getSystemService(AudioManager.class);
        File[] stale=activity.getCacheDir().listFiles((d,n)->n.startsWith("tts-")&&n.endsWith(".mp3"));if(stale!=null)for(File f:stale)f.delete();
    }
    private String provider(){return prefs.getString("provider","android");}
    private String engine(){return prefs.getString("engine","");}
    private String voiceKey(){return "voice_"+provider()+"_"+("android".equals(provider())?engine():"");}
    private String voice(){return prefs.getString(voiceKey(),"");}
    private boolean enabled(){return prefs.getBoolean("enabled",false);}
    private void signal(String value){status=value;listener.changed(value);}
    JSONObject state()throws Exception{
        JSONArray list=voices;
        if("elevenlabs".equals(provider()))list=elevenVoices;
        else if(!engine().equals(engineLoaded))list=new JSONArray();
        return new JSONObject().put("enabled",enabled()).put("provider",provider()).put("mode",prefs.getString("mode","full"))
            .put("engine",engine()).put("voice",voice()).put("voices",list).put("engines",engines)
            .put("busy",busy).put("reading",reading).put("status",status).put("more",more)
            .put("voicesLoaded","elevenlabs".equals(provider())?elevenLoaded:"android".equals(provider())?androidReady:true)
            .put("elevenlabsKey",!eleven.get().isEmpty());
    }
    synchronized boolean configure(String json){
        if(DemoMode.enabled(activity)||json==null||json.length()>4000)return false;
        try{
            JSONObject data=new JSONObject(json);
            String p=data.optString("provider",provider()),mode=data.optString("mode",prefs.getString("mode","full")),e=data.optString("engine",engine());
            if(!Arrays.asList("android","elevenlabs").contains(p)||!Arrays.asList("full","summary").contains(mode)||!e.matches("[A-Za-z0-9_.]{0,200}"))return false;
            String vk="voice_"+p+"_"+("android".equals(p)?e:"");
            String selected=data.optString("voice",prefs.getString(vk,""));
            if(selected.length()>300||selected.indexOf('\0')>=0)return false;
            boolean on=data.optBoolean("enabled",enabled());
            if(data.has("voice")&&!selected.isEmpty()&&!selected.equals(prefs.getString(vk,""))&&!listed(selected,"elevenlabs".equals(p)?elevenVoices:voices))return false;
            boolean changedEngine=!p.equals(provider())||!e.equals(engine());
            if(!prefs.edit().putString("provider",p).putString("mode",mode).putString("engine",e).putString(vk,selected).putBoolean("enabled",on).commit())return false;
            ++generation;
            activity.runOnUiThread(()->{stop();if(changedEngine)shutdownAndroid();signal("");});return true;
        }catch(Exception ignored){return false;}
    }
    private boolean listed(String id,JSONArray list){for(int i=0;i<list.length();i++)if(id.equals(list.optJSONObject(i).optString("id")))return true;return false;}
    void context(String value){if(value==null||value.length()>2000)return;if(!value.equals(context)){context=value;stop();}}
    void refresh(boolean append){
        if(DemoMode.enabled(activity)||reading||busy)return;
        if("android".equals(provider())){initAndroid();return;}
        String secret=eleven.get();if(secret.isEmpty()){signal("voice_key_required");return;}
        if(append&&!more)return;
        final String page=append?nextPage:"";final long serial=++generation,epoch=DemoMode.epoch();busy=true;signal("tts_loading");
        network.execute(()->{
            try{
                JSONObject data=api.voices(secret,page,()->serial==generation&&listener.current(epoch));
                activity.runOnUiThread(()->{
                    if(serial!=generation||!listener.current(epoch))return;
                    try{
                        JSONArray out=new JSONArray();Set<String> ids=new HashSet<>();
                        if(append)for(int i=0;i<elevenVoices.length();i++){JSONObject r=elevenVoices.getJSONObject(i);out.put(r);ids.add(r.getString("id"));}
                        JSONArray fetched=data.getJSONArray("voices");for(int i=0;i<fetched.length();i++){JSONObject r=fetched.getJSONObject(i);if(ids.add(r.getString("id")))out.put(r);}
                        elevenVoices=out;elevenLoaded=true;nextPage=data.optString("next");more=data.optBoolean("hasMore")&&!nextPage.isEmpty()&&!page.equals(nextPage);busy=false;signal("");
                    }catch(Exception invalid){busy=false;signal("tts_failed");}
                });
            }catch(Exception error){activity.runOnUiThread(()->{if(serial==generation){busy=false;signal(errorCode(error));}});}
        });
    }
    private void initAndroid(){
        if(androidReady&&engine().equals(engineLoaded)){loadAndroidVoices();signal("");return;}
        if(initializing)return;
        shutdownAndroid();initializing=true;busy=true;signal("tts_loading");
        final String selected=engine();final long serial=generation,epoch=DemoMode.epoch();
        // Verify an explicit engine before construction: TextToSpeech otherwise silently falls back.
        if(!selected.isEmpty()){
            boolean installed=false;
            for(android.content.pm.ResolveInfo r:activity.getPackageManager().queryIntentServices(new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE),0))
                if(r.serviceInfo!=null&&selected.equals(r.serviceInfo.packageName)&&r.serviceInfo.enabled&&r.serviceInfo.applicationInfo.enabled)installed=true;
            if(!installed){initializing=false;busy=false;signal("tts_unavailable");return;}
        }
        final TextToSpeech[] created=new TextToSpeech[1];
        TextToSpeech.OnInitListener ready=result->new Handler(Looper.getMainLooper()).post(()->{
            if(serial!=generation||!listener.current(epoch)||!selected.equals(engine())||androidTts!=created[0]){
                if(androidTts==created[0]){shutdownAndroid();busy=false;}else if(created[0]!=null)created[0].shutdown();return;
            }
            initializing=false;busy=false;
            if(result!=TextToSpeech.SUCCESS){shutdownAndroid();signal("tts_unavailable");return;}
            androidReady=true;engineLoaded=selected;
            androidTts.setAudioAttributes(attributes());
            androidTts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                public void onStart(String id){}
                public void onDone(String id){activity.runOnUiThread(()->{if(validUtterance(id))next();});}
                public void onError(String id){activity.runOnUiThread(()->{if(validUtterance(id))fail("tts_failed");});}
            });
            loadAndroidVoices();signal("");
            if(reading&&readGeneration==generation)next();
        });
        try{created[0]=selected.isEmpty()?new TextToSpeech(activity,ready):new TextToSpeech(activity,ready,selected);androidTts=created[0];}
        catch(Exception ignored){shutdownAndroid();busy=false;signal("tts_unavailable");}
    }
    private void loadAndroidVoices(){
        try{
            JSONArray es=new JSONArray(),vs=new JSONArray();
            for(TextToSpeech.EngineInfo e:androidTts.getEngines())es.put(new JSONObject().put("id",e.name).put("label",e.label));
            Set<Voice> available=androidTts.getVoices();List<Voice> sorted=new ArrayList<>(available==null?Collections.emptySet():available);
            sorted.sort(Comparator.comparing(v->v.getLocale().toLanguageTag()+v.getName()));
            for(Voice v:sorted){Set<String> features=v.getFeatures();vs.put(new JSONObject().put("id",v.getName()).put("label",v.getLocale().getDisplayName()+" · "+v.getName())
                .put("network",v.isNetworkConnectionRequired()).put("disabled",features!=null&&features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)));}
            engines=es;voices=vs;
        }catch(Exception ignored){voices=new JSONArray();signal("tts_unavailable");}
    }
    private boolean validUtterance(String id){return reading&&currentRead()&&id.equals("tts-"+readGeneration+"-"+part);}
    void read(String source,String text,boolean preview){
        if(DemoMode.enabled(activity)||text==null||text.length()>131072||(!preview&&!enabled())||!source.equals(context)||context.isEmpty())return;
        stop();readEpoch=DemoMode.epoch();readContext=source;readGeneration=generation;
        String spoken="summary".equals(prefs.getString("mode","full"))&&!preview?SpeechText.summary(text):SpeechText.plain(text);
        if(spoken.isEmpty()){signal("tts_empty");return;}
        parts=SpeechText.chunks(spoken,2000);part=0;reading=true;
        if("android".equals(provider())){
            if(!androidReady||!engine().equals(engineLoaded)){initAndroid();return;}
        }else{
            if(eleven.get().isEmpty()){fail("voice_key_required");return;}
            if(!voice().matches("[A-Za-z0-9_-]{1,128}")||(elevenLoaded&&!listed(voice(),elevenVoices))){fail("tts_unavailable");return;}
        }
        next();
    }
    private boolean currentRead(){return reading&&readGeneration==generation&&listener.current(readEpoch)&&readContext.equals(context);}
    private AudioAttributes attributes(){return new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();}
    private boolean takeFocus(){
        if(focusHeld)return true;
        focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes())
            .setOnAudioFocusChangeListener(change->{if(change<0)activity.runOnUiThread(this::stop);}).build();
        focusHeld=audioManager.requestAudioFocus(focus)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED;return focusHeld;
    }
    private void next(){
        if(!currentRead()){stop();return;}
        if(part>=parts.size()){stop();return;}
        String text=parts.get(part++);final long serial=readGeneration,epoch=readEpoch;
        if("android".equals(provider())){
            if(!takeFocus()){fail("tts_failed");return;}
            String selected=voice();boolean set=false;
            if(selected.isEmpty())set=androidTts.setLanguage(Locale.forLanguageTag(new AppLanguage(activity).get()))>=0;
            else{Set<Voice> list=androidTts.getVoices();if(list!=null)for(Voice v:list)if(v.getName().equals(selected)&&!(v.getFeatures()!=null&&v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)))set=androidTts.setVoice(v)==TextToSpeech.SUCCESS;}
            if(!set){fail("tts_unavailable");return;}
            signal("tts_playing");if(androidTts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"tts-"+serial+"-"+part)==TextToSpeech.ERROR)fail("tts_failed");return;
        }
        signal("tts_loading");final String p=provider(),secret=eleven.get(),v=voice();
        network.execute(()->{
            File file=null;
            try{
                if(serial!=generation||!listener.current(epoch))return;
                file=File.createTempFile("tts-",".mp3",activity.getCacheDir());audio=file;
                api.synthesize(p,secret,v,text,file,()->serial==generation&&listener.current(epoch));final File ready=file;
                activity.runOnUiThread(()->{if(serial!=generation||!currentRead()){ready.delete();return;}play(ready);});
            }catch(Exception error){if(file!=null)file.delete();activity.runOnUiThread(()->{if(serial==generation)fail(errorCode(error));});}
        });
    }
    private void play(File file){
        if(!takeFocus()){file.delete();fail("tts_failed");return;}
        try{
            MediaPlayer p=new MediaPlayer();player=p;p.setAudioAttributes(attributes());p.setDataSource(file.getAbsolutePath());
            final long serial=readGeneration;
            p.setOnPreparedListener(m->{if(player==m&&serial==generation&&currentRead()){signal("tts_playing");m.start();}});
            p.setOnCompletionListener(m->{if(player!=m||serial!=generation)return;releasePlayer();file.delete();audio=null;next();});
            p.setOnErrorListener((m,w,e)->{if(player==m&&serial==generation)fail("tts_failed");return true;});p.prepareAsync();
        }catch(Exception ignored){fail("tts_failed");}
    }
    private void fail(String code){stop();signal(code);}
    private static String errorCode(Exception error){String s=error.getMessage();return Arrays.asList("voice_key_required","voice_auth","voice_forbidden","voice_limit","tts_unavailable").contains(s)?s:"tts_failed";}
    private void releasePlayer(){if(player!=null){try{player.release();}catch(Exception ignored){}player=null;}}
    private void shutdownAndroid(){androidReady=false;initializing=false;if(androidTts!=null){try{androidTts.shutdown();}catch(Exception ignored){}androidTts=null;}}
    void stop(){++generation;reading=false;busy=false;api.cancel();releasePlayer();if(androidTts!=null)androidTts.stop();if(initializing)shutdownAndroid();if(audio!=null){audio.delete();audio=null;}parts=Collections.emptyList();if(focusHeld){audioManager.abandonAudioFocusRequest(focus);focusHeld=false;}signal("");}
    void pause(){stop();if(keyDialog!=null)keyDialog.dismiss();}
    void close(){pause();shutdownAndroid();network.shutdownNow();}
    void keyAction(String p,String action,String labels){
        if(DemoMode.enabled(activity)||!"elevenlabs".equals(p))return;
        stop();
        if("remove".equals(action)){eleven.clear();if("elevenlabs".equals(p)){elevenVoices=new JSONArray();elevenLoaded=false;more=false;nextPage="";}signal("voice_key_removed");return;}
        if(!"edit".equals(action)||keyDialog!=null)return;
        try{
            JSONObject l=new JSONObject(labels);final long epoch=DemoMode.epoch();EditText input=new EditText(activity);
            input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);input.setSingleLine(true);input.setSaveEnabled(false);
            input.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(512)});
            AlertDialog d=new AlertDialog.Builder(activity).setTitle(VoiceTranscription.name(p)+" · TTS · "+l.optString("voice_key"))
                .setMessage(l.optString("voice_key_hint")).setView(input).setNegativeButton(l.optString("voice_cancel"),null).setPositiveButton(l.optString("voice_save"),null).create();keyDialog=d;
            d.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            d.setOnDismissListener(x->{input.setText("");keyDialog=null;});
            d.setOnShowListener(x->d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                if(!listener.current(epoch)){d.dismiss();return;}String secret=input.getText().toString().trim();
                if(!secret.matches("[\\x21-\\x7e]{1,512}")){input.setError(l.optString("voice_key_required"));return;}
                try{eleven.save(secret);if("elevenlabs".equals(p)){elevenVoices=new JSONArray();elevenLoaded=false;more=false;nextPage="";}d.dismiss();signal("voice_saved");}catch(Exception ignored){input.setError(l.optString("voice_failed"));}
            }));d.show();
        }catch(Exception ignored){signal("tts_failed");}
    }
}
