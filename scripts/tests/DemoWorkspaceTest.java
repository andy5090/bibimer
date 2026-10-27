package app.bibimer;

import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicLong;

/** Runs the demo protocol without Android, agents, Termux, credentials or a test dependency. */
public final class DemoWorkspaceTest {
    private static int assertions;
    private static void check(boolean value, String message) { assertions++; if (!value) throw new AssertionError(message); }
    private static Map<String, Object> data(Object... pairs) { return DemoWorkspace.object(pairs); }
    @SuppressWarnings("unchecked") private static Map<String, Object> map(Object value) { return (Map<String, Object>)value; }
    @SuppressWarnings("unchecked") private static List<Map<String, Object>> list(Object value) { return (List<Map<String, Object>>)value; }
    private static String text(Map<String, Object> data, String key) { return DemoWorkspace.text(data, key); }
    private static final class Fixture {
        final AtomicLong now = new AtomicLong(100000);
        final DemoWorkspace demo = new DemoWorkspace(now::get);
        Map<String, Object> get(String path) { return demo.request("GET", path, data()); }
        Map<String, Object> post(String path, Object... pairs) { return demo.request("POST", path, data(pairs)); }
        Map<String, Object> health() { return get("/v1/health"); }
        Map<String, Object> project() { return list(health().get("projects")).get(0); }
        String projectId() { return text(project(), "id"); }
        String session(String agent) { for (Map<String, Object> session : list(project().get("sessions"))) if (text(session, "agent").equals(agent)) return text(session, "id"); throw new AssertionError(); }
        Map<String, Object> events(String id) { return get("/v1/sessions/" + id + "/events?cursor=0&wait=0"); }
        Map<String, Object> action(String id, String action, Object... pairs) { return post("/v1/sessions/" + id + "/" + action, pairs); }
        void finish(String id) { now.addAndGet(10000); events(id); now.addAndGet(10000); events(id); }
    }
    private static void fails(String key, Runnable operation) {
        try { operation.run(); throw new AssertionError("Expected " + key); }
        catch (DemoWorkspace.Failure invalid) { check(invalid.key.equals(key), "Failure key: " + invalid.key); }
    }
    private static String lastAnswer(Map<String, Object> event) {
        String answer = ""; for (Map<String, Object> item : list(event.get("items"))) if (text(item, "kind").equals("assistant")) answer = text(item, "text"); return answer;
    }
    private static void initialProtocol() {
        Fixture f = new Fixture(); Map<String, Object> health = f.health();
        check(health.get("protocol").equals(1) && health.get("demo").equals(true), "Demo protocol");
        check(list(health.get("agents")).size() == 4, "Four programs");
        for (Map<String, Object> agent : list(health.get("agents"))) check(agent.get("installed").equals(true), "Selectors enabled");
        String codex = lastAnswer(f.events(f.session("codex"))), claude = lastAnswer(f.events(f.session("claude"))), opencode = lastAnswer(f.events(f.session("opencode")));
        check(codex.contains("| Feature |") && codex.contains("```javascript"), "Table and JS");
        check(claude.contains("```python"), "Python example"); check(opencode.contains("```json") && opencode.contains("```mermaid"), "Structured data and diagram source");
        check(!codex.equals(claude) && !claude.equals(opencode), "Distinct provider examples");
        Map<String, Object> trees = f.post("/v1/worktrees", "project_id", f.projectId()); check(list(trees.get("worktrees")).size() == 2, "Sample worktree list");
    }
    private static void inputAndReplay() {
        Fixture f = new Fixture(); String id = f.session("codex"); String initial = lastAnswer(f.events(id));
        f.action(id, "message", "text", "PRIVATE-INPUT-DO-NOT-KEEP", "request_id", "first"); f.finish(id);
        Map<String, Object> first = f.events(id); check(!first.toString().contains("PRIVATE-INPUT"), "Never stores or echoes submitted text");
        check(!lastAnswer(first).equals(initial) && lastAnswer(first).contains("Python"), "Next send changes format");
        f.action(id, "message", "text", "Another unrelated prompt"); f.finish(id);
        check(lastAnswer(f.events(id)).contains("```json"), "Next example is documentation");
        check(text(map(f.events(id).get("session")), "turn_state").equals("ready"), "Normal sample completion");
        Map<String, Object> feed = f.get("/v1/completions?cursor=0&instance=" + f.demo.instance() + "&wait=0");
        check(list(feed.get("events")).size() == 2, "One explicit completion per replay");
        check(!feed.toString().contains("PRIVATE-INPUT"), "No submitted text in notification feed");
        check(text(list(feed.get("events")).get(0), "preview").startsWith("Demo:"), "Completion clearly marked");
        Fixture same = new Fixture(); String other = same.session("codex"); same.action(other, "message", "text", "Entirely different input"); same.finish(other);
        check(lastAnswer(first).equals(lastAnswer(same.events(other))), "Output is input independent");
    }
    private static void approvalsAndQuestions() {
        Fixture f = new Fixture(); String id = f.session("claude");
        for (int i = 0; i < 2; i++) { f.action(id, "message", "text", "any"); f.finish(id); }
        f.action(id, "message", "text", "ignored"); f.finish(id);
        Map<String, Object> event = f.events(id); check(text(map(event.get("session")), "turn_state").equals("waiting"), "Waits for explicit approval");
        Map<String, Object> prompt = list(event.get("requests")).get(0); check(text(prompt, "kind").equals("command"), "Approval card");
        fails("error_prompt_missing", () -> f.action(id, "respond", "prompt_id", "wrong", "decision", "accept"));
        f.action(id, "respond", "prompt_id", prompt.get("id"), "decision", "accept");
        prompt = list(f.events(id).get("requests")).get(0); check(text(prompt, "kind").equals("questions"), "Question after approval");
        f.action(id, "respond", "prompt_id", prompt.get("id"), "answers", data("demo-color", "PRIVATE-ANSWER"));
        f.now.addAndGet(2000); event = f.events(id); check(list(event.get("requests")).isEmpty(), "Question cleared");
        check(text(map(event.get("session")), "turn_state").equals("ready"), "Finishes after explicit answer");
        check(!event.toString().contains("PRIVATE-ANSWER"), "Question answer never retained");
    }
    private static void queueAndInterrupt() {
        Fixture f = new Fixture(); String id = f.session("codex"); f.action(id, "message", "text", "start");
        f.action(id, "message", "text", "SECRET-QUEUED-CONTENT"); Map<String, Object> event = f.events(id);
        List<Map<String, Object>> queue = list(event.get("queue")); check(queue.size() == 1, "Queues during replay"); check(!queue.toString().contains("SECRET"), "Queue contains only sample placeholder");
        Map<String, Object> state = map(event.get("session"));
        f.action(id, "queue", "action", "steer", "entry_id", queue.get(0).get("id"), "turn_id", state.get("active_turn_id"));
        check(list(f.events(id).get("queue")).isEmpty(), "Queue steer accepts one entry");
        f.action(id, "message", "text", "queued"); f.action(id, "interrupt");
        event = f.events(id); check(map(event.get("session")).get("queue_paused").equals(true), "Interruption pauses queue");
        f.now.addAndGet(100000); f.events(id);
        check(list(f.get("/v1/completions?cursor=0&instance=" + f.demo.instance() + "&wait=0").get("events")).isEmpty(), "Interrupted replay does not alert");
        f.action(id, "queue", "action", "resume"); check(text(map(f.events(id).get("session")), "turn_state").equals("running"), "Explicit resume starts sample");
    }
    private static void terminalAndInspector() {
        Fixture f = new Fixture(); String id = f.session("shell");
        f.action(id, "input", "text", "rm -rf /PRIVATE-USER-FILES"); Map<String, Object> event = f.events(id);
        String output = new String(java.util.Base64.getDecoder().decode(text(event, "data")), java.nio.charset.StandardCharsets.UTF_8);
        check(output.contains("no command was executed") && !output.contains("rm -rf"), "Terminal never runs or echoes commands");
        check(output.contains("\u001b[32m") && output.contains("└──"), "Color and terminal tree sample");
        String project = f.projectId();
        check(list(f.post("/v1/inspect", "project_id", project, "action", "files", "path", "").get("entries")).size() == 2, "File browser");
        check(text(f.post("/v1/inspect", "project_id", project, "action", "file", "path", "README.md"), "text").contains("No files were read"), "Fictional file preview");
        check(list(f.post("/v1/inspect", "project_id", project, "action", "status").get("entries")).size() == 1, "Git status");
        check(text(f.post("/v1/inspect", "project_id", project, "action", "diff", "path", "src/garden.js"), "text").contains("@@"), "Git diff");
        check(list(f.post("/v1/inspect", "project_id", project, "action", "history").get("entries")).size() == 1, "History");
        fails("error_demo_path", () -> f.post("/v1/inspect", "project_id", project, "action", "file", "path", "../../private"));
        fails("error_demo_request", () -> f.post("/native/open-file", "path", "/private"));
        fails("error_demo_request", () -> f.post("/v1/pair", "code", "12345678"));
    }
    private static void managementAndHistory() {
        Fixture f = new Fixture(); String project = f.projectId(), id = f.session("codex");
        f.action(id, "manage", "action", "archive"); check(map(f.events(id).get("session")).get("archived").equals(true), "Archiving preserves running replay");
        f.action(id, "manage", "action", "rename", "title", "Sample renamed"); check(text(map(f.events(id).get("session")), "title").equals("Sample renamed"), "Rename");
        fails("error_session_active", () -> f.action(id, "manage", "action", "delete"));
        f.action(id, "stop"); f.action(id, "manage", "action", "delete"); fails("error_session_missing", () -> f.events(id));
        check(list(f.post("/v1/session-history", "project_id", project, "agent", "claude").get("sessions")).size() == 1, "Fictional import catalog");
        Map<String, Object> started = f.post("/v1/sessions", "project_id", project, "agent", "claude", "mode", "chat", "worktree_path", DemoWorkspace.ROOT + "-preview", "source_thread_id", "demo-history");
        check(text(map(started.get("session")), "agent").equals("claude"), "Import is isolated sample session");
        f.post("/v1/project-session", "project_id", project, "session_id", map(started.get("session")).get("id"), "agent", "claude");
        check(text(map(f.health().get("session")), "id").equals(text(map(started.get("session")), "id")), "Selecting a session");
        check(list(f.post("/v1/models", "project_id", project, "agent", "claude").get("models")).size() == 1, "Sample model selection");
        check(list(f.post("/v1/commands", "project_id", project, "agent", "claude").get("commands")).size() == 1, "Sample slash command selection");
        String target = f.session("opencode"); Map<String, Object> preview = f.action(target, "handoff", "action", "preview");
        check(text(preview, "context").contains("Fictional"), "Synthetic handoff preview");
        Map<String, Object> transferred = f.action(target, "handoff", "action", "start", "agent", "codex", "context", "PRIVATE-CONTEXT", "instruction", "PRIVATE-INSTRUCTION");
        check(!f.events(text(map(transferred.get("session")), "id")).toString().contains("PRIVATE"), "Handoff does not retain submitted context");
    }
    private static void resetAndSafetyLimits() {
        Fixture f = new Fixture(); String oldInstance = f.demo.instance(), old = f.session("codex");
        f.action(old, "message", "text", "ignored"); f.demo.reset(true); f.now.addAndGet(100000);
        check(!f.demo.instance().equals(oldInstance), "Every reset has a new identity");
        fails("error_session_missing", () -> f.events(old));
        Map<String, Object> feed = f.get("/v1/completions?cursor=0&instance=" + oldInstance + "&wait=0");
        check(feed.get("reset").equals(true) && list(feed.get("events")).isEmpty(), "Old replay/completions removed");
        check(lastAnswer(f.events(f.session("codex"))).contains("가상의"), "Korean sample copy");
        fails("error_demo_path", () -> f.post("/v1/folders", "path", "/data/data/com.termux/files/home"));
        fails("error_demo_path", () -> f.post("/v1/project", "path", "/demo/../private"));
        fails("error_demo_request", () -> f.demo.request("DELETE", "/v1/health", data()));
        fails("error_demo_request", () -> f.get("/v1/completions?cursor=-1&instance=none&wait=0"));
        fails("error_demo_limit", () -> f.action(f.session("codex"), "message", "text", new String(new char[8193]).replace('\0', 'x')));
        for (int i = 0; i < 11; i++) f.post("/v1/project", "path", "/demo/projects/sample" + i);
        fails("error_demo_limit", () -> f.post("/v1/project", "path", "/demo/projects/too-many"));
        Fixture second = new Fixture(); check(list(second.health().get("projects")).size() == 1, "Workspaces are isolated instances");
    }
    private static void githubSample() {
        Fixture f = new Fixture(); check(text(f.post("/v1/github", "action", "status"), "account").contains("fictional"), "No credential needed");
        check(list(f.post("/v1/github", "action", "repositories").get("entries")).size() == 1, "Fictional repositories");
        Map<String, Object> result = f.post("/v1/github", "action", "clone", "repository", "demo/pocket-garden", "parent", "/demo/projects", "name", "new-garden", "request_id", "sample-clone");
        check(text(map(result.get("job")), "state").equals("complete"), "In-memory import sample");
        check(list(f.health().get("projects")).size() == 2, "Sample project registered");
        fails("error_demo_request", () -> f.post("/v1/github", "action", "clone", "repository", "real/private", "parent", "/demo/projects", "name", "private"));
    }
    private static void normalDraftBoundary() {
        NormalDraftStore store = new NormalDraftStore();
        String payload = "{\"views\":[[\"project/session\",{\"text\":\"PRIVATE-NORMAL-DRAFT\"}]]}";
        check(!store.ready(), "No entry-ready snapshot initially");
        check(!store.save(payload, true), "Demo cannot write normal drafts");
        check(store.save(payload, false), "Normal draft captured in RAM");
        check(store.take(true).equals("{}") && store.ready(), "Demo cannot read or consume normal snapshot");
        check(!store.save(new String(new char[NormalDraftStore.MAX_CHARACTERS + 1]), false), "Oversize save refused");
        check(store.ready(), "Rejected save preserves existing snapshot");
        check(store.take(false).equals(payload), "Normal page restores exact draft");
        check(!store.ready() && store.take(false).equals("{}"), "Restore is one-shot");
        check(!store.save(null, false) && !store.ready(), "Failed capture cannot permit demo entry");
        check(store.save("", false), "Bounded empty payload accepted by RAM store; API validates JSON separately");
        check(new NormalDraftStore().take(false).equals("{}"), "A new activity has no persisted draft data");
    }
    private static void uiQueueAddContract() {
        Fixture f = new Fixture(); String id = f.session("codex"); long revision = ((Number)map(f.events(id).get("session")).get("output_end")).longValue();
        Map<String, Object> first = f.action(id, "queue", "action", "add", "text", "PRIVATE-UI-FIRST-SEND", "request_id", "first-ui-request");
        check(text(map(first.get("session")), "turn_state").equals("running"), "Actual UI queue:add starts the first replay");
        check(list(first.get("queue")).isEmpty(), "First ready send is consumed immediately");
        check(((Number)map(first.get("session")).get("output_end")).longValue() > revision, "Queue response includes current session revision");
        f.action(id, "queue", "action", "add", "text", "PRIVATE-UI-SECOND-SEND", "request_id", "second-ui-request");
        List<Map<String, Object>> queued = list(f.action(id, "queue", "action", "add", "text", "PRIVATE-UI-THIRD-SEND", "request_id", "third-ui-request").get("queue"));
        check(queued.size() == 2 && !queued.toString().contains("PRIVATE"), "Active sends queue only fictional placeholders");
        f.finish(id); Map<String, Object> event = f.events(id);
        check(lastAnswer(event).contains("Python"), "First real UI send advances the prerecorded format");
        check(list(event.get("queue")).isEmpty(), "The next replay consumes all waiting messages as one batch");
        f.finish(id); event = f.events(id);
        check(lastAnswer(event).contains("```json") && list(event.get("queue")).isEmpty(), "One queued batch produces one next replay");
        check(!event.toString().contains("PRIVATE-UI"), "Actual UI request contents are never retained");
        fails("error_session_not_running", () -> f.action(f.session("shell"), "queue", "action", "add", "text", "ignored"));
        f.action(id, "stop"); fails("error_session_not_running", () -> f.action(id, "queue", "action", "add", "text", "ignored"));
    }
    private static void projectResponseContract() {
        Fixture f = new Fixture(); String firstId = f.projectId();
        Map<String, Object> second = map(f.post("/v1/project", "path", "/demo/projects/second").get("project"));
        check(list(f.health().get("features")).contains("project_ordering"), "Demo advertises memory-only project ordering");
        String secondId = text(second, "id");
        Map<String, Object> order = f.post("/v1/project/manage", "project_id", secondId, "action", "move_up");
        check(list(order.get("project_order")).equals(Arrays.asList(secondId, firstId)), "Move up returns ordered IDs");
        check(text(list(f.health().get("projects")).get(0), "id").equals(secondId), "Health follows project order");
        check(text(map(f.health().get("project")), "id").equals(secondId), "Reordering leaves active project unchanged");
        f.post("/v1/project/manage", "project_id", secondId, "action", "move_up");
        check(text(list(f.health().get("projects")).get(0), "id").equals(secondId), "Top boundary is a no-op");
        f.post("/v1/project/manage", "project_id", secondId, "action", "move_down");
        check(text(list(f.health().get("projects")).get(0), "id").equals(firstId), "Move down restores original order");
        check(list(f.health().get("features")).contains("project_drag_ordering"), "Demo supports drag ordering");
        f.post("/v1/project/manage", "project_id", secondId, "action", "move_to", "position", 0);
        check(text(list(f.health().get("projects")).get(0), "id").equals(secondId), "Drag moves to requested position");
        f.post("/v1/project/manage", "project_id", secondId, "action", "move_to", "position", 1);
        Map<String, Object> renamed = f.post("/v1/project/manage", "project_id", firstId, "action", "rename", "name", "Renamed sample");
        check(text(map(renamed.get("project")), "id").equals(firstId), "Rename response returns its requested target");
        check(text(map(f.health().get("project")), "id").equals(text(second, "id")), "Rename does not change active project");
        Map<String, Object> removed = f.post("/v1/project/manage", "project_id", second.get("id"), "action", "delete");
        check(!removed.containsKey("project") && text(removed, "active_project_id").equals(firstId), "Delete response carries only remaining active project ID");
        f.post("/v1/project", "path", DemoWorkspace.ROOT);
        check(list(f.health().get("projects")).size() == 1, "Registering existing sample folder reuses it");
    }
    private static void initialMessage() {
        Fixture f = new Fixture(); String request = "initial-message-receipt";
        Map<String, Object> payload = data("project_id", f.projectId(), "agent", "codex", "mode", "chat", "new_session", true,
            "request_id", request, "initial_message", data("text", "PRIVATE_FIRST_MESSAGE"));
        Map<String, Object> first = map(f.demo.request("POST", "/v1/sessions", payload).get("session"));
        check(text(first, "turn_state").equals("running"), "Initial Send starts sample replay");
        Map<String, Object> again = map(f.demo.request("POST", "/v1/sessions", payload).get("session"));
        check(text(first, "id").equals(text(again, "id")), "Initial Send retry reuses session");
        check(text(first, "launch_id").equals(request), "Receipt can reconcile lost native replies");
        check(!f.events(text(first, "id")).toString().contains("PRIVATE_FIRST_MESSAGE"), "Demo never retains submitted first message");
    }
    public static void main(String[] args) {
        initialProtocol(); inputAndReplay(); approvalsAndQuestions(); queueAndInterrupt(); terminalAndInspector(); managementAndHistory(); resetAndSafetyLimits(); githubSample(); normalDraftBoundary(); uiQueueAddContract(); projectResponseContract();
        initialMessage();
        System.out.println("DemoWorkspace: " + assertions + " behavioral assertions passed across 12 scenarios");
    }
}
