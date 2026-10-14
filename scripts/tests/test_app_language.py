"""App-language persistence with Android API doubles; no APK or device changes."""
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "android/app/src/main"


class AppLanguageTests(unittest.TestCase):
    def test_native_catalogs_cover_default_strings(self):
        def strings(folder):
            return {e.attrib["name"]: e.text for e in ET.parse(SRC / "res" / folder / "strings.xml").getroot()}
        base = strings("values")
        for folder in ("values-ko", "values-pt-rBR", "values-es", "values-in", "values-b+zh+Hans", "values-ja", "values-b+zh+Hant", "values-fr", "values-de"):
            translated = strings(folder)
            self.assertEqual(base.keys(), translated.keys(), folder)
            self.assertTrue(all(text and text.strip() for text in translated.values()), folder)

    def test_system_language_selection_persistence_and_failed_save(self):
        stubs = {
            "android/content/SharedPreferences.java": '''package android.content;
                public interface SharedPreferences {
                    String getString(String key, String fallback); Editor edit();
                    interface Editor { Editor putString(String key, String value); boolean commit(); }
                }''',
            "android/content/res/Configuration.java": '''package android.content.res;
                import android.os.LocaleList;
                public class Configuration {
                    public LocaleList locales;
                    public Configuration() {} public Configuration(Configuration source) { locales = source.locales; }
                    public void setLocales(LocaleList value) { locales = value; }
                    public LocaleList getLocales() { return locales; }
                }''',
            "android/os/LocaleList.java": '''package android.os;
                import java.util.Locale;
                public class LocaleList {
                    private final Locale[] locales;
                    public LocaleList(Locale... values) { locales = values; }
                    public int size() { return locales.length; }
                    public Locale get(int index) { return locales[index]; }
                }''',
            "android/content/res/Resources.java": '''package android.content.res;
                public class Resources {
                    public final Configuration config = new Configuration();
                    public Configuration getConfiguration() { return config; }
                }''',
            "android/content/Context.java": '''package android.content;
                import android.content.res.*;
                public abstract class Context {
                    public static final int MODE_PRIVATE = 0;
                    public abstract SharedPreferences getSharedPreferences(String name, int mode);
                    public Resources getResources() { return new Resources(); }
                    public abstract Context createConfigurationContext(Configuration value);
                    public abstract String getString(int resource);
                }''',
            "app/bibimer/DemoMode.java": '''package app.bibimer;
                import android.content.Context;
                final class DemoMode { static boolean enabled; static String preferenceName(Context c, String name) { return enabled ? "demo-" + name : name; } }''',
            "app/bibimer/AppLanguageTest.java": '''package app.bibimer;
                import android.content.*; import android.content.res.*; import java.util.*;
                public class AppLanguageTest {
                    static class Store implements SharedPreferences {
                        String saved; boolean fail;
                        public String getString(String key, String fallback) { return saved == null ? fallback : saved; }
                        public Editor edit() { return new Editor() {
                            String pending;
                            public Editor putString(String key, String value) { pending = value; return this; }
                            public boolean commit() { if (fail) return false; saved = pending; return true; }
                        }; }
                    }
                    static class Device extends Context {
                        final Map<String, Store> stores = new HashMap<>();
                        final Resources resources = new Resources(); Configuration textConfig;
                        public SharedPreferences getSharedPreferences(String name, int mode) { return stores.computeIfAbsent(name, key -> new Store()); }
                        Store store() { return (Store)getSharedPreferences(DemoMode.preferenceName(this, "appearance"), 0); }
                        public Resources getResources() { return resources; }
                        public Context createConfigurationContext(Configuration value) { textConfig = value; return this; }
                        public String getString(int resource) { return textConfig.getLocales().get(0).toLanguageTag(); }
                        void locales(String... tags) {
                            Locale[] values = new Locale[tags.length];
                            for (int i = 0; i < tags.length; i++) values[i] = Locale.forLanguageTag(tags[i]);
                            resources.config.setLocales(new android.os.LocaleList(values));
                        }
                    }
                    static void check(boolean ok) { if (!ok) throw new AssertionError(); }
                    public static void main(String[] args) {
                        Device device = new Device(); device.locales("ko-KR");
                        AppLanguage app = new AppLanguage(device);
                        check(app.preference().equals("system")); check(app.get().equals("ko"));
                        check(device.store().saved == null);
                        String[][] cases = {
                            {"en-GB", "en"}, {"ko-KR", "ko"}, {"es-MX", "es"}, {"pt-PT", "pt-BR"},
                            {"pt-BR", "pt-BR"}, {"id-ID", "id"}, {"in-ID", "id"}, {"zh", "zh-Hans"},
                            {"zh-CN", "zh-Hans"}, {"zh-SG", "zh-Hans"}, {"zh-Hans-TW", "zh-Hans"},
                            {"zh-TW", "zh-Hant"}, {"zh-HK", "zh-Hant"}, {"zh-MO", "zh-Hant"}, {"zh-Hant-CN", "zh-Hant"},
                            {"fr-FR", "fr"}, {"fr-CA", "fr"}, {"ja-JP", "ja"}, {"de-AT", "de"}, {"zh-Hans-HK", "zh-Hans"}, {"zh-Latn", "en"}, {"ar", "en"}
                        };
                        for (String[] row : cases) {
                            device.locales(row[0]); check(app.get().equals(row[1]));
                            check(app.text(1).equals(row[1]));
                            check(app.preference().equals("system"));
                        }
                        device.locales("zh-Hant-TW", "fr", "es-AR", "ko"); check(app.get().equals("zh-Hant"));
                        device.locales("ar", "pt-PT", "ko"); check(app.get().equals("pt-BR"));
                        device.locales("en", "ko"); check(app.get().equals("en"));
                        device.locales(); check(app.get().equals("en"));
                        device.locales("ko-KR");
                        for (String code : new String[]{"en", "ko", "pt-BR", "es", "id", "zh-Hans", "ja", "zh-Hant", "fr", "de"}) {
                            check(app.set(code)); check(app.get().equals(code)); check(app.preference().equals(code));
                            check(new AppLanguage(device).get().equals(code)); check(app.text(1).equals(code));
                            String policy = "https://bibimer.app/" + (code.equals("en") ? "" : code + "/") + "privacy/";
                            check(app.privacyUrl().equals(policy));
                        }
                        check(app.set("en")); device.locales("es-MX"); check(app.get().equals("en"));
                        check(new AppLanguage(device).get().equals("en"));
                        check(app.set("system")); check(app.get().equals("es"));
                        check(app.privacyUrl().equals("https://bibimer.app/es/privacy/"));
                        check(new AppLanguage(device).preference().equals("system"));
                        device.locales("id-ID"); check(app.get().equals("id"));
                        check(new AppLanguage(device).get().equals("id"));
                        for (String code : new String[]{null, "ar", "pt", "zh", "zh-CN", "zh-TW", "../../", "https://example.org", "__proto__", ""}) {
                            check(!app.set(code)); check(app.preference().equals("system"));
                        }
                        device.store().fail = true; check(!app.set("es"));
                        check(app.preference().equals("system")); check(new AppLanguage(device).get().equals("id"));
                        device.store().fail = false; check(app.set("en"));
                        device.store().fail = true; check(!app.set("system")); check(app.get().equals("en"));
                        check(new AppLanguage(device).preference().equals("en"));
                        device.store().fail = false;
                        for (String invalid : new String[]{"unknown", "https://example.org", "../../"}) {
                            device.store().saved = invalid; AppLanguage restored = new AppLanguage(device);
                            check(restored.preference().equals("system")); check(restored.get().equals("id"));
                            check(restored.privacyUrl().equals("https://bibimer.app/id/privacy/"));
                        }
                        check(app.set("es")); DemoMode.enabled = true;
                        AppLanguage demo = new AppLanguage(device); check(demo.preference().equals("system"));
                        check(demo.set("ko")); check(demo.get().equals("ko"));
                        DemoMode.enabled = false; check(new AppLanguage(device).get().equals("es"));
                        System.out.println("AppLanguage: system locale priority, ten overrides, dynamic changes, privacy URL, demo isolation, invalid input and failed save passed");
                    }
                }''',
        }
        with tempfile.TemporaryDirectory(prefix="bibimer-language-test-") as folder:
            target = Path(folder)
            for name, content in stubs.items():
                file = target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(content)
            sources = [str(file) for file in target.rglob("*.java")]
            sources.append(str(SRC / "java/app/bibimer/AppLanguage.java"))
            subprocess.run(["javac", "-encoding", "UTF-8", "-d", folder, *sources], check=True, capture_output=True, text=True)
            result = subprocess.run(["java", "-cp", folder, "app.bibimer.AppLanguageTest"], check=True, capture_output=True, text=True)
            self.assertIn("failed save passed", result.stdout)
            print(result.stdout.strip())


if __name__ == "__main__":
    unittest.main()
