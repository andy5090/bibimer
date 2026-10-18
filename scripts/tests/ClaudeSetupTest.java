package app.bibimer;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

public final class ClaudeSetupTest {
    public static void main(String[] args) throws Exception {
        if (args.length == 2) {
            try (InputStream input = Files.newInputStream(Paths.get(args[0]))) {
                System.out.print(ClaudeSetup.command(input, args[1]));
            }
            return;
        }
        for (String invalid : new String[]{"", "BIBIMER_CLAUDE_SETUP_COMMAND", "bad\0script"}) {
            try {
                ClaudeSetup.command(new ByteArrayInputStream(invalid.getBytes(StandardCharsets.UTF_8)), "en");
                throw new AssertionError("Invalid installer accepted");
            } catch (IOException expected) { }
        }
        try {
            ClaudeSetup.command(new ByteArrayInputStream(new byte[32001]), "en");
            throw new AssertionError("Oversize installer accepted");
        } catch (IOException expected) { }
        String body = "printf '%s\\n' \"$HOME\"\n";
        String safe = ClaudeSetup.command(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)), "ko; false");
        if (!safe.startsWith("BIBIMER_LANGUAGE=en bash <<'")) throw new AssertionError("Unsafe language");
        if (!safe.contains(body)) throw new AssertionError("Installer changed");
        System.out.println("Claude command: invalid/oversize scripts rejected, language constrained, shell text preserved");
    }
}
