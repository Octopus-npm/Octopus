import chalk from "chalk";
import ora, { Ora } from "ora";
import os from "os";

import {
  PlanStep,
  StepResult,
  VerificationResult,
  MissingField,
} from "../core/planTypes.js";

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
    chalk.cyan("⬡ web"),
    chalk.cyan("⬡ git"),
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
    web: "🌐",
    git: "🐼",
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

// Git specific display functions
export function showGitStatus(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── git status ──────────────────────────────"));
  const lines = output.trimEnd().split("\n");
  lines.forEach((line) => {
    if (line.includes("modified")) {
      console.log(chalk.yellow("  ▲  ") + chalk.white(line.trim()));
    } else if (line.includes("new file") || line.includes("added")) {
      console.log(chalk.green("  ✚  ") + chalk.white(line.trim()));
    } else if (line.includes("deleted")) {
      console.log(chalk.red("  ✖  ") + chalk.white(line.trim()));
    } else if (line.includes("untracked")) {
      console.log(chalk.gray("  ?  ") + chalk.white(line.trim()));
    } else if (line.trim()) {
      console.log(chalk.gray("  │  ") + chalk.white(line.trim()));
    }
  });
  console.log();
}

export function showGitLog(
  commits: { hash: string; date: string; message: string; author: string }[],
): void {
  console.log();
  console.log(chalk.cyan("  ── git log ─────────────────────────────────"));
  commits.forEach((c, i) => {
    console.log(
      chalk.gray(`  ${String(i + 1).padStart(2, "0")}  `) +
        chalk.cyan(c.hash) +
        chalk.gray("  ") +
        chalk.white(c.message),
    );
    console.log(
      chalk.gray("       ") +
        chalk.gray(c.author) +
        chalk.gray("  •  ") +
        chalk.gray(c.date),
    );
    console.log();
  });
}

export function showGitDiff(output: string): void {
  console.log();

  // Split into per-file sections
  const fileSections = output.split(/^diff --git /m).filter(Boolean);

  fileSections.forEach((section) => {
    const lines = section.split("\n");

    // Extract file name from first line: "a/src/file.ts b/src/file.ts"
    const fileHeader = lines[0] ?? "";
    const fileMatch = fileHeader.match(/b\/(.+)$/);
    const fileName = fileMatch ? fileMatch[1] : fileHeader;

    console.log(chalk.cyan("  ┌─ ") + chalk.white.bold(fileName));
    console.log(chalk.gray("  │"));

    let inHunk = false;

    lines.slice(1).forEach((line) => {
      // Skip git metadata lines
      if (
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ") ||
        line.startsWith("diff --git") ||
        line.startsWith("new file") ||
        line.startsWith("deleted file")
      )
        return;

      // Hunk header @@ -x,y +a,b @@
      if (line.startsWith("@@")) {
        inHunk = true;
        const hunkMatch = line.match(/@@ .+ @@ ?(.*)?/);
        const context = hunkMatch?.[1] ?? "";
        console.log(
          chalk.gray("  ├─ ") +
            chalk.cyan(
              line.split("@@")[1]?.trim().split("@@")[0]?.trim() ?? "",
            ) +
            (context ? chalk.gray("  " + context) : ""),
        );
        return;
      }

      if (!inHunk) return;

      if (line.startsWith("+")) {
        console.log(chalk.green("  │ + ") + chalk.green(line.slice(1)));
      } else if (line.startsWith("-")) {
        console.log(chalk.red("  │ - ") + chalk.red(line.slice(1)));
      } else if (line.trim()) {
        console.log(chalk.gray("  │   ") + chalk.gray(line));
      }
    });

    console.log(chalk.gray("  └" + "─".repeat(44)));
    console.log();
  });
}

export function showCommitMessage(message: string): void {
  console.log();
  console.log(chalk.cyan("  ── ai generated commit message ─────────────"));
  console.log(chalk.white("  " + message));
  console.log();
}

export function showGitBranches(branches: string[], current: string): void {
  console.log();
  console.log(chalk.cyan("  ── branches ─────────────────────────────────"));
  branches.forEach((b) => {
    const isCurrent = b.trim() === current.trim();
    if (isCurrent) {
      console.log(
        chalk.green("  ✦  ") +
          chalk.white(b.trim()) +
          chalk.gray("  ← current"),
      );
    } else {
      console.log(chalk.gray("  ○  ") + chalk.gray(b.trim()));
    }
  });
  console.log();
}

export function showSafetyCheck(issues: string[]): void {
  console.log();
  if (issues.length === 0) {
    console.log(chalk.green("  ✔  No issues found. Safe to push."));
  } else {
    console.log(chalk.yellow("  ⚠  Safety check found issues:"));
    issues.forEach((issue) => {
      console.log(chalk.red("     ✖  ") + chalk.white(issue));
    });
  }
  console.log();
}

export function showStandup(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── standup report ──────────────────────────"));
  const lines = output.trimEnd().split("\n");
  lines.forEach((line) => {
    console.log(chalk.gray("  ") + chalk.white(line));
  });
  console.log();
}

export function showPRDescription(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── PR description ──────────────────────────"));
  const lines = output.trimEnd().split("\n");
  lines.forEach((line) => {
    console.log(chalk.gray("  ") + chalk.white(line));
  });
  console.log();
}

export function showStashes(
  stashes: { index: number; message: string; summary: string }[],
): void {
  console.log();
  console.log(chalk.cyan("  ── stashes ──────────────────────────────────"));
  if (stashes.length === 0) {
    console.log(chalk.gray("  No stashes found."));
  } else {
    stashes.forEach((s) => {
      console.log(chalk.cyan(`  [${s.index}]  `) + chalk.white(s.message));
      console.log(chalk.gray("       ") + chalk.gray(s.summary));
      console.log();
    });
  }
  console.log();
}

export function showStaleBranches(
  branches: { name: string; lastCommit: string; daysAgo: number }[],
): void {
  console.log();
  console.log(chalk.cyan("  ── stale branches ───────────────────────────"));
  if (branches.length === 0) {
    console.log(chalk.gray("  No stale branches found."));
  } else {
    branches.forEach((b) => {
      console.log(
        chalk.yellow("  ○  ") +
          chalk.white(b.name) +
          chalk.gray(`  •  last commit ${b.daysAgo} days ago`),
      );
    });
  }
  console.log();
}

export function showRepoStats(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── repo stats ───────────────────────────────"));
  output.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(/\s{2,}/);
    console.log(
      chalk.gray("  " + (key ?? "").padEnd(18)) + chalk.white(rest.join("  ")),
    );
  });
  console.log();
}

export function showSyncStatus(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── sync status ──────────────────────────────"));
  output.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(/\s{2,}/);
    const value = rest.join("  ");
    const color = value.includes("✔")
      ? chalk.green
      : value.includes("↑")
        ? chalk.yellow
        : value.includes("↓")
          ? chalk.yellow
          : value.includes("↕")
            ? chalk.red
            : chalk.white;
    console.log(chalk.gray("  " + (key ?? "").padEnd(12)) + color(value));
  });
  console.log();
}

export function showContributors(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── contributors ─────────────────────────────"));
  output.split("\n").forEach((line) => {
    console.log(chalk.gray("  ") + chalk.white(line));
  });
  console.log();
}

export function showRemoteBranches(output: string): void {
  console.log();
  console.log(chalk.cyan("  ── remote branches ──────────────────────────"));
  output.split("\n").forEach((line) => {
    console.log(
      chalk.cyan("  ○  ") + chalk.white(line.replace("  ○  ", "").trim()),
    );
  });
  console.log();
}

// ── Supervisor: plan preview
export function showPlan(steps: PlanStep[]): void {
  console.log();
  console.log(chalk.cyan("  ── execution plan ──────────────────────────"));
  steps.forEach((step, i) => {
    const condition = step.condition ? chalk.gray(`  (${step.condition})`) : "";
    console.log(
      chalk.gray(`  ${i + 1}.  `) + chalk.white(step.description) + condition,
    );
  });
  console.log();
}

// ── Supervisor: missing info prompt
export function showMissingInfo(missingFields: MissingField[]): void {
  console.log();
  console.log(chalk.yellow("  ⚠  Missing info before I can run this:"));
  missingFields.forEach((f) => {
    console.log(chalk.gray("     •  ") + chalk.white(f.question));
  });
  console.log();
  console.log(
    chalk.gray("  Reply with the missing info, or rephrase your request."),
  );
  console.log();
}

// ── Supervisor: step progress (live, one per step)
export function showStepStart(
  step: PlanStep,
  index: number,
  total: number,
): void {
  console.log();
  console.log(
    chalk.cyan(`  [${index}/${total}]  `) + chalk.white(step.description),
  );
}

export function showStepResult(
  step: PlanStep,
  result: StepResult,
  verification: VerificationResult,
): void {
  if (verification.reason === "Dependency failed") {
    console.log(
      chalk.gray(`         ⊘  Skipped — `) +
        chalk.gray(verification.reason.toLowerCase()),
    );
    return;
  }

  const failed = !result.success || !verification.passed;

  if (failed) {
    const reason = verification.reason || result.message;
    if (reason.includes("Security issues found:")) {
      console.log(chalk.red(`         ✖  Security check failed:`));
      const issues = reason.replace("Security issues found: ", "").split("; ");
      issues.forEach((issue) => {
        console.log(chalk.red(`            •  `) + chalk.white(issue));
      });
    } else {
      console.log(chalk.red(`         ✖  `) + chalk.white(reason));
    }
    return;
  }

  // Success — route to the same rich formatters the simple path uses
  const data = result.data as
    | { type?: string; [key: string]: unknown }
    | undefined;
  const indent = "         ";

  if (data?.type === "status") {
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
    showGitStatusIndented(result.output, indent);
  } else if (data?.type === "log") {
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
    (
      data.commits as {
        hash: string;
        date: string;
        message: string;
        author: string;
      }[]
    ).forEach((c) => {
      console.log(
        chalk.gray(`${indent}   `) +
          chalk.cyan(c.hash) +
          chalk.gray("  ") +
          chalk.white(c.message),
      );
    });
  } else if (data?.type === "branches") {
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
    (data.branches as string[]).forEach((b) => {
      const marker = b.trim() === data.current ? "✦" : "○";
      console.log(
        chalk.gray(`${indent}   ${marker}  `) + chalk.white(b.trim()),
      );
    });
  } else if (
    data?.type === "remote-branches" ||
    data?.type === "contributors" ||
    data?.type === "stats" ||
    data?.type === "sync"
  ) {
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
    result.output.split("\n").forEach((line) => {
      console.log(chalk.gray(`${indent}   `) + chalk.white(line));
    });
  } else if (result.output) {
    // Generic — show output indented, truncated if long
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
    const lines = result.output.split("\n");
    const preview = lines.slice(0, 6);
    preview.forEach((line) => {
      console.log(chalk.gray(`${indent}   `) + chalk.white(line));
    });
    if (lines.length > 6) {
      console.log(
        chalk.gray(`${indent}   ... (${lines.length - 6} more lines)`),
      );
    }
  } else {
    console.log(chalk.green(`${indent}✔  `) + chalk.white(result.message));
  }
}

function showGitStatusIndented(output: string, indent: string): void {
  output
    .trimEnd()
    .split("\n")
    .forEach((line) => {
      if (line.includes("modified")) {
        console.log(chalk.yellow(`${indent}   ▲  `) + chalk.white(line.trim()));
      } else if (line.includes("untracked")) {
        console.log(chalk.gray(`${indent}   ?  `) + chalk.white(line.trim()));
      } else if (line.includes("deleted")) {
        console.log(chalk.red(`${indent}   ✖  `) + chalk.white(line.trim()));
      } else if (line.trim()) {
        console.log(chalk.gray(`${indent}   │  `) + chalk.white(line.trim()));
      }
    });
}

// ── Supervisor: final summary
export function showSupervisorSummary(summary: string, success: boolean): void {
  console.log();
  console.log(chalk.cyan("  ── supervisor summary ──────────────────────"));
  if (success) {
    console.log(chalk.green("  ✔  ") + chalk.white(summary));
  } else {
    console.log(chalk.red("  ✖  ") + chalk.white(summary));
  }
  console.log();
}

// ── Supervisor: classification indicator (subtle, low-noise)
export function showSupervisorMode(reasoning: string): void {
  console.log();
  console.log(
    chalk.gray("  ⎇  ") +
      chalk.gray("Multi-step task detected — ") +
      chalk.gray(reasoning),
  );
}
