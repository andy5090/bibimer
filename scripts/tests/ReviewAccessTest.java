package app.bibimer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Fictional test codes only, never the private review code used by a release. */
public final class ReviewAccessTest {
    private static int assertions;
    private static void check(boolean value, String message) { assertions++; if (!value) throw new AssertionError(message); }
    private static String digest(String code) throws Exception {
        byte[] value = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(); for (byte item : value) result.append(String.format("%02x", item & 255)); return result.toString();
    }
    public static void main(String[] args) throws Exception {
        String code = "fictional-unit-test-code", expected = digest(code);
        check(ReviewAccess.verify(expected, code), "Matching code accepted");
        check(ReviewAccess.verify(expected.toUpperCase(java.util.Locale.ROOT), code), "Hex case does not change digest");
        check(!ReviewAccess.verify(expected, "incorrect-test-code"), "Wrong code denied");
        check(!ReviewAccess.verify("", code), "Default empty configuration fails closed");
        check(!ReviewAccess.verify(null, code), "Missing configuration denied");
        check(!ReviewAccess.verify("invalid", code), "Invalid digest denied");
        check(!ReviewAccess.verify(expected.substring(1), code), "Wrong digest length denied");
        check(!ReviewAccess.verify(expected, null), "Missing code denied");
        check(!ReviewAccess.verify(expected, ""), "Empty code denied");
        check(!ReviewAccess.verify(digest("   "), "   "), "Whitespace-only code denied");
        check(!ReviewAccess.verify(digest("sample\ncode"), "sample\ncode"), "Control characters denied");
        String oversized = new String(new char[ReviewAccess.MAX_CODE_CHARACTERS + 1]).replace('\0', 'x');
        check(!ReviewAccess.verify(digest(oversized), oversized), "Oversized matching code still denied");
        check(!ReviewAccess.authorized(true, expected, ""), "Legacy public enabled flag cannot authorize demo");
        check(!ReviewAccess.authorized(true, "", ""), "Default build cannot authorize legacy state");
        check(!ReviewAccess.authorized(false, expected, expected), "Exited mode remains disabled");
        check(!ReviewAccess.authorized(true, expected, digest("old-test-code")), "Changed build digest revokes prior authorization");
        check(ReviewAccess.authorized(true, expected, expected), "Verified current digest can resume authorized mode");
        System.out.println("ReviewAccess: " + assertions + " verifier/legacy/configuration assertions passed");
    }
}
