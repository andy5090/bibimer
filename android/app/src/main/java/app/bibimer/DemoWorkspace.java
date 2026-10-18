package app.bibimer;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.LongSupplier;

/** Fictional, memory-only protocol replay. No network, files, processes or user input storage. */
final class DemoWorkspace {
    static final String HOME = "/demo", ROOT = "/demo/projects/pocket-garden";
    private static final String DIFF = "diff --git a/src/garden.js b/src/garden.js\n--- a/src/garden.js\n+++ b/src/garden.js\n@@ -1 +1 @@\n-export const flowers = 2;\n+export const flowers = 3;\n";
    private final LongSupplier clock;
    private final Map<String, Map<String, Object>> projects = new LinkedHashMap<>();
    private final Map<String, Session> sessions = new LinkedHashMap<>();
    private final List<Map<String, Object>> completions = new ArrayList<>(), jobs = new ArrayList<>();
    private String instance, activeProject;
    private long completionId;
    private boolean korean;

    static Map<String, Object> object(Object... pairs) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) result.put((String)pairs[i], pairs[i + 1]);
        return result;
    }
    static String text(Map<String, Object> data, String key) { return String.valueOf(data.getOrDefault(key, "")); }
    private String copy(String en, String ko) { return korean ? ko : en; }
    private static String id() { return UUID.randomUUID().toString(); }
    private static long number(Map<String, Object> data, String key) {
        Object value = data.get(key); return value instanceof Number ? ((Number)value).longValue() : 0;
    }
    static final class Failure extends RuntimeException {
        final String key;
        Failure(String key) { this.key = key; }
    }
    private static void require(boolean condition, String key) { if (!condition) throw new Failure(key); }
    DemoWorkspace() { this(System::currentTimeMillis); }
    DemoWorkspace(LongSupplier clock) { this.clock = clock; reset(false); }

    synchronized void reset(boolean korean) {
        this.korean = korean; instance = id(); completionId = 0;
        projects.clear(); sessions.clear(); completions.clear(); jobs.clear();
        Map<String, Object> project = addProject(ROOT, copy("Pocket Garden · sample", "Pocket Garden · 예제"));
        activeProject = text(project, "id");
        for (String agent : Arrays.asList("codex", "claude", "opencode")) {
            Session session = create(project, agent, "chat", ROOT, object());
            session.title = provider(agent) + copy(" · sample log", " · 예제 로그");
            session.item("notice", copy("Fictional session log. Send any text to replay the next example. Your input is not saved or used to create responses.",
                "가상의 세션 로그입니다. 아무 내용이나 보내면 다음 예제를 재생합니다. 입력은 저장하거나 응답 작성에 사용하지 않습니다."));
            completeLog(session);
        }
        Session terminal = create(project, "shell", "terminal", ROOT, object());
        terminal.output = copy("DEMO TERMINAL — prerecorded output; no shell commands run.\r\nTry sending any command.\r\n/demo/projects/pocket-garden $ ",
            "데모 터미널 — 미리 준비한 출력이며 셸 명령을 실행하지 않습니다.\r\n아무 명령이나 보내 보세요.\r\n/demo/projects/pocket-garden $ ");
        terminal.revision++;
        select(project, sessions.values().iterator().next());
    }
    synchronized void language(boolean korean) { this.korean = korean; }
    synchronized String instance() { return instance; }

    private Map<String, Object> addProject(String path, String name) {
        require(projects.size() < 12, "error_demo_limit");
        Map<String, Object> project = object("id", id(), "name", name, "path", path, "agent", "codex", "selected", "");
        projects.put(text(project, "id"), project); return project;
    }
    private Map<String, Object> project(Map<String, Object> data) {
        String key = data.containsKey("project_id") ? text(data, "project_id") : activeProject;
        require(projects.containsKey(key), "error_project_missing"); return projects.get(key);
    }
    private static String provider(String agent) { return agent.equals("codex") ? "Codex" : agent.equals("claude") ? "Claude Code" : agent.equals("opencode") ? "OpenCode" : "Terminal"; }
    private Session create(Map<String, Object> project, String agent, String mode, String path, Map<String, Object> options) {
        require(sessions.size() < 24, "error_demo_limit");
        require(Arrays.asList("codex", "claude", "opencode", "shell").contains(agent), "error_agent_unavailable");
        require(Arrays.asList("chat", "terminal").contains(mode) && !(agent.equals("shell") && mode.equals("chat")), "error_demo_request");
        require(path.equals(text(project, "path")) || path.equals(text(project, "path") + "-preview"), "error_worktree_missing");
        Session session = new Session(project, agent, mode, path, options);
        sessions.put(session.id, session); return session;
    }
    private void select(Map<String, Object> project, Session session) {
        activeProject = text(project, "id"); project.put("selected", session == null ? "" : session.id);
        if (session != null) project.put("agent", session.agent);
    }
    private final class Session {
        final String id = DemoWorkspace.id(), agent, mode;
        final Map<String, Object> project;
        final List<Map<String, Object>> items = new ArrayList<>(), requests = new ArrayList<>(), queue = new ArrayList<>();
        Map<String, Object> options;
        String state = "running", turn = "ready", title = "", output = "", turnId = "";
        boolean archived, paused;
        int replay, phase;
        long revision, due, started = clock.getAsLong();
        Session(Map<String, Object> parent, String agent, String mode, String path, Map<String, Object> options) {
            this.project = object("id", parent.get("id"), "name", parent.get("name"), "path", path);
            this.agent = agent; this.mode = mode;
            this.options = object("permission", "inherit", "model", "", "effort", "");
            if (agent.equals("codex")) this.options.put("fast", false);
            this.options.putAll(options);
        }
        void item(String kind, String text) { item(object("kind", kind, "text", text, "status", "completed")); }
        void item(Map<String, Object> value) {
            value.put("id", "demo-" + id + "-" + (++revision)); value.put("revision", revision);
            items.add(value); if (items.size() > 100) items.remove(0);
        }
        Map<String, Object> snapshot() {
            return object("id", id, "project", project, "agent", agent, "mode", mode, "state", state,
                "display_title", title, "title", title, "archived", archived, "options", options, "launch_options", options,
                "ready", true, "turn_state", turn, "active_turn_id", turnId, "queued_count", queue.size(),
                "queue_paused", paused, "can_steer", agent.equals("codex"), "started_at", started / 1000.0,
                "output_start", 0, "output_end", revision, "exit_code", state.equals("exited") ? 0 : null,
                "external_thread_id", "demo-" + id, "history_persisted", false);
        }
    }
    private void completeLog(Session session) {
        String name = provider(session.agent);
        int scenario = (session.replay + (session.agent.equals("claude") ? 1 : session.agent.equals("opencode") ? 2 : 0)) % 3;
        session.item(object("kind", "plan", "steps", Arrays.asList(object("step", copy("Explore the fictional garden", "가상의 정원 살펴보기"), "status", "completed"),
            object("step", copy("Review sample changes", "예제 변경 내용 확인"), "status", "completed"))));
        session.item(object("kind", "command", "title", "demo: inspect sample workspace", "text", "[sample output]\nsrc/garden.js\nREADME.md\n", "exit_code", 0, "status", "completed"));
        session.item(object("kind", "tool", "title", name + " · fictional tool event", "text", "{\"demo\": true, \"flowers\": [\"mint\", \"iris\", \"rose\"]}", "status", "completed"));
        session.item(object("kind", "diff", "title", "Sample change · no file was edited", "changes", Arrays.asList(object("path", "src/garden.js", "diff", DIFF)), "status", "completed"));
        if (scenario == 0) session.item("assistant", copy("## " + name + " sample session\n\nThis is **fictional log replay**, independent of your input. No agent, shell or file operation ran.\n\n[Sample file](src/garden.js) · preview from the Files panel.\n\n### Garden checklist\n- [x] Display sample files\n- [x] Show a diff\n- [ ] Try approval and question cards\n\n| Feature | Sample result |\n| --- | --- |\n| Flowers | 3 |\n| Color | mint |\n\n```javascript\nexport const flowers = 3;\nconsole.log('Hello, pocket garden');\n```\n\n> The phone is the workspace; this demo only previews its interface.\n\nSend any text to replay the next example. Every third example offers **approval**, then a **question**. The other examples finish automatically so you can test background alerts.",
            "## " + name + " 예제 세션\n\n입력과 관계없이 **가상의 로그를 재생**합니다. 에이전트·셸 명령·파일 작업은 실행하지 않았습니다.\n\n[예제 파일](src/garden.js) · 파일 패널에서 미리 볼 수 있습니다.\n\n### 정원 체크리스트\n- [x] 예제 파일 표시\n- [x] 변경 내용 보기\n- [ ] 승인·질문 카드 체험\n\n| 항목 | 예제 결과 |\n| --- | --- |\n| 꽃 | 3개 |\n| 색상 | 민트 |\n\n```javascript\nexport const flowers = 3;\nconsole.log('Hello, pocket garden');\n```\n\n> 휴대폰이 개발 공간이 됩니다. 이 데모는 그 화면을 미리 보여줍니다.\n\n아무 내용이나 보내면 다음 예제를 재생합니다. 세 번째마다 **승인**과 **질문**을 체험할 수 있습니다. 나머지 예제는 자동으로 끝나므로 백그라운드 알림도 확인할 수 있습니다."));
        else if (scenario == 1) {
            session.item(object("kind", "command", "title", "demo: fictional Python test", "text", "FICTIONAL TEST OUTPUT — no Python process was started\nTraceback (most recent call last):\n  File \"sample_garden.py\", line 4, in sample\n    raise ValueError('sample only')\nValueError: sample only\n\n...\n3 example checks passed\n", "exit_code", 0, "status", "completed"));
            session.item("assistant", copy("## " + name + " · Python example\n\n**Fictional replay.** The traceback and results above are sample text, unrelated to your input. No tests actually ran.\n\n1. Read a sample traceback.\n2. Expand the command card to see multiline output.\n3. Inspect the suggested code below.\n\n```python\ndef describe_garden(flowers):\n    return f'{len(flowers)} sample flowers'\n\nprint(describe_garden(['mint', 'iris', 'rose']))\n```\n\n> Example output: `3 sample flowers`\n\n### Next steps\n- Keep the function small.\n- Try another prerecorded sample.\n\nEvery third send shows a sample approval and question. Other sends finish automatically for background alert testing.",
                "## " + name + " · Python 예제\n\n**가상의 예제 재생입니다.** 위 오류와 결과는 미리 작성한 예제이며 입력과 관계없습니다. 테스트를 실제로 실행하지 않았습니다.\n\n1. 예제 오류를 읽어 보세요.\n2. 명령 카드를 펼쳐 여러 줄 출력을 확인하세요.\n3. 아래 코드를 살펴보세요.\n\n```python\ndef describe_garden(flowers):\n    return f'{len(flowers)} sample flowers'\n\nprint(describe_garden(['mint', 'iris', 'rose']))\n```\n\n> 예제 출력: `3 sample flowers`\n\n### 다음 단계\n- 함수를 간결하게 유지합니다.\n- 미리 준비한 다른 예제도 재생해 보세요.\n\n세 번째 전송마다 승인·질문 예제를 표시합니다. 나머지는 자동으로 끝나므로 백그라운드 알림도 확인할 수 있습니다."));
        } else {
            session.item("assistant", copy("## " + name + " · Documentation example\n\nThis **fictional log** previews Markdown, structured data and diagram source. Your input did not create this answer.\n\n### Sample configuration\n```json\n{\n  \"project\": \"pocket-garden\",\n  \"demo\": true,\n  \"flowers\": 3\n}\n```\n\n### Diagram source (displayed as code)\n```mermaid\nflowchart LR\n  Phone --> Workspace\n  Workspace --> SampleSession\n```\n\n### Notes\n- **Project:** a fictional garden\n- *Session:* prerecorded content\n- `demo: review garden`: a sample label, never an executed command\n\n> No real session transcript was used.\n\nSend any text to switch sample formats. Every third send offers approval, then a question; other examples finish automatically.",
                "## " + name + " · 문서 예제\n\n**가상의 로그**로 Markdown·구조화된 데이터·다이어그램 소스를 보여줍니다. 입력으로 이 답변을 작성하지 않았습니다.\n\n### 예제 설정\n```json\n{\n  \"project\": \"pocket-garden\",\n  \"demo\": true,\n  \"flowers\": 3\n}\n```\n\n### 다이어그램 소스 (코드로 표시)\n```mermaid\nflowchart LR\n  Phone --> Workspace\n  Workspace --> SampleSession\n```\n\n### 안내\n- **프로젝트:** 가상의 정원\n- *세션:* 미리 준비한 내용\n- `demo: review garden`: 실행하지 않는 예제 문구\n\n> 실제 세션 기록은 사용하지 않았습니다.\n\n아무 내용이나 보내면 다른 형식의 예제를 보여줍니다. 세 번째마다 승인·질문을 체험하고 나머지 예제는 자동으로 끝납니다."));
        }
    }
    private void begin(Session session) {
        require(session.state.equals("running") && session.turn.equals("ready"), "error_turn_running");
        require(session.items.size() < 96, "error_demo_limit");
        session.replay++; session.phase = 0; session.turn = "running"; session.turnId = id(); session.due = clock.getAsLong() + 1500;
        session.item("user", copy("[Prerecorded sample instruction] Review the pocket garden example.", "[미리 준비한 예제 지시] Pocket Garden 예제를 검토해 주세요."));
        session.item("notice", copy("Replaying a fictional example. Your submitted text is ignored and is not stored.", "가상의 예제를 재생합니다. 보낸 내용은 사용하거나 저장하지 않습니다."));
    }
    private void addInput(Session session, Map<String, Object> data) {
        require(session.mode.equals("chat") && session.state.equals("running"), "error_session_not_running");
        checkInput(data);
        if (session.turn.equals("ready") && session.queue.isEmpty()) {
            session.paused = false;
            begin(session);
        } else {
            require(session.queue.size() < 8, "error_demo_limit");
            session.queue.add(object("id", id(), "text", copy("[Queued sample instruction · your input is not stored]", "[대기 예제 지시 · 입력은 저장하지 않습니다]"), "state", "queued"));
            session.revision++;
        }
    }
    private void advance() {
        long now = clock.getAsLong();
        for (Session session : sessions.values()) {
            if (!session.state.equals("running") || !session.turn.equals("running") || now < session.due) continue;
            if (session.phase == 0) {
                session.item(object("kind", "plan", "steps", Arrays.asList(object("step", "Replay sample events", "status", "in_progress"), object("step", "Show formatted result", "status", "pending"))));
                session.phase = 1; session.due = now + 4500;
            } else if (session.phase == 1 && session.replay % 3 == 0) {
                session.requests.add(object("id", id(), "kind", "command", "params", object("reason", copy("Demo approval only. Accepting does not run this sample command.", "데모 승인입니다. 허용해도 아래 예제 명령은 실행하지 않습니다."),
                    "command", "demo: review garden", "cwd", session.project.get("path"), "availableDecisions", Arrays.asList("decline", "accept"))));
                session.turn = "waiting"; session.revision++;
            } else {
                completeLog(session); session.turn = "ready"; session.turnId = ""; session.revision++;
                completions.add(object("id", ++completionId, "session_id", session.id, "project_id", session.project.get("id"),
                    "project_name", copy("Demo · Pocket Garden", "데모 · Pocket Garden"), "session_title", session.title,
                    "agent", session.agent, "preview", copy("Demo: fictional sample replay completed. No AI request was made.", "데모: 가상의 예제 재생을 마쳤습니다. AI 요청은 보내지 않았습니다."), "completed_at", now / 1000.0));
                if (completions.size() > 40) completions.remove(0);
                if (!session.paused && !session.queue.isEmpty()) { session.queue.remove(0); begin(session); }
            }
        }
    }
    private Map<String, Object> health() {
        List<Map<String, Object>> rows = new ArrayList<>(), agents = new ArrayList<>();
        for (Map<String, Object> project : projects.values()) {
            List<Map<String, Object>> children = new ArrayList<>();
            for (Session session : sessions.values()) if (session.project.get("id").equals(project.get("id"))) children.add(session.snapshot());
            Session selected = sessions.get(text(project, "selected"));
            Map<String, Object> row = new LinkedHashMap<>(project); row.remove("selected");
            row.put("sessions", children); row.put("session", selected == null ? null : selected.snapshot()); rows.add(row);
        }
        for (String agent : Arrays.asList("shell", "codex", "claude", "opencode")) agents.add(object("id", agent, "name", provider(agent), "installed", true, "available", true, "ready", true, "modes", agent.equals("shell") ? Arrays.asList("terminal") : Arrays.asList("terminal", "chat")));
        Map<String, Object> project = projects.get(activeProject); Session selected = project == null ? null : sessions.get(text(project, "selected"));
        return object("version", "demo", "protocol", 1, "demo", true, "instance", instance, "home", HOME, "project", project,
            "projects", rows, "agents", agents, "session", selected == null ? null : selected.snapshot(), "features", Arrays.asList(
            "multiple_projects", "browse_folders", "import_codex_session", "import_agent_session", "agent_options", "live_agent_options",
            "chat_queue", "codex_steer", "queue_steer", "model_options", "agent_sessions", "session_library", "session_titles", "slash_commands",
            "git_worktrees", "project_management", "project_ordering", "project_drag_ordering", "response_notifications", "workspace_inspector", "github_import", "agent_handoff", "file_links"));
    }
    private String samplePath(String path) {
        if (path.equals("~") || path.isEmpty()) return HOME;
        if (path.startsWith("~/")) path = HOME + path.substring(1);
        require(path.equals(HOME) || path.startsWith(HOME + "/"), "error_demo_path");
        require(!path.contains("..") && path.length() <= 180 && !path.contains("\0"), "error_demo_path"); return path;
    }
    @SuppressWarnings("unchecked")
    synchronized Map<String, Object> request(String method, String path, Map<String, Object> data) {
        advance();
        require(method.equals("GET") || method.equals("POST"), "error_demo_request");
        if (method.equals("GET") && path.equals("/v1/health")) return health();
        if (method.equals("GET") && path.startsWith("/v1/completions?")) {
            Map<String, String> query = query(path); long cursor = parseCursor(query.get("cursor"));
            boolean reset = !instance.equals(query.get("instance"));
            List<Map<String, Object>> events = new ArrayList<>();
            if (!reset) for (Map<String, Object> completion : completions) if (number(completion, "id") > cursor) events.add(completion);
            return object("instance", instance, "cursor", completionId, "reset", reset, "events", events);
        }
        if (path.startsWith("/v1/sessions/")) {
            String[] parts = path.split("/"); require(parts.length == 5, "error_demo_request");
            Session session = sessions.get(parts[3]); require(session != null, "error_session_missing");
            String action = parts[4].split("\\?")[0];
            if (method.equals("GET") && action.equals("events")) {
                long cursor = parseCursor(query(path).get("cursor")); List<Map<String, Object>> items = new ArrayList<>(); List<String> retained = new ArrayList<>();
                for (Map<String, Object> item : session.items) { retained.add(text(item, "id")); if (number(item, "revision") > cursor) items.add(item); }
                return object("cursor", session.revision, "gap", false, "session", session.snapshot(), "items", items, "retained", retained,
                    "requests", new ArrayList<>(session.requests), "queue", new ArrayList<>(session.queue), "data", cursor < session.revision && session.mode.equals("terminal") ? Base64.getEncoder().encodeToString(session.output.getBytes(StandardCharsets.UTF_8)) : "");
            }
            if (method.equals("GET") && action.equals("title")) return object("session", session.snapshot());
            require(method.equals("POST"), "error_demo_request");
            if (action.equals("message")) {
                addInput(session, data);
            } else if (action.equals("input")) {
                require(session.mode.equals("terminal") && session.state.equals("running"), "error_demo_request");
                session.output = "\r\n" + copy("[Sample terminal replay — input ignored; no command was executed]", "[예제 터미널 재생 — 입력은 사용하지 않으며 명령을 실행하지 않았습니다]") + "\r\n\u001b[32mpocket-garden\u001b[0m\r\n├── README.md\r\n└── src/garden.js\r\n\r\n3 sample flowers\r\n" + session.project.get("path") + " $ "; session.revision++;
            } else if (action.equals("respond")) {
                require(!session.requests.isEmpty() && text(session.requests.get(0), "id").equals(text(data, "prompt_id")), "error_prompt_missing");
                Map<String, Object> prompt = session.requests.remove(0);
                if (text(prompt, "kind").equals("command") && text(data, "decision").equals("accept")) {
                    session.requests.add(object("id", id(), "kind", "questions", "params", object("questions", Arrays.asList(object("id", "demo-color", "question", copy("Sample question: choose a garden color. This answer is not stored.", "예제 질문: 정원 색상을 선택해 보세요. 답변은 저장하지 않습니다."),
                        "isOther", true, "options", Arrays.asList(object("label", "Mint", "description", "Sample option"), object("label", "Lavender", "description", "Sample option")))))));
                } else { session.phase = 2; session.turn = "running"; session.due = clock.getAsLong() + 1500; }
                session.revision++;
            } else if (action.equals("queue")) {
                require(session.mode.equals("chat") && session.state.equals("running"), "error_session_not_running");
                String operation = text(data, "action");
                if (operation.equals("add")) addInput(session, data);
                else if (operation.equals("resume")) { session.paused = false; if (session.turn.equals("ready") && !session.queue.isEmpty()) { session.queue.remove(0); begin(session); } }
                else {
                    Map<String, Object> entry = session.queue.stream().filter(row -> text(row, "id").equals(text(data, "entry_id"))).findFirst().orElse(null);
                    require(entry != null, "error_queue_entry");
                    require(operation.equals("remove") || operation.equals("steer"), "error_demo_request");
                    if (operation.equals("steer")) require(session.agent.equals("codex") && session.turnId.equals(text(data, "turn_id")) && !session.turnId.isEmpty(), "error_steer_unavailable");
                    session.queue.remove(entry); if (operation.equals("steer")) session.item("notice", copy("Demo steer accepted. The prerecorded example is unchanged.", "데모 Steer를 수락했습니다. 미리 준비한 예제는 그대로 재생합니다."));
                } session.revision++;
            } else if (action.equals("steer")) {
                checkInput(data); require(session.agent.equals("codex") && !session.turnId.isEmpty() && session.turnId.equals(text(data, "turn_id")), "error_steer_unavailable");
                session.item("notice", copy("Demo steer accepted. Input is ignored; replay is unchanged.", "데모 Steer를 수락했습니다. 입력은 사용하지 않고 같은 예제를 재생합니다."));
            } else if (action.equals("interrupt")) {
                session.turn = "ready"; session.turnId = ""; session.requests.clear(); session.paused = true; session.item("notice", copy("Sample replay interrupted. Queue paused.", "예제 재생을 중단했습니다. 대기열도 일시정지했습니다."));
            } else if (action.equals("stop")) {
                session.state = "exited"; session.turn = "ready"; session.turnId = ""; session.requests.clear(); session.queue.clear(); session.revision++;
            } else if (action.equals("manage")) {
                String operation = text(data, "action");
                if (operation.equals("rename")) { String title = text(data, "title").trim(); require(!title.isEmpty() && title.length() <= 120, "error_demo_request"); session.title = title; }
                else if (operation.equals("archive") || operation.equals("restore")) session.archived = operation.equals("archive");
                else if (operation.equals("delete")) { require(!session.state.equals("running"), "error_session_active"); sessions.remove(session.id); return object("deleted", true); }
                else throw new Failure("error_demo_request"); session.revision++;
            } else if (action.equals("options")) {
                require(data.get("options") instanceof Map, "error_demo_request"); session.options = new LinkedHashMap<>((Map<String, Object>)data.get("options")); session.revision++;
            } else if (action.equals("handoff")) {
                require(session.mode.equals("chat") && session.turn.equals("ready") && session.requests.isEmpty() && session.queue.isEmpty(), "error_turn_running");
                if (text(data, "action").equals("preview")) return object("context", copy("[Fictional sample context]\nUser: Review Pocket Garden.\nAssistant: Three sample flowers are displayed.", "[가상의 예제 맥락]\n사용자: Pocket Garden을 검토해 주세요.\n답변: 예제 꽃 세 송이를 표시했습니다."), "revision", session.revision, "message_count", 2, "truncated", false);
                require(text(data, "action").equals("start"), "error_demo_request");
                Map<String, Object> project = projects.get(text(session.project, "id"));
                Session next = create(project, text(data, "agent"), "chat", text(session.project, "path"), object());
                next.title = provider(next.agent) + " · sample handoff"; completeLog(next); select(project, next); return object("session", next.snapshot());
            } else require(action.equals("resize"), "error_demo_request");
            return object("session", session.snapshot(), "queue", new ArrayList<>(session.queue));
        }
        require(method.equals("POST"), "error_demo_request");
        if (path.equals("/v1/folders")) {
            String folder = samplePath(text(data, "path")); List<Map<String, Object>> entries = new ArrayList<>();
            if (folder.equals(HOME)) entries.add(object("name", "projects", "path", HOME + "/projects"));
            else if (folder.equals(HOME + "/projects")) for (Map<String, Object> project : projects.values()) entries.add(object("name", project.get("name"), "path", project.get("path")));
            return object("path", folder, "parent", folder.equals(HOME) ? null : folder.substring(0, folder.lastIndexOf('/')), "entries", entries, "writable", true, "next", null);
        }
        if (path.equals("/v1/project")) {
            Map<String, Object> project;
            if (data.containsKey("project_id")) project = project(data);
            else {
                String folder = samplePath(text(data, "path"));
                project = projects.values().stream().filter(row -> text(row, "path").equals(folder)).findFirst().orElse(null);
                if (project == null) project = addProject(folder, folder.substring(folder.lastIndexOf('/') + 1) + " · sample");
            }
            activeProject = text(project, "id"); return object("project", project);
        }
        if (path.equals("/v1/project/manage")) {
            Map<String, Object> project = project(data);
            if (text(data, "action").equals("move_up") || text(data, "action").equals("move_down") || text(data, "action").equals("move_to")) {
                List<String> keys = new ArrayList<>(projects.keySet()); String key = text(project, "id");
                int index = keys.indexOf(key), destination = index + (text(data, "action").equals("move_up") ? -1 : 1);
                if (text(data, "action").equals("move_to")) {
                    Object position = data.get("position");
                    require(position instanceof Integer || position instanceof Long, "error_demo_request");
                    long requested = ((Number) position).longValue();
                    require(requested >= 0 && requested < keys.size(), "error_demo_request");
                    destination = (int) requested;
                }
                if (destination >= 0 && destination < keys.size()) {
                    keys.remove(index); keys.add(destination, key);
                    Map<String, Map<String, Object>> ordered = new LinkedHashMap<>();
                    for (String id : keys) ordered.put(id, projects.get(id));
                    projects.clear(); projects.putAll(ordered);
                }
                return object("project_order", keys);
            }
            if (text(data, "action").equals("rename")) {
                String name = text(data, "name").trim(); require(!name.isEmpty() && name.length() <= 120, "error_demo_request"); project.put("name", name);
                for (Session session : sessions.values()) if (session.project.get("id").equals(project.get("id"))) session.project.put("name", name);
                return object("project", project, "active_project_id", activeProject);
            }
            else if (text(data, "action").equals("delete")) {
                for (Session session : sessions.values()) require(!session.project.get("id").equals(project.get("id")) || !session.state.equals("running"), "error_project_active");
                sessions.values().removeIf(session -> session.project.get("id").equals(project.get("id"))); projects.remove(text(project, "id"));
                if (activeProject.equals(project.get("id"))) activeProject = projects.isEmpty() ? null : projects.keySet().iterator().next();
            } else throw new Failure("error_demo_request"); return object("active_project_id", activeProject);
        }
        if (path.equals("/v1/worktrees")) {
            Map<String, Object> project = project(data); String folder = text(project, "path");
            return object("project_id", project.get("id"), "worktrees", Arrays.asList(object("path", folder, "name", project.get("name"), "primary", true, "available", true, "branch", "main"), object("path", folder + "-preview", "name", "sample-preview", "primary", false, "available", true, "branch", "demo/preview")));
        }
        if (path.equals("/v1/project-agent") || path.equals("/v1/project-session")) {
            Map<String, Object> project = project(data); String agent = text(data, "agent"); Session selected = null;
            if (data.containsKey("session_id")) { selected = sessions.get(text(data, "session_id")); require(selected != null && selected.project.get("id").equals(project.get("id")), "error_session_missing"); }
            else for (Session session : sessions.values()) if (session.project.get("id").equals(project.get("id")) && session.agent.equals(agent)) selected = session;
            select(project, selected); project.put("agent", agent); return object("project", project, "session", selected == null ? null : selected.snapshot());
        }
        if (path.equals("/v1/sessions")) {
            Map<String, Object> project = project(data); String folder = data.containsKey("worktree_path") ? text(data, "worktree_path") : text(project, "path");
            Session session = create(project, text(data, "agent"), text(data, "mode"), folder, data.get("options") instanceof Map ? (Map<String, Object>)data.get("options") : object());
            session.title = provider(session.agent) + " · sample";
            if (session.mode.equals("chat")) completeLog(session); else { session.output = "DEMO TERMINAL — prerecorded output. No commands run.\r\n" + folder + " $ "; session.revision++; }
            select(project, session); return object("session", session.snapshot());
        }
        if (path.equals("/v1/models")) return object("agent", data.get("agent"), "models", Arrays.asList(object("id", "demo-model", "name", "Sample model · no inference", "description", "Fictional selector example", "efforts", Arrays.asList(object("id", "low"), object("id", "high")))));
        if (path.equals("/v1/commands")) return object("commands", Arrays.asList(object("id", "demo-sample", "name", "sample", "description", "Replay the fictional sample", "kind", "command", "scope", "demo", "hint", "")));
        if (path.equals("/v1/session-history")) return object("sessions", Arrays.asList(object("id", "demo-history", "title", "Fictional saved session", "updated_at", clock.getAsLong() / 1000.0, "source", "demo")), "next_cursor", null, "project_id", project(data).get("id"));
        if (path.equals("/v1/inspect")) return inspect(data);
        if (path.equals("/v1/github")) return github(data);
        throw new Failure("error_demo_request");
    }
    private void checkInput(Map<String, Object> data) {
        require(data.get("text") instanceof String && !text(data, "text").trim().isEmpty(), "error_input_size");
        require(text(data, "text").length() <= 8192, "error_demo_limit");
    }
    private static Map<String, String> query(String path) {
        require(path.contains("?"), "error_demo_request"); Map<String, String> result = new LinkedHashMap<>();
        for (String pair : path.substring(path.indexOf('?') + 1).split("&")) { String[] parts = pair.split("=", 2); require(parts.length == 2, "error_demo_request"); result.put(parts[0], parts[1]); } return result;
    }
    private static long parseCursor(String cursor) { require(cursor != null && cursor.matches("[0-9]{1,16}"), "error_demo_request"); return Long.parseLong(cursor); }
    private Map<String, Object> inspect(Map<String, Object> data) {
        project(data); String action = text(data, "action"), path = text(data, "path");
        require(path.isEmpty() || path.equals("README.md") || path.equals("src") || path.equals("src/garden.js"), "error_demo_path");
        if (action.equals("files")) return object("path", path, "entries", path.equals("src") ? Arrays.asList(object("name", "garden.js", "path", "src/garden.js", "kind", "file")) : Arrays.asList(object("name", "README.md", "path", "README.md", "kind", "file"), object("name", "src", "path", "src", "kind", "folder")), "next_offset", null);
        if (action.equals("file")) return object("kind", "text", "path", path, "text", path.equals("README.md") ? "# Pocket Garden\n\nFictional demo project. No files were read from your phone.\n" : "// Fictional sample file\nexport const flowers = 3;\n", "language", path.endsWith(".js") ? "javascript" : "markdown", "truncated", false);
        if (action.equals("status")) return object("branch", object("head", "main", "upstream", "sample/main", "ab", "+1 -0"), "entries", Arrays.asList(object("xy", ".M", "path", "src/garden.js", "conflict", false)), "next_offset", null);
        if (action.equals("diff")) return object("text", DIFF, "diff", DIFF, "truncated", false);
        if (action.equals("history")) return object("revision", "demo-history", "entries", Arrays.asList(object("id", "1111111111111111111111111111111111111111", "short", "1111111", "subject", "Sample: plant the pocket garden", "author", "Demo Author", "date", "2026-01-01", "refs", "main")), "next_offset", null);
        if (action.equals("commit")) return object("subject", "Sample: plant the pocket garden", "author", "Demo Author", "date", "2026-01-01", "text", DIFF, "diff", DIFF, "truncated", false);
        throw new Failure("error_demo_request");
    }
    private Map<String, Object> github(Map<String, Object> data) {
        String action = text(data, "action");
        if (action.equals("repositories")) return object("entries", Arrays.asList(object("name", "demo/pocket-garden", "description", "Fictional repository; no GitHub request is made.", "private", false, "archived", false)), "next", null);
        if (action.equals("clone")) {
            require(text(data, "repository").equals("demo/pocket-garden"), "error_demo_request");
            String parent = samplePath(text(data, "parent")), name = text(data, "name"); require(name.matches("[A-Za-z0-9_-]{1,60}"), "error_demo_path");
            Map<String, Object> project = addProject(parent + "/" + name, name + " · sample");
            Map<String, Object> job = object("id", text(data, "request_id"), "state", "complete", "repository", "demo/pocket-garden", "path", project.get("path"), "project_id", project.get("id"));
            jobs.add(job); return object("job", job);
        }
        require(Arrays.asList("status", "poll", "login", "cancel_login", "cancel_clone").contains(action), "error_demo_request");
        return object("installed", true, "account", "demo-account · fictional", "login", object("state", "complete"), "jobs", new ArrayList<>(jobs));
    }
}
