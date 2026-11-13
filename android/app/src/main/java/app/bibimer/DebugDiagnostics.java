package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Opt-in, bounded status events. Never accepts text, paths, payloads or credentials. */
final class DebugDiagnostics {
    private static final Set<String> EVENTS = new HashSet<>(Arrays.asList(
        "enabled", "launch", "resume", "pause", "request_ok", "request_failed", "ui_error", "ui_rejection"));
    private final SharedPreferences preferences;
    private boolean enabled;
    private JSONArray events = new JSONArray();
    DebugDiagnostics(Context context) {
        preferences = context.getSharedPreferences("debug-diagnostics", Context.MODE_PRIVATE);
        enabled = preferences.getBoolean("enabled", false);
        if (enabled) try {
            JSONArray saved = new JSONArray(preferences.getString("events", "[]"));
            for (int i = Math.max(0, saved.length() - 64); i < saved.length(); i++) {
                JSONObject row = saved.optJSONObject(i);
                if (row == null || !EVENTS.contains(row.optString("event"))) continue;
                JSONObject safe = new JSONObject().put("event", row.optString("event"));
                for (String key : new String[]{"time", "uptime", "code"})
                    if (row.opt(key) instanceof Number) safe.put(key, row.opt(key));
                events.put(safe);
            }
        } catch (Exception ignored) { events = new JSONArray(); }
        else preferences.edit().remove("events").apply();
    }
    synchronized boolean enabled() { return enabled; }
    synchronized boolean setEnabled(boolean value) {
        if (value == enabled) return true;
        if (!preferences.edit().putBoolean("enabled", value).remove("events").commit()) return false;
        enabled = value; events = new JSONArray();
        if (value) record("enabled", 0);
        return true;
    }
    synchronized void clear() { if (!enabled) return; events = new JSONArray(); preferences.edit().remove("events").apply(); }
    synchronized void record(String event, int code) {
        if (!enabled || !EVENTS.contains(event)) return;
        try {
            events.put(new JSONObject().put("event", event).put("time", System.currentTimeMillis())
                .put("uptime", SystemClock.elapsedRealtime()).put("code", code));
            if (events.length() > 64) events.remove(0);
            preferences.edit().putString("events", events.toString()).apply();
        } catch (Exception ignored) { }
    }
    synchronized String snapshot() {
        if (!enabled) return "";
        try { return new JSONObject().put("schema", 1).put("platform", "android").put("events", events).toString(2); }
        catch (Exception ignored) { return ""; }
    }
}
