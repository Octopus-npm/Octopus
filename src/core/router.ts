import { ParsedIntent } from "./intentParser.js";
import { executeShell } from "../tentacles/shell.js";
import { executeFile } from "../tentacles/file.js";
import { executeEmail } from "../tentacles/email.js";
import { executeWeb } from "../tentacles/web.js";

// ── Unified result type
export interface ExecuteResult {
  success: boolean;
  output: string;
  message: string;
}

export type ProgressCallback = (text: string) => void;

// ── Router
export async function execute(
  intent: ParsedIntent,
  onProgress: ProgressCallback,
): Promise<ExecuteResult> {
  switch (intent.action) {
    case "shell": {
      const command = intent.params["command"];
      if (!command) {
        return {
          success: false,
          output: "",
          message: "No command found in parsed intent.",
        };
      }
      onProgress("Running command...");
      return executeShell(command);
    }

    case "file": {
      const operation = intent.params["operation"];
      if (operation === "read") onProgress("Reading file...");
      else if (operation === "write") onProgress("Writing file...");
      else if (operation === "search") onProgress("Searching files...");
      else if (operation === "list") onProgress("Listing directory...");
      return executeFile(intent.params);
    }

    case "email": {
      onProgress("Sending email...");
      return executeEmail(intent.params);
    }

    case "web": {
      const operation = intent.params["operation"];

      if (operation === "search") onProgress("🌐  Launching search...");
      else if (operation === "scrape") onProgress("🌐  Opening page...");
      else if (operation === "screenshot") onProgress("🌐  Loading page...");
      else if (operation === "summarize") onProgress("🌐  Fetching page...");
      else onProgress("🌐  Working...");
      return executeWeb(intent.params, onProgress);
    }

    case "unknown":
    default: {
      return {
        success: false,
        output: "",
        message: "Unknown action — nothing to execute.",
      };
    }
  }
}
