package app.bibimer;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.view.WindowManager;
import android.widget.EditText;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/** Native-only credentials, foreground capture and explicit upload consent. */
final class VoiceInputController {
    static final int DEVICE_REQUEST = 11, PERMISSION_REQUEST = 612;
    interface Listener {
        boolean current(long epoch);
        void result(String id, String status, String text, long epoch);
        void changed(String status);
    }
    private final Activity activity;
    private final Listener listener;
    private final SharedPreferences preferences;
    private final TokenStore openai, elevenlabs;
    private final VoiceTranscription client;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private volatile String request;
    private volatile boolean checking;
    private volatile long generation;
    private long epoch;
    private JSONObject labels = new JSONObject();
    private MediaRecorder recorder;
    private File audio, uploadAudio;
    private volatile BibimerDialog dialog;
    private volatile String deviceRequest;
    private long deviceEpoch;
    private final Runnable limit = () -> finishRecording(true);

    VoiceInputController(Activity activity, Listener listener) {
        this(activity, listener, new VoiceTranscription());
    }
    VoiceInputController(Activity activity, Listener listener, VoiceTranscription client) {
        this.client = client;
        this.activity = activity; this.listener = listener;
        preferences = activity.getSharedPreferences("voice_input", Activity.MODE_PRIVATE);
        openai = new TokenStore(activity, "voice_openai", "bibimer.voice.openai");
        elevenlabs = new TokenStore(activity, "voice_elevenlabs", "bibimer.voice.elevenlabs");
        // Crash leftovers remain app-private and are removed on the next start.
        File[] leftovers = activity.getCacheDir().listFiles((dir, name) -> name.startsWith("voice-") && name.endsWith(".m4a"));
        if (leftovers != null) for (File file : leftovers) file.delete();
    }
    private String provider() { return preferences.getString("provider", "device"); }
    private String language() { return preferences.getString("language", ""); }
    private TokenStore key(String provider) { return "openai".equals(provider) ? openai : elevenlabs; }
    boolean active(){return busy();}
    private boolean busy() { return request != null || checking || deviceRequest != null || dialog != null; }
    private Intent intent() { return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH); }
    private JSONArray devices() throws Exception {
        JSONArray result = new JSONArray();
        for (ResolveInfo info : activity.getPackageManager().queryIntentActivities(intent(), 0)) {
            if (info.activityInfo == null || !info.activityInfo.exported || !info.activityInfo.enabled || !info.activityInfo.applicationInfo.enabled) continue;
            if (info.activityInfo.permission != null && activity.checkSelfPermission(info.activityInfo.permission) != PackageManager.PERMISSION_GRANTED) continue;
            result.put(new JSONObject().put("id", "device:" + new ComponentName(info.activityInfo.packageName, info.activityInfo.name).flattenToString())
                .put("label", info.loadLabel(activity.getPackageManager()).toString()));
        }
        return result;
    }
    private boolean available(String selected) {
        if ("device".equals(selected) || VoiceTranscription.external(selected)) return true;
        try { JSONArray list = devices(); for (int i=0;i<list.length();i++) if (selected.equals(list.getJSONObject(i).getString("id"))) return true; }
        catch (Exception ignored) { }
        return false;
    }
    JSONObject state() throws Exception {
        JSONArray apps;
        try { apps = devices(); } catch (Exception ignored) { apps = new JSONArray(); }
        return new JSONObject().put("provider", provider()).put("language", language()).put("devices", apps)
            .put("openaiKey", !openai.get().isEmpty()).put("elevenlabsKey", !elevenlabs.get().isEmpty());
    }
    synchronized boolean configure(String provider, String language) {
        if (DemoMode.enabled(activity) || busy() || !available(provider) || language == null || !language.matches("|en|ko|pt|es|id|zh|ja|fr|de")) return false;
        return preferences.edit().putString("provider", provider).putString("language", language).commit();
    }
    private String text(String key) { return labels.optString(key, key); }
    private void readLabels(String json) throws Exception {
        if (json == null || json.length() > 24000) throw new IllegalArgumentException();
        labels = new JSONObject(json);
    }
    void editKey(String selected, String json) {
        if (busy() || DemoMode.enabled(activity) || !VoiceTranscription.external(selected)) return;
        final long operationEpoch = DemoMode.epoch();
        try { readLabels(json); } catch (Exception ignored) { return; }
        EditText field = new EditText(activity);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        field.setSingleLine(true); field.setSaveEnabled(false);
        field.setImeOptions(android.view.inputmethod.EditorInfo.IME_FLAG_NO_EXTRACT_UI | android.view.inputmethod.EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING);
        field.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(512)});
        BibimerDialog keyDialog = new BibimerDialog.Builder(activity).setTitle(VoiceTranscription.name(selected) + " · " + text("voice_key"))
            .setMessage(text("voice_key_hint")).setView(field)
            .setNegativeButton(text("voice_cancel"), null).setPositiveButton(text("voice_save"), null).create();
        dialog = keyDialog;
        keyDialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        keyDialog.setOnDismissListener(d -> { field.setText(""); if (dialog == keyDialog) dialog = null; });
        keyDialog.setOnShowListener(d -> keyDialog.getButton(BibimerDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            if (!listener.current(operationEpoch)) { keyDialog.dismiss(); return; }
            String value = field.getText().toString().trim();
            if (!value.matches("[\\x21-\\x7e]{1,512}")) { keyDialog.showError(text("voice_key_required")); return; }
            try { key(selected).save(value); keyDialog.dismiss(); listener.changed("voice_saved"); }
            catch (Exception ignored) { keyDialog.showError(text("voice_failed")); }
        }));
        keyDialog.show();
    }
    void removeKey(String selected) {
        if (busy() || DemoMode.enabled(activity) || !VoiceTranscription.external(selected)) return;
        key(selected).clear(); listener.changed("voice_key_removed");
    }
    void check(String selected) {
        if (busy() || DemoMode.enabled(activity) || !VoiceTranscription.external(selected)) return;
        String secret = key(selected).get();
        if (secret.isEmpty()) { listener.changed("voice_key_required"); return; }
        checking = true; final long serial = ++generation, capturedEpoch = DemoMode.epoch();
        listener.changed("voice_checking");
        network.execute(() -> {
            if (serial != generation || !listener.current(capturedEpoch)) return;
            String status = client.check(selected, secret);
            activity.runOnUiThread(() -> {
                if (serial != generation) return;
                checking = false;
                if (listener.current(capturedEpoch)) listener.changed(status);
            });
        });
    }
    synchronized void start(String id, String json) {
        long capturedEpoch = DemoMode.epoch();
        if (busy() || DemoMode.enabled(activity)) { listener.result(id, "failed", "", capturedEpoch); return; }
        try { readLabels(json); } catch (Exception ignored) { listener.result(id, "failed", "", capturedEpoch); return; }
        String selected = provider();
        if (!available(selected)) { listener.result(id, "unavailable", "", capturedEpoch); return; }
        if (!VoiceTranscription.external(selected)) {
            Intent intent = intent().putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            if (selected.startsWith("device:")) intent.setComponent(ComponentName.unflattenFromString(selected.substring(7)));
            if (!language().isEmpty()) intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language());
            deviceRequest = id; deviceEpoch = capturedEpoch;
            try { activity.startActivityForResult(intent, DEVICE_REQUEST); }
            catch (Exception ignored) { deviceRequest = null; listener.result(id, "unavailable", "", capturedEpoch); }
            return;
        }
        if (key(selected).get().isEmpty()) { listener.result(id, "voice_key_required", "", capturedEpoch); return; }
        request = id; epoch = capturedEpoch; ++generation;
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST); return;
        }
        record();
    }
    void permissionResult() {
        if (request == null) return;
        if (!listener.current(epoch) || activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            complete("voice_permission", ""); return;
        }
        record();
    }
    private void record() {
        if (request == null || !listener.current(epoch)) { cancel(); return; }
        try {
            audio = File.createTempFile("voice-", ".m4a", activity.getCacheDir());
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioChannels(1); recorder.setAudioSamplingRate(16000); recorder.setAudioEncodingBitRate(64000);
            recorder.setMaxDuration(60000); recorder.setMaxFileSize(VoiceTranscription.MAX_AUDIO);
            recorder.setOutputFile(audio.getAbsolutePath());
            recorder.setOnErrorListener((r, what, extra) -> { if (r == recorder) complete("voice_failed", ""); });
            recorder.setOnInfoListener((r, what, extra) -> {
                if (r == recorder && (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED || what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_FILESIZE_REACHED)) finishRecording(true);
            });
            recorder.prepare(); recorder.start();
            BibimerDialog capture = new BibimerDialog.Builder(activity).setTitle(text("voice_recording"))
                .setMessage(text("voice_record_hint").replace("{provider}", VoiceTranscription.name(provider())))
                .setNegativeButton(text("voice_cancel"), (d,w) -> cancel())
                .setPositiveButton(text("voice_stop_recording"), (d,w) -> finishRecording()).create();
            dialog = capture; capture.setCanceledOnTouchOutside(false); capture.setOnCancelListener(d -> cancel()); capture.show();
            handler.postDelayed(limit, 60500);
        } catch (Exception ignored) { complete("voice_failed", ""); }
    }
    private void dismiss() { BibimerDialog old = dialog; dialog = null; if (old != null) old.dismiss(); }
    private void finishRecording() { finishRecording(false); }
    private void finishRecording(boolean limited) {
        if (recorder == null || request == null) return;
        handler.removeCallbacks(limit);
        try { recorder.stop(); } catch (Exception ignored) {
            // Android may already have stopped at its duration/file limit.
            if (!limited || audio == null || audio.length() == 0) { complete("voice_empty", ""); return; }
        }
        recorder.release(); recorder = null; dismiss();
        if (!listener.current(epoch)) { cancel(); return; }
        BibimerDialog confirm = new BibimerDialog.Builder(activity).setTitle(text("voice_upload"))
            .setMessage(text("voice_upload_hint").replace("{provider}", VoiceTranscription.name(provider())))
            .setNegativeButton(text("voice_cancel"), (d,w) -> cancel()).setPositiveButton(text("voice_upload"), (d,w) -> upload()).create();
        dialog = confirm; confirm.setCanceledOnTouchOutside(false); confirm.setOnCancelListener(d -> cancel()); confirm.show();
    }
    private void upload() {
        dismiss();
        if (request == null || !listener.current(epoch) || audio == null) { cancel(); return; }
        final String selected = provider(), secret = key(selected).get(), lang = language();
        final File capturedAudio = audio; audio = null; uploadAudio = capturedAudio;
        final long serial = generation, capturedEpoch = epoch;
        BibimerDialog progress = new BibimerDialog.Builder(activity).setTitle(text("voice_transcribing"))
            .setMessage(VoiceTranscription.name(selected)).setNegativeButton(text("voice_cancel"), (d,w) -> cancel()).create();
        dialog = progress; progress.setCanceledOnTouchOutside(false); progress.setOnCancelListener(d -> cancel()); progress.show();
        network.execute(() -> {
            String text = "", status = "ok";
            try { text = client.transcribe(selected, secret, lang, capturedAudio, () -> serial == generation && listener.current(capturedEpoch)); }
            catch (Exception error) {
                String message = error.getMessage();
                status = "voice_auth".equals(message) || "voice_forbidden".equals(message) || "voice_limit".equals(message) || "voice_empty".equals(message) ? message : "voice_failed";
            } finally { capturedAudio.delete(); }
            final String resultText = text, resultStatus = status;
            activity.runOnUiThread(() -> { if (serial == generation) complete(resultStatus, resultText); });
        });
    }
    private void complete(String status, String text) {
        String id = request; long capturedEpoch = epoch; request = null;
        handler.removeCallbacks(limit);
        if (recorder != null) { try { recorder.reset(); } catch (Exception ignored) { } recorder.release(); recorder = null; }
        if (audio != null) { audio.delete(); audio = null; }
        if (uploadAudio != null) { uploadAudio.delete(); uploadAudio = null; }
        dismiss();
        if (id != null) listener.result(id, status, text, capturedEpoch);
    }
    void cancelRequest(String id) { if (id != null && id.equals(request)) cancel(); }
    void cancel() { ++generation; boolean wasChecking = checking; checking = false; client.cancel(); complete("cancelled", ""); if (wasChecking) listener.changed(""); }
    void stop() { cancel(); }
    void close() { cancel(); deviceRequest = null; network.shutdownNow(); }
    boolean activityResult(int result, Intent data) {
        String id = deviceRequest; deviceRequest = null;
        if (id == null) return true;
        String text = "", status = result == Activity.RESULT_CANCELED ? "cancelled" : "failed";
        try {
            if (result == Activity.RESULT_OK && data != null) {
                java.util.ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (results != null && !results.isEmpty() && results.get(0) != null) text = results.get(0).trim();
                status = text.isEmpty() ? "empty" : text.length() > 65536 ? "failed" : "ok";
            }
        } catch (Exception ignored) { status = "failed"; }
        listener.result(id, status, "ok".equals(status) ? text : "", deviceEpoch); return true;
    }
}
