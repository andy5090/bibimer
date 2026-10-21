"""Controlled app-server fixture. Never contacts a model or runs shell commands."""
import json
import os
import sys
import time
from pathlib import Path

thread, turn, pending = "test-thread", None, None
count = 0
store = Path(os.environ["BIBIMER_TEST_CODEX_STORE"]) if os.environ.get("BIBIMER_TEST_CODEX_STORE") else None
history = []
defaults = {"model":"test-codex", "reasoningEffort":"medium", "approvalPolicy": "on-request", "approvalsReviewer": "user", "sandbox": {"type": "workspaceWrite", "writableRoots": [], "networkAccess": False}}


def saved(key):
    return {"id": key, "name": "Saved workspace" if key == "saved-one" else "Earlier fix <b>literal</b>",
            "preview": "Private saved preview", "cwd": str(Path.cwd() / "other") if key == "foreign" else str(Path.cwd()),
            "ephemeral": key == "temporary", "updatedAt": 1790564400, "source": "cli",
            "status": {"type": "active" if key == "active" else "notLoaded"}}


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def notify(method, params):
    emit({"method": method, "params": {"threadId": thread, "turnId": turn, **params}})


def item(value, complete=True):
    if store and complete and value.get("type") in {"userMessage", "agentMessage"}:
        history.append({"turnId": turn, "item": value})
        store.write_text(json.dumps({"thread": saved(thread), "history": history}))
    notify("item/completed" if complete else "item/started", {"item": value})


def finish(status="completed"):
    item({"id": "reply", "type": "agentMessage", "text": "# Result\n**Formatted** reply · 비비머\n- First step\n- Second step\n```python\nprint('hello')\n+-------+\n| ASCII |\n+-------+\n```\n| Name | State |\n| --- | --- |\n| Task | Done |\n<script>window.untrusted=true</script>"})
    if text == "context-compact":
        item({"id": "compaction", "type": "contextCompaction"})
    notify("thread/tokenUsage/updated", {"tokenUsage": {
        "last": {"totalTokens": 12000 if text == "context-compact" else 76000,
                 "inputTokens": 70000, "cachedInputTokens": 60000, "outputTokens": 6000, "reasoningOutputTokens": 2000},
        "total": {"totalTokens": 9999999}, "modelContextWindow": 200000}})
    notify("turn/completed", {"turn": {"id": turn, "status": status}})


for line in sys.stdin:
    message = json.loads(line)
    method, params = message.get("method"), message.get("params", {})
    if method in {"thread/start", "thread/resume", "thread/fork", "turn/start"}:
        with Path("codex-options.jsonl").open("a") as capture:
            capture.write(json.dumps({"method": method, **{key: params[key] for key in ("sandbox", "sandboxPolicy", "approvalPolicy", "serviceTier", "config", "approvalsReviewer", "model", "effort") if key in params}}) + "\n")
    if method in {"turn/start", "turn/steer"}:
        with Path("codex-inputs.jsonl").open("a") as capture:
            capture.write(json.dumps({"method": method, "input": params["input"]}) + "\n")
    if method == "skills/list":
        assert params["cwds"] == [str(Path.cwd())]
        rows = [{"name": "review", "description": "Review changes <b>literally</b>", "enabled": True,
                 "path": str(Path.cwd()/".agents/skills/review/SKILL.md"), "scope": "repo"},
                {"name": "disabled", "enabled": False, "path": "/disabled/SKILL.md"},
                {"name": "bad name", "enabled": True, "path": "/bad/SKILL.md"},
                {"name": "duplicate", "description": "First scope", "path": "/first/SKILL.md", "enabled": True},
                {"name": "duplicate", "description": "Second scope", "path": "/second/SKILL.md", "enabled": True}]
        emit({"id": message["id"], "result": {"data": [{"cwd": str(Path.cwd()), "skills": rows, "errors": []}]}})
    elif method == "initialize":
        emit({"id": message["id"], "result": {"userAgent": "test"}})
    elif method == "model/list":
        rows = [{"id":"test-codex", "model":"test-codex", "displayName":"Test Codex", "defaultReasoningEffort":"medium", "isDefault":True,
                 "supportedReasoningEfforts":[{"reasoningEffort":level,"description":"Controlled "+level} for level in ["low","medium","high","xhigh"]]},
                {"id":"test-small", "model":"test-small", "displayName":"Test Small", "defaultReasoningEffort":"low",
                 "supportedReasoningEfforts":[{"reasoningEffort":"low"}]},
                {"id":"hidden-model", "hidden":True}]
        emit({"id":message["id"],"result":{"data":rows,"nextCursor":None}})
    elif method == "thread/start":
        assert params["ephemeral"] is False
        emit({"id": message["id"], "result": {**defaults, "thread": {"id": thread, "ephemeral": False}}})
    elif method == "thread/list":
        assert params["cwd"] == str(Path.cwd()) and params["limit"] == 25
        assert params["sourceKinds"] == ["cli", "vscode", "appServer"]
        assert params["modelProviders"] == []
        if store:
            rows = [json.loads(store.read_text())["thread"]] if store.exists() else []
            emit({"id": message["id"], "result": {"data": rows, "nextCursor": None}})
            continue
        if params.get("searchTerm") == "unsupported":
            emit({"id": message["id"], "error": {"code": -32601, "message": "Unsupported"}})
            continue
        data = [saved("saved-two")] if params.get("cursor") else [saved("saved-one")]
        data = [entry for entry in data if params.get("searchTerm", "") in entry["name"]]
        emit({"id": message["id"], "result": {"data": data, "nextCursor": None if params.get("cursor") or not data else "page-2"}})
    elif method == "thread/read":
        assert params["includeTurns"] is False
        emit({"id": message["id"], "result": {"thread": saved(params["threadId"])}})
    elif method in {"thread/resume", "thread/fork"}:
        assert set(params) <= {"threadId", "excludeTurns", "sandbox", "approvalPolicy", "approvalsReviewer", "serviceTier", "config"} and params["excludeTurns"] is True
        if params["threadId"] == "import-failure":
            emit({"id": message["id"], "error": {"code": -32603, "message": "Do not expose private failure detail"}})
            continue
        thread = params["threadId"] + ("-copy" if method == "thread/fork" else "")
        if store:
            history = json.loads(store.read_text())["history"]
        emit({"id": message["id"], "result": {**defaults, "thread": {**saved(thread), "turns": []}}})
    elif method == "thread/items/list":
        assert params == {"threadId": thread, "sortDirection": "desc", "limit": 50}
        if store:
            emit({"id": message["id"], "result": {"data": list(reversed(history[-50:]))}})
            continue
        if thread.startswith("no-preview"):
            emit({"id": message["id"], "error": {"code": -32601, "message": "Unsupported preview"}})
            continue
        history = [
            {"id": "old-user", "type": "userMessage", "content": [{"type": "text", "text": "Saved private prompt"}]},
            {"id": "old-reply", "type": "agentMessage", "text": "## Restored context\n**Saved** reply\n```python\nprint('restored')\n```"},
            {"id": "old-command", "type": "commandExecution", "command": "old command", "aggregatedOutput": "saved output", "status": "inProgress"},
            {"id": "old-approval", "type": "approvalRequest", "command": "never execute"},
        ]
        emit({"id": message["id"], "result": {"data": [{"turnId": "old-turn", "item": entry} for entry in reversed(history)], "nextCursor": "older-history"}})
    elif method == "turn/start":
        if params["input"][0]["text"] == "start-error":
            emit({"id": message["id"], "error": {"code": -32602, "message": "Controlled start rejection"}})
            continue
        assert params["threadId"] == thread
        count += 1
        Path("turn-count").write_text(str(count))
        turn = "turn-" + str(count)
        text = params["input"][0]["text"]
        notify("turn/started", {"turn": {"id": turn, "status": "inProgress"}})
        emit({"id": message["id"], "result": {"turn": {"id": turn}}})
        item({"id": "user", "type": "userMessage", "content": [{"type": "text", "text": text}]})
        item({"id": "reply", "type": "agentMessage", "text": ""}, False)
        notify("item/agentMessage/delta", {"itemId": "reply", "delta": "Streaming **reply**"})
        if text in {"approval", "question", "unsupported"}:
            pending = text
            if text == "approval":
                item({"id": "command", "type": "commandExecution", "command": "test-command", "status": "inProgress"}, False)
                request = {"itemId": "command", "command": "test-command", "cwd": str(Path.cwd()), "reason": "Controlled test approval"}
                name = "item/commandExecution/requestApproval"
            elif text == "question":
                request = {"itemId": "question", "questions": [{"id": "choice", "header": "Choice", "question": "Which language?", "isOther": True,
                           "options": [{"label": "English", "description": "English UI"}, {"label": "한국어", "description": "Korean UI"}]}]}
                name = "item/tool/requestUserInput"
            else:
                request, name = {"itemId": "other"}, "item/permissions/requestApproval"
            emit({"id": 91, "method": name, "params": {"threadId": thread, "turnId": turn, **request}})
        elif text in {"wait", "interrupt-error"}:
            pending = text
        elif text == "large":
            for index in range(60):
                item({"id": "large-" + str(index), "type": "agentMessage", "text": "x" * 32768})
            finish()
        else:
            item({"id": "command", "type": "commandExecution", "command": "printf example", "aggregatedOutput": "controlled output", "exitCode": 0, "status": "completed"})
            item({"id": "change", "type": "fileChange", "changes": [{"path": "example.py", "diff": "-old\n+new"}], "status": "completed"})
            finish()
    elif method == "turn/steer":
        text = params["input"][0]["text"]
        assert set(params) == {"threadId", "expectedTurnId", "input"}
        if params["expectedTurnId"] != turn or text == "steer-reject":
            emit({"id": message["id"], "error": {"code": -32602, "message": "Controlled steer rejection"}})
            continue
        if text == "steer-timeout":
            continue
        if text == "steer-complete-before-receipt":
            finish()
            deadline = time.monotonic() + 3
            while not Path("release-steer-receipt").exists() and time.monotonic() < deadline:
                time.sleep(.01)
        item({"id": message["id"], "type": "userMessage", "content": [{"type": "text", "text": text}]})
        emit({"id": message["id"], "result": {"turnId": "wrong-turn" if text == "steer-wrong-receipt" else turn}})
        if text == "finish":
            pending = None
            finish()
    elif method == "turn/interrupt":
        if pending == "interrupt-error":
            emit({"id": message["id"], "error": {"code": -32603, "message": "Controlled interrupt failure"}})
            continue
        pending = None
        emit({"id": message["id"], "result": {}})
        finish("interrupted")
    elif not method and message.get("id") == 91:
        if pending == "approval":
            decision = message["result"]["decision"]
            if decision == "accept":
                Path("approved").write_text("once")
            item({"id": "command", "type": "commandExecution", "command": "test-command", "status": "completed" if decision == "accept" else "declined"})
        elif pending == "question":
            assert message["result"]["answers"]["choice"]["answers"]
        elif pending == "unsupported":
            assert "error" in message
        pending = None
        notify("serverRequest/resolved", {"requestId": 91})
        finish()
