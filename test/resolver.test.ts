import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { resolveTaskMessages } from "../src/core/resolver";
import type { ArcMessage } from "../src/core/types";

function makeMsg(
  partial: Partial<ArcMessage> & Pick<ArcMessage, "task_id" | "content">
): ArcMessage {
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
    makeMsg({ task_id: "auth", content: "Use JWT for APIs", agent: "gpt" }),
    makeMsg({ task_id: "auth", content: "Use JWT for APIs", agent: "claude" })
  ];

  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "consensus");
  assert.equal(result.resolution, "Use JWT for APIs");
  assert.equal(result.confidence, "high");
  assert.equal(result.domain, "auth");
  assert.equal(result.relationship, "consensus");
  assert.equal(result.strategy, "choose_one");
});

test("resolver returns conflict and merged suggestion for known patterns", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "auth", content: "Use JWT for internal services and APIs", agent: "gpt" }),
    makeMsg({ task_id: "auth", content: "Use OAuth for third-party integrations", agent: "claude" })
  ];

  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "conflict");
  assert.equal(
    result.resolution,
    "Use JWT for internal services and OAuth for external integrations"
  );
  assert.equal(result.confidence, "medium");
  assert.equal(result.domain, "auth");
  assert.equal(result.relationship, "complementary");
  assert.equal(result.strategy, "context_split");
});

test("single message yields low confidence", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "auth", content: "Only one proposal", agent: "gpt" })
  ];
  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "consensus");
  assert.equal(result.confidence, "low");
  assert.equal(result.domain, "unknown");
  assert.equal(result.strategy, "choose_one");
});

test("three agents with conflicting content yields low confidence", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "x", content: "A", agent: "a1" }),
    makeMsg({ task_id: "x", content: "B", agent: "a2" }),
    makeMsg({ task_id: "x", content: "C", agent: "a3" })
  ];
  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "conflict");
  assert.equal(result.confidence, "low");
  assert.equal(result.domain, "unknown");
  assert.equal(result.relationship, "conflict");
  assert.equal(result.strategy, "choose_one");
});

test("REST vs GraphQL resolves with complementary hybrid strategy", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "api", content: "Use REST endpoints for service APIs", agent: "gpt" }),
    makeMsg({ task_id: "api", content: "Use GraphQL for flexible client queries", agent: "claude" })
  ];
  const result = resolveTaskMessages(messages);
  assert.equal(result.domain, "api");
  assert.equal(result.relationship, "complementary");
  assert.equal(result.strategy, "hybrid");
  assert.ok(result.decision.includes("REST"));
  assert.ok(result.decision.includes("GraphQL"));
});

test("SQL vs NoSQL resolves with complementary hybrid strategy", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "db", content: "Use SQL for consistency and transactions", agent: "gpt" }),
    makeMsg({ task_id: "db", content: "Use NoSQL for scale and flexible schema", agent: "claude" })
  ];
  const result = resolveTaskMessages(messages);
  assert.equal(result.domain, "database");
  assert.equal(result.relationship, "complementary");
  assert.equal(result.strategy, "hybrid");
  assert.ok(result.decision.toLowerCase().includes("sql"));
  assert.ok(result.decision.toLowerCase().includes("nosql"));
});

test("validator role outweighs proposer when ranking conflicting options", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "t", content: "Pick Python", agent: "a1", role: "proposer" }),
    makeMsg({ task_id: "t", content: "Pick Ruby", agent: "a2", role: "proposer" }),
    makeMsg({ task_id: "t", content: "Pick Ruby", agent: "a3", role: "validator" })
  ];
  const result = resolveTaskMessages(messages);
  assert.equal(result.status, "conflict");
  assert.equal(result.decision, "Pick Ruby");
});

test("reasoning includes role-labeled contributions", () => {
  const messages: ArcMessage[] = [
    makeMsg({ task_id: "auth", content: "Use JWT", agent: "gpt", role: "proposer" }),
    makeMsg({
      task_id: "auth",
      content: "OAuth required for external partners",
      agent: "claude",
      role: "validator"
    })
  ];
  const result = resolveTaskMessages(messages);
  const text = result.reasoning.join("\n");
  assert.ok(text.includes("proposer"));
  assert.ok(text.includes("validator"));
});
