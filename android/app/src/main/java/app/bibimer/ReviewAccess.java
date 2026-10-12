package app.bibimer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Access-code verification only; no code, token or transcript is retained. */
final class ReviewAccess {
    static final int MAX_CODE_CHARACTERS = 128;

    static boolean configured(String digest) { return digest != null && digest.matches("[a-fA-F0-9]{64}"); }

    private static byte[] bytes(String digest) {
        byte[] value = new byte[32];
        for (int i = 0; i < value.length; i++) value[i] = (byte)((Character.digit(digest.charAt(i * 2), 16) << 4) | Character.digit(digest.charAt(i * 2 + 1), 16));
        return value;
    }

    static boolean verify(String digest, String code) {
        if (!configured(digest) || code == null || code.isEmpty() || code.length() > MAX_CODE_CHARACTERS || code.trim().isEmpty()) return false;
        for (int i = 0; i < code.length(); i++) if (code.charAt(i) < 32 || code.charAt(i) == 127) return false;
        try { return MessageDigest.isEqual(bytes(digest), MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException unavailable) { return false; }
    }

    static boolean authorized(boolean enabled, String currentDigest, String authenticatedDigest) {
        return enabled && configured(currentDigest) && configured(authenticatedDigest) && MessageDigest.isEqual(bytes(currentDigest), bytes(authenticatedDigest));
    }
}
