package app.bibimer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** Frame a bundled, fixed installer for explicit paste into Termux. */
final class ClaudeSetup {
    private static final String DELIMITER = "BIBIMER_CLAUDE_SETUP_COMMAND";

    static String command(InputStream input, String language) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.write(buffer, 0, count);
            if (output.size() > 32000) throw new IOException("Installer too large");
        }
        String script = new String(output.toByteArray(), StandardCharsets.UTF_8);
        if (script.isEmpty() || script.contains(DELIMITER) || script.indexOf('\0') >= 0)
            throw new IOException("Invalid installer");
        return "BIBIMER_LANGUAGE=" + ("ko".equals(language) ? "ko" : "en") +
            " bash <<'" + DELIMITER + "'\n" + script + "\n" + DELIMITER + "\n";
    }
}
