import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { deleteMessagesByTask, initializeWorkspace, listMessages, saveMessage } from "../src/core/storage";
import type { ArcMessage } from "../src/core/types";

function makeMsg(partial: Partial<ArcMessage> & Pick<ArcMessage, "id" | "task_id" | "content">): ArcMessage {
  return {
    agent: partial.agent ?? "agent",
    type: partial.type ?? "proposal",
    timestamp: partial.timestamp ?? new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...partial
  };
}

test("storage listMessages skips invalid JSON and non-message objects", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "arc-"));
  try {
    await initializeWorkspace(cwd);

    const messagesPath = path.join(cwd, ".confluxa", "messages");
    await fs.writeFile(path.join(messagesPath, "bad.json"), "not json", "utf-8");
    await fs.writeFile(
      path.join(messagesPath, "wrong.json"),
      JSON.stringify({ hello: "world" }),
      "utf-8"
    );

    const msg = makeMsg({
      id: "m1",
      task_id: "auth",
      content: "Use JWT for APIs",
      timestamp: new Date("2026-01-01T00:00:01.000Z").toISOString()
    });
    await saveMessage(msg, cwd);

    const messages = await listMessages(cwd);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, "m1");
    assert.equal(messages[0].task_id, "auth");
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test("storage deleteMessagesByTask skips corrupt files and deletes only matching tasks", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "arc-"));
  try {
    await initializeWorkspace(cwd);
    const messagesPath = path.join(cwd, ".confluxa", "messages");

    const msg1: ArcMessage = makeMsg({
      id: "m1",
      task_id: "task-a",
      content: "Use JWT for APIs",
      timestamp: new Date("2026-01-01T00:00:01.000Z").toISOString()
    });

    const msg2: ArcMessage = makeMsg({
      id: "m2",
      task_id: "task-b",
      content: "Use OAuth for integrations",
      timestamp: new Date("2026-01-01T00:00:02.000Z").toISOString()
    });

    await saveMessage(msg1, cwd);
    await saveMessage(msg2, cwd);
    await fs.writeFile(path.join(messagesPath, "corrupt.json"), "{", "utf-8");

    const deleted = await deleteMessagesByTask("task-a", cwd);
    assert.equal(deleted, 1);

    const messages = await listMessages(cwd);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, "m2");
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

