import dotenv from "dotenv";
dotenv.config();
import os from "os";
import path from "path";
import fs from "fs";

export const platform = {
  isWindows: os.platform() === "win32",
  isMac: os.platform() === "darwin",
  isLinux: os.platform() === "linux",
  name: os.platform(),
};

// first run detection
function isFirstRun(): boolean {
  const envPath = path.join(process.cwd(), ".env");
  const homeEnvPath = path.join(os.homedir(), ".octopus", ".env");

  // Check local .env
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    if (
      content.includes("GROQ_API_KEY=") &&
      !content.includes("GROQ_API_KEY=\n") &&
      !content.includes("GROQ_API_KEY= ")
    ) {
      const match = content.match(/GROQ_API_KEY=(.+)/);
      if (match && match[1].trim().length > 10) return false;
    }
  }

  // Check home dir .env
  if (fs.existsSync(homeEnvPath)) {
    dotenv.config({ path: homeEnvPath });
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10)
      return false;
  }

  return true;
}

function require_env(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length < 5) {
    return "";
  }
  return value;
}

// Try loading from /.octopus/.env as fallback
const homeEnvPath = path.join(os.homedir(), ".octopus", ".env");
if (fs.existsSync(homeEnvPath)) {
  dotenv.config({ path: homeEnvPath, override: false });
}

export const config = {
  groq: {
    apiKey: require_env("GROQ_API_KEY"),
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
  gmail: {
    user: process.env.GMAIL_USER ?? "",
    appPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  },
  isFirstRun: isFirstRun(),
};
