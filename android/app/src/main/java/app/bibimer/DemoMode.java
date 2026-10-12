package app.bibimer;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** One explicit switch; real pairing and all normal preferences are preserved. */
final class DemoMode {
    private static final DemoWorkspace workspace = new DemoWorkspace();
    private static volatile long epoch;
    static boolean enabled(Context context) {
        android.content.SharedPreferences preferences = context.getSharedPreferences("demo_mode", Context.MODE_PRIVATE);
        return ReviewAccess.authorized(preferences.getBoolean("enabled", false), ReviewAccessConfig.DIGEST, preferences.getString("authenticated_digest", ""));
    }
    static String preferenceName(Context context, String name) { return enabled(context) ? "demo_" + name : name; }
    static long epoch() { return epoch; }
    static boolean set(Context context, boolean enabled, String code) {
        if (enabled && !ReviewAccess.verify(ReviewAccessConfig.DIGEST, code)) return false;
        synchronized (ResponseNotifications.CURSOR_LOCK) {
            synchronized (workspace) {
                android.content.SharedPreferences.Editor preferences = context.getSharedPreferences("demo_mode", Context.MODE_PRIVATE).edit().putBoolean("enabled", enabled);
                if (enabled) preferences.putString("authenticated_digest", ReviewAccessConfig.DIGEST);
                else preferences.remove("authenticated_digest");
                if (!preferences.commit()) return false;
                ++epoch;
                workspace.reset("ko".equals(new AppLanguage(context).get()));
                return true;
            }
        }
    }
    static void language(boolean korean) { workspace.language(korean); }
    static JSONObject request(String method, String path, String body, long expectedEpoch) throws Exception {
        if (body == null || body.length() > 65536) throw new IllegalArgumentException();
        // Bound long polls without holding the workspace lock. No HTTP connection exists in demo.
        if (path.contains("wait=20")) Thread.sleep(path.startsWith("/v1/completions?") ? 750 : 250);
        synchronized (workspace) {
            if (expectedEpoch != epoch) throw new InterruptedException();
            try { return new JSONObject().put("ok", true).put("status", 200).put("data", new JSONObject(workspace.request(method, path, map(new JSONObject(body))))); }
            catch (DemoWorkspace.Failure invalid) { return new JSONObject().put("ok", false).put("status", 400).put("data", new JSONObject().put("code", invalid.key).put("error", invalid.key)); }
        }
    }
    private static Map<String, Object> map(JSONObject json) throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        Iterator<String> keys = json.keys(); while (keys.hasNext()) { String key = keys.next(); result.put(key, value(json.get(key))); } return result;
    }
    private static Object value(Object value) throws Exception {
        if (value == JSONObject.NULL) return null;
        if (value instanceof JSONObject) return map((JSONObject)value);
        if (value instanceof JSONArray) { List<Object> result = new ArrayList<>(); JSONArray array = (JSONArray)value; for (int i = 0; i < array.length(); i++) result.add(value(array.get(i))); return result; }
        return value;
    }
}
