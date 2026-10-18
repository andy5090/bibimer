package app.bibimer;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import java.io.InputStream;

/** User-requested agent authentication and Claude maintenance in a new Termux terminal, independent of pairing. */
final class TermuxAgentActions {
    static final int REQUEST_PERMISSION = 25;
    interface Status { void update(String agent, String code); }
    private final Activity activity;
    private final Status status;
    private String pendingAgent, pendingAction, pendingLanguage, lastAgent, lastAction;
    private long pendingEpoch, lastStart;

    TermuxAgentActions(Activity activity, Status status) {
        this.activity = activity;
        this.status = status;
    }

    void request(String agent, String action, String language) {
        if (!AgentSetup.supports(agent, action) || DemoMode.enabled(activity) || activity.isDestroyed()) return;
        if (pendingAction != null || (lastStart != 0 && agent.equals(lastAgent) && action.equals(lastAction) && SystemClock.elapsedRealtime() - lastStart < 1500)) return;
        try { activity.getPackageManager().getPackageInfo("com.termux", 0); }
        catch (PackageManager.NameNotFoundException missing) { status.update(agent, "quick_termux_missing"); return; }
        if (!TermuxSetup.permitted(activity)) {
            pendingAgent = agent;
            pendingAction = action;
            pendingLanguage = language;
            pendingEpoch = DemoMode.epoch();
            status.update(agent, "quick_permission");
            try {
                activity.requestPermissions(new String[]{TermuxSetup.PERMISSION}, REQUEST_PERMISSION);
            } catch (Exception ignored) {
                pendingAgent = pendingAction = pendingLanguage = null;
            }
            return;
        }
        start(agent, action, language);
    }

    void permissionResult() {
        String agent = pendingAgent, action = pendingAction, language = pendingLanguage;
        pendingAgent = pendingAction = pendingLanguage = null;
        if (action == null || activity.isDestroyed() || DemoMode.enabled(activity) || pendingEpoch != DemoMode.epoch()) return;
        if (!TermuxSetup.permitted(activity)) { status.update(agent, "quick_permission"); return; }
        start(agent, action, language);
    }

    private void start(String agent, String action, String language) {
        try {
            String version = activity.getPackageManager().getPackageInfo("com.termux", 0).versionName;
            String[] parts = version.split("[.\\-]");
            if (parts.length < 2 || (Integer.parseInt(parts[0]) == 0 && Integer.parseInt(parts[1]) < 118)) {
                status.update(agent, "quick_termux_old"); return;
            }
            String asset = AgentSetup.asset(agent, action), script;
            try (InputStream input = asset == null ? null : activity.getAssets().open(asset)) {
                script = AgentSetup.action(agent, action, input, language);
            }
            Intent command = new Intent("com.termux.RUN_COMMAND")
                .setClassName("com.termux", "com.termux.app.RunCommandService")
                .putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
                .putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"--noprofile", "--norc", "-c", script})
                .putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND", false)
                .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "BIBIMER " + AgentSetup.label(agent) + " " + action);
            // No result callback, output file, or stdin script: authentication stays
            // in Termux, and its terminal remains interactive throughout login.
            activity.startService(command);
            lastAgent = agent; lastAction = action;
            lastStart = SystemClock.elapsedRealtime();
            status.update(agent, "agent_action_sent");
        } catch (PackageManager.NameNotFoundException missing) {
            status.update(agent, "quick_termux_missing");
        } catch (SecurityException denied) {
            status.update(agent, "quick_permission");
        } catch (Exception ignored) {
            status.update(agent, "quick_start_failed");
        }
    }
}
