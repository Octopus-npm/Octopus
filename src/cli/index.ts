#!/usr/bin/env node
import readline from "readline";
import chalk from "chalk";
import { parseIntent } from "../core/intentParser.js";
import {
  showBanner,
  showPrompt,
  showIntent,
  showSuccess,
  showError,
  showOutput,
  showUnknown,
  showCancelled,
  showGoodbye,
  startSpinner,
  updateSpinner,
  stopSpinner,
  showConfirmPrompt,
  showWebResult,
  showScreenshotSaved,
} from "./display.js";
import {
  addMessage,
  clearMemory,
  getRecentMessages,
  getSessionStats,
} from "../memory/store.js";
import { closeBrowser } from "../tentacles/web.js";

// ── Confirmation gate
async function confirm(rl: readline.Interface): Promise<boolean> {
  return new Promise((resolve) => {
    showConfirmPrompt();
    rl.once("line", (answer) => {
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// Extract URL directly from raw user input — for better output and avoid failures
function extractUrlFromInput(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

// ── Main loop
async function main(): Promise<void> {
  showBanner();
  const stats = getSessionStats();
  if (stats.totalMessages > 0) {
    console.log(
      chalk.gray(
        `  Resuming session — ${stats.totalMessages} messages in memory`,
      ),
    );
    console.log();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Graceful exit on Ctrl+C
  rl.on("SIGINT", async () => {
    await closeBrowser();
    showGoodbye();
    process.exit(0);
  });

  const ask = (): void => {
    showPrompt();

    rl.once("line", async (input) => {
      const trimmed = input.trim();

      // Empty input
      if (!trimmed) {
        ask();
        return;
      }

      // Exit commands
      if (["exit", "quit", "bye"].includes(trimmed.toLowerCase())) {
        await closeBrowser();
        showGoodbye();
        rl.close();
        process.exit(0);
      }

      // Clear memory
      if (
        ["clear memory", "forget everything", "reset memory"].includes(
          trimmed.toLowerCase(),
        )
      ) {
        clearMemory();
        showSuccess("Memory cleared. Starting fresh.");
        ask();
        return;
      }

      // Help command
      if (
        ["help", "?", "commands", "what can you do"].includes(
          trimmed.toLowerCase(),
        )
      ) {
        console.log();
        console.log(chalk.cyan("  🐙 What Octopus can do:"));
        console.log();
        console.log(
          chalk.white("  ⚡ Shell    ") +
            chalk.gray("Run any terminal command in plain English"),
        );
        console.log(chalk.gray('             "show running processes"'));
        console.log(chalk.gray('             "what is my IP address"'));
        console.log();
        console.log(
          chalk.white("  📁 File    ") +
            chalk.gray("Read, write, list, search files"),
        );
        console.log(chalk.gray('             "read ~/notes.txt"'));
        console.log(
          chalk.gray(
            '             "search for files named report in my documents"',
          ),
        );
        console.log();
        console.log(
          chalk.white("  ✉️  Email   ") + chalk.gray("Send emails via Gmail"),
        );
        console.log(
          chalk.gray(
            '             "email john@acme.com that the meeting is at 3pm"',
          ),
        );
        console.log();
        console.log(
          chalk.white("  🌐 Web     ") +
            chalk.gray("Scrape, screenshot, summarize, search the web"),
        );
        console.log(chalk.gray('             "get headlines from bbc.com"'));
        console.log(
          chalk.gray('             "search for nodejs jobs in Kolkata"'),
        );
        console.log(
          chalk.gray('             "summarize https://dev.to/some-article"'),
        );
        console.log(
          chalk.gray('             "screenshot github.com/Codewithpabitra"'),
        );
        console.log();

        console.log(
          chalk.white("  🧠 Memory  ") + chalk.gray("Special commands"),
        );
        console.log(
          chalk.gray('             "clear memory" — wipe conversation history'),
        );
        console.log(chalk.gray('             "exit" — quit Octopus'));
        console.log();
        ask();
        return;
      }

      // Parse intent via Groq
      // Parse intent via Groq
      startSpinner("Thinking...");
      let intent;
      try {
        const recentMessages = getRecentMessages(10);
        intent = await parseIntent(trimmed, recentMessages);
      } catch (err) {
        stopSpinner();
        showError(
          "Failed to reach Groq API. Check your GROQ_API_KEY and internet connection.",
        );
        ask();
        return;
      }
      stopSpinner();

      // Show what Octopus understood
      showIntent(intent.summary, intent.action);

      //URL override — if user typed a URL, always use it regardless of what Groq parsed
      if (intent.action === "web" && intent.params["url"]) {
        const rawUrl = extractUrlFromInput(trimmed);
        if (rawUrl) {
          intent.params["url"] = rawUrl;
        }
      }

      // Handle unknown
      if (intent.action === "unknown") {
        const reason =
          intent.params["reason"] ?? "Could not understand command.";
        showUnknown(reason);
        addMessage("user", trimmed, "unknown");
        addMessage("assistant", `Could not execute: ${reason}`, "unknown");
        ask();
        return;
      }

      // Confirmation gate for risky actions
      if (intent.confirmRequired) {
        const approved = await confirm(rl);
        if (!approved) {
          showCancelled();
          ask();
          return;
        }
        startSpinner("Starting...");
      }

      // Route to tentacle
      try {
        const { execute } = await import("../core/router.js");
        // startSpinner("Starting...");
        const executionLabels: Record<string, string> = {
          shell: "Running command...",
          file: "Processing file...",
          email: "Sending email...",
          web: "Launching browser...",
        };
        startSpinner(executionLabels[intent.action] ?? "Working...");

        const result = await execute(intent, (text) => {
          updateSpinner(text);
        });
        stopSpinner();

        if (result.success) {
          if (result.output) showOutput(result.output);
          showSuccess(result.message);
        } else {
          showError(result.message);
        }

        addMessage("user", trimmed, intent.action);
        addMessage("assistant", result.message, intent.action);
      } catch (err) {
        showError("Router not ready yet — build Steps 7-9 first.");
      }

      ask();
    });
  };

  ask();
}

main();
