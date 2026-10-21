package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;

/** Composer preferences shared by projects, sessions, and interface modes. */
final class InputPreferences {
    private final SharedPreferences preferences;
    private volatile String enterBehavior;
    private volatile String contextDisplay;

    InputPreferences(Context context) {
        preferences = context.getSharedPreferences(DemoMode.preferenceName(context, "input"), Context.MODE_PRIVATE);
        enterBehavior = "send".equals(preferences.getString("enter_behavior", "newline")) ? "send" : "newline";
        contextDisplay = "remaining".equals(preferences.getString("context_display", "used")) ? "remaining" : "used";
    }

    String getEnterBehavior() { return enterBehavior; }
    String getContextDisplay() { return contextDisplay; }

    synchronized boolean setContextDisplay(String value) {
        if (!"used".equals(value) && !"remaining".equals(value)) return false;
        if (!preferences.edit().putString("context_display", value).commit()) return false;
        contextDisplay = value;
        return true;
    }

    synchronized boolean setEnterBehavior(String value) {
        if (!"newline".equals(value) && !"send".equals(value)) return false;
        if (!preferences.edit().putString("enter_behavior", value).commit()) return false;
        enterBehavior = value;
        return true;
    }
}
