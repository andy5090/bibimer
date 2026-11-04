package app.bibimer;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/** Exercises real multipart encoding and response handling with an in-memory transport. */
public final class VoiceTranscriptionTest {
    static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    static class Connection extends HttpURLConnection {
        final ByteArrayOutputStream output = new ByteArrayOutputStream();
        final Map<String,String> headers = new HashMap<>();
        String body = "{\"text\":\"  테스트 <script> text  \"}", type;
        int code = 200, responses, streams; boolean disconnected;
        Connection(URL url) { super(url); }
        public void connect() { }
        public void disconnect() { disconnected = true; }
        public boolean usingProxy() { return false; }
        public void setRequestProperty(String key, String value) { headers.put(key,value); }
        public OutputStream getOutputStream() { streams++; return output; }
        public int getResponseCode() { responses++; return code; }
        public InputStream getInputStream() { check(code == 200); return new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)); }
        public InputStream getErrorStream() { throw new AssertionError("Error body must not be read"); }
        String payload() { return new String(output.toByteArray(), StandardCharsets.UTF_8); }
    }
    static Connection latest; static int opens;
    static VoiceTranscription client() { return new VoiceTranscription(url -> { opens++; latest = new Connection(url); return latest; }); }
    static void failure(File audio, String body, int code, String expected) throws Exception {
        VoiceTranscription c = new VoiceTranscription(url -> { latest = new Connection(url); latest.body = body; latest.code = code; return latest; });
        try { c.transcribe("openai", "test-only", "", audio, () -> true); throw new AssertionError("Expected failure"); }
        catch (Exception error) { if (expected != null) check(expected.equals(error.getMessage())); }
        check(latest.disconnected); check(latest.responses == 1);
    }
    public static void main(String[] args) throws Exception {
        File audio = File.createTempFile("voice-protocol-test", ".m4a");
        byte[] bytes = {0, 1, 2, 3, 9, 13, 10, (byte)255}; Files.write(audio.toPath(), bytes);
        try {
            VoiceTranscription c = client();
            check(c.transcribe("openai", "test-key", "ko", audio, () -> true).equals("테스트 <script> text"));
            check(latest.getURL().toString().equals("https://api.openai.com/v1/audio/transcriptions"));
            check(latest.headers.get("Authorization").equals("Bearer test-key"));
            check(!latest.headers.containsKey("xi-api-key"));
            check(!latest.getInstanceFollowRedirects()); check(!latest.getUseCaches());
            check(latest.getConnectTimeout() == 15000 && latest.getReadTimeout() == 60000);
            String payload = latest.payload();
            check(payload.contains("name=\"model\"\r\n\r\ngpt-transcribe\r\n"));
            check(payload.contains("name=\"languages[]\"\r\n\r\nko\r\n"));
            check(payload.contains("filename=\"speech.m4a\"\r\nContent-Type: audio/mp4\r\n\r\n"));
            check(payload.endsWith("--\r\n") && !payload.contains("test-key"));
            byte[] sent = latest.output.toByteArray();
            int start = payload.indexOf("Content-Type: audio/mp4\r\n\r\n") + "Content-Type: audio/mp4\r\n\r\n".length();
            check(Arrays.equals(bytes, Arrays.copyOfRange(sent,start,start+bytes.length)));
            check(latest.disconnected && latest.responses == 1);
            c.transcribe("elevenlabs", "eleven-test", "", audio, () -> true);
            check(latest.getURL().toString().equals("https://api.elevenlabs.io/v1/speech-to-text"));
            check(latest.headers.get("xi-api-key").equals("eleven-test") && !latest.headers.containsKey("Authorization"));
            check(latest.payload().contains("scribe_v2") && latest.payload().contains("tag_audio_events"));
            check(!latest.payload().contains("language_code") && !latest.payload().contains("languages[]"));
            c.transcribe("elevenlabs", "eleven-test", "zh", audio, () -> true);
            check(latest.payload().contains("name=\"language_code\"\r\n\r\nzh\r\n"));
            for (int code : new int[]{301,302,401,403,429,500}) failure(audio,"DO NOT RETURN THIS PRIVATE ERROR",code,VoiceTranscription.status(code));
            failure(audio,"{\"text\":\" \"}",200,"voice_empty");
            failure(audio,"{\"text\":123}",200,"voice_failed");
            failure(audio,"{\"text\":{\"secret\":\"data\"}}",200,"voice_failed");
            failure(audio,"[]",200,null);
            failure(audio,"{\"text\":\""+String.join("",Collections.nCopies(65537,"x"))+"\"}",200,"voice_failed");
            failure(audio,String.join("",Collections.nCopies(1024*1024+1,"x")),200,"voice_failed");
            int before = opens;
            try { c.transcribe("openai","test-key","",audio,()->false); throw new AssertionError(); } catch (IOException expected) { }
            check(opens == before);
            for (String provider : new String[]{"other","https://example.org","device"}) {
                try { c.transcribe(provider,"test-key","",audio,()->true); throw new AssertionError(); } catch (IOException expected) { }
            }
            check(opens == before);
            try { c.transcribe("openai","test\r\ninjection","",audio,()->true); throw new AssertionError(); } catch (IOException expected) { }
            check(opens == before);
            int[] calls = {0};
            try { c.transcribe("openai","test-key","",audio,()->++calls[0]<2); throw new AssertionError(); } catch (IOException expected) { }
            check(latest.streams == 0 && latest.disconnected);
            c.check("openai","test-key"); check(latest.getURL().getPath().equals("/v1/models/gpt-transcribe")); check(latest.streams == 0);
            c.check("elevenlabs","test-key"); check(latest.getURL().getPath().equals("/v1/user")); check(latest.streams == 0);
            VoiceTranscription rejected = new VoiceTranscription(url -> { latest = new Connection(url); latest.code = 401; return latest; });
            check(rejected.check("openai","bad-test").equals("voice_auth"));
            check(latest.disconnected && latest.responses == 1);
        } finally { audio.delete(); }
        System.out.println("PASS voice API transport: fixed endpoints/auth, multipart/audio/language, strict/limited responses, cancellation, private errors, no redirects/retries/fallback, metadata-only checks");
    }
}
