"""Exercise the actual Android preference store without building an APK."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ContextPreferencesTests(unittest.TestCase):
    def test_default_reopen_failure_validation_and_demo_isolation(self):
        sources = {
            'android/content/SharedPreferences.java': '''package android.content;
                public interface SharedPreferences {
                    String getString(String key, String fallback); Editor edit();
                    interface Editor { Editor putString(String key, String value); boolean commit(); }
                }''',
            'android/content/Context.java': '''package android.content;
                import java.util.*;
                public class Context {
                    public static final int MODE_PRIVATE=0;
                    public final Map<String,Store> stores=new HashMap<>();
                    public SharedPreferences getSharedPreferences(String name,int mode) {
                        return stores.computeIfAbsent(name,key->new Store());
                    }
                    public static class Store implements SharedPreferences {
                        public final Map<String,String> data=new HashMap<>(); public boolean fail;
                        public String getString(String key,String fallback) { return data.getOrDefault(key,fallback); }
                        public Editor edit() { return new Editor() {
                            final Map<String,String> pending=new HashMap<>();
                            public Editor putString(String key,String value) { pending.put(key,value);return this; }
                            public boolean commit() { if(fail)return false;data.putAll(pending);return true; }
                        }; }
                    }
                }''',
            'app/bibimer/DemoMode.java': '''package app.bibimer;
                public class DemoMode { static boolean demo;
                    static String preferenceName(android.content.Context context,String name) { return demo?"demo-"+name:name; }
                }''',
            'app/bibimer/ContextPreferencesTest.java': '''package app.bibimer;
                import android.content.Context;
                public class ContextPreferencesTest {
                    static void check(boolean ok) { if(!ok)throw new AssertionError(); }
                    public static void main(String[] args) {
                        Context context=new Context(); InputPreferences original=new InputPreferences(context);
                        check(original.getContextDisplay().equals("used"));
                        check(original.setEnterBehavior("send"));
                        check(original.setContextDisplay("remaining"));
                        InputPreferences reopened=new InputPreferences(context);
                        check(reopened.getContextDisplay().equals("remaining"));
                        check(reopened.getEnterBehavior().equals("send"));
                        for(String invalid:new String[]{null,"","both","USED","other"})check(!reopened.setContextDisplay(invalid));
                        check(reopened.getContextDisplay().equals("remaining"));
                        context.stores.get("input").fail=true;
                        check(!reopened.setContextDisplay("used"));
                        check(reopened.getContextDisplay().equals("remaining"));
                        check(new InputPreferences(context).getContextDisplay().equals("remaining"));
                        context.stores.get("input").fail=false;
                        check(reopened.setContextDisplay("used"));
                        check(new InputPreferences(context).getContextDisplay().equals("used"));
                        check(reopened.setContextDisplay("remaining"));
                        DemoMode.demo=true;
                        InputPreferences demo=new InputPreferences(context);
                        check(demo.getContextDisplay().equals("used"));check(demo.setContextDisplay("used"));
                        DemoMode.demo=false;
                        check(new InputPreferences(context).getContextDisplay().equals("remaining"));
                        context.stores.get("input").data.put("context_display","invalid");
                        check(new InputPreferences(context).getContextDisplay().equals("used"));
                        System.out.println("Context preferences: default, persistence, atomic failed save, validation and demo isolation passed");
                    }
                }''',
        }
        with tempfile.TemporaryDirectory(prefix='bibimer-context-preferences-') as directory:
            target = Path(directory)
            for name, source in sources.items():
                file = target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(source)
            subprocess.run(['javac', '-encoding', 'UTF-8', '-d', directory,
                *map(str, target.rglob('*.java')),
                str(ROOT / 'android/app/src/main/java/app/bibimer/InputPreferences.java')],
                capture_output=True, text=True, check=True)
            result = subprocess.run(['java', '-cp', directory, 'app.bibimer.ContextPreferencesTest'],
                                    capture_output=True, text=True, check=True)
            self.assertIn('demo isolation passed', result.stdout)


if __name__ == '__main__':
    unittest.main()
