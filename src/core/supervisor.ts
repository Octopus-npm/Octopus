import Groq from "groq-sdk";
import { config } from "../config/keys.js";
import {
  ExecutionPlan,
  PlanStep,
  ValidationResult,
  StepResult,
  SupervisorResult,
  VerificationResult,
} from "./planTypes.js";

import { executeShell } from "../tentacles/shell.js";
import { executeFile } from "../tentacles/file.js";
import { executeEmail } from "../tentacles/email.js";
import { executeWeb } from "../tentacles/web.js";
import { executeGit } from "../tentacles/git.js";
import { validatePlan } from "./validator.js";

const groq = new Groq({ apiKey: config.groq.apiKey });

const MAX_STEPS = 5;

const PLANNER_PROMPT = `You are the planning module of Octopus, a terminal AI agent. Break the user's complex request into an ordered list of steps. Each step uses exactly ONE tentacle.

Available tentacles and their EXACT operations — do not invent operations not listed here:
- shell: { command } → returns: raw command output text
- file: { operation: "read"|"write"|"list"|"search", path, content, query } → returns: file content or listing text
- email: { to, subject, body } → returns: confirmation message only, no usable output for chaining
- web: { operation: "scrape"|"screenshot"|"summarize"|"search", url, query, savePath }
  - scrape → returns: page text content (chainable as input to file/email)
  - summarize → returns: AI summary text (chainable)
  - screenshot → returns: file path of saved image (not chainable as text)
  - search → returns: a FORMATTED LIST of multiple results with titles/links — NOT a single URL, cannot be chained directly into another web.url param
- git: { operation: "status"|"commit"|"log"|"branch"|"push"|"pull"|"diff"|"undo"|"safety"|"standup"|"pr"|"stash"|"stale"|"remote"|"remote-branches"|"sync"|"fetch"|"contributors"|"stats", message, branch, sub, count, days } → returns: varies, mostly human-readable summaries (chainable as text for email/file)

CRITICAL RULE — NO SHELL GUESSING: The "shell" tentacle only runs commands the user explicitly wants run, or well-known universal CLI commands (npm test, npm run build, etc). NEVER use shell to "guess" at a capability that doesn't exist — for example, do not invent a shell command for "deploy to vercel" unless the user explicitly says to run "vercel deploy". Do not invent a shell command as a substitute for "generate a standup" (use git's "standup" operation) or for "fix issues" (no such capability exists — use "unsupported"). If you are inventing a command name that isn't something a real person would type in a terminal verbatim, it belongs in "unsupported" instead.

CRITICAL: "generate a standup", "create a standup", "daily standup", "what did I work on" should ALWAYS map to git tentacle operation "standup" — never shell, never "get today's date".

CRITICAL: Before using "shell" for any git-related task, check if a git tentacle operation already does it: contributors counting → use git "contributors" operation, NOT shell. Standup/recent work → use git "standup". Repo overview → use git "stats". Only use shell for git operations that have no equivalent in the git tentacle's operation list.

CRITICAL CHAINING RULE: Only chain {{step_N_output}} into a NEXT step's param if that step's output is genuinely a single usable piece of data (text content, a generated message, a summary). NEVER chain "search" results into a "scrape" or "screenshot" url param — search returns multiple results as formatted text, not one URL. If the user's request implies "search then visit/open/buy a result", that next action is NOT POSSIBLE with current tentacles — add it to "unsupported" instead of guessing.

CRITICAL: If part of the user's request doesn't clearly map to one of the operations listed above, or requires chaining that doesn't make sense per the rule above, DO NOT invent or guess. Instead, omit that part and note it in "unsupported".

Rules:
- Maximum ${MAX_STEPS} steps. If the request needs more, simplify or combine.
- Each step needs a unique numeric "id" starting from 1.
- If a step's params depend on a PREVIOUS step's output, set "dependsOn": [stepId] and leave that param as "{{step_N_output}}" — ONLY when the chaining rule above allows it.
- If a step should only run conditionally on a previous step's success, set "condition" describing it in plain English.
- Don't invent information the user didn't provide.
- "description" is a short human-readable summary of that single step.

Return ONLY this JSON, nothing else:
{
  "steps": [...],
  "unsupported": ["short description of any part of the request that has no matching tentacle operation or can't be chained"]
}

Example — "search for nike shoes on flipkart and buy one":
{
  "steps": [
    {"id": 1, "tentacle": "web", "operation": "search", "params": {"query": "nike jordan shoes flipkart"}, "description": "Search for Nike Jordan shoes"}
  ],
  "unsupported": ["Buying a product — Octopus has no checkout/payment tentacle", "Opening or scraping a specific result — search returns multiple results, not one page to act on"]
}

Example — "generate my standup and email it to my manager":
{
  "steps": [
    {"id": 1, "tentacle": "git", "operation": "standup", "params": {}, "description": "Generate standup from recent commits"},
    {"id": 2, "tentacle": "email", "operation": "send", "params": {"to": "", "subject": "Daily standup", "body": "{{step_1_output}}"}, "description": "Email the standup", "dependsOn": [1]}
  ],
  "unsupported": []
}

Example — "check who has committed the most and email me the count":
{
  "steps": [
    {"id": 1, "tentacle": "git", "operation": "contributors", "params": {}, "description": "Get contributor commit counts"},
    {"id": 2, "tentacle": "email", "operation": "send", "params": {"to": "", "subject": "Contributors", "body": "{{step_1_output}}"}, "description": "Email contributor counts", "dependsOn": [1]}
  ],
  "unsupported": []
}`;

export async function generatePlan(userInput: string): Promise<ExecutionPlan> {
  const response = await groq.chat.completions.create({
    model: config.groq.model,
    messages: [
      { role: "system", content: PLANNER_PROMPT },
      { role: "user", content: userInput },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";

  let parsed: { steps: PlanStep[]; unsupported?: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { steps: [] };
  }

  // Hard cap - never trust the model's step count blindly
  const steps = (parsed.steps ?? []).slice(0, MAX_STEPS);

  // Sanitize each step has the required shape
  const validTentacles = ["shell", "file", "email", "web", "git"];
  const cleanSteps: PlanStep[] = steps
    .filter((s) => validTentacles.includes(s.tentacle))
    .map((s, i) => ({
      id: s.id ?? i + 1,
      tentacle: s.tentacle,
      operation: s.operation ?? "",
      params: s.params ?? {},
      description: s.description ?? "Step " + (i + 1),
      condition: s.condition,
      dependsOn: s.dependsOn,
    }));

  return {
    steps: cleanSteps,
    originalRequest: userInput,
    unsupported: parsed.unsupported ?? [],
  };
}

export type SupervisorProgressCallback = (text: string) => void;

// ── Validation gate

export function validateExecutionPlan(plan: ExecutionPlan): ValidationResult {
  return validatePlan(plan.steps);
}

// ── Placeholder resolution — fills {{step_N_output}} from prior results
function resolveParams(
  params: Record<string, string>,
  stepResults: StepResult[],
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string") {
      resolved[key] = value;
      continue;
    }

    resolved[key] = value.replace(
      /\{\{step_(\d+)_output\}\}/g,
      (_match, stepIdStr) => {
        const refId = parseInt(stepIdStr);
        const refResult = stepResults.find((r) => r.stepId === refId);
        return refResult?.output ?? "";
      },
    );
  }

  return resolved;
}

// ── Condition check — does this step's dependency chain allow it to run?

function shouldRunStep(step: PlanStep, stepResults: StepResult[]): boolean {
  if (!step.dependsOn || step.dependsOn.length === 0) return true;

  // If any dependency failed, this step is skipped (conditional steps like "push if tests pass")
  for (const depId of step.dependsOn) {
    const depResult = stepResults.find((r) => r.stepId === depId);
    if (!depResult || !depResult.success) return false;
  }

  return true;
}

// ── Single step delegation — calls the actual tentacle

async function delegateStep(
  step: PlanStep,
  stepResults: StepResult[],
  onProgress: SupervisorProgressCallback,
): Promise<StepResult> {
  const resolvedParams = resolveParams(step.params, stepResults);

  try {
    switch (step.tentacle) {
      case "shell": {
        onProgress(`⚡ ${step.description}`);
        const result = await executeShell(resolvedParams["command"] ?? "");
        return {
          stepId: step.id,
          success: result.success,
          output: result.output,
          message: result.message,
        };
      }

      case "file": {
        onProgress(`📁 ${step.description}`);
        const result = await executeFile({
          ...resolvedParams,
          operation: step.operation,
        });
        return {
          stepId: step.id,
          success: result.success,
          output: result.output,
          message: result.message,
        };
      }

      case "email": {
        onProgress(`✉️  ${step.description}`);
        const result = await executeEmail(resolvedParams);
        return {
          stepId: step.id,
          success: result.success,
          output: result.output,
          message: result.message,
        };
      }

      case "web": {
        onProgress(`🌐 ${step.description}`);
        // summarize re-scrapes internally - always needs its own url, never step output
        const params: Record<string, string> =
          step.operation === "summarize"
            ? { operation: step.operation, url: step.params["url"] ?? "" }
            : {
                ...resolvedParams,
                operation: step.operation,
                url: resolvedParams["url"] ?? "",
              };
        const result = await executeWeb(params, onProgress);
        return {
          stepId: step.id,
          success: result.success,
          output: result.output,
          message: result.message,
        };
      }

      case "git": {
        onProgress(`⎇  ${step.description}`);
        const result = await executeGit(
          { ...resolvedParams, operation: step.operation },
          onProgress,
        );
        return {
          stepId: step.id,
          success: result.success,
          output: result.output,
          message: result.message,
          data: result.data,
        };
      }

      default:
        return {
          stepId: step.id,
          success: false,
          output: "",
          message: `Unknown tentacle: ${step.tentacle}`,
        };
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      stepId: step.id,
      success: false,
      output: "",
      message: error.message ?? "Step execution failed",
    };
  }
}

// verify result
function verifyStepResult(
  step: PlanStep,
  result: StepResult,
): VerificationResult {
  // If the tentacle itself reported failure, trust that - no need for extra checks
  if (!result.success) {
    return {
      passed: false,
      reason: result.message,
      shouldRetry: false,
      shouldAbort: true,
    };
  }

  // Sanity checks per tentacle — catch "succeeded" results that are actually empty/wrong
  if (step.tentacle === "git" && step.operation === "standup") {
    if (!result.output || result.output.trim().length < 5) {
      return {
        passed: false,
        reason: "Standup generation returned empty content",
        shouldRetry: false,
        shouldAbort: true,
      };
    }
  }

  if (step.tentacle === "git" && step.operation === "safety") {
    const data = result.data as { issues?: string[] } | undefined;
    const issues = data?.issues ?? [];
    if (issues.length > 0) {
      return {
        passed: false,
        reason: `Security issues found: ${issues.join("; ")}`,
        shouldRetry: false,
        shouldAbort: true,
      };
    }
  }

  if (
    step.tentacle === "web" &&
    (step.operation === "scrape" || step.operation === "summarize")
  ) {
    if (!result.output || result.output.trim().length < 10) {
      return {
        passed: false,
        reason: "Web content came back empty or too short to be useful",
        shouldRetry: false,
        shouldAbort: true,
      };
    }
  }

  if (step.tentacle === "email") {
    if (!result.message.toLowerCase().includes("sent")) {
      return {
        passed: false,
        reason: "Email step completed but confirmation message looks wrong",
        shouldRetry: false,
        shouldAbort: true,
      };
    }
  }

  return { passed: true, reason: "OK", shouldRetry: false, shouldAbort: false };
}

// ── Main orchestration loop
export async function runSupervisor(
  plan: ExecutionPlan,
  onProgress: SupervisorProgressCallback,
  onStepStart: (step: PlanStep, index: number, total: number) => void,
  onStepDone: (
    step: PlanStep,
    result: StepResult,
    verification: VerificationResult,
  ) => void,
): Promise<SupervisorResult> {
  const stepResults: StepResult[] = [];
  const total = plan.steps.length;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    // Conditional skip — dependency failed, this step doesn't run
    if (!shouldRunStep(step, stepResults)) {
      const skippedResult: StepResult = {
        stepId: step.id,
        success: false,
        output: "",
        message: "Skipped — a required prior step did not succeed",
      };
      stepResults.push(skippedResult);
      onStepDone(step, skippedResult, {
        passed: false,
        reason: "Dependency failed",
        shouldRetry: false,
        shouldAbort: false,
      });
      continue;
    }

    onStepStart(step, i + 1, total);

    const result = await delegateStep(step, stepResults, onProgress);
    const verification = verifyStepResult(step, result);

    stepResults.push(result);
    onStepDone(step, result, verification);

    if (verification.shouldAbort) {
      return {
        success: false,
        summary: `Stopped at step ${i + 1}/${total}: ${verification.reason}`,
        stepResults,
        abortedAt: step.id,
      };
    }
  }

  const allSucceeded = stepResults.every(
    (r) => r.success || stepResults.find((s) => s.stepId === r.stepId),
  );
  const successCount = stepResults.filter((r) => r.success).length;

  return {
    success: successCount > 0,
    summary: `Completed ${successCount}/${total} step(s)`,
    stepResults,
  };
}

// ── Full pipeline entry point — plan, validate, execute
export interface SupervisorRunResult {
  status: "needs_info" | "completed";
  plan: ExecutionPlan;
  validation?: ValidationResult;
  result?: SupervisorResult;
}

export async function executeSupervisorTask(
  userInput: string,
  onProgress: SupervisorProgressCallback,
  onStepStart: (step: PlanStep, index: number, total: number) => void,
  onStepDone: (
    step: PlanStep,
    result: StepResult,
    verification: VerificationResult,
  ) => void,
): Promise<SupervisorRunResult> {
  onProgress("⎇  Planning steps...");
  const plan = await generatePlan(userInput);

  if (plan.steps.length === 0) {
    return {
      status: "completed",
      plan,
      result: {
        success: false,
        summary:
          "Could not break this request into actionable steps. Try rephrasing.",
        stepResults: [],
      },
    };
  }

  const validation = validateExecutionPlan(plan);
  if (!validation.valid) {
    return { status: "needs_info", plan, validation };
  }

  const result = await runSupervisor(plan, onProgress, onStepStart, onStepDone);
  return { status: "completed", plan, result };
}
