#!/usr/bin/env python3
"""Test-only ACP peer; never shipped as an installed agent."""
import json
from pathlib import Path
import sys
import threading

if "--version" in sys.argv:
    print("fixture-gemini")
    sys.exit(0)

lock = threading.Lock()
pending = {}
session = "acp-test-session"


def emit(value):
    with lock:
        print(json.dumps({"jsonrpc": "2.0", **value}), flush=True)


def update(value):
    emit({"method": "session/update", "params": {"sessionId": session, "update": value}})


for line in sys.stdin:
    value = json.loads(line)
    method, params = value.get("method"), value.get("params") or {}
    key = value.get("id")
    if method == "initialize":
        assert params["protocolVersion"] == 1
        assert params["clientCapabilities"] == {}
        result = {"protocolVersion": 1, "agentCapabilities": {}}
    elif method == "session/new":
        assert Path(params["cwd"]).resolve() == Path.cwd()
        result = {"sessionId": session, "models": {"currentModelId": "fixture-model", "availableModels": [{"modelId": "fixture-model", "name": "Fixture"}]}}
    elif method == "session/set_model":
        assert params["modelId"] == "fixture-model"
        result = {}
    elif method == "session/prompt":
        prompt = params["prompt"][0]["text"]
        if prompt == "approval":
            pending["approval"] = key
            emit({"id": "approval", "method": "session/request_permission", "params": {"sessionId": session,
                "toolCall": {"toolCallId": "write", "title": "Write fixture file", "kind": "edit", "status": "pending"},
                "options": [{"optionId": "one", "kind": "allow_once", "name": "Once"},
                            {"optionId": "always", "kind": "allow_always", "name": "Always"},
                            {"optionId": "no", "kind": "reject_once", "name": "No"}]}})
            continue
        if prompt == "wait":
            pending["cancel"] = key
            continue
        update({"sessionUpdate": "agent_thought_chunk", "content": {"type": "text", "text": "PRIVATE-THOUGHT"}})
        update({"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": "hello "}})
        update({"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": "world"}})
        result = {"stopReason": "max_tokens" if prompt == "limit" else "end_turn"}
    elif method == "session/cancel":
        if "cancel" in pending:
            emit({"id": pending.pop("cancel"), "result": {"stopReason": "cancelled"}})
        continue
    elif method is None and key == "approval":
        outcome = value["result"]["outcome"]
        if outcome == {"outcome": "selected", "optionId": "one"}:
            Path("approved.txt").write_text("explicitly approved")
        elif outcome not in ({"outcome": "selected", "optionId": "no"}, {"outcome": "cancelled"}):
            raise AssertionError("Never select permanent approval")
        update({"sessionUpdate": "tool_call_update", "toolCallId": "write", "status": "completed"})
        emit({"id": pending.pop("approval"), "result": {"stopReason": "end_turn"}})
        continue
    else:
        emit({"id": key, "error": {"code": -32601, "message": "unsupported"}})
        continue
    emit({"id": key, "result": result})
