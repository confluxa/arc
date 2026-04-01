import chalk from "chalk";
import { deleteMessagesByTask, saveMessage } from "../core/storage";
import { ArcMessage } from "../core/types";
import { createId } from "../utils/ids";
import { runInit } from "./init";
import { runResolve } from "./resolve";

type DemoScenario = "auth" | "api" | "database";

const DEMO_SCENARIOS: Record<DemoScenario, Omit<ArcMessage, "id" | "timestamp">[]> = {
  auth: [
    { task_id: "auth", agent: "gpt", type: "proposal", content: "Use JWT", role: "proposer" },
    { task_id: "auth", agent: "claude", type: "proposal", content: "Use OAuth", role: "validator" }
  ],
  api: [
    {
      task_id: "api",
      agent: "gpt",
      type: "proposal",
      content: "Use REST endpoints for service APIs",
      role: "proposer"
    },
    {
      task_id: "api",
      agent: "claude",
      type: "proposal",
      content: "Use GraphQL for flexible client queries",
      role: "critic"
    }
  ],
  database: [
    {
      task_id: "database",
      agent: "gpt",
      type: "proposal",
      content: "Use SQL for consistency and transactions",
      role: "proposer"
    },
    {
      task_id: "database",
      agent: "claude",
      type: "proposal",
      content: "Use NoSQL for scale and flexible schema",
      role: "critic"
    }
  ]
};

export async function runDemo(inputScenario?: string): Promise<void> {
  const scenario = (inputScenario?.trim().toLowerCase() || "auth") as DemoScenario;
  if (!DEMO_SCENARIOS[scenario]) {
    throw new Error('Invalid demo scenario. Use one of: "auth", "api", "database".');
  }

  const demoMessages = DEMO_SCENARIOS[scenario];
  const taskId = demoMessages[0].task_id;

  console.log(chalk.bold.blue("ARC — decision engine demo"));
  console.log(chalk.dim("Conflicting agent outputs → one structured decision."));
  console.log("");

  console.log(chalk.cyan("Step 1: Initialize workspace"));
  await runInit();
  await sleep(200);
  console.log("");

  console.log(chalk.cyan("Step 2: Same task, different agents"));
  await deleteMessagesByTask(taskId);
  await sleep(150);
  console.log("");

  const first = demoMessages[0];
  const second = demoMessages[1];

  console.log(chalk.cyan(`Step 3: ${first.agent} → "${first.content}"`));
  await saveMessage({ ...first, id: createId(), timestamp: new Date().toISOString() });
  await sleep(280);
  console.log("");

  console.log(chalk.cyan(`Step 4: ${second.agent} → "${second.content}"`));
  await saveMessage({ ...second, id: createId(), timestamp: new Date().toISOString() });
  await sleep(280);
  console.log("");

  console.log(chalk.cyan("Step 5: Run the decision engine"));
  console.log(
    chalk.dim(
      "  Includes: Domain · Relationship · Strategy · Decision · Confidence · Reasoning · Trade-offs"
    )
  );
  await sleep(200);
  console.log("");

  await runResolve(taskId, { json: false });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
