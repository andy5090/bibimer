package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;

/** Last confirmed Termux project locations; no project contents or credentials. */
final class ProjectLocations {
    private final Context context;
    private final SharedPreferences preferences;

    ProjectLocations(Context context) {
        this.context = context;
        preferences = context.getSharedPreferences("project_locations", Context.MODE_PRIVATE);
    }

    private static boolean valid(String path) {
        if (path == null || !path.startsWith("/") || path.length() > 4096) return false;
        for (int i = 0; i < path.length(); i++) {
            if (path.charAt(i) < 32 || path.charAt(i) == 127) return false;
        }
        return true;
    }

    private String get(String key) {
        if (DemoMode.enabled(context)) return "";
        try {
            String value = preferences.getString(key, "");
            return valid(value) ? value : "";
        } catch (ClassCastException invalid) { return ""; }
    }

    String parent() { return get("parent"); }
    String folder() { return get("folder"); }

    synchronized boolean set(String parent, String folder) {
        if (DemoMode.enabled(context) || !valid(parent) || !valid(folder)) return false;
        return preferences.edit().putString("parent", parent).putString("folder", folder).commit();
    }
}
