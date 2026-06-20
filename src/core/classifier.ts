import Groq from "groq-sdk";
import { config } from "../config/keys.js";

const groq = new Groq({ apiKey: config.groq.apiKey });

// fast reponse model
const CLASSIFIER_MODEL = "llama-3.1-8b-instant";

export interface ClassificationResult {
  complexity: "simple" | "complex";
  reasoning: string;
}

const CLASSIFIER_PROMPT = `You classify a user's terminal command as "simple" or "complex".

"simple" = needs exactly ONE operation, from ONE tentacle, in ONE call.
"complex" = needs TWO OR MORE operations — even if they're all from the SAME tentacle.

CRITICAL RULE 1: Count operations, not tentacles. "Check remote origin and tell me git status" is TWO git operations (remote + status) — complex, even though both are "git".

CRITICAL RULE 2: If the request requires output from one tentacle to be used by a DIFFERENT tentacle, it is ALWAYS complex.

CRITICAL RULE 3: Multiple questions or asks joined by "and" are almost always complex — "check X and tell me Y" is two operations even if X and Y sound related.

Examples:
- "check the remote origin and tell me the status" → COMPLEX (git: remote operation + git: status operation — two distinct operations)
- "show me my last 5 commits and check if it's safe to push" → COMPLEX (git: log + git: safety — two operations)
- "generate my standup and email it to my manager" → COMPLEX (git: standup + email: send — two tentacles)
- "show git status" → SIMPLE (one operation)
- "what is my IP address" → SIMPLE (one operation)
- "email john a long message about the deadline" → SIMPLE (one operation, rich parameters)
- "commit my changes with a good message" → SIMPLE (git handles diff-reading and committing as ONE internal operation)

Rule of thumb: if you can satisfy the ENTIRE request with one tentacle call using one operation, it's simple. If the user is asking for two or more distinct pieces of information or actions, even from the same tentacle, it's complex.

Return ONLY this JSON, nothing else:
{"complexity": "simple" | "complex", "reasoning": "one short sentence why, mention which operation(s)"}`;

export async function classifyComplexity(
  userInput: string,
): Promise<ClassificationResult> {
  // Cheap pre-filter before even calling Groq - obvious multi-step signals
  const multiStepSignals = [
    /\band\s+then\b/i,
    /\bafter\s+that\b/i,
    /\bonly\s+if\b/i,
    /\bif\s+.+\s+then\b/i,
    /,\s*then\b/i,
    /\b(generate|create|write|check|search|scrape|commit|push|pull|run|fetch|read)\b.+\band\b.+\b(email|send|message|notify|save|write|commit|push)\b/i,
    /\b(check|show|tell me|get|fetch)\b.+\band\b.+\b(tell me|show|status|check)\b/i,
  ];

  const hasObviousSignal = multiStepSignals.some((p) => p.test(userInput));

  // Obvious signal - skip the API call entirely, save the round trip
  if (hasObviousSignal) {
    return {
      complexity: "complex",
      reasoning: "Detected sequential or conditional language",
    };
  }

  try {
    const response = await groq.chat.completions.create({
      model: CLASSIFIER_MODEL,
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content: userInput },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw) as ClassificationResult;

    if (parsed.complexity !== "simple" && parsed.complexity !== "complex") {
      return {
        complexity: "simple",
        reasoning: "Classifier returned invalid value, defaulting to simple",
      };
    }

    return parsed;
  } catch {
    // Classifier failure - fail safe to simple path, never block the user
    return {
      complexity: "simple",
      reasoning: "Classifier unavailable, defaulting to simple",
    };
  }
}
