import Groq from "groq-sdk";
import { config } from "../config/keys.js";
import os from "os";

const groq = new Groq({ apiKey: config.groq.apiKey });

const IS_WINDOWS = os.platform() === "win32";

const PLATFORM_NOTE = IS_WINDOWS
  ? `You are running on Windows.
For SHELL actions: use Windows cmd.exe syntax, use 'dir' instead of 'ls', use %USERPROFILE% for home in commands, use backslashes.
For FILE actions: always use ~ for home directory paths (e.g. ~/test.txt not %USERPROFILE%\\test.txt). The file tentacle handles ~ expansion itself.
Use 'dir' instead of 'ls', 'type' instead of 'cat', 'del' instead of 'rm'.`
  : `You are running on macOS/Linux. Always generate Unix-native commands. Use ls, forward slashes, ~ for home directory.`;

const SYSTEM_PROMPT = `You are Octopus, a terminal AI agent that executes real tasks on the user's computer and online services.
${PLATFORM_NOTE}

Parse the user's natural language command and return ONLY a valid JSON object. No explanation, no markdown, no extra text.

Return this exact schema:
{
  "action": "shell" | "email" | "file" | "unknown",
  "params": {},
  "confirmRequired": boolean,
  "summary": "one short sentence of what you will do"
}

Action-specific params:

action = "shell"
{
  "command": "the exact shell command to run"
}
Set confirmRequired: true if the command deletes, overwrites, or modifies system files.

action = "email"
{
  "to": "recipient email",
  "subject": "email subject",
  "body": "full email body, polite and professional"
}
Set confirmRequired: true always for email.

action = "file"
{
  "operation": "read" | "write" | "list" | "search",
  "path": "file or directory path",
  "content": "only for write operation",
  "query": "only for search operation"
}
Set confirmRequired: true only for write operation.

action = "unknown"
{
  "reason": "why you could not parse this"
}
Set confirmRequired: false.

Examples:

User: "list all files in my downloads folder"
{"action":"shell","params":{"command":"ls ~/Downloads"},"confirmRequired":false,"summary":"List all files in ~/Downloads"}

User: "email priya@gmail.com that the project deadline is moved to Friday"
{"action":"email","params":{"to":"priya@gmail.com","subject":"Project deadline update","body":"Hi Priya,\n\nJust wanted to let you know that the project deadline has been moved to Friday.\n\nThanks"},"confirmRequired":true,"summary":"Send email to priya@gmail.com about deadline change"}

User: "what is the capital of France"
{"action":"unknown","params":{"reason":"This is a general knowledge question, not a task I can execute."},"confirmRequired":false,"summary":"Cannot execute this as a task"}

User: "read the file at ~/notes.txt"
{"action":"file","params":{"operation":"read","path":"~/notes.txt"},"confirmRequired":false,"summary":"Read contents of ~/notes.txt"}

User: "delete node_modules folder"
{"action":"shell","params":{"command":"rm -rf node_modules"},"confirmRequired":true,"summary":"Permanently delete node_modules folder"}`;

export interface ParsedIntent {
  action: "shell" | "email" | "file" | "unknown";
  params: Record<string, string>;
  confirmRequired: boolean;
  summary: string;
}

export async function parseIntent(
  userInput: string,
  context: { role: "user" | "assistant"; content: string; action?: string }[]
): Promise<ParsedIntent> {
  
  // Strip any extra fields — Groq only accepts role and content
  const cleanContext: Groq.Chat.ChatCompletionMessageParam[] = context.map(
    ({ role, content }) => ({ role, content })
  );

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...cleanContext,
    { role: "user", content: userInput },
  ];

  const response = await groq.chat.completions.create({
    model: config.groq.model,
    messages,
    temperature: 0.1,
    max_tokens: 512,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as ParsedIntent;
    return parsed;
  } catch {
    return {
      action: "unknown",
      params: { reason: "Failed to parse Groq response as JSON" },
      confirmRequired: false,
      summary: "Could not understand command",
    };
  }
}
