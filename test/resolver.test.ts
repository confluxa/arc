import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { resolveTaskMessages } from "../src/core/resolver";
import type { ArcMessage } from "../src/core/types";

function makeMsg(partial: Partial<ArcMessage> & Pick<ArcMessage, "task_id" | "content">): ArcMessage {
  return {
    id: partial.id ?? randomUUID(),
    agent: partial.agent ?? "agent",
    type: partial.type ?? "proposal",
    timestamp: partial.timestamp ?? new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...partial
  };
}

test("resolver returns consensus when all contents match", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "auth", content: "Use JWT for APIs" }),
    makeMsg({ task_id: "auth", content: "Use JWT for APIs" })
  ];

  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "consensus");
  assert.equal(result.resolution, "Use JWT for APIs");
});

test("resolver returns conflict and merged suggestion for known patterns", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "auth", content: "Use JWT for internal services and APIs" }),
    makeMsg({ task_id: "auth", content: "Use OAuth for third-party integrations" })
  ];

  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "conflict");
  assert.equal(
    result.resolution,
    "Use JWT for internal services and OAuth for external integrations"
  );
});

