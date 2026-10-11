package app.bibimer;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** Last explicit choices, shared by projects but kept separate for each agent. */
final class AgentPreferences {
    private final SharedPreferences preferences;

    AgentPreferences(Context context) {
        preferences = context.getSharedPreferences(DemoMode.preferenceName(context, "agent_options"), Context.MODE_PRIVATE);
    }

    private JSONObject validate(String agent, String json) throws Exception {
        JSONObject value = new JSONObject(json);
        String modes;
        switch (agent) {
            case "codex": modes = "|inherit|read-only|workspace-write|yolo|"; break;
            case "claude": modes = "|inherit|default|acceptEdits|plan|bypassPermissions|"; break;
            case "opencode": modes = "|inherit|ask|allow|"; break;
            default: throw new IllegalArgumentException();
        }
        Object mode = value.get("permission");
        if (!(mode instanceof String) || ((String) mode).contains("|") ||
                !modes.contains("|" + mode + "|")) throw new IllegalArgumentException();
        JSONObject result = new JSONObject().put("permission", mode);
        int expected = agent.equals("codex") ? 2 : 1;
        if (agent.equals("codex")) {
            Object fast = value.get("fast");
            if (!(fast instanceof Boolean)) throw new IllegalArgumentException();
            result.put("fast", fast);
        }
        for (String key : new String[]{"model", "effort"}) {
            if (!value.has(key)) continue;
            Object item = value.get(key);
            if (!(item instanceof String) || ((String) item).length() > 256) throw new IllegalArgumentException();
            for (int i = 0; i < ((String) item).length(); i++)
                if (((String) item).charAt(i) < 32) throw new IllegalArgumentException();
            result.put(key, item); expected++;
        }
        if (value.length() != expected || (!result.optString("effort").isEmpty() && result.optString("model").isEmpty()))
            throw new IllegalArgumentException();
        return result;
    }

    synchronized JSONObject get() throws Exception {
        JSONObject result = new JSONObject();
        for (String agent : new String[]{"codex", "claude", "opencode"}) {
            String fallback = agent.equals("codex") ? "{\"permission\":\"inherit\",\"fast\":false}" : "{\"permission\":\"inherit\"}";
            try { result.put(agent, validate(agent, preferences.getString(agent, fallback))); }
            catch (Exception invalid) { result.put(agent, new JSONObject(fallback)); }
        }
        return result;
    }

    synchronized boolean set(String agent, String json) {
        try { return preferences.edit().putString(agent, validate(agent, json).toString()).commit(); }
        catch (Exception invalid) { return false; }
    }
}
