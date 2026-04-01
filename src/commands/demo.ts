import chalk from "chalk";
import { deleteMessagesByTask, saveMessage } from "../core/storage";
import { ArcMessage } from "../core/types";
import { createId } from "../utils/ids";
import { runInit } from "./init";
import { runResolve } from "./resolve";

type DemoScenario = "auth" | "api" | "database";

const DEMO_SCENARIOS: Record<DemoScenario, Omit<ArcMessage, "id" | "timestamp">[]> = {
  auth: [
    { task_id: "auth", agent: "gpt", type: "proposal", content: "Use JWT" },
    { task_id: "auth", agent: "claude", type: "proposal", content: "Use OAuth" }
  ],
  api: [
    { task_id: "api", agent: "gpt", type: "proposal", content: "Use REST endpoints for service APIs" },
    { task_id: "api", agent: "claude", type: "proposal", content: "Use GraphQL for flexible client queries" }
  ],
  database: [
    { task_id: "database", agent: "gpt", type: "proposal", content: "Use SQL for consistency and transactions" },
    { task_id: "database", agent: "claude", type: "proposal", content: "Use NoSQL for scale and flexible schema" }
  ]
};

export async function runDemo(inputScenario?: string): Promise<void> {
  const scenario = (inputScenario?.trim().toLowerCase() || "auth") as DemoScenario;
  if (!DEMO_SCENARIOS[scenario]) {
    throw new Error('Invalid demo scenario. Use one of: "auth", "api", "database".');
  }

  const demoMessages = DEMO_SCENARIOS[scenario];
  const taskId = demoMessages[0].task_id;

  console.log(chalk.bold.blue("ARC - Agent Resolution & Coordination"));
  console.log("");

  console.log(chalk.cyan("Step 1: Initializing ARC workspace..."));
  await runInit();
  await sleep(420);
  console.log("");

  console.log(chalk.cyan("Step 2: Simulating multiple AI agents..."));
  await deleteMessagesByTask(taskId);
  await sleep(380);
  console.log("");

  const first = demoMessages[0];
  const second = demoMessages[1];

  console.log(chalk.cyan(`Step 3: Agent ${first.agent} proposes: ${first.content}`));
  await saveMessage({ ...first, id: createId(), timestamp: new Date().toISOString() });
  await sleep(500);
  console.log("");

  console.log(chalk.cyan(`Step 4: Agent ${second.agent} proposes: ${second.content}`));
  await saveMessage({ ...second, id: createId(), timestamp: new Date().toISOString() });
  await sleep(500);
  console.log("");

  console.log(chalk.cyan("Step 5: Detecting conflicts..."));
  await sleep(350);
  console.log("");

  console.log(chalk.cyan("Step 6: Resolving..."));
  await sleep(420);
  console.log("");

  await runResolve(taskId, { json: false });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
