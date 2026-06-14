#!/usr/bin/env node
import readline from "readline";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan("  ❯ ") + chalk.white(question + " "), resolve);
  });
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(chalk.cyan("  ❯ ") + chalk.white(question + " "));
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    stdin.on("data", function handler(char: string) {
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", handler);
        process.stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit();
      } else if (char === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        value += char;
        process.stdout.write("*");
      }
    });
  });
}

async function setup() {
  console.clear();
  console.log();
  console.log(chalk.cyan.bold("  🐙 Octopus Setup Wizard"));
  console.log(chalk.gray("  ─────────────────────────────────────"));
  console.log();
  console.log(chalk.gray("  Let's get you configured in 2 minutes."));
  console.log();

  // Check if .env already exists
  const envPath = path.join(process.cwd(), ".env");
  const existing: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    console.log(
      chalk.yellow(
        "  ⚠  .env file found — existing values will be kept if you skip a field.",
      ),
    );
    console.log();
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) existing[key.trim()] = rest.join("=").trim();
    }
  }

  // Groq API Key
  console.log(chalk.white("  Step 1 — Groq API Key"));
  console.log(chalk.gray("  Get yours free at https://console.groq.com"));
  console.log();
  const groqKey = await askHidden("GROQ_API_KEY:");
  const finalGroqKey = groqKey || existing["GROQ_API_KEY"] || "";
  console.log();

  // Groq Model
  console.log(chalk.white("  Step 2 — Groq Model"));
  console.log(
    chalk.gray("  Press enter to use default: llama-3.3-70b-versatile"),
  );
  console.log();
  const groqModel = await ask("GROQ_MODEL (or press enter for default):");
  const finalGroqModel =
    groqModel || existing["GROQ_MODEL"] || "llama-3.3-70b-versatile";
  console.log();

  // Gmail setup
  console.log(chalk.white("  Step 3 — Gmail (optional, for email tentacle)"));
  console.log(
    chalk.gray(
      "  Skip by pressing enter. Setup later by re-running octopus setup.",
    ),
  );
  console.log(
    chalk.gray(
      "  App password guide: myaccount.google.com → Security → App passwords",
    ),
  );
  console.log();
  const gmailUser = await ask(
    "GMAIL_USER (your gmail address or press enter to skip):",
  );
  const finalGmailUser = gmailUser || existing["GMAIL_USER"] || "";
  console.log();

  let finalGmailPass = existing["GMAIL_APP_PASSWORD"] || "";
  if (finalGmailUser) {
    const gmailPass = await askHidden("GMAIL_APP_PASSWORD:");
    finalGmailPass = gmailPass || existing["GMAIL_APP_PASSWORD"] || "";
    console.log();
  }

  // Write .env
  const envContent = [
    `GROQ_API_KEY=${finalGroqKey}`,
    `GROQ_MODEL=${finalGroqModel}`,
    `GMAIL_USER=${finalGmailUser}`,
    `GMAIL_APP_PASSWORD=${finalGmailPass}`,
  ].join("\n");

  fs.writeFileSync(envPath, envContent, "utf-8");

  console.log();
  console.log(chalk.gray("  ─────────────────────────────────────"));
  console.log();
  console.log(chalk.green("  ✔  Configuration saved to .env"));
  console.log();
  console.log(chalk.white("  You're all set. Run Octopus with:"));
  console.log();
  console.log(chalk.cyan("     npm run dev"));
  console.log(chalk.gray("     or after npm install -g octopus-agent:"));
  console.log(chalk.cyan("     octopus"));
  console.log();

  rl.close();
}

setup();
