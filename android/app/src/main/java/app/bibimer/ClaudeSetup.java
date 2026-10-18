package app.bibimer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** Frame a bundled, fixed installer for explicit paste into Termux. */
final class ClaudeSetup {
    private static final String DELIMITER = "BIBIMER_CLAUDE_SETUP_COMMAND";

    static boolean supports(String action) {
        return "repair".equals(action) || "adapter".equals(action) ||
            "login".equals(action) || "status".equals(action) || "version".equals(action);
    }

    static String asset(String action) {
        if ("repair".equals(action)) return "claude-repair-setup.sh";
        if ("adapter".equals(action)) return "claude-adapter-setup.sh";
        return null;
    }

    /** Fixed actions only. Keep interactive stdin available for browser login. */
    static String action(String action, InputStream input, String language) throws IOException {
        if (!supports(action)) throw new IOException("Unknown Claude action");
        boolean korean = "ko".equals(language);
        String body;
        if (asset(action) != null) {
            if (input == null) throw new IOException("Missing installer");
            body = command(input, language);
        } else {
            body = "if [ -x \"$HOME/.local/share/bibimer/claude-runtime/claude\" ]; then\n" +
                "  bibimer_claude=\"$HOME/.local/share/bibimer/claude-runtime/claude\"\n" +
                "elif command -v claude >/dev/null 2>&1; then\n  bibimer_claude=claude\nelse\n" +
                "  printf '%s\\n' '" + (korean ? "Claude를 먼저 설치하거나 복구하세요." : "Install or repair Claude first.") + "' >&2\n" +
                "  exit 127\nfi\n\"$bibimer_claude\" " +
                ("login".equals(action) ? "auth login" : "status".equals(action) ? "auth status" : "--version") + "\n";
        }
        // A separate subshell contains installer set -eu/exit. Leave the new terminal
        // open for inspection, without recording the script in interactive history.
        return "(\ncd \"$HOME\" || exit\n" + body + ")\nbibimer_status=$?\n" +
            "printf '\\n" + (korean ? "명령 종료 코드: %s" : "Command exit code: %s") + "\\n' \"$bibimer_status\"\n" +
            "exec /data/data/com.termux/files/usr/bin/bash -i\n";
    }

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
