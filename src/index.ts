import { Command } from "commander";
import { runClean } from "./commands/clean";
import { runDemo } from "./commands/demo";
import { runExplain } from "./commands/explain";
import { runInit } from "./commands/init";
import { runList } from "./commands/list";
import { runPublish } from "./commands/publish";
import { runResolve } from "./commands/resolve";
import { runStatus } from "./commands/status";
import { runView } from "./commands/view";
import type { AgentRole, MessageType } from "./core/types";
import { error as logError } from "./utils/logger";

const program = new Command();

program
  .name("arc")
  .description("Confluxa ARC CLI - local AI coordination and conflict resolution")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize .confluxa workspace structure")
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("publish")
  .description("Publish a task message into .confluxa/messages")
  .requiredOption("--task <task_id>", "Task ID")
  .requiredOption("--type <type>", "Message type: proposal|result|note")
  .requiredOption("--content <content>", "Message content")
  .requiredOption("--agent <agent>", "Agent name")
  .option("--role <role>", "Agent role: proposer | critic | validator", "proposer")
  .action(async (options) => {
    try {
      const validTypes: MessageType[] = ["proposal", "result", "note"];
      if (!validTypes.includes(options.type)) {
        throw new Error("Invalid --type. Allowed values: proposal, result, note.");
      }

      const validRoles: AgentRole[] = ["proposer", "critic", "validator"];
      if (!validRoles.includes(options.role)) {
        throw new Error("Invalid --role. Allowed values: proposer, critic, validator.");
      }

      await runPublish({
        task: options.task,
        type: options.type,
        content: options.content,
        agent: options.agent,
        role: options.role
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("list <task>")
  .description("List task messages")
  .action(async (task: string) => {
    try {
      await runList(task);
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("view <task>")
  .description("View task messages grouped by agent")
  .action(async (task: string) => {
    try {
      await runView(task);
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("resolve <task>")
  .description("Detect conflicts and generate a resolution digest")
  .option("--json", "Output raw JSON resolution")
  .action(async (task: string, options: { json?: boolean }) => {
    try {
      await runResolve(task, options);
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("clean <task>")
  .description("Delete all messages for a task")
  .action(async (task: string) => {
    try {
      await runClean(task);
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("status")
  .description("Show workspace status and recent tasks")
  .action(async () => {
    try {
      await runStatus();
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("demo")
  .description("Run a quick decision-engine demo (conflict → structured decision)")
  .argument("[scenario]", "Demo scenario: auth | api | database")
  .action(async (scenario?: string) => {
    try {
      await runDemo(scenario);
    } catch (error) {
      handleCliError(error);
    }
  });

program
  .command("explain")
  .description("Explain what ARC does and why it matters")
  .action(() => {
    try {
      runExplain();
    } catch (error) {
      handleCliError(error);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  handleCliError(error);
});

function handleCliError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Unknown error";
  logError(message);
  process.exit(1);
}
