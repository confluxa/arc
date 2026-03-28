import chalk from "chalk";

export function runExplain(): void {
  console.log(chalk.bold.blue("ARC - Agent Resolution & Coordination"));
  console.log("");
  console.log("ARC coordinates multiple AI tools locally through a shared `.confluxa/` workspace.");
  console.log("");
  console.log(chalk.bold("How it works:"));
  console.log("1. Agents publish proposals/results as structured messages.");
  console.log("2. ARC groups outputs by task and detects conflicts.");
  console.log("3. ARC generates a clear resolution digest for next-step execution.");
  console.log("");
  console.log(chalk.bold("Why it matters:"));
  console.log("You get faster multi-agent collaboration with less confusion and clearer decisions.");
}
