package app.bibimer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Non-exported receiver; only the single-use PendingIntent can deliver a setup result. */
public final class TermuxSetupReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        PendingResult pending = goAsync();
        new Thread(() -> {
            try { TermuxSetup.receive(context.getApplicationContext(), intent); }
            finally { pending.finish(); }
        }, "bibimer-setup-result").start();
    }
}
