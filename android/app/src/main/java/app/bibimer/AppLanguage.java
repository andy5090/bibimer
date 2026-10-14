package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.LocaleList;
import java.util.Locale;

/** App copy defaults to English regardless of the device language. */
final class AppLanguage {
    private final Context context;
    private final SharedPreferences preferences;
    private volatile String language;

    AppLanguage(Context context) {
        this.context = context;
        preferences = context.getSharedPreferences(DemoMode.preferenceName(context, "appearance"), Context.MODE_PRIVATE);
        String saved = preferences.getString("language", "en");
        language = supported(saved) ? saved : "en";
    }

    String get() { return language; }

    synchronized boolean set(String value) {
        if (!supported(value)) return false;
        if (!preferences.edit().putString("language", value).commit()) return false;
        language = value;
        return true;
    }

    String text(int resource) {
        Configuration configuration = new Configuration(context.getResources().getConfiguration());
        configuration.setLocales(new LocaleList(Locale.forLanguageTag(language)));
        return context.createConfigurationContext(configuration).getString(resource);
    }

    private static boolean supported(String value) {
        return "en".equals(value) || "ko".equals(value) || "pt-BR".equals(value)
            || "es".equals(value) || "id".equals(value);
    }
}
