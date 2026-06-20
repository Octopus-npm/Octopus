export interface PlanStep {
  id: number;
  tentacle: "shell" | "file" | "email" | "web" | "git";
  operation: string;
  params: Record<string, string>;
  description: string;
  condition?: string;
  dependsOn?: number[];
}

export interface ExecutionPlan {
  steps: PlanStep[];
  originalRequest: string;
  unsupported?: string[];
}

// Validation
export interface MissingField {
  stepId: number;
  field: string;
  question: string; // what to ask the user if any required field is missing
}

export interface ValidationResult {
  valid: boolean;
  missingFields: MissingField[];
}

// Step execution result
export interface StepResult {
  stepId: number;
  success: boolean;
  output: string;
  message: string;
  data?: unknown;
}

// Verification
export interface VerificationResult {
  passed: boolean;
  reason: string;
  shouldRetry: boolean;
  shouldAbort: boolean;
}

// Supervisor final result
export interface SupervisorResult {
  success: boolean;
  summary: string;
  stepResults: StepResult[];
  abortedAt?: number;
}

// Pending plan (held in memory while waiting on missing info)
export interface PendingPlan {
  plan: ExecutionPlan;
  missingFields: MissingField[];
  createdAt: number; // timestamp - used to expire stale pending plans
}