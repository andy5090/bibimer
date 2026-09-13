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
        preferences = context.getSharedPreferences("appearance", Context.MODE_PRIVATE);
        language = "ko".equals(preferences.getString("language", "en")) ? "ko" : "en";
    }

    String get() { return language; }

    synchronized boolean set(String value) {
        if (!"en".equals(value) && !"ko".equals(value)) return false;
        if (!preferences.edit().putString("language", value).commit()) return false;
        language = value;
        return true;
    }

    String text(int resource) {
        Configuration configuration = new Configuration(context.getResources().getConfiguration());
        configuration.setLocales(new LocaleList(Locale.forLanguageTag(language)));
        return context.createConfigurationContext(configuration).getString(resource);
    }
}
