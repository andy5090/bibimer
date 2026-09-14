"""Controlled app-server fixture. Never contacts a model or runs shell commands."""
import json
import sys
from pathlib import Path

thread, turn, pending = "test-thread", None, None
count = 0


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def notify(method, params):
    emit({"method": method, "params": {"threadId": thread, "turnId": turn, **params}})


def item(value, complete=True):
    notify("item/completed" if complete else "item/started", {"item": value})


def finish(status="completed"):
    item({"id": "reply", "type": "agentMessage", "text": "# Result\n**Formatted** reply · 비비머\n- First step\n- Second step\n```python\nprint('hello')\n+-------+\n| ASCII |\n+-------+\n```\n| Name | State |\n| --- | --- |\n| Task | Done |\n<script>window.untrusted=true</script>"})
    notify("turn/completed", {"turn": {"id": turn, "status": status}})


for line in sys.stdin:
    message = json.loads(line)
    method, params = message.get("method"), message.get("params", {})
    if method == "initialize":
        emit({"id": message["id"], "result": {"userAgent": "test"}})
    elif method == "thread/start":
        assert params["ephemeral"] is True
        assert "sandbox" not in params and "approvalPolicy" not in params
        emit({"id": message["id"], "result": {"thread": {"id": thread}}})
    elif method == "turn/start":
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
