package app.bibimer;

import java.io.IOException;
import java.io.InputStream;

/** Allowlisted CLI operations; never accepts executable paths, prompts, or credentials. */
final class AgentSetup {
    static boolean supports(String agent, String action) {
        if ("claude".equals(agent)) return ClaudeSetup.supports(action);
        if ("codex".equals(agent) || "opencode".equals(agent))
            return "login".equals(action) || "status".equals(action) || "version".equals(action);
        if ("gemini".equals(agent)) return "login".equals(action) || "version".equals(action);
        return false;
    }

    static String label(String agent) {
        if ("codex".equals(agent)) return "Codex";
        if ("claude".equals(agent)) return "Claude";
        if ("opencode".equals(agent)) return "OpenCode";
        if ("gemini".equals(agent)) return "Gemini CLI";
        throw new IllegalArgumentException("Unknown agent");
    }

    static String asset(String agent, String action) {
        return "claude".equals(agent) ? ClaudeSetup.asset(action) : null;
    }

    static String action(String agent, String action, InputStream input, String language) throws IOException {
        if (!supports(agent, action)) throw new IOException("Unknown agent action");
        if ("claude".equals(agent)) return ClaudeSetup.action(action, input, language);
        boolean korean = "ko".equals(language);
        String missing = "printf '%s\\n' '" + label(agent) +
            (korean ? "를 Termux에 먼저 설치하세요." : " must be installed in Termux first.") + "' >&2\nexit 127\n";
        String body;
        if ("gemini".equals(agent)) {
            // This phone's npm launcher has an incompatible env shebang. Invoke
            // its installed JS entry with Node; keep terminal stdin interactive.
            body = "if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then\n" + missing + "fi\n" +
                "bibimer_npm_root=$(npm root -g) || exit $?\n" +
                "bibimer_gemini=\"$bibimer_npm_root/@google/gemini-cli/bundle/gemini.js\"\n" +
                "if [ ! -f \"$bibimer_gemini\" ]; then\n" + missing + "fi\n" +
                "node \"$bibimer_gemini\"" + ("version".equals(action) ? " --version" : "") + "\n";
        } else {
            String args = "version".equals(action) ? "--version" : "codex".equals(agent) ?
                ("login".equals(action) ? "login" : "login status") :
                ("login".equals(action) ? "auth login" : "auth list");
            body = "if ! command -v " + agent + " >/dev/null 2>&1; then\n" + missing + "fi\n" + agent + " " + args + "\n";
        }
        // Gemini opens its native authentication selector; no synthetic /auth
        // prompt, automatic choice, logout, model request, or key injection.
        return ClaudeSetup.terminal(body, language);
    }
}
