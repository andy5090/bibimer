package app.bibimer;

import android.view.View;
import android.webkit.WebView;

/** UI-thread only. Covers unfinished frames without reloading the workspace. */
final class AppScreenCover {
    private final View cover;
    private final WebView web;
    private long generation;
    private Runnable timeout;

    AppScreenCover(View cover, WebView web) {
        this.cover = cover;
        this.web = web;
    }

    long show(long timeoutMillis) {
        cancelTimeout();
        long ticket = ++generation;
        cover.setVisibility(View.VISIBLE);
        // No minimum display time and no dependency on bridge/network readiness.
        timeout = () -> hide(ticket);
        cover.postDelayed(timeout, timeoutMillis);
        return ticket;
    }

    void hideWhenDrawn(long ticket) {
        if (ticket != generation) return;
        web.postVisualStateCallback(ticket, new WebView.VisualStateCallback() {
            @Override public void onComplete(long requestId) { hide(ticket); }
        });
    }

    void stop() {
        ++generation;
        cancelTimeout();
        cover.setVisibility(View.VISIBLE);
    }

    void close() {
        ++generation;
        cancelTimeout();
    }

    private void hide(long ticket) {
        if (ticket != generation) return;
        cancelTimeout();
        cover.setVisibility(View.GONE);
    }

    private void cancelTimeout() {
        if (timeout != null) cover.removeCallbacks(timeout);
        timeout = null;
    }
}
