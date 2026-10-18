package app.bibimer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Non-exported, single-use result receiver; only fixed status codes reach the UI. */
public final class BridgeMaintenanceReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        BridgeMaintenance.receive(context.getApplicationContext(), intent);
    }
}
