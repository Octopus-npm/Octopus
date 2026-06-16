import chalk from "chalk";
import ora, { Ora } from "ora";
import os from "os";

const OS_LABEL =
  os.platform() === "win32"
    ? "windows"
    : os.platform() === "darwin"
      ? "macos"
      : "linux";

// ── Octopus ASCII banner

export function showBanner(): void {
  console.clear();
  console.log();
  console.log(
    chalk.cyan.bold(`
  ██████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗███████╗
 ██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔════╝
 ██║   ██║██║        ██║   ██║   ██║██████╔╝██║   ██║███████╗
 ██║   ██║██║        ██║   ██║   ██║██╔═══╝ ██║   ██║╚════██║
 ╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║     ╚██████╔╝███████║
  ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝
  `),
  );

  console.log(
    chalk.cyan("  ") +
      chalk.bold.white("🐙  Terminal AI Agent") +
      chalk.gray("  —  speak naturally, execute instantly"),
  );

  console.log();
  console.log(
    chalk.gray(
      "  ─────────────────────────────────────────────────────────────",
    ),
  );
  console.log();

  console.log(
    chalk.gray("  Tentacles  ") +
      chalk.cyan("⬡ shell  ") +
      chalk.cyan("⬡ email  ") +
      chalk.cyan("⬡ file"),
  );

  console.log(
    chalk.gray("  Model      ") +
      chalk.white("llama-3.3-70b-versatile") +
      chalk.gray("  via Groq") +
      "\n" +
      chalk.gray("  Platform   ") +
      chalk.white(OS_LABEL),
  );

  console.log(chalk.gray("  Memory     ") + chalk.white("last 10 messages"));

  console.log();
  console.log(
    chalk.gray(
      "  ─────────────────────────────────────────────────────────────",
    ),
  );
  console.log();
  console.log(
    chalk.gray("  Type a task in plain English or use a command below:"),
  );
  console.log();
  console.log(
    chalk.gray("  ") +
      chalk.cyan("help") +
      chalk.gray("  —  show what Octopus can do"),
  );
  console.log(
    chalk.gray("  ") +
      chalk.cyan("clear memory") +
      chalk.gray("  —  wipe conversation history"),
  );
  console.log(
    chalk.gray("  ") + chalk.cyan("exit") + chalk.gray("  —  quit Octopus"),
  );
  console.log();
}

// ── Spinner

type SpinnerStyle =
  | "dots"
  | "dots2"
  | "dots8"
  | "line"
  | "earth"
  | "moon"
  | "arrow";

let spinner: Ora | null = null;

export function startSpinner(text: string, style: SpinnerStyle = "dots"): void {
  spinner = ora({
    text: chalk.gray(text),
    spinner: style,
    color: "cyan",
  }).start();
}

export function updateSpinner(text: string): void {
  if (spinner) {
    spinner.text = chalk.gray(text);
  }
}

export function stopSpinner(): void {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

// ── Input prompt

export function showPrompt(): void {
  process.stdout.write(chalk.cyan.bold("  🐙 ❯ ") + chalk.white(""));
}

// ── Intent summary

export function showIntent(summary: string, action: string): void {
  const icons: Record<string, string> = {
    shell: "⚡",
    email: "✉️ ",
    file: "📁",
    unknown: "❓",
  };
  const icon = icons[action] ?? "•";
  console.log();
  console.log(chalk.gray("  intent  ") + chalk.white(`${icon}  ${summary}`));
}

// ── Confirm prompt

export function showConfirmPrompt(): void {
  process.stdout.write(
    chalk.yellow("  ⚠  This action requires confirmation. Proceed? ") +
      chalk.white("[y/n] "),
  );
}

// ── Results

export function showSuccess(message: string): void {
  console.log();
  console.log(chalk.green("  ✔  ") + chalk.white(message));
  console.log();
}

export function showError(message: string): void {
  console.log();
  console.log(chalk.red("  ✖  ") + chalk.white(message));
  console.log();
}

export function showOutput(output: string): void {
  console.log();
  const lines = output.trimEnd().split("\n");
  lines.forEach((line) => {
    console.log(chalk.gray("  │  ") + chalk.white(line));
  });
  console.log();
}

export function showUnknown(reason: string): void {
  console.log();
  console.log(
    chalk.yellow("  ◆  ") + chalk.gray("Octopus can't execute this as a task:"),
  );
  console.log(chalk.gray("     ") + chalk.white(reason));
  console.log(chalk.gray("     Try rephrasing as a concrete action."));
  console.log();
}

export function showCancelled(): void {
  console.log();
  console.log(chalk.gray("  ✖  Cancelled."));
  console.log();
}

export function showGoodbye(): void {
  console.log();
  console.log(chalk.cyan("  🐙  Goodbye. Tentacles retracted."));
  console.log();
}

// Search In Web
export function showWebResult(url: string, content: string): void {
  console.log();
  console.log(chalk.gray("  source  ") + chalk.cyan(url));
  console.log();
  const lines = content.trimEnd().split("\n");
  lines.forEach((line) => {
    console.log(chalk.gray("  │  ") + chalk.white(line));
  });
  console.log();
}

export function showScreenshotSaved(filePath: string): void {
  console.log();
  console.log(
    chalk.green("  ✔  ") +
      chalk.white("Screenshot saved → ") +
      chalk.cyan(filePath),
  );
  console.log();
}
