package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;
import org.json.JSONObject;

/** Read-only Play availability. Never downloads, installs, restarts or opens a store. */
final class AppUpdates {
    static final long DAY = 24 * 60 * 60 * 1000L;
    static final long RETRY = 15 * 60 * 1000L;
    private final Context context;
    private final SharedPreferences preferences;
    private final Runnable changed;
    private final long installed;
    private String state = "idle";
    private long available, lastAttempt, ticket;
    private boolean checking, closed;
    private AppUpdateManager manager;

    AppUpdates(Context context, Runnable changed) {
        this.context = context;
        this.changed = changed;
        preferences = context.getSharedPreferences("app_updates", Context.MODE_PRIVATE);
        long version = 0;
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            version = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception ignored) { }
        installed = version;
        if (number("installed") == installed) {
            lastAttempt = number("attempt");
            long age = System.currentTimeMillis() - lastAttempt;
            if (age >= 0 && age < DAY) {
                try { state = preferences.getString("state", "idle"); }
                catch (ClassCastException ignored) { }
                if (!"available".equals(state) && !"current".equals(state) && !"failed".equals(state)) state = "idle";
                available = number("available");
                if (state.equals("available") && available <= installed) state = "idle";
            }
        }
    }

    private long number(String key) {
        try { return preferences.getLong(key, 0); }
        catch (ClassCastException ignored) { return 0; }
    }

    private boolean fromPlay() {
        try {
            String installer = Build.VERSION.SDK_INT >= 30 ?
                context.getPackageManager().getInstallSourceInfo(context.getPackageName()).getInstallingPackageName() :
                context.getPackageManager().getInstallerPackageName(context.getPackageName());
            return "com.android.vending".equals(installer);
        } catch (Exception ignored) { return false; }
    }

    synchronized JSONObject status() {
        JSONObject result = new JSONObject();
        try {
            boolean demo = DemoMode.enabled(context);
            long remaining = number("dismiss_until") - System.currentTimeMillis();
            boolean dismissed = number("dismiss_version") == available && remaining > 0 && remaining <= DAY;
            result.put("state", demo ? "disabled" : state)
                .put("availableVersionCode", demo ? 0 : available)
                .put("showNotice", !demo && state.equals("available") && !dismissed);
        } catch (Exception ignored) { }
        return result;
    }

    synchronized void check(boolean manual) {
        if (closed || checking || DemoMode.enabled(context)) return;
        if (!fromPlay() || installed <= 0) {
            state = "unavailable"; available = 0; changed.run(); return;
        }
        long now = System.currentTimeMillis(), age = now - lastAttempt;
        long interval = state.equals("failed") ? RETRY : DAY;
        if (!manual && lastAttempt != 0 && age >= 0 && age < interval) return;
        final long request = ++ticket;
        final long modeEpoch = DemoMode.epoch();
        checking = true; state = "checking"; lastAttempt = now;
        save(); changed.run();
        try {
            if (manager == null) manager = AppUpdateManagerFactory.create(context);
            manager.getAppUpdateInfo().addOnSuccessListener(info -> {
                synchronized (AppUpdates.this) {
                    if (!current(request, modeEpoch)) return;
                    checking = false;
                    available = info.availableVersionCode();
                    if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && available > installed) state = "available";
                    else if (info.updateAvailability() == UpdateAvailability.UPDATE_NOT_AVAILABLE) { state = "current"; available = 0; }
                    else { state = "failed"; available = 0; }
                    save(); changed.run();
                }
            }).addOnFailureListener(error -> fail(request, modeEpoch));
        } catch (RuntimeException ignored) { fail(request, modeEpoch); }
    }

    private boolean current(long request, long modeEpoch) {
        return !closed && request == ticket && modeEpoch == DemoMode.epoch() && !DemoMode.enabled(context);
    }

    private synchronized void fail(long request, long modeEpoch) {
        if (!current(request, modeEpoch)) return;
        checking = false; state = "failed"; available = 0; save(); changed.run();
    }

    private void save() {
        // Only public version numbers and check/dismiss times; no account IDs or credentials.
        preferences.edit().putLong("installed", installed).putLong("attempt", lastAttempt)
            .putLong("available", available).putString("state", checking ? "failed" : state).apply();
    }

    synchronized void dismiss() {
        if (closed || DemoMode.enabled(context) || !state.equals("available")) return;
        preferences.edit().putLong("dismiss_version", available)
            .putLong("dismiss_until", System.currentTimeMillis() + DAY).apply();
        changed.run();
    }

    synchronized void storeFailed() {
        if (closed || DemoMode.enabled(context)) return;
        state = "store_failed"; changed.run();
    }

    synchronized void invalidate() {
        ++ticket;
        if (checking) { state = "idle"; lastAttempt = 0; }
        checking = false;
    }
    synchronized void close() { closed = true; invalidate(); }
}
