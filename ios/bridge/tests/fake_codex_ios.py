#!/usr/bin/env python3
"""Test-only Codex RPC peer for iOS policy persistence and forwarding."""
import json
from pathlib import Path
import sys

thread = "ios-codex-fixture"


def emit(value):
    print(json.dumps(value), flush=True)


for line in sys.stdin:
    value = json.loads(line)
    if "id" not in value:
        continue
    method, params = value.get("method"), value.get("params") or {}
    if method in {"thread/start", "turn/start"}:
        with Path("codex-requests.jsonl").open("a") as output:
            output.write(json.dumps(value) + "\n")
    if method == "initialize":
        result = {}
    elif method == "thread/start":
        result = {"thread": {"id": thread, "cwd": str(Path.cwd()), "ephemeral": False},
                  "model": "fixture-model", "sandbox": {"type": "readOnly"},
                  "approvalPolicy": "on-request", "approvalsReviewer": "user"}
    elif method == "turn/start":
        identity = "turn-" + str(value["id"])
        emit({"id": value["id"], "result": {"turn": {"id": identity}}})
        emit({"method": "turn/started", "params": {"threadId": thread, "turn": {"id": identity, "status": "inProgress"}}})
        emit({"method": "item/completed", "params": {"threadId": thread, "turnId": identity,
            "item": {"id": "answer", "type": "agentMessage", "text": "fixture complete", "status": "completed"}}})
        emit({"method": "turn/completed", "params": {"threadId": thread, "turn": {"id": identity, "status": "completed"}}})
        continue
    else:
        result = {"data": []}
    emit({"id": value["id"], "result": result})
