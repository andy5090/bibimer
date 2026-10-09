package app.bibimer;

import android.content.Context;
import android.net.Uri;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.json.JSONObject;

/** Copies Termux files over authenticated loopback; no content is returned to JavaScript. */
final class FileLinks {
    static final long LIMIT = 64 * 1024 * 1024L;
    static final class Failure extends Exception {
        final String code;
        Failure(String code) { super(code); this.code = code; }
    }
    static final class Opened {
        final Uri uri; final String mime;
        Opened(Uri uri, String mime) { this.uri = uri; this.mime = mime; }
    }
    private static JSONObject call(LocalBridge bridge, JSONObject data) throws Exception {
        JSONObject result = bridge.request("POST", "/v1/files", data.toString());
        if (!result.optBoolean("ok")) throw new Failure(result.getJSONObject("data").optString("code", "error_file_open"));
        return result.getJSONObject("data");
    }
    private static void check(BooleanSupplier cancelled) throws Failure {
        if (Thread.currentThread().isInterrupted() || cancelled.getAsBoolean()) throw new Failure("error_file_cancelled");
    }
    static Opened copy(Context context, LocalBridge bridge, JSONObject request, BooleanSupplier cancelled) throws Exception {
        final long deadline = android.os.SystemClock.elapsedRealtime() + 90000;
        BooleanSupplier aborted = () -> cancelled.getAsBoolean() || android.os.SystemClock.elapsedRealtime() > deadline;
        String transfer = null;
        File directory = null;
        boolean complete = false;
        try {
            check(aborted);
            // Never let JavaScript call arbitrary transfer operations or select a native cache path.
            JSONObject prepare = new JSONObject().put("action", "prepare").put("project_id", request.getString("project_id"))
                .put("path", request.getString("path"));
            if (request.has("worktree_path")) prepare.put("worktree_path", request.getString("worktree_path"));
            JSONObject info = call(bridge, prepare);
            transfer = info.getString("id");
            long size = info.getLong("size");
            if (size < 0 || size > LIMIT) throw new Failure("error_file_large");
            String name = info.getString("name").replaceAll("[\\p{Cntrl}/\\\\]", "_");
            if (name.length() > 160) name = name.substring(name.length() - 160);
            if (name.isEmpty() || name.equals(".") || name.equals("..") || name.equals("metadata.json") || name.equals("content.part")) name = "file-" + name;
            String mime = info.optString("mime", "application/octet-stream");
            if (!mime.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+")) mime = "application/octet-stream";
            check(aborted);
            LinkedFileProvider.prune(context, size + 4096, false);
            String id = UUID.randomUUID().toString();
            directory = new File(LinkedFileProvider.root(context), id);
            if (!directory.mkdirs()) throw new Failure("error_file_open");
            File partial = new File(directory, "content.part"), target = new File(directory, name);
            long offset = 0;
            try (FileOutputStream stream = new FileOutputStream(partial)) {
                boolean done;
                do {
                    check(aborted);
                    JSONObject block = call(bridge, new JSONObject().put("action", "read").put("id", transfer).put("offset", offset));
                    String encoded = block.getString("data");
                    if (encoded.length() > 350000) throw new Failure("error_file_open");
                    byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                    long next = block.getLong("next");
                    done = block.getBoolean("done");
                    if (block.getLong("offset") != offset || bytes.length > 256 * 1024 || next != offset + bytes.length ||
                        next > size || done != (next == size) || (!done && bytes.length == 0)) throw new Failure("error_file_changed");
                    stream.write(bytes); offset = next;
                } while (!done);
            }
            check(aborted);
            if (offset != size || !partial.renameTo(target)) throw new Failure("error_file_changed");
            JSONObject meta = new JSONObject().put("name", name).put("mime", mime);
            Files.write(new File(directory, "metadata.json").toPath(), meta.toString().getBytes(StandardCharsets.UTF_8));
            directory.setLastModified(System.currentTimeMillis());
            check(aborted);
            complete = true;
            return new Opened(LinkedFileProvider.uri(context, id, name), mime);
        } finally {
            if (transfer != null) {
                try { call(bridge, new JSONObject().put("action", "release").put("id", transfer)); }
                catch (Exception ignored) { }
            }
            if (!complete && directory != null) {
                File[] files = directory.listFiles();
                if (files != null) for (File file : files) file.delete();
                directory.delete();
            }
        }
    }
}
