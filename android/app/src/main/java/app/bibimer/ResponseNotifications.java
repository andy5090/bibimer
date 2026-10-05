package app.bibimer;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONObject;

/** Notification consent and channel settings, independent of any agent permission. */
final class ResponseNotifications {
    static final Object CURSOR_LOCK = new Object();
    static final int PERMISSION_REQUEST = 42;
    static final String RESPONSES = "responses", MONITOR = "response_monitor";
    static volatile String state = "stopped";

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("response_notifications", Context.MODE_PRIVATE);
    }

    static boolean enabled(Context context) { return preferences(context).getBoolean("enabled", true); }

    static void channels(Context context) {
        AppLanguage language = new AppLanguage(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel responses = new NotificationChannel(RESPONSES,
            language.text(R.string.notification_channel_responses), NotificationManager.IMPORTANCE_DEFAULT);
        responses.setDescription(language.text(R.string.notification_channel_description));
        responses.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(responses);
        manager.createNotificationChannel(new NotificationChannel(MONITOR,
            language.text(R.string.notification_channel_monitor), NotificationManager.IMPORTANCE_LOW));
    }

    static boolean allowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel channel = manager.getNotificationChannel(RESPONSES);
        return manager.areNotificationsEnabled() && (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE);
    }

    static JSONObject status(Context context) throws Exception {
        return new JSONObject().put("enabled", enabled(context)).put("allowed", allowed(context)).put("state", state);
    }

    static void clearCursor(Context context) {
        synchronized (CURSOR_LOCK) {
            SharedPreferences prefs = preferences(context);
            prefs.edit().remove("instance").remove("cursor").putLong("epoch", prefs.getLong("epoch", 0) + 1).commit();
        }
    }

    static void stop(Context context, boolean clear) {
        context.stopService(new Intent(context, ResponseNotificationService.class));
        if (clear) clearCursor(context);
    }

    static void ensure(Activity activity, boolean supported, boolean requestPermission) {
        if (!enabled(activity) || !supported) {
            stop(activity, !enabled(activity));
            return;
        }
        channels(activity);
        if (!allowed(activity)) {
            stop(activity, true);
            if (requestPermission && Build.VERSION.SDK_INT >= 33 &&
                    activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                if (preferences(activity).edit().putBoolean("asked", true).commit())
                    activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
            }
            return;
        }
        try { activity.startForegroundService(new Intent(activity, ResponseNotificationService.class)); }
        catch (RuntimeException ignored) { state = "failed"; }
    }
}
