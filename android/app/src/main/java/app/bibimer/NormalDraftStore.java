package app.bibimer;

/** Bounded RAM-only handoff for unsent normal UI drafts during demo. */
final class NormalDraftStore {
    static final int MAX_CHARACTERS = 262144;
    private String snapshot;

    synchronized boolean save(String value, boolean demo) {
        if (demo || value == null || value.length() > MAX_CHARACTERS) return false;
        snapshot = value; return true;
    }
    synchronized boolean ready() { return snapshot != null; }
    synchronized String take(boolean demo) {
        if (demo) return "{}";
        String value = snapshot; snapshot = null;
        return value == null ? "{}" : value;
    }
}
