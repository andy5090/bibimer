package app.bibimer;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Comparator;
import org.json.JSONObject;

/** Only completed private cache copies can be granted to a receiving viewer. */
public final class LinkedFileProvider extends ContentProvider {
    static final long TTL = 60 * 60 * 1000L;
    static final long CAPACITY = 128 * 1024 * 1024L;

    static File root(Context context) { return new File(context.getCacheDir(), "linked-files"); }
    static Uri uri(Context context, String id, String name) {
        return new Uri.Builder().scheme("content").authority(context.getPackageName() + ".files")
            .appendPath(id).appendPath(name).build();
    }
    private static JSONObject metadata(File directory) throws Exception {
        return new JSONObject(new String(Files.readAllBytes(new File(directory, "metadata.json").toPath()), StandardCharsets.UTF_8));
    }
    private File selected(Uri uri) throws FileNotFoundException {
        try {
            if (!"content".equals(uri.getScheme()) || !(getContext().getPackageName() + ".files").equals(uri.getAuthority()) ||
                uri.getQuery() != null || uri.getFragment() != null || uri.getPathSegments().size() != 2)
                throw new IllegalArgumentException();
            String id = uri.getPathSegments().get(0), name = uri.getPathSegments().get(1);
            if (!id.matches("[a-f0-9-]{36}") || name.contains("/") || name.contains("\\") ||
                name.equals(".") || name.equals("..") || name.equals("metadata.json") || name.equals("content.part"))
                throw new IllegalArgumentException();
            File base = root(getContext()).getCanonicalFile(), directory = new File(base, id).getCanonicalFile();
            if (!base.equals(directory.getParentFile()) || System.currentTimeMillis() - directory.lastModified() > TTL)
                throw new IllegalArgumentException();
            JSONObject meta = metadata(directory);
            File file = new File(directory, name).getCanonicalFile();
            if (!name.equals(meta.getString("name")) || !directory.equals(file.getParentFile()) || !file.isFile())
                throw new IllegalArgumentException();
            return file;
        } catch (Exception ignored) { throw new FileNotFoundException("File unavailable"); }
    }
    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) {
        try { return metadata(selected(uri).getParentFile()).getString("mime"); }
        catch (Exception ignored) { return "application/octet-stream"; }
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("Read only");
        return ParcelFileDescriptor.open(selected(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String order) {
        try {
            File file = selected(uri);
            String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
            MatrixCursor cursor = new MatrixCursor(columns, 1);
            Object[] row = new Object[columns.length];
            for (int i = 0; i < columns.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) row[i] = file.getName();
                if (OpenableColumns.SIZE.equals(columns[i])) row[i] = file.length();
            }
            cursor.addRow(row); return cursor;
        } catch (Exception ignored) { return null; }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException("Read only"); }
    @Override public int update(Uri uri, ContentValues values, String where, String[] args) { throw new UnsupportedOperationException("Read only"); }
    @Override public int delete(Uri uri, String where, String[] args) { throw new UnsupportedOperationException("Read only"); }

    static synchronized void prune(Context context, long incoming, boolean all) {
        File[] directories = root(context).listFiles();
        if (directories == null) return;
        Arrays.sort(directories, Comparator.comparingLong(File::lastModified));
        long total = 0;
        for (File directory : directories) {
            File[] files = directory.listFiles();
            if (files != null) for (File file : files) total += file.length();
        }
        for (File directory : directories) {
            if (!directory.getName().matches("[a-f0-9-]{36}")) continue;
            if (!all && System.currentTimeMillis() - directory.lastModified() <= TTL && total + incoming <= CAPACITY) continue;
            try { context.revokeUriPermission(uri(context, directory.getName(), metadata(directory).getString("name")), Intent.FLAG_GRANT_READ_URI_PERMISSION); }
            catch (Exception ignored) { }
            File[] files = directory.listFiles();
            if (files != null) for (File file : files) { total -= file.length(); file.delete(); }
            directory.delete();
        }
    }
}
