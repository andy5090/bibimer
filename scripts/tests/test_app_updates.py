"""Run the native update controller against deterministic JVM API doubles.

No APK, network, Play account, real waiting, downloads, or device writes are used.
"""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class AppUpdatesTests(unittest.TestCase):
    def test_play_availability_cache_throttling_and_lifecycle(self):
        sources = {
            "android/content/SharedPreferences.java": """package android.content;
                public interface SharedPreferences {
                    String getString(String k, String d); long getLong(String k, long d); Editor edit();
                    interface Editor {
                        Editor putString(String k, String v); Editor putLong(String k, long v); void apply();
                    }
                }""",
            "android/content/Context.java": """package android.content;
                import android.content.pm.PackageManager;
                public abstract class Context {
                    public static final int MODE_PRIVATE=0;
                    public abstract SharedPreferences getSharedPreferences(String name, int mode);
                    public abstract PackageManager getPackageManager();
                    public String getPackageName() { return "app.bibimer"; }
                }""",
            "android/content/pm/PackageInfo.java": """package android.content.pm;
                public class PackageInfo {
                    public int versionCode=36; public long getLongVersionCode() { return versionCode; }
                }""",
            "android/content/pm/InstallSourceInfo.java": """package android.content.pm;
                public class InstallSourceInfo {
                    private final String installer;
                    public InstallSourceInfo(String value) { installer=value; }
                    public String getInstallingPackageName() { return installer; }
                }""",
            "android/content/pm/PackageManager.java": """package android.content.pm;
                public class PackageManager {
                    public String installer="com.android.vending";
                    public boolean failInstaller, failVersion;
                    public final PackageInfo info=new PackageInfo();
                    public PackageInfo getPackageInfo(String pkg, int flags) {
                        if(failVersion) throw new RuntimeException("missing package"); return info;
                    }
                    public String getInstallerPackageName(String pkg) {
                        if(failInstaller) throw new RuntimeException("installer unavailable"); return installer;
                    }
                    public InstallSourceInfo getInstallSourceInfo(String pkg) {
                        return new InstallSourceInfo(getInstallerPackageName(pkg));
                    }
                }""",
            "android/os/Build.java": """package android.os;
                public class Build { public static class VERSION { public static int SDK_INT=36; } }
            """,
            "org/json/JSONObject.java": """package org.json;
                import java.util.*;
                public class JSONObject {
                    private final Map<String,Object> values=new HashMap<>();
                    public JSONObject put(String k,Object v) { values.put(k,v); return this; }
                    public String getString(String k) { return (String)values.get(k); }
                    public long getLong(String k) { return ((Number)values.get(k)).longValue(); }
                    public boolean getBoolean(String k) { return (Boolean)values.get(k); }
                }""",
            "app/bibimer/DemoMode.java": """package app.bibimer;
                import android.content.Context;
                final class DemoMode {
                    static boolean demo; static long revision;
                    static boolean enabled(Context c) { return demo; }
                    static long epoch() { return revision; }
                }""",
            "com/google/android/play/core/install/model/UpdateAvailability.java": """
                package com.google.android.play.core.install.model;
                public final class UpdateAvailability {
                    public static final int UNKNOWN=0, UPDATE_NOT_AVAILABLE=1, UPDATE_AVAILABLE=2,
                        DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS=3;
                }""",
            "com/google/android/gms/tasks/Task.java": """package com.google.android.gms.tasks;
                public class Task<T> {
                    public interface Success<T> { void onSuccess(T value); }
                    public interface Failure { void onFailure(Exception error); }
                    private Success<T> success; private Failure failure;
                    public Task<T> addOnSuccessListener(Success<T> cb) { success=cb; return this; }
                    public Task<T> addOnFailureListener(Failure cb) { failure=cb; return this; }
                    public void succeed(T value) { if(success != null) success.onSuccess(value); }
                    public void fail() { if(failure != null) failure.onFailure(new RuntimeException("offline")); }
                }""",
            "com/google/android/play/core/appupdate/AppUpdateInfo.java": """
                package com.google.android.play.core.appupdate;
                public final class AppUpdateInfo {
                    private final int availability, version;
                    public AppUpdateInfo(int a,int v) { availability=a; version=v; }
                    public int updateAvailability() { return availability; }
                    public int availableVersionCode() { return version; }
                }""",
            "com/google/android/play/core/appupdate/AppUpdateManager.java": """
                package com.google.android.play.core.appupdate;
                import com.google.android.gms.tasks.Task; import java.util.*;
                // Intentionally exposes no download, install, update-flow, or store-opening APIs.
                public final class AppUpdateManager {
                    public final List<Task<AppUpdateInfo>> requests=new ArrayList<>();
                    public boolean throwRequest;
                    public Task<AppUpdateInfo> getAppUpdateInfo() {
                        if(throwRequest) throw new RuntimeException("SDK unavailable");
                        Task<AppUpdateInfo> task=new Task<>(); requests.add(task); return task;
                    }
                }""",
            "com/google/android/play/core/appupdate/AppUpdateManagerFactory.java": """
                package com.google.android.play.core.appupdate;
                import android.content.Context;
                public final class AppUpdateManagerFactory {
                    public static AppUpdateManager manager; public static int creates;
                    public static boolean throwCreate;
                    public static AppUpdateManager create(Context c) {
                        creates++; if(throwCreate) throw new RuntimeException("missing Play"); return manager;
                    }
                }""",
            "app/bibimer/AppUpdatesTest.java": r"""package app.bibimer;
                import android.content.*; import android.content.pm.*; import android.os.Build;
                import org.json.JSONObject; import java.util.*;
                import com.google.android.gms.tasks.Task;
                import com.google.android.play.core.appupdate.*;
                import com.google.android.play.core.install.model.UpdateAvailability;
                public final class AppUpdatesTest {
                    static int assertions;
                    static final class Store implements SharedPreferences {
                        final Map<String,Object> data=new HashMap<>();
                        public String getString(String k,String d) { return (String)data.getOrDefault(k,d); }
                        public long getLong(String k,long d) { return (Long)data.getOrDefault(k,d); }
                        public Editor edit() { return new Editor() {
                            final Map<String,Object> pending=new HashMap<>();
                            public Editor putString(String k,String v) { pending.put(k,v); return this; }
                            public Editor putLong(String k,long v) { pending.put(k,v); return this; }
                            public void apply() { data.putAll(pending); }
                        }; }
                    }
                    static final class Device extends Context {
                        final Store store=new Store(); final PackageManager pm=new PackageManager();
                        int notifications;
                        public SharedPreferences getSharedPreferences(String name,int mode) {
                            check(name.equals("app_updates") && mode==MODE_PRIVATE,"private update preferences");
                            return store;
                        }
                        public PackageManager getPackageManager() { return pm; }
                    }
                    static Device device() {
                        DemoMode.demo=false; DemoMode.revision++;
                        Build.VERSION.SDK_INT=36; AppUpdateManagerFactory.creates=0;
                        AppUpdateManagerFactory.throwCreate=false;
                        AppUpdateManagerFactory.manager=new AppUpdateManager(); return new Device();
                    }
                    static AppUpdates controller(Device d) { return new AppUpdates(d,()->d.notifications++); }
                    static Task<AppUpdateInfo> task(int index) { return AppUpdateManagerFactory.manager.requests.get(index); }
                    static int requests() { return AppUpdateManagerFactory.manager.requests.size(); }
                    static void result(int index,int availability,int version) {
                        task(index).succeed(new AppUpdateInfo(availability,version));
                    }
                    static void check(boolean yes,String message) {
                        assertions++; if(!yes) throw new AssertionError(message);
                    }
                    static void state(AppUpdates c,String expected) {
                        check(c.status().getString("state").equals(expected),"state must be "+expected+", got "+c.status().getString("state"));
                    }
                    static void cache(Device d,String state,long available,long age) {
                        d.store.data.put("installed",36L); d.store.data.put("state",state);
                        d.store.data.put("available",available);
                        d.store.data.put("attempt",System.currentTimeMillis()-age);
                    }
                    static void availabilityAndThrottle() {
                        Device d=device(); AppUpdates c=controller(d); state(c,"idle");
                        c.check(false); state(c,"checking");
                        check(requests()==1 && AppUpdateManagerFactory.creates==1,"one Play SDK query");
                        c.check(false); c.check(true); check(requests()==1,"no concurrent automatic or manual query");
                        check(d.store.getString("state","").equals("failed"),"unfinished query persisted as retryable failure");
                        result(0,UpdateAvailability.UPDATE_AVAILABLE,37); state(c,"available");
                        check(c.status().getLong("availableVersionCode")==37 && c.status().getBoolean("showNotice"),"higher version notice");
                        c.check(false); check(requests()==1,"success throttled for 24 hours");
                        c.check(true); check(requests()==2 && AppUpdateManagerFactory.creates==1,"manual bypass and manager reuse");
                        result(1,UpdateAvailability.UPDATE_NOT_AVAILABLE,0); state(c,"current");
                        check(!c.status().getBoolean("showNotice") && c.status().getLong("availableVersionCode")==0,"current hides notice");
                        AppUpdates restored=controller(d); state(restored,"current"); restored.check(false);
                        check(requests()==2,"successful cache survives new controller");
                        cache(d,"current",0,AppUpdates.DAY+60000); controller(d).check(false);
                        check(requests()==3,"expired 24 hour cache checks again");
                    }
                    static void dismissalAndMetadata() {
                        Device d=device(); AppUpdates c=controller(d); c.check(true);
                        result(0,UpdateAvailability.UPDATE_AVAILABLE,37); c.dismiss();
                        check(!c.status().getBoolean("showNotice"),"later hides notice");
                        AppUpdates restored=controller(d); state(restored,"available");
                        check(!restored.status().getBoolean("showNotice"),"later survives new controller");
                        restored.check(true); result(1,UpdateAvailability.UPDATE_AVAILABLE,37);
                        check(!restored.status().getBoolean("showNotice"),"same version stays dismissed");
                        restored.check(true); result(2,UpdateAvailability.UPDATE_AVAILABLE,38);
                        check(restored.status().getBoolean("showNotice"),"newer version ignores old dismissal");
                        restored.dismiss(); d.store.data.put("dismiss_until",System.currentTimeMillis()-60000);
                        check(restored.status().getBoolean("showNotice"),"dismissal expires without waiting");
                        d.store.data.put("dismiss_until",System.currentTimeMillis()+AppUpdates.DAY+60000);
                        check(restored.status().getBoolean("showNotice"),"clock rollback cannot extend dismissal indefinitely");
                        Set<String> allowed=new HashSet<>(Arrays.asList("installed","attempt","state","available","dismiss_version","dismiss_until"));
                        for(Map.Entry<String,Object> entry:d.store.data.entrySet()) {
                            check(allowed.contains(entry.getKey()),"only allowlisted public metadata persists");
                            check(entry.getValue() instanceof Long || entry.getKey().equals("state"),"only version/time numbers and state persist");
                        }
                    }
                    static void failuresAndRetry() {
                        Device d=device(); AppUpdates c=controller(d); c.check(true); task(0).fail(); state(c,"failed");
                        c.check(false); check(requests()==1,"failure throttled 15 minutes");
                        cache(d,"failed",0,AppUpdates.RETRY+60000); AppUpdates retry=controller(d); retry.check(false);
                        check(requests()==2,"retry after 15 minutes"); task(1).fail();
                        retry.check(true); check(requests()==3,"manual bypasses failure throttle");
                        result(2,UpdateAvailability.UNKNOWN,99); state(retry,"failed");
                        retry.check(true); result(3,UpdateAvailability.UPDATE_AVAILABLE,36); state(retry,"failed");
                        check(!retry.status().getBoolean("showNotice"),"same installed code never offered");
                        retry.check(true); result(4,UpdateAvailability.UPDATE_AVAILABLE,35); state(retry,"failed");
                        retry.check(true); result(5,UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS,37); state(retry,"failed");
                        d=device(); AppUpdateManagerFactory.throwCreate=true; c=controller(d); c.check(false); state(c,"failed");
                        d=device(); AppUpdateManagerFactory.manager.throwRequest=true; c=controller(d); c.check(false); state(c,"failed");
                        d=device(); c=controller(d); c.check(false);
                        AppUpdates reopened=controller(d); state(reopened,"failed"); reopened.check(false);
                        check(requests()==1,"interrupted query restores failure throttle, not a day-long idle cache");
                        cache(d,"failed",0,AppUpdates.RETRY+60000); reopened=controller(d); reopened.check(false);
                        check(requests()==2,"interrupted query can retry after 15 minutes");
                        result(1,UpdateAvailability.UPDATE_NOT_AVAILABLE,0); state(reopened,"current");
                    }
                    static void invalidationAndDemo() {
                        Device d=device(); AppUpdates c=controller(d); c.check(false); Task<AppUpdateInfo> old=task(0);
                        c.invalidate(); state(c,"idle"); int notices=d.notifications;
                        old.succeed(new AppUpdateInfo(UpdateAvailability.UPDATE_AVAILABLE,37)); old.fail();
                        state(c,"idle"); check(d.notifications==notices,"invalidated callbacks ignored");
                        c.check(false); check(requests()==2,"cancelled check can retry automatically");
                        result(1,UpdateAvailability.UPDATE_NOT_AVAILABLE,0); state(c,"current");
                        c.check(true); old=task(2); DemoMode.demo=true; DemoMode.revision++;
                        state(c,"disabled"); check(!c.status().getBoolean("showNotice"),"demo hides update notice");
                        notices=d.notifications; c.check(true); c.dismiss(); c.storeFailed();
                        check(requests()==3 && d.notifications==notices,"demo forbids checks or preference changes");
                        // Leave demo before the old callback: matching current mode alone is insufficient.
                        DemoMode.demo=false; DemoMode.revision++;
                        old.succeed(new AppUpdateInfo(UpdateAvailability.UPDATE_AVAILABLE,99)); old.fail();
                        state(c,"checking"); check(d.notifications==notices,"epoch prevents stale callback after demo exit");
                        c.invalidate(); c.check(false); check(requests()==4,"demo-invalidated query retries");
                        old=task(3); c.close(); notices=d.notifications;
                        old.succeed(new AppUpdateInfo(UpdateAvailability.UPDATE_AVAILABLE,99)); old.fail();
                        c.check(true); c.dismiss(); c.storeFailed();
                        check(requests()==4 && d.notifications==notices,"destroyed controller ignores callbacks and actions");
                    }
                    static void installationAndCorruptCache() {
                        for(int api:new int[]{26,28,30,36}) {
                            Device d=device(); Build.VERSION.SDK_INT=api; AppUpdates c=controller(d);
                            c.check(false); check(requests()==1,"Play detection supports API "+api);
                        }
                        for(String installer:new String[]{null,"","com.android.shell","org.fdroid.fdroid"}) {
                            Device d=device(); d.pm.installer=installer; AppUpdates c=controller(d); c.check(true);
                            state(c,"unavailable"); check(requests()==0 && AppUpdateManagerFactory.creates==0,"sideload never calls SDK");
                            check(!c.status().getBoolean("showNotice"),"sideload hides notice");
                        }
                        Device d=device(); d.pm.failInstaller=true; AppUpdates c=controller(d); c.check(true); state(c,"unavailable");
                        check(AppUpdateManagerFactory.creates==0,"unknown installer never calls SDK");
                        d=device(); d.pm.failVersion=true; c=controller(d); c.check(true); state(c,"unavailable");
                        check(AppUpdateManagerFactory.creates==0,"unknown installed version never calls SDK");
                        d=device(); cache(d,"available",37,60000); d.pm.info.versionCode=37; c=controller(d); state(c,"idle");
                        check(c.status().getLong("availableVersionCode")==0 && !c.status().getBoolean("showNotice"),"installed update discards stale cache");
                        c.check(false); check(requests()==1,"installed update resets throttle");
                        result(0,UpdateAvailability.UPDATE_NOT_AVAILABLE,0); state(c,"current");
                        d=device(); cache(d,"available",36,60000); c=controller(d); state(c,"idle");
                        check(!c.status().getBoolean("showNotice"),"invalid cached available code never offered");
                        d=device(); cache(d,"available",37,AppUpdates.DAY+60000); c=controller(d); state(c,"idle");
                        check(!c.status().getBoolean("showNotice"),"expired available cache never offered");
                        d=device(); cache(d,"current",0,-60000); c=controller(d); state(c,"idle"); c.check(false);
                        check(requests()==1,"future check timestamp does not block checking");
                        d=device(); d.store.data.put("installed","invalid"); d.store.data.put("attempt","invalid");
                        c=controller(d); state(c,"idle"); c.check(false); check(requests()==1,"corrupt metadata recovers");
                        d=device(); cache(d,"current",0,60000); d.store.data.put("state",123L);
                        c=controller(d); state(c,"idle");
                    }
                    public static void main(String[] args) {
                        availabilityAndThrottle(); dismissalAndMetadata(); failuresAndRetry();
                        invalidationAndDemo(); installationAndCorruptCache();
                        System.out.println("App updates: "+assertions+" assertions; availability, throttle, persistence, lifecycle, demo and installer isolation passed");
                    }
                }""",
        }
        with tempfile.TemporaryDirectory(prefix="bibimer-updates-test-") as directory:
            target = Path(directory)
            for name, text in sources.items():
                file = target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(text)
            compiled = subprocess.run([
                "javac", "-encoding", "UTF-8", "-d", directory,
                *map(str, target.rglob("*.java")),
                str(ROOT / "android/app/src/main/java/app/bibimer/AppUpdates.java"),
            ], capture_output=True, text=True)
            self.assertEqual(compiled.returncode, 0, compiled.stdout + compiled.stderr)
            result = subprocess.run(["java", "-cp", directory, "app.bibimer.AppUpdatesTest"],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("installer isolation passed", result.stdout)
            print(result.stdout.strip())
