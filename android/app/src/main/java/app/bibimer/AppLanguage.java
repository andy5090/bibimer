package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.LocaleList;
import java.util.Locale;

/** Follows the device locale list unless the user explicitly selects a language. */
final class AppLanguage {
    private final Context context;
    private final SharedPreferences preferences;
    private volatile String preference;

    AppLanguage(Context context) {
        this.context = context;
        preferences = context.getSharedPreferences(DemoMode.preferenceName(context, "appearance"), Context.MODE_PRIVATE);
        String saved = preferences.getString("language", "system");
        preference = supported(saved) ? saved : "system";
    }

    String preference() { return preference; }

    String get() {
        String selected = preference;
        if (!"system".equals(selected)) return selected;
        LocaleList locales = context.getResources().getConfiguration().getLocales();
        for (int index = 0; index < locales.size(); index++) {
            String matched = match(locales.get(index));
            if (matched != null) return matched;
        }
        return "en";
    }

    synchronized boolean set(String value) {
        if (!supported(value)) return false;
        if (!preferences.edit().putString("language", value).commit()) return false;
        preference = value;
        return true;
    }

    String text(int resource) {
        Configuration configuration = new Configuration(context.getResources().getConfiguration());
        configuration.setLocales(new LocaleList(Locale.forLanguageTag(get())));
        return context.createConfigurationContext(configuration).getString(resource);
    }

    String privacyUrl() {
        String selected = get();
        return "https://bibimer.app/" + ("en".equals(selected) ? "" : selected + "/") + "privacy/";
    }

    private static String match(Locale locale) {
        String code = locale.getLanguage();
        if ("en".equals(code) || "ko".equals(code) || "es".equals(code) || "ja".equals(code) || "fr".equals(code) || "de".equals(code)) return code;
        if ("pt".equals(code)) return "pt-BR";
        if ("id".equals(code) || "in".equals(code)) return "id";
        if (!"zh".equals(code)) return null;
        String script = locale.getScript(), region = locale.getCountry();
        if ("Hans".equals(script)) return "zh-Hans";
        if ("Hant".equals(script)) return "zh-Hant";
        if (!script.isEmpty()) return null;
        if ("TW".equals(region) || "HK".equals(region) || "MO".equals(region)) return "zh-Hant";
        return "zh-Hans";
    }

    private static boolean supported(String value) {
        return "system".equals(value) || "en".equals(value) || "ko".equals(value) || "pt-BR".equals(value)
            || "es".equals(value) || "id".equals(value) || "zh-Hans".equals(value) || "zh-Hant".equals(value)
            || "ja".equals(value) || "fr".equals(value) || "de".equals(value);
    }
}
