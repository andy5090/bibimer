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
        for folder in ("values-ko", "values-pt-rBR", "values-es", "values-in", "values-b+zh+Hans"):
            translated = strings(folder)
            self.assertEqual(base.keys(), translated.keys(), folder)
            self.assertTrue(all(text and text.strip() for text in translated.values()), folder)

    def test_default_selection_persistence_and_failed_save(self):
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
                }''',
            "android/os/LocaleList.java": '''package android.os;
                import java.util.Locale;
                public class LocaleList { public final Locale locale; public LocaleList(Locale value) { locale = value; } }''',
            "android/content/res/Resources.java": '''package android.content.res;
                public class Resources {
                    public Configuration getConfiguration() { return new Configuration(); }
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
                final class DemoMode { static String preferenceName(Context c, String name) { return name; } }''',
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
                        final Store store = new Store(); Configuration config;
                        public SharedPreferences getSharedPreferences(String name, int mode) { return store; }
                        public Context createConfigurationContext(Configuration value) { config = value; return this; }
                        public String getString(int resource) { return config.locales.locale.toLanguageTag(); }
                    }
                    static void check(boolean ok) { if (!ok) throw new AssertionError(); }
                    public static void main(String[] args) {
                        Locale.setDefault(Locale.forLanguageTag("es"));
                        Device device = new Device(); AppLanguage app = new AppLanguage(device);
                        check(app.get().equals("en"));
                        for (String code : new String[]{"en", "ko", "pt-BR", "es", "id", "zh-Hans"}) {
                            check(app.set(code)); check(app.get().equals(code));
                            check(new AppLanguage(device).get().equals(code));
                            check(app.text(1).equals(code));
                            String policy = "https://bibimer.app/" + (code.equals("en") ? "" : code + "/") + "privacy/";
                            check(app.privacyUrl().equals(policy));
                        }
                        for (String code : new String[]{null, "fr", "pt", "zh", "zh-CN", "zh-Hant", "../../", "https://example.org", "__proto__", ""}) {
                            check(!app.set(code)); check(app.get().equals("zh-Hans"));
                        }
                        device.store.fail = true; check(!app.set("es"));
                        check(app.get().equals("zh-Hans")); check(new AppLanguage(device).get().equals("zh-Hans"));
                        device.store.saved = "unknown"; check(new AppLanguage(device).get().equals("en"));
                        check(new AppLanguage(device).privacyUrl().equals("https://bibimer.app/privacy/"));
                        System.out.println("AppLanguage: default, six locales, reload, resource locale, privacy URL, invalid input and failed save passed");
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
