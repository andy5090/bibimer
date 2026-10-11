package app.bibimer;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.service.notification.StatusBarNotification;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/** Reads completion metadata for every session, never sends agent commands. */
public final class ResponseNotificationService extends Service {
    static final String OPEN_SESSION = "app.bibimer.OPEN_SESSION";
    private static final String DISABLE = "app.bibimer.DISABLE_RESPONSE_NOTIFICATIONS";
    private static final int ONGOING = 1;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean alive;
    private boolean started;
    private TokenStore tokens;
    private LocalBridge bridge;
    private boolean demo;
    private long demoEpoch;
    private SharedPreferences preferences;
    private boolean currentMode() { return demo == DemoMode.enabled(this) && demoEpoch == DemoMode.epoch(); }
    private boolean enabled() { return preferences.getBoolean("enabled", true); }

    @Override public void onCreate() {
        super.onCreate(); tokens = new TokenStore(this); bridge = new LocalBridge(tokens); alive = true;
        demo = DemoMode.enabled(this); demoEpoch = DemoMode.epoch(); preferences = ResponseNotifications.preferences(this);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && DISABLE.equals(intent.getAction())) {
            synchronized (ResponseNotifications.CURSOR_LOCK) {
                if (!currentMode() || intent.getBooleanExtra("notification_demo", false) != demo) { if (!started) stopSelf(); return START_NOT_STICKY; }
                preferences.edit().putBoolean("enabled", false).commit();
                ResponseNotifications.clearCursor(preferences);
            }
            stopSelf(); return START_NOT_STICKY;
        }
        tokens.reload();
        if (!currentMode() || !enabled() || !ResponseNotifications.allowed(this) || (!demo && tokens.get().isEmpty())) {
            stopSelf(); return START_NOT_STICKY;
        }
        ResponseNotifications.channels(this);
        AppLanguage language = new AppLanguage(this);
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent disable = PendingIntent.getService(this, 1, new Intent(this, ResponseNotificationService.class).setAction(DISABLE)
            .setData(Uri.parse("bibimer://alerts/" + (demo ? "demo" : "termux"))).putExtra("notification_demo", demo),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification ongoing = new Notification.Builder(this, demo ? "demo_response_monitor" : ResponseNotifications.MONITOR)
            .setSmallIcon(R.drawable.ic_notification).setContentTitle(language.text(demo ? R.string.notification_demo_monitor_title : R.string.notification_monitor_title))
            .setContentText(language.text(demo ? R.string.notification_demo_monitor_body : R.string.notification_monitor_body)).setContentIntent(open)
            .setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false).setCategory(Notification.CATEGORY_SERVICE)
            .addAction(new Notification.Action.Builder(null, language.text(R.string.notification_stop_alerts), disable).build()).build();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(ONGOING, ongoing, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(ONGOING, ongoing);
        } catch (RuntimeException ignored) {
            ResponseNotifications.state = "failed"; stopSelf(); return START_NOT_STICKY;
        }
        if (!started) { started = true; worker.execute(this::monitor); }
        return START_NOT_STICKY;
    }

    private void monitor() {
        String instance;
        long cursor, epoch;
        synchronized (ResponseNotifications.CURSOR_LOCK) {
            instance = preferences.getString("instance", "none");
            cursor = preferences.getLong("cursor", 0);
            epoch = preferences.getLong("epoch", 0);
        }
        while (alive && !Thread.currentThread().isInterrupted()) {
            if (!currentMode()) break;
            if (!enabled() || !ResponseNotifications.allowed(this)) {
                synchronized (ResponseNotifications.CURSOR_LOCK) { if (currentMode()) ResponseNotifications.clearCursor(preferences); }
                break;
            }
            try {
                synchronized (ResponseNotifications.CURSOR_LOCK) {
                    if (epoch != preferences.getLong("epoch", 0)) {
                        epoch = preferences.getLong("epoch", 0); instance = "none"; cursor = 0;
                    }
                }
                tokens.reload();
                if (!demo && tokens.get().isEmpty()) break;
                String path = "/v1/completions?cursor=" + cursor + "&instance=" + instance + "&wait=20";
                JSONObject result = demo ? DemoMode.request("GET", path, "{}", demoEpoch) : bridge.request("GET", path, "{}");
                if (!alive || !currentMode()) break;
                if (result.optInt("status") == 404) { ResponseNotifications.state = "unsupported"; break; }
                if (result.optInt("status") == 401) { ResponseNotifications.state = "unpaired"; break; }
                if (!result.optBoolean("ok")) throw new IllegalStateException();
                JSONObject data = result.getJSONObject("data");
                String nextInstance = data.getString("instance");
                long nextCursor = data.getLong("cursor");
                if (!nextInstance.matches("[a-f0-9-]{36}") || nextCursor < 0) throw new IllegalStateException();
                if (data.getBoolean("reset") || !instance.equals(nextInstance)) {
                    instance = nextInstance; cursor = nextCursor;
                } else {
                    JSONArray events = data.getJSONArray("events");
                    for (int i = 0; i < events.length(); i++) {
                        if (!alive || !currentMode() || !enabled() || !ResponseNotifications.allowed(this)) break;
                        JSONObject event = events.getJSONObject(i);
                        long id = event.getLong("id");
                        if (id <= cursor) continue;
                        if (id > nextCursor) throw new IllegalStateException();
                        synchronized (ResponseNotifications.CURSOR_LOCK) {
                            if (!alive || !currentMode() || !enabled() || !ResponseNotifications.allowed(this) || epoch != preferences.getLong("epoch", 0)) throw new IllegalStateException();
                            post(instance, event);
                            cursor = id;
                            if (!preferences.edit().putString("instance", instance).putLong("cursor", cursor).commit()) throw new IllegalStateException();
                        }
                    }
                    cursor = nextCursor;
                }
                synchronized (ResponseNotifications.CURSOR_LOCK) {
                    if (!alive || !currentMode() || !enabled() || !ResponseNotifications.allowed(this) || epoch != preferences.getLong("epoch", 0)) continue;
                    if (!preferences.edit().putString("instance", instance).putLong("cursor", cursor).commit()) throw new IllegalStateException();
                    ResponseNotifications.state = "listening";
                }
            } catch (Exception ignored) {
                if (!alive || !currentMode() || Thread.currentThread().isInterrupted()) break;
                synchronized (ResponseNotifications.CURSOR_LOCK) { if (currentMode()) ResponseNotifications.state = "reconnecting"; }
                try { Thread.sleep(5000); } catch (InterruptedException done) { Thread.currentThread().interrupt(); break; }
            }
        }
        stopSelf();
    }

    private void post(String instance, JSONObject event) throws Exception {
        String session = event.getString("session_id"), project = event.getString("project_id");
        if (!session.matches("[a-f0-9-]{36}") || !project.matches("[a-f0-9-]{36}")) throw new IllegalStateException();
        String prefix = demo ? "demo-response/" : "response/";
        String tag = prefix + instance + "/" + event.getLong("id");
        Intent intent = new Intent(this, MainActivity.class).setAction(OPEN_SESSION).setData(Uri.parse("bibimer://" + tag))
            .putExtra("notification_session", session).putExtra("notification_project", project)
            .putExtra("notification_demo", demo)
            .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AppLanguage language = new AppLanguage(this);
        String title = event.optString("project_name", "BIBIMER");
        String sessionTitle = event.optString("session_title", "");
        String agent = event.optString("agent");
        String agentName = agent.equals("codex") ? "Codex" : agent.equals("claude") ? "Claude" : "OpenCode";
        String text = event.optString("preview", "").trim();
        if (text.codePointCount(0, text.length()) > 180)
            text = text.substring(0, text.offsetByCodePoints(0, 179)).trim() + "…";
        if (text.isEmpty()) text = language.text(R.string.notification_response_complete);
        String channel = demo ? "demo_responses" : ResponseNotifications.RESPONSES;
        Notification hidden = new Notification.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification).setContentTitle("BIBIMER")
            .setContentText(language.text(demo ? R.string.notification_demo_complete : R.string.notification_response_complete)).build();
        Notification notification = new Notification.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification).setContentTitle(title).setContentText(text)
            .setSubText(sessionTitle.isEmpty() ? agentName : sessionTitle)
            .setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(open)
            .setWhen((long)(event.getDouble("completed_at") * 1000)).setAutoCancel(true).setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_STATUS).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(hidden).build();
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(tag, 2, notification);
        StatusBarNotification[] active = manager.getActiveNotifications();
        Arrays.sort(active, Comparator.comparingLong(StatusBarNotification::getPostTime).reversed());
        int count = 0;
        for (StatusBarNotification item : active) if (item.getTag() != null && item.getTag().startsWith(prefix) && ++count > 40)
            manager.cancel(item.getTag(), item.getId());
    }

    @Override public void onDestroy() {
        alive = false; bridge.cancelPoll(); worker.shutdownNow(); stopForeground(STOP_FOREGROUND_REMOVE);
        if (currentMode() && ("listening".equals(ResponseNotifications.state) || "reconnecting".equals(ResponseNotifications.state))) ResponseNotifications.state = "stopped";
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
