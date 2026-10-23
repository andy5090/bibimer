package app.bibimer;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONObject;

/** Fixed bundled maintenance, independent of Downloads, pairing and agent authentication. */
final class BridgeMaintenance {
    static final int REQUEST_PERMISSION = 26;
    private static final String ACTION = "app.bibimer.BRIDGE_MAINTENANCE_RESULT";
    private String pending, pendingRecovery;
    private long epoch;

    static boolean supports(String action) { return "update".equals(action) || "restart".equals(action); }
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences("bridge-maintenance", Context.MODE_PRIVATE); }
    private static void phase(Context c, String value) { prefs(c).edit().putString("phase", value).commit(); }

    static synchronized String status(Context c) {
        String value = prefs(c).getString("phase", "");
        if ("bridge_maintenance_running".equals(value) && System.currentTimeMillis() - prefs(c).getLong("started", 0) > 60000) {
            phase(c, "bridge_maintenance_failed");
            return "bridge_maintenance_failed";
        }
        return value;
    }

    // Deliberately narrow wire format: only canonical UUIDs, never shell text.
    static boolean validRecovery(String action, String value) {
        String id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
        return "update".equals(action) && value != null && value.length() <= 5200 &&
            value.matches("\\{\"id\":\"" + id + "\",\"instance\":\"" + id +
                "\",\"session_ids\":\\[\"" + id + "\"(?:,\"" + id + "\"){0,127}\\]\\}");
    }

    void request(Activity activity, String action) { request(activity, action, null); }

    void request(Activity activity, String action, String recovery) {
        if (recovery != null && !validRecovery(action, recovery)) return;
        if (!supports(action) || DemoMode.enabled(activity) || activity.isDestroyed() || pending != null ||
            "bridge_maintenance_running".equals(status(activity))) return;
        if (!TermuxSetup.permitted(activity)) {
            pending = action; pendingRecovery = recovery; epoch = DemoMode.epoch();
            phase(activity, "quick_permission");
            try { activity.requestPermissions(new String[]{TermuxSetup.PERMISSION}, REQUEST_PERMISSION); }
            catch (Exception ignored) { pending = null; pendingRecovery = null; }
            return;
        }
        start(activity, action, recovery);
    }

    void permissionResult(Activity activity) {
        String action = pending, recovery = pendingRecovery; pending = null; pendingRecovery = null;
        if (action == null || activity.isDestroyed() || DemoMode.enabled(activity) || epoch != DemoMode.epoch()) return;
        if (!TermuxSetup.permitted(activity)) { phase(activity, "quick_permission"); return; }
        start(activity, action, recovery);
    }

    private static PendingIntent callback(Context c, String id) {
        return PendingIntent.getBroadcast(c, 0, new Intent(c, BridgeMaintenanceReceiver.class).setAction(ACTION)
            .setData(Uri.parse("bibimer-maintenance://result/" + id)),
            PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
    }

    private static synchronized void start(Activity activity, String action, String recovery) {
        try {
            if ("bridge_maintenance_running".equals(status(activity))) return;
            String[] version = activity.getPackageManager().getPackageInfo("com.termux", 0).versionName.split("[.\\-]");
            if (version.length < 2 || (Integer.parseInt(version[0]) == 0 && Integer.parseInt(version[1]) < 118)) {
                phase(activity, "quick_termux_old"); return;
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream input = activity.getAssets().open("bridge-maintenance.py")) {
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > 220000) throw new IllegalStateException();
                }
            }
            String helper = new String(output.toByteArray(), StandardCharsets.UTF_8);
            if (helper.isEmpty() || helper.contains("BIBIMER_MAINTENANCE_PYTHON") || helper.indexOf('\0') >= 0) throw new IllegalStateException();
            String script = "python - " + action + " <<'BIBIMER_MAINTENANCE_PYTHON'\n" + helper + "\nBIBIMER_MAINTENANCE_PYTHON\n";
            if (recovery != null) script = "BIBIMER_MAINTENANCE_REOPEN='" +
                java.util.Base64.getEncoder().encodeToString(recovery.getBytes(StandardCharsets.UTF_8)) + "' " + script;
            if (script.length() > 228000) throw new IllegalStateException();
            String id = UUID.randomUUID().toString();
            if (!prefs(activity).edit().putString("id", id).putString("phase", "bridge_maintenance_running")
                .putLong("started", System.currentTimeMillis()).commit()) throw new IllegalStateException();
            Intent command = new Intent("com.termux.RUN_COMMAND")
                .setClassName("com.termux", "com.termux.app.RunCommandService")
                .putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
                .putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"--noprofile", "--norc", "-s"})
                .putExtra("com.termux.RUN_COMMAND_STDIN", script)
                .putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND", true)
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND_CUSTOM_LOG_LEVEL", "0")
                .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "BIBIMER bridge " + action)
                .putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", callback(activity, id));
            activity.startService(command);
        } catch (PackageManager.NameNotFoundException missing) { phase(activity, "quick_termux_missing"); }
        catch (SecurityException denied) { phase(activity, "quick_permission"); }
        catch (Exception ignored) { phase(activity, "quick_start_failed"); }
    }

    static synchronized void receive(Context context, Intent intent) {
        try {
            String id = prefs(context).getString("id", "");
            if (id.isEmpty() || !"bridge_maintenance_running".equals(status(context)) || !ACTION.equals(intent.getAction()) ||
                !Uri.parse("bibimer-maintenance://result/" + id).equals(intent.getData())) return;
            Bundle result = intent.getBundleExtra("result");
            if (result == null) { phase(context, "bridge_maintenance_failed"); return; }
            if (result.getInt("err", 0) != -1) {
                phase(context, result.getString("errmsg", "").contains("allow-external-apps") ? "quick_external" : "quick_start_failed"); return;
            }
            String output = result.getString("stdout", "");
            if (output.length() > 256) throw new IllegalStateException();
            String code = new JSONObject(output).getString("status");
            boolean success = result.getInt("exitCode", -1) == 0;
            phase(context, success && code.equals("bridge_maintenance_done") ? code :
                !success && (code.equals("bridge_maintenance_busy") || code.equals("bridge_maintenance_running")) ? code : "bridge_maintenance_failed");
        } catch (Exception ignored) { phase(context, "bridge_maintenance_failed"); }
    }
}
