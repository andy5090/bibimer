package app.bibimer;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String PAGE = "https://" + ASSET_HOST + "/index.html";
    private static final int EXPORT_INSTALLER = 10;
    private static final Set<String> ASSETS = new HashSet<>(Arrays.asList(
        "index.html", "app.js", "app.css", "i18n.js", "conversation.js", "rich-text.js", "brand.svg", "vendor/marked.js", "vendor/highlight.js", "vendor/xterm.js", "vendor/xterm.css", "vendor/addon-fit.js"));
    private final ExecutorService actions = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<Runnable>(128));
    private final ExecutorService events = Executors.newSingleThreadExecutor();
    private WebView web;
    private TokenStore tokens;
    private AppLanguage language;
    private AgentPreferences agentPreferences;
    private LocalBridge bridge;
    private volatile boolean destroyed;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        tokens = new TokenStore(this);
        language = new AppLanguage(this);
        agentPreferences = new AgentPreferences(this);
        bridge = new LocalBridge(tokens);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(17, 20, 23));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() |
                    WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17, 20, 23));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setDomStorageEnabled(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // Navigation never brings external content into this privileged WebView.
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
                if ("https".equals(uri.getScheme()) && ASSET_HOST.equals(uri.getHost()) &&
                    "GET".equals(request.getMethod()) && ASSETS.contains(path)) {
                    try {
                        String type = path.endsWith(".js") ? "application/javascript" :
                            path.endsWith(".css") ? "text/css" : path.endsWith(".svg") ? "image/svg+xml" : "text/html";
                        return new WebResourceResponse(type, "UTF-8", getAssets().open(path));
                    } catch (Exception ignored) { }
                }
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
        });
        web.addJavascriptInterface(new NativeApi(), "Bibimer");
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        web.loadUrl(PAGE);
    }

    private void script(String source) {
        runOnUiThread(() -> { if (!destroyed) web.evaluateJavascript(source, null); });
    }

    private void reply(String id, JSONObject result) {
        script("window.BibimerNativeReply && window.BibimerNativeReply(" + JSONObject.quote(id) + "," + result + ");");
    }

    private void error(String id, String code, int message) {
        try {
            reply(id, new JSONObject().put("ok", false).put("status", 0)
                .put("data", new JSONObject().put("code", code).put("error", language.text(message))));
        } catch (Exception ignored) { }
    }

    private void toast(int message) {
        runOnUiThread(() -> Toast.makeText(this, language.text(message), Toast.LENGTH_LONG).show());
    }

    private boolean termuxInstalled() {
        try { getPackageManager().getPackageInfo("com.termux", 0); return true; }
        catch (Exception ignored) { return false; }
    }

    private final class NativeApi {
        @JavascriptInterface public String environment() {
            try {
                return new JSONObject().put("paired", !tokens.get().isEmpty())
                    .put("termuxInstalled", termuxInstalled()).put("language", language.get())
                    .put("agentOptions", agentPreferences.get())
                    .put("version", "0.8.1").toString();
            } catch (Exception ignored) { return "{}"; }
        }

        @JavascriptInterface public boolean setLanguage(String value) {
            return language.set(value);
        }

        @JavascriptInterface public boolean setAgentOptions(String agent, String value) {
            return agentPreferences.set(agent, value);
        }

        @JavascriptInterface public void request(String id, String method, String path, String body) {
            if (id.length() > 80 || destroyed) return;
            ExecutorService executor = path.contains("/events?") ? events : actions;
            try {
                executor.execute(() -> {
                    try { reply(id, bridge.request(method, path, body)); }
                    catch (Exception ignored) {
                        error(id, "error_connection_failed", R.string.error_connection_failed);
                    }
                });
            } catch (RejectedExecutionException ignored) {
                error(id, "error_input_busy", R.string.error_input_busy);
            }
        }

        @JavascriptInterface public void forget() {
            bridge.cancelPoll();
            tokens.clear();
        }

        @JavascriptInterface public void cancelPoll() {
            bridge.cancelPoll();
        }

        @JavascriptInterface public void openTermux() {
            runOnUiThread(() -> {
                Intent intent = getPackageManager().getLaunchIntentForPackage("com.termux");
                if (intent == null) toast(R.string.install_termux_first);
                else startActivity(intent);
            });
        }

        @JavascriptInterface public void openGuide(String guide) {
            String url;
            if (guide.equals("termux")) url = "https://f-droid.org/packages/com.termux/";
            else if (guide.equals("termux-help")) url = "https://github.com/termux/termux-app#installation";
            else if (guide.equals("codex")) url = "https://github.com/openai/codex";
            else if (guide.equals("claude")) url = "https://code.claude.com/docs/en/setup";
            else if (guide.equals("opencode")) url = "https://opencode.ai/docs/";
            else return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (Exception ignored) { toast(R.string.browser_required); }
            });
        }

        @JavascriptInterface public void openLink(String url) {
            if (url == null || url.length() > 8192 || url.matches("(?s).*[\\x00-\\x20].*")) return;
            Uri uri = Uri.parse(url);
            if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) ||
                uri.getHost() == null || uri.getUserInfo() != null) return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (Exception ignored) { toast(R.string.browser_required); }
            });
        }

        @JavascriptInterface public void copyCommand(String name) {
            String command;
            if (name.equals("storage")) command = "termux-setup-storage";
            else if (name.equals("install")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "bash ~/storage/downloads/bibimer-setup.sh";
            else if (name.equals("claude-adapter")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "BIBIMER_CLAUDE=1 bash ~/storage/downloads/bibimer-setup.sh";
            else if (name.equals("claude-repair")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "BIBIMER_CLAUDE_TERMUX=1 bash ~/storage/downloads/bibimer-setup.sh";
            else if (name.equals("start")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "~/.local/bin/bibimer-bridge start";
            else if (name.equals("restart")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "~/.local/bin/bibimer-bridge restart";
            else if (name.equals("pair")) command = ("ko".equals(language.get()) ? "BIBIMER_LANGUAGE=ko " : "") + "~/.local/bin/bibimer-bridge pair";
            else return;
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText(language.text(R.string.clipboard_label), command));
                toast(R.string.command_copied);
            });
        }

        @JavascriptInterface public void copyText(String text) {
            if (text == null || text.length() > 65536) return;
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("Bibimer", text));
                toast(R.string.command_copied);
            });
        }

        @JavascriptInterface public void exportInstaller() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/octet-stream");
                    intent.putExtra(Intent.EXTRA_TITLE, "bibimer-setup.sh");
                    startActivityForResult(intent, EXPORT_INSTALLER);
                } catch (Exception ignored) { toast(R.string.file_picker_failed); }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == EXPORT_INSTALLER && result == RESULT_OK && data != null && data.getData() != null) {
            Uri target = data.getData();
            actions.execute(() -> {
                try (InputStream input = getAssets().open("bibimer-setup.sh");
                     OutputStream output = getContentResolver().openOutputStream(target, "wt")) {
                    if (output == null) throw new IllegalStateException();
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    toast(R.string.installer_saved);
                } catch (Exception ignored) { toast(R.string.installer_save_failed); }
            });
        }
    }

    @Override protected void onPause() {
        script("window.BibimerPause && window.BibimerPause();");
        bridge.cancelPoll();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) script("window.BibimerResume && window.BibimerResume();");
    }

    @Override protected void onDestroy() {
        destroyed = true;
        bridge.cancelPoll();
        actions.shutdownNow();
        events.shutdownNow();
        web.removeJavascriptInterface("Bibimer");
        web.destroy();
        // Activity lifecycle deliberately never calls the session stop endpoint.
        super.onDestroy();
    }
}
