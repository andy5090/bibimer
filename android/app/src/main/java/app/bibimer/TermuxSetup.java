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

/** Fixed, user-initiated bootstrap; no arbitrary executable or script from the WebView. */
final class TermuxSetup {
    static final String PERMISSION = "com.termux.permission.RUN_COMMAND";
    static final int REQUEST_PERMISSION = 24;
    private static final long DEADLINE = 15 * 60 * 1000;
    private static final String ACTION = "app.bibimer.TERMUX_SETUP_RESULT";

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("termux-setup", Context.MODE_PRIVATE);
    }

    static boolean permitted(Context context) {
        return context.checkSelfPermission(PERMISSION) == PackageManager.PERMISSION_GRANTED;
    }

    static synchronized JSONObject status(Context context) throws Exception {
        SharedPreferences p = prefs(context);
        String phase = p.getString("phase", "idle");
        if ((phase.equals("running") || phase.equals("connecting")) &&
                System.currentTimeMillis() - p.getLong("started", 0) > DEADLINE) {
            phase = "quick_timeout";
            p.edit().putString("phase", phase).commit();
        }
        return new JSONObject().put("phase", phase).put("id", p.getString("id", ""))
            .put("permitted", permitted(context));
    }

    static synchronized void fail(Context context, String phase) {
        prefs(context).edit().putString("phase", phase).commit();
    }

    static synchronized void forget(Context context, TokenStore tokens) {
        SharedPreferences p = prefs(context);
        String id = p.getString("id", "");
        if (!id.isEmpty()) callback(context, id).cancel();
        p.edit().clear().commit();
        tokens.clear();
    }

    private static PendingIntent callback(Context context, String id) {
        Intent result = new Intent(context, TermuxSetupReceiver.class).setAction(ACTION)
            .setData(Uri.parse("bibimer-setup://result/" + id));
        return PendingIntent.getBroadcast(context, 0, result,
            PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
    }

    static synchronized void start(Activity activity) {
        try {
            String phase = status(activity).getString("phase");
            if (phase.equals("running") || phase.equals("connecting")) return;
            String version = activity.getPackageManager().getPackageInfo("com.termux", 0).versionName;
            String[] parts = version.split("[.\\-]");
            if (parts.length < 2 || (Integer.parseInt(parts[0]) == 0 && Integer.parseInt(parts[1]) < 118)) {
                fail(activity, "quick_termux_old"); return;
            }
            if (!permitted(activity)) {
                fail(activity, "quick_permission");
                activity.requestPermissions(new String[]{PERMISSION}, REQUEST_PERMISSION);
                return;
            }
            String script = script(activity);
            String id = UUID.randomUUID().toString();
            if (!prefs(activity).edit().putString("id", id).putString("phase", "running")
                    .putLong("started", System.currentTimeMillis()).commit()) throw new IllegalStateException();
            Intent command = new Intent("com.termux.RUN_COMMAND")
                .setClassName("com.termux", "com.termux.app.RunCommandService")
                .putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash")
                .putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"--noprofile", "--norc", "-s"})
                .putExtra("com.termux.RUN_COMMAND_STDIN", script)
                .putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home")
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND", true)
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND_CUSTOM_LOG_LEVEL", "0")
                .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "BIBIMER setup")
                .putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", callback(activity, id));
            activity.startService(command);
        } catch (PackageManager.NameNotFoundException missing) {
            fail(activity, "quick_termux_missing");
        } catch (SecurityException denied) {
            fail(activity, "quick_permission");
        } catch (Exception ignored) {
            fail(activity, "quick_start_failed");
        }
    }

    private static String asset(Context context, String name) throws Exception {
        try (InputStream input = context.getAssets().open(name)) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                if (output.size() > 220000) throw new IllegalStateException();
            }
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    static String script(Context context) throws Exception {
        String installer = asset(context, "bibimer-setup.sh");
        String helper = asset(context, "setup-connect.py");
        String script = asset(context, "quick-setup.sh").replace("__BIBIMER_INSTALLER__", installer)
            .replace("__BIBIMER_CONNECT_HELPER__", helper);
        // Android serializes strings as UTF-16. Leave headroom under the documented intent limit.
        if (script.length() > 220000) throw new IllegalStateException();
        return script;
    }

    static synchronized void receive(Context context, Intent intent) {
        SharedPreferences p = prefs(context);
        try {
            String id = p.getString("id", "");
            String phase = status(context).getString("phase");
            if (!phase.equals("running") || id.isEmpty() || !ACTION.equals(intent.getAction()) ||
                    !Uri.parse("bibimer-setup://result/" + id).equals(intent.getData())) return;
            Bundle bundle = intent.getBundleExtra("result");
            if (bundle == null) { fail(context, "quick_start_failed"); return; }
            if (bundle.getInt("err", 0) != -1) {
                String error = bundle.getString("errmsg", "");
                fail(context, error.contains("allow-external-apps") ? "quick_external" : "quick_start_failed");
                return;
            }
            String stdout = bundle.getString("stdout", "");
            if (stdout.length() > 2048) throw new IllegalStateException();
            JSONObject result = new JSONObject(stdout);
            if (bundle.getInt("exitCode", -1) != 0) {
                String code = result.optString("error");
                fail(context, code.matches("quick_(python|install|bridge)_failed") || code.equals("quick_busy") ? code : "quick_start_failed");
                return;
            }
            String code = result.getString("code");
            if (result.getInt("protocol") != 1 || !code.matches("[0-9]{8}")) throw new IllegalStateException();
            fail(context, "connecting");
            JSONObject paired = new LocalBridge(new TokenStore(context)).request("POST", "/v1/pair",
                new JSONObject().put("code", code).toString());
            fail(context, paired.optBoolean("ok") ? "connected" : "quick_pair_failed");
        } catch (Exception ignored) {
            fail(context, p.getString("phase", "").equals("connecting") ? "quick_pair_failed" : "quick_start_failed");
        }
    }
}
