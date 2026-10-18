package app.bibimer;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import java.io.InputStream;

/** User-requested Claude maintenance in a new Termux terminal, independent of pairing. */
final class TermuxClaudeActions {
    static final int REQUEST_PERMISSION = 25;
    interface Status { void update(String code); }
    private final Activity activity;
    private final Status status;
    private String pendingAction, pendingLanguage;
    private long pendingEpoch, lastStart;

    TermuxClaudeActions(Activity activity, Status status) {
        this.activity = activity;
        this.status = status;
    }

    void request(String action, String language) {
        if (!ClaudeSetup.supports(action) || DemoMode.enabled(activity) || activity.isDestroyed()) return;
        if (pendingAction != null || (lastStart != 0 && SystemClock.elapsedRealtime() - lastStart < 1500)) return;
        try { activity.getPackageManager().getPackageInfo("com.termux", 0); }
        catch (PackageManager.NameNotFoundException missing) { status.update("quick_termux_missing"); return; }
        if (!TermuxSetup.permitted(activity)) {
            pendingAction = action;
            pendingLanguage = language;
            pendingEpoch = DemoMode.epoch();
            status.update("quick_permission");
            try {
                activity.requestPermissions(new String[]{TermuxSetup.PERMISSION}, REQUEST_PERMISSION);
            } catch (Exception ignored) {
                pendingAction = null;
            }
            return;
        }
        start(action, language);
    }

    void permissionResult() {
        String action = pendingAction, language = pendingLanguage;
        pendingAction = pendingLanguage = null;
        if (action == null || activity.isDestroyed() || DemoMode.enabled(activity) || pendingEpoch != DemoMode.epoch()) return;
        if (!TermuxSetup.permitted(activity)) { status.update("quick_permission"); return; }
        start(action, language);
    }

    private void start(String action, String language) {
        try {
            String version = activity.getPackageManager().getPackageInfo("com.termux", 0).versionName;
            String[] parts = version.split("[.\\-]");
            if (parts.length < 2 || (Integer.parseInt(parts[0]) == 0 && Integer.parseInt(parts[1]) < 118)) {
                status.update("quick_termux_old"); return;
            }
            String asset = ClaudeSetup.asset(action), script;
            try (InputStream input = asset == null ? null : activity.getAssets().open(asset)) {
                script = ClaudeSetup.action(action, input, language);
            }
            Intent command = new Intent("com.termux.RUN_COMMAND")
                .setClassName("com.termux", "com.termux.app.RunCommandService")
                .putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
                .putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"--noprofile", "--norc", "-c", script})
                .putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND", false)
                .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "BIBIMER Claude " + action);
            // No result callback, output file, or stdin script: authentication stays
            // in Termux, and its terminal remains interactive throughout login.
            activity.startService(command);
            lastStart = SystemClock.elapsedRealtime();
            status.update("claude_action_sent");
        } catch (PackageManager.NameNotFoundException missing) {
            status.update("quick_termux_missing");
        } catch (SecurityException denied) {
            status.update("quick_permission");
        } catch (Exception ignored) {
            status.update("quick_start_failed");
        }
    }
}
