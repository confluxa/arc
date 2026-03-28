import { initializeWorkspace } from "../core/storage";
import { info, success } from "../utils/logger";

export async function runInit(): Promise<void> {
  await initializeWorkspace();
  success("Initialized Confluxa workspace");
  info("  - .confluxa/context.json");
  info("  - .confluxa/messages/");
  info("  - .confluxa/tasks/");
}
