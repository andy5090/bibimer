package app.bibimer;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONObject;

/** Fixed HTTPS destinations; never retries, redirects, logs or returns error bodies. */
final class VoiceTranscription {
    interface Connector { HttpURLConnection open(URL url) throws IOException; }
    interface Current { boolean current(); }
    static final int MAX_AUDIO = 8 * 1024 * 1024;
    private final Connector connector;
    private volatile HttpURLConnection active;
    void cancel() { HttpURLConnection c = active; if (c != null) c.disconnect(); }
    VoiceTranscription() { this(url -> (HttpURLConnection) url.openConnection()); }
    VoiceTranscription(Connector connector) { this.connector = connector; }
    static String name(String provider) { return "openai".equals(provider) ? "OpenAI" : "ElevenLabs"; }
    static boolean external(String provider) { return "openai".equals(provider) || "elevenlabs".equals(provider); }
    static String model(String provider) { return "openai".equals(provider) ? "gpt-transcribe" : "scribe_v2"; }
    private HttpURLConnection connection(String provider, String key, boolean check) throws Exception {
        if (!external(provider) || key.isEmpty() || key.length() > 512 || !key.matches("[\\x21-\\x7e]+")) throw new IOException();
        String endpoint = "openai".equals(provider) ? "https://api.openai.com/v1/" + (check ? "models/" + model(provider) : "audio/transcriptions") :
            "https://api.elevenlabs.io/v1/" + (check ? "user" : "speech-to-text");
        HttpURLConnection c = connector.open(new URL(endpoint));
        c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(60000); c.setUseCaches(false);
        c.setRequestProperty("openai".equals(provider) ? "Authorization" : "xi-api-key", "openai".equals(provider) ? "Bearer " + key : key);
        active = c;
        return c;
    }
    static String status(int code) {
        return code == 401 ? "voice_auth" : code == 403 ? "voice_forbidden" : code == 429 ? "voice_limit" : "voice_failed";
    }
    String check(String provider, String key) {
        HttpURLConnection c = null;
        try { c = connection(provider, key, true); int code = c.getResponseCode(); return code == 200 ? "voice_checked" : status(code); }
        catch (Exception ignored) { return "voice_failed"; }
        finally { if (c != null) { c.disconnect(); if (active == c) active = null; } }
    }
    static void field(OutputStream out, String boundary, String name, String value) throws IOException {
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n").getBytes(StandardCharsets.UTF_8));
    }
    String transcribe(String provider, String key, String language, File audio, Current current) throws Exception {
        if (!current.current()) throw new IOException("cancelled");
        if (audio.length() < 1 || audio.length() > MAX_AUDIO) throw new IOException("voice_failed");
        HttpURLConnection c = connection(provider, key, false);
        try {
            c.setRequestMethod("POST"); c.setDoOutput(true);
            String boundary = "bibimer-" + UUID.randomUUID();
            c.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            c.setChunkedStreamingMode(8192);
            if (!current.current()) throw new IOException("cancelled");
            try (OutputStream out = c.getOutputStream()) {
                field(out, boundary, "openai".equals(provider) ? "model" : "model_id", model(provider));
                if (!language.isEmpty()) field(out, boundary, "openai".equals(provider) ? "languages[]" : "language_code", language);
                if ("elevenlabs".equals(provider)) { field(out, boundary, "tag_audio_events", "false"); field(out, boundary, "timestamps_granularity", "none"); }
                out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"speech.m4a\"\r\nContent-Type: audio/mp4\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                try (InputStream in = new FileInputStream(audio)) {
                    byte[] buf = new byte[8192]; int n, total = 0;
                    while ((n = in.read(buf)) != -1) {
                        if (!current.current() || (total += n) > MAX_AUDIO) throw new IOException("cancelled");
                        out.write(buf, 0, n);
                    }
                }
                if (!current.current()) throw new IOException("cancelled");
                out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
            }
            if (!current.current()) throw new IOException("cancelled");
            int code = c.getResponseCode();
            if (code != 200) throw new IOException(status(code));
            ByteArrayOutputStream body = new ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[8192]; int n;
                while ((n = in.read(buf)) != -1) {
                    if (!current.current() || body.size() + n > 1024 * 1024) throw new IOException("voice_failed");
                    body.write(buf, 0, n);
                }
            }
            Object value = new JSONObject(new String(body.toByteArray(), StandardCharsets.UTF_8)).opt("text");
            if (!(value instanceof String)) throw new IOException("voice_failed");
            String text = ((String) value).trim();
            if (text.isEmpty()) throw new IOException("voice_empty");
            if (text.length() > 65536) throw new IOException("voice_failed");
            return text;
        } finally { c.disconnect(); if (active == c) active = null; }
    }
}
