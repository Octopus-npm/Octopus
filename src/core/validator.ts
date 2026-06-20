import { PlanStep, ValidationResult, MissingField } from "./planTypes.js";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const URL_REGEX =
  /^https?:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,253}[a-zA-Z0-9])?(?::\d{1,5})?(?:\/[^\s]*)?$/;

const PATH_TRAVERSAL_REGEX = /\.\.[/\\]|\0/;

const BRANCH_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,99}$/;
const SHELL_METACHAR_REGEX = /[;&|`$(){}[\]<>\\!#*?~]/;

// Field validators
function isValidEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  return EMAIL_REGEX.test(value.trim());
}

function isValidUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  return URL_REGEX.test(value.trim());
}

function isSafePath(value: string): boolean {
  if (!value || value.length > 1024) return false;
  if (PATH_TRAVERSAL_REGEX.test(value)) return false;
  return true;
}

function isSafeBranchName(value: string): boolean {
  if (!value) return false;
  if (SHELL_METACHAR_REGEX.test(value)) return false;
  return BRANCH_NAME_REGEX.test(value.trim());
}

const PLACEHOLDER_REGEX = /^\{\{step_\d+_output\}\}$/;

function isPlaceholder(value: string | undefined): boolean {
  return !!value && PLACEHOLDER_REGEX.test(value.trim());
}

// ── Per-step validation rules
function validateStep(step: PlanStep): MissingField[] {
  const missing: MissingField[] = [];
  const { tentacle, operation, params } = step;

  if (tentacle === "email") {
    const to = params["to"]?.trim();
    if (!to) {
      missing.push({
        stepId: step.id,
        field: "to",
        question: "Who should I email this to? (provide an email address)",
      });
    } else if (!isPlaceholder(to) && !isValidEmail(to)) {
      missing.push({
        stepId: step.id,
        field: "to",
        question: `"${to}" doesn't look like a valid email address. What's the correct address?`,
      });
    }

    const subject = params["subject"]?.trim();
    const body = params["body"]?.trim();
    if (!subject && !body) {
      missing.push({
        stepId: step.id,
        field: "content",
        question: "What should the email say? (subject and body)",
      });
    }
  }

  if (tentacle === "web") {
    if (["scrape", "screenshot", "summarize"].includes(operation)) {
      const url = params["url"]?.trim();
      if (!url) {
        missing.push({
          stepId: step.id,
          field: "url",
          question: "Which URL should I use?",
        });
      } else if (!isPlaceholder(url) && !isValidUrl(url)) {
        missing.push({
          stepId: step.id,
          field: "url",
          question: `"${url}" isn't a valid http/https URL. What's the correct link?`,
        });
      }
    }
    if (operation === "search") {
      const query = params["query"]?.trim();
      if (!query) {
        missing.push({
          stepId: step.id,
          field: "query",
          question: "What should I search for?",
        });
      }
    }
  }

  if (tentacle === "file") {
    const path = params["path"]?.trim();
    if (
      ["read", "write", "search"].includes(operation) &&
      !path &&
      operation !== "search"
    ) {
      missing.push({
        stepId: step.id,
        field: "path",
        question: "Which file or folder path should I use?",
      });
    }
    if (path && !isPlaceholder(path) && !isSafePath(path)) {
      missing.push({
        stepId: step.id,
        field: "path",
        question: `That path looks unsafe (contains "..") — please give a direct path.`,
      });
    }
    if (operation === "write" && !params["content"]?.trim()) {
      missing.push({
        stepId: step.id,
        field: "content",
        question: "What content should I write to the file?",
      });
    }
  }

  if (tentacle === "git" && operation === "branch") {
    const sub = params["sub"];
    const branch = params["branch"]?.trim();
    if (["create", "switch", "delete"].includes(sub) && !branch) {
      missing.push({
        stepId: step.id,
        field: "branch",
        question: "What's the branch name?",
      });
    }
    if (branch && !isSafeBranchName(branch)) {
      missing.push({
        stepId: step.id,
        field: "branch",
        question: `"${branch}" isn't a safe branch name — avoid spaces and special characters like ; & | \` $.`,
      });
    }
  }

  if (tentacle === "shell") {
    const command = params["command"]?.trim();
    if (!command) {
      missing.push({
        stepId: step.id,
        field: "command",
        question: "What command should I run?",
      });
    }
  }

  return missing;
}

// ── Main validator
export function validatePlan(steps: PlanStep[]): ValidationResult {
  const allMissing: MissingField[] = [];

  for (const step of steps) {
    const missing = validateStep(step);
    allMissing.push(...missing);
  }

  return {
    valid: allMissing.length === 0,
    missingFields: allMissing,
  };
}
