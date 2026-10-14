"""Native preference lifecycle with Android API doubles; no APK or device writes."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ProjectLocationTests(unittest.TestCase):
    def test_persistence_atomic_failure_validation_and_demo_isolation(self):
        sources = {
            "android/content/SharedPreferences.java": """package android.content;
                public interface SharedPreferences {
                    String getString(String key, String fallback); Editor edit();
                    interface Editor { Editor putString(String key, String value); boolean commit(); }
                }""",
            "android/content/Context.java": """package android.content;
                public abstract class Context {
                    public static final int MODE_PRIVATE = 0;
                    public abstract SharedPreferences getSharedPreferences(String name, int mode);
                }""",
            "app/bibimer/DemoMode.java": """package app.bibimer;
                import android.content.Context;
                final class DemoMode { static boolean demo; static boolean enabled(Context c) { return demo; } }
            """,
            "app/bibimer/ProjectLocationsTest.java": """package app.bibimer;
                import android.content.*; import java.util.*;
                public final class ProjectLocationsTest {
                    static final class Store implements SharedPreferences {
                        final Map<String, Object> data = new HashMap<>(); boolean fail;
                        public String getString(String k, String d) { return (String)data.getOrDefault(k, d); }
                        public Editor edit() { return new Editor() {
                            final Map<String, Object> pending = new HashMap<>();
                            public Editor putString(String k, String v) { pending.put(k, v); return this; }
                            public boolean commit() { if (fail) return false; data.putAll(pending); return true; }
                        }; }
                    }
                    static final class Device extends Context {
                        final Store store = new Store();
                        public SharedPreferences getSharedPreferences(String name, int mode) {
                            if (!name.equals("project_locations") || mode != MODE_PRIVATE) throw new AssertionError();
                            return store;
                        }
                    }
                    static void check(boolean value) { if (!value) throw new AssertionError(); }
                    public static void main(String[] args) {
                        Device device = new Device(); ProjectLocations saved = new ProjectLocations(device);
                        check(saved.parent().equals("") && saved.folder().equals(""));
                        check(saved.set("/projects 한글", "/projects 한글/app"));
                        ProjectLocations reopened = new ProjectLocations(device);
                        check(reopened.parent().equals("/projects 한글"));
                        check(reopened.folder().equals("/projects 한글/app"));
                        device.store.fail = true;
                        check(!reopened.set("/elsewhere", "/elsewhere/new"));
                        check(new ProjectLocations(device).parent().equals("/projects 한글"));
                        check(new ProjectLocations(device).folder().equals("/projects 한글/app"));
                        device.store.fail = false;
                        for (String value : new String[]{null, "", "relative", "~/projects", "/bad\\npath", "/bad\\u007fpath", "/" + String.join("", Collections.nCopies(4097, "x"))}) {
                            check(!reopened.set(value, "/ok")); check(!reopened.set("/ok", value));
                        }
                        DemoMode.demo = true;
                        check(saved.parent().equals("") && reopened.folder().equals(""));
                        check(!saved.set("/demo", "/demo/projects"));
                        DemoMode.demo = false;
                        check(saved.folder().equals("/projects 한글/app"));
                        device.store.data.put("parent", Integer.valueOf(1));
                        device.store.data.put("folder", "relative");
                        check(saved.parent().equals("") && saved.folder().equals(""));
                        check(saved.set("/", "/root-project"));
                        check(new ProjectLocations(device).parent().equals("/"));
                        System.out.println("Project locations: reopen, atomic failed save, Unicode/root, invalid state and demo isolation passed");
                    }
                }""",
        }
        with tempfile.TemporaryDirectory(prefix="bibimer-locations-test-") as directory:
            target = Path(directory)
            for name, text in sources.items():
                file = target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(text)
            subprocess.run([
                "javac", "-encoding", "UTF-8", "-d", directory,
                *map(str, target.rglob("*.java")),
                str(ROOT / "android/app/src/main/java/app/bibimer/ProjectLocations.java"),
            ], capture_output=True, text=True, check=True)
            result = subprocess.run(["java", "-cp", directory, "app.bibimer.ProjectLocationsTest"],
                                    capture_output=True, text=True, check=True)
            self.assertIn("demo isolation passed", result.stdout)
            print(result.stdout.strip())
