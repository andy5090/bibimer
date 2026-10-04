package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** The token stays in native memory / encrypted app-private preferences. */
final class TokenStore {
    private static final String ALIAS = "bibimer.local.bridge";
    private final SharedPreferences preferences;
    private volatile String token = "";

    TokenStore(Context context) {
        preferences = context.getSharedPreferences("bridge", Context.MODE_PRIVATE);
        reload();
    }

    synchronized void reload() {
        token = "";
        try {
            String ciphertext = preferences.getString("token", "");
            if (!ciphertext.isEmpty()) {
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128,
                    Base64.decode(preferences.getString("iv", ""), Base64.NO_WRAP)));
                token = new String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
            preferences.edit().clear().apply();
        }
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry) store.getEntry(ALIAS, null)).getSecretKey();
    }

    synchronized void save(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        String encrypted = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        boolean saved = preferences.edit().putString("token", encrypted)
            .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).commit();
        if (!saved) throw new IllegalStateException("Token save failed");
        token = value;
    }

    String get() { return token; }
    synchronized void clear() { token = ""; preferences.edit().clear().apply(); }
}
