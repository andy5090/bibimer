package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;

/** Composer preferences shared by projects, sessions, and interface modes. */
final class InputPreferences {
    private final SharedPreferences preferences;
    private volatile String enterBehavior;

    InputPreferences(Context context) {
        preferences = context.getSharedPreferences("input", Context.MODE_PRIVATE);
        enterBehavior = "send".equals(preferences.getString("enter_behavior", "newline")) ? "send" : "newline";
    }

    String getEnterBehavior() { return enterBehavior; }

    synchronized boolean setEnterBehavior(String value) {
        if (!"newline".equals(value) && !"send".equals(value)) return false;
        if (!preferences.edit().putString("enter_behavior", value).commit()) return false;
        enterBehavior = value;
        return true;
    }
}
