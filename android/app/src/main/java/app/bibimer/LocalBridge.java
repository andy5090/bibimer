package app.bibimer;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** No remote host, proxy, redirect, or token-bearing URL can be supplied by the UI. */
final class LocalBridge {
    private final TokenStore tokens;
    private volatile HttpURLConnection poll;

    LocalBridge(TokenStore tokens) { this.tokens = tokens; }

    JSONObject request(String method, String path, String body) throws Exception {
        boolean get = method.equals("GET");
        boolean pair = path.equals("/v1/pair") && method.equals("POST");
        boolean allowed = get && (path.equals("/v1/health") ||
            path.matches("/v1/completions\\?cursor=[0-9]{1,16}&instance=(none|[a-f0-9-]{36})&wait=(0|20)") ||
            path.matches("/v1/sessions/[a-f0-9-]{36}/events\\?cursor=[0-9]{1,16}&wait=(0|20)"));
        allowed |= method.equals("POST") && (pair || path.equals("/v1/project") || path.equals("/v1/project/manage") || path.equals("/v1/project-agent") || path.equals("/v1/project-session") || path.equals("/v1/worktrees") || path.equals("/v1/models") || path.equals("/v1/folders") || path.equals("/v1/sessions") || path.equals("/v1/session-history") ||
            path.matches("/v1/sessions/[a-f0-9-]{36}/(input|resize|stop|message|respond|interrupt|options|queue|steer|manage)"));
        if (!allowed || body.length() > 65536) throw new IllegalArgumentException("Invalid local request");
        HttpURLConnection connection = (HttpURLConnection)
            new URL("http://127.0.0.1:8765" + path).openConnection(Proxy.NO_PROXY);
        boolean polling = path.contains("/events?") || path.startsWith("/v1/completions?");
        if (polling) poll = connection;
        try {
            connection.setRequestMethod(method);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(pair ? 2000 : 3000);
            connection.setReadTimeout(pair ? 4000 : polling || path.equals("/v1/session-history") || path.equals("/v1/models") || path.equals("/v1/sessions") || path.endsWith("/options") ? 25000 : 6000);
            connection.setUseCaches(false);
            if (!pair) connection.setRequestProperty("Authorization", "Bearer " + tokens.get());
            if (!get) {
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (stream == null) throw new IllegalStateException("Empty response");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream input = stream) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > 2 * 1024 * 1024) throw new IllegalStateException("Oversized response");
                }
            }
            JSONObject data = new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8));
            if (pair && status == 200) {
                if (data.optInt("protocol") != 1) throw new IllegalStateException("Unsupported protocol");
                tokens.save(data.getString("token"));
                data.remove("token"); // Never deliver the bearer token to JavaScript.
            }
            return new JSONObject().put("ok", status == 200).put("status", status).put("data", data);
        } finally {
            connection.disconnect();
            if (polling && poll == connection) poll = null;
        }
    }

    void cancelPoll() {
        HttpURLConnection current = poll;
        if (current != null) current.disconnect();
    }
}
