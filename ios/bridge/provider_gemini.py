#!/usr/bin/env python3
"""Gemini CLI's native ACP -> Bibimer stdio events, without terminal scraping.

ACP v1: https://agentclientprotocol.com/protocol/v1/prompt-turn
The CLI owns files, tools, authentication and context. Only one-time permission
choices are offered. Success requires ACP's explicit end_turn response.
"""
import contextlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import uuid

LIMIT = 32768


class Adapter:
    def __init__(self, executable):
        self.cwd = str(Path.cwd().resolve())
        self.thread = self.turn = None
        self.serial = 0
        self.lock = threading.RLock()
        self.output_lock = threading.Lock()
        self.write_lock = threading.Lock()
        self.waiters, self.permissions, self.tools, self.messages = {}, {}, {}, {}
        self.catalog = []
        self.default_model = None
        self.process = subprocess.Popen([executable, "--experimental-acp"], stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            env=dict(os.environ, GEMINI_CLI_NO_RELAUNCH="1"), close_fds=True)
        self.closed = False
        threading.Thread(target=self.read, daemon=True).start()

    def emit(self, value):
        with self.output_lock:
            print(json.dumps(value, ensure_ascii=False), flush=True)

    def notify(self, method, params):
        self.emit({"method": method, "params": {"threadId": self.thread, "turnId": self.turn, **params}})

    def send(self, value):
        with self.write_lock:
            self.process.stdin.write((json.dumps({"jsonrpc": "2.0", **value}) + "\n").encode())
            self.process.stdin.flush()

    def rpc(self, method, params, timeout=30):
        with self.lock:
            self.serial += 1
            key = self.serial
            waiter = [threading.Event(), None]
            self.waiters[key] = waiter
        try:
            self.send({"id": key, "method": method, "params": params})
            if not waiter[0].wait(timeout):
                raise RuntimeError("error_agent_transport")
            response = waiter[1]
            if not response or "error" in response:
                raise RuntimeError("error_agent_start" if method == "session/new" else "error_agent_transport")
            return response.get("result") or {}
        finally:
            with self.lock:
                self.waiters.pop(key, None)

    def read(self):
        try:
            while True:
                raw = self.process.stdout.readline(1024 * 1024 + 1)
                if not raw:
                    return
                if len(raw) > 1024 * 1024 or not raw.endswith(b"\n"):
                    raise ValueError("ACP message limit")
                value = json.loads(raw)
                if "method" not in value and "id" in value:
                    with self.lock:
                        waiter = self.waiters.get(value["id"])
                        if waiter:
                            waiter[1] = value
                            waiter[0].set()
                elif value.get("method") == "session/update":
                    self.update(value.get("params") or {})
                elif value.get("method") == "session/request_permission" and "id" in value:
                    self.permission(value)
                elif "id" in value:
                    self.send({"id": value["id"], "error": {"code": -32601, "message": "Unsupported client capability"}})
        except (OSError, ValueError, TypeError, KeyError):
            pass
        finally:
            with self.lock:
                for waiter in self.waiters.values():
                    waiter[0].set()
                if not self.closed:
                    self.notify("bibimer/notice", {"code": "error_agent_transport"})
                    if self.turn:
                        self.complete("failed")

    @staticmethod
    def text(value):
        return value[:LIMIT] if isinstance(value, str) else ""

    def tool_item(self, update):
        key = str(update.get("toolCallId", ""))[:200]
        previous = self.tools.get(key, {})
        merged = {**previous, **update}
        self.tools[key] = merged
        if len(self.tools) > 500:
            self.tools.pop(next(iter(self.tools)))
        content = merged.get("content") or []
        text = "\n".join(self.text(row.get("content", {}).get("text")) for row in content
                         if isinstance(row, dict) and row.get("type") == "content" and isinstance(row.get("content"), dict))
        status = {"pending": "inProgress", "in_progress": "inProgress", "completed": "completed", "failed": "failed"}.get(merged.get("status"), "inProgress")
        item = {"id": key, "type": "tool", "tool": self.text(merged.get("title")), "status": status, "result": self.text(text)}
        if merged.get("kind") == "execute":
            item.update(type="commandExecution", command=self.text(merged.get("title")), aggregatedOutput=self.text(text))
        elif merged.get("kind") == "edit":
            changes = []
            for row in content[:100]:
                if row.get("type") == "diff":
                    before, after = self.text(row.get("oldText")), self.text(row.get("newText"))
                    changes.append({"path": self.text(row.get("path")), "diff": self.text(
                        "\n".join("-" + line for line in before.splitlines()) + "\n" + "\n".join("+" + line for line in after.splitlines()))})
            item.update(type="fileChange", changes=changes)
        return item

    def update(self, params):
        with self.lock:
            if not self.thread or params.get("sessionId") != self.thread:
                return
            update = params.get("update") or {}
            kind = update.get("sessionUpdate")
            if kind == "usage_update":
                # Standard ACP window usage only. Gemini's quota/billing metadata
                # does not describe the current window and is not a fallback.
                self.notify("bibimer/contextUsage", {"usedTokens": update.get("used"),
                    "contextWindow": update.get("size"), "estimated": False})
                return
            if not self.turn:
                return
            if kind == "agent_message_chunk" and (update.get("content") or {}).get("type") == "text":
                key = str(update.get("messageId") or "response")[:200]
                self.messages[key] = self.text(self.messages.get(key, "") + self.text(update["content"].get("text")))
                if len(self.messages) > 100:
                    self.messages.pop(next(iter(self.messages)))
                self.notify("item/started", {"item": {"id": key, "type": "agentMessage", "text": self.messages[key], "status": "inProgress"}})
            elif kind in {"tool_call", "tool_call_update"}:
                item = self.tool_item(update)
                self.notify("item/completed" if item["status"] in {"completed", "failed"} else "item/started", {"item": item})
            elif kind == "plan":
                self.notify("turn/plan/updated", {"plan": [{"step": self.text(row.get("content")), "status": row.get("status", "pending")}
                    for row in (update.get("entries") or [])[:100]]})
            # Raw thought chunks and unsupported metadata are never forwarded.

    def permission(self, value):
        with self.lock:
            params = value.get("params") or {}
            if not self.turn or params.get("sessionId") != self.thread or len(self.permissions) >= 16:
                self.send({"id": value["id"], "result": {"outcome": {"outcome": "cancelled"}}})
                return
            options = params.get("options") or []
            one = next((row.get("optionId") for row in options if row.get("kind") == "allow_once"), None)
            reject = next((row.get("optionId") for row in options if row.get("kind") == "reject_once"), None)
            key = "permission-" + str(uuid.uuid4())
            self.permissions[key] = (value["id"], one, reject)
            tool = params.get("toolCall") or {}
            item = self.tool_item(tool)
            self.notify("item/started", {"item": item})
            self.emit({"id": key, "method": "item/fileChange/requestApproval" if tool.get("kind") == "edit" else "item/commandExecution/requestApproval",
                "params": {"threadId": self.thread, "turnId": self.turn, "itemId": item["id"],
                           "reason": self.text(tool.get("title")), "command": self.text(tool.get("title")),
                           "availableDecisions": ["accept", "decline"] if one is not None else ["decline"]}})

    def respond(self, value):
        with self.lock:
            pending = self.permissions.pop(value.get("id"), None)
            if not pending:
                return
            identity, one, reject = pending
            decision = (value.get("result") or {}).get("decision")
            selected = one if decision == "accept" else reject if decision == "decline" else None
            outcome = {"outcome": "selected", "optionId": selected} if selected is not None else {"outcome": "cancelled"}
            self.send({"id": identity, "result": {"outcome": outcome}})

    def new_thread(self):
        if not self.thread:
            result = self.rpc("session/new", {"cwd": self.cwd, "mcpServers": []}, timeout=120)
            self.thread = result["sessionId"]
            models = result.get("models") or {}
            self.catalog = models.get("availableModels") or []
            self.default_model = models.get("currentModelId")
        return {"id": self.thread, "cwd": self.cwd, "ephemeral": True, "status": {"type": "idle"}}

    def complete(self, status):
        if self.turn:
            for key, text in self.messages.items():
                self.notify("item/completed", {"item": {"id": key, "type": "agentMessage", "text": text,
                    "status": "completed" if status == "completed" else "interrupted"}})
            self.notify("turn/completed", {"turn": {"id": self.turn, "status": status}})
        self.turn = None
        self.messages.clear()
        self.tools.clear()
        for identity, _, _ in self.permissions.values():
            with contextlib.suppress(OSError):
                self.send({"id": identity, "result": {"outcome": {"outcome": "cancelled"}}})
        self.permissions.clear()

    def prompt(self, turn, params):
        try:
            options = params.get("bibimerOptions") or {}
            model = options.get("model") or self.default_model
            if model:
                self.rpc("session/set_model", {"sessionId": self.thread, "modelId": model})
            result = self.rpc("session/prompt", {"sessionId": self.thread, "prompt": params["input"]}, timeout=3600)
            # end_turn is the native success signal. Token budgets, refusal and
            # transport errors never produce a successful completion notification.
            status = "completed" if result.get("stopReason") == "end_turn" else "interrupted" if result.get("stopReason") == "cancelled" else "failed"
        except (OSError, ValueError, KeyError, RuntimeError):
            status = "failed"
        with self.lock:
            if self.turn == turn:
                self.complete(status)

    def call(self, method, params):
        if method == "initialize":
            self.rpc("initialize", {"protocolVersion": 1, "clientInfo": {"name": "bibimer", "version": "0.1.0"}, "clientCapabilities": {}}, timeout=120)
            return {"capabilities": {"steer": False}}
        if method == "model/list":
            self.new_thread()
            return {"data": [{"id": row["modelId"], "displayName": row.get("name") or row["modelId"],
                "description": row.get("description", ""), "isDefault": row["modelId"] == self.default_model,
                "supportedReasoningEfforts": []} for row in self.catalog if isinstance(row.get("modelId"), str)]}
        if method == "thread/start":
            if self.thread:
                raise RuntimeError("error_session_exists")
            return {"thread": self.new_thread()}
        if method == "thread/list":
            raise RuntimeError("error_history_unsupported")
        if method in {"skills/list", "commands/list"}:
            return {"data": []}
        if params.get("threadId") != self.thread or not self.thread:
            raise RuntimeError("error_chat_request")
        if method == "turn/interrupt":
            with self.lock:
                if params.get("turnId") == self.turn:
                    self.send({"method": "session/cancel", "params": {"sessionId": self.thread}})
                    for identity, _, _ in self.permissions.values():
                        self.send({"id": identity, "result": {"outcome": {"outcome": "cancelled"}}})
                    self.permissions.clear()
            return {}
        raise RuntimeError("error_history_unsupported")

    def handle(self, value):
        if "method" not in value:
            self.respond(value)
            return
        if "id" not in value:
            return
        identity, method, params = value["id"], value["method"], value.get("params") or {}
        try:
            if method == "turn/start":
                with self.lock:
                    if not self.thread or params.get("threadId") != self.thread or self.turn:
                        raise RuntimeError("error_chat_busy")
                    if (params.get("bibimerOptions") or {}).get("effort"):
                        raise RuntimeError("error_model_selection")
                    self.turn = str(uuid.uuid4())
                    turn = self.turn
                    self.emit({"id": identity, "result": {"turn": {"id": turn}}})
                    self.notify("turn/started", {"turn": {"id": turn, "status": "inProgress"}})
                    self.notify("item/completed", {"item": {"id": "user-" + turn, "type": "userMessage", "status": "completed", "content": params["input"]}})
                    threading.Thread(target=self.prompt, args=(turn, params), daemon=True).start()
                return
            result = self.call(method, params)
            self.emit({"id": identity, "result": result})
        except (OSError, ValueError, KeyError, RuntimeError) as error:
            code = str(error) if str(error).startswith("error_") else "error_agent_transport"
            self.emit({"id": identity, "error": {"code": -32000, "message": code}})

    def close(self):
        self.closed = True
        with contextlib.suppress(OSError):
            self.process.stdin.close()
        try:
            self.process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=2)
        self.process.stdout.close()


def main():
    adapter = Adapter(sys.argv[1])
    try:
        while True:
            raw = sys.stdin.buffer.readline(1024 * 1024 + 1)
            if not raw:
                return
            if len(raw) > 1024 * 1024 or not raw.endswith(b"\n"):
                raise ValueError("Message limit")
            adapter.handle(json.loads(raw))
    finally:
        adapter.close()


if __name__ == "__main__":
    main()
