import simpleGit, { SimpleGit } from "simple-git";
import Groq from "groq-sdk";
import { config } from "../config/keys.js";

export interface GitResult {
  success: boolean;
  output: string;
  message: string;
  data?: unknown;
}

export type GitProgressCallback = (text: string) => void;

function getGit(): SimpleGit {
  return simpleGit(process.cwd());
}

async function groqSummarize(prompt: string, system: string): Promise<string> {
  const groq = new Groq({ apiKey: config.groq.apiKey });
  const response = await groq.chat.completions.create({
    model: config.groq.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });
  return response.choices[0].message.content ?? "";
}

// ── STATUS
async function gitStatus(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("⎇  Reading working tree...");
  const git = getGit();
  try {
    const status = await git.status();
    const lines: string[] = [];

    if (status.staged.length)
      lines.push(`staged (${status.staged.length} files):`);
    status.staged.forEach((f) => lines.push(`  new file: ${f}`));

    if (status.modified.length)
      lines.push(`modified (${status.modified.length} files):`);
    status.modified.forEach((f) => lines.push(`  modified: ${f}`));

    if (status.deleted.length)
      lines.push(`deleted (${status.deleted.length} files):`);
    status.deleted.forEach((f) => lines.push(`  deleted: ${f}`));

    if (status.not_added.length)
      lines.push(`untracked (${status.not_added.length} files):`);
    status.not_added.forEach((f) => lines.push(`  untracked: ${f}`));

    if (lines.length === 0)
      lines.push("working tree clean — nothing to commit");

    return {
      success: true,
      output: lines.join("\n"),
      message: `Branch: ${status.current ?? "unknown"} — ${status.files.length} change(s)`,
      data: { type: "status" },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git status failed",
    };
  }
}

// ── COMMIT WITH AI MESSAGE
async function gitCommit(
  userMessage: string,
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  const git = getGit();

  try {
    onProgress("⎇  Reading your changes...");
    const status = await git.status();

    if (status.files.length === 0) {
      return {
        success: false,
        output: "",
        message: "Nothing to commit — working tree clean.",
      };
    }

    onProgress("⎇  Staging all changes...");
    await git.add(".");

    onProgress("⎇  Reading diff...");
    const diff = await git.diff(["--cached", "--stat"]);
    const diffFull = await git.diff(["--cached"]);

    let commitMessage = userMessage;

    if (
      !userMessage ||
      userMessage.toLowerCase().includes("good message") ||
      userMessage.toLowerCase().includes("auto")
    ) {
      onProgress("⎇  AI is writing your commit message...");
      commitMessage = await groqSummarize(
        `Here is the git diff:\n\n${diffFull.slice(0, 3000)}\n\nStat summary:\n${diff}`,
        `You are a git expert. Write a single conventional commit message for these changes.
Format: type(scope): description
Types: feat, fix, docs, style, refactor, test, chore
Rules:
- Max 72 characters
- Lowercase
- No period at end
- Be specific about what changed
- Return ONLY the commit message, nothing else`,
      );
      commitMessage = commitMessage.trim().replace(/^"|"$/g, "");
    }

    onProgress(`⎇  Committing: "${commitMessage}"`);
    await git.commit(commitMessage);

    return {
      success: true,
      output: commitMessage,
      message: `Committed: ${commitMessage}`,
      data: { type: "commit", commitMessage },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git commit failed",
    };
  }
}

// ── LOG

async function gitLog(
  count: number,
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  onProgress("⎇  Fetching commit history...");
  const git = getGit();
  try {
    const log = await git.log({ maxCount: count });
    const commits = log.all.map((c) => ({
      hash: c.hash.slice(0, 7),
      date: new Date(c.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      message: c.message,
      author: c.author_name,
    }));

    return {
      success: true,
      output: commits
        .map((c) => `${c.hash}  ${c.message}  (${c.author}, ${c.date})`)
        .join("\n"),
      message: `Showing last ${commits.length} commits`,
      data: { type: "log", commits },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git log failed",
    };
  }
}

// ── BRANCH
async function gitBranch(
  operation: string,
  branchName: string,
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  const git = getGit();
  try {
    if (operation === "list") {
      onProgress("⎇  Listing branches...");
      const branches = await git.branchLocal();
      return {
        success: true,
        output: branches.all.join("\n"),
        message: `Found ${branches.all.length} branch(es)`,
        data: {
          type: "branches",
          branches: branches.all,
          current: branches.current,
        },
      };
    }

    if (operation === "create") {
      onProgress(`⎇  Creating branch ${branchName}...`);
      await git.checkoutLocalBranch(branchName);
      return {
        success: true,
        output: "",
        message: `Created and switched to branch: ${branchName}`,
      };
    }

    if (operation === "switch") {
      onProgress(`⎇  Switching to ${branchName}...`);
      await git.checkout(branchName);
      return {
        success: true,
        output: "",
        message: `Switched to branch: ${branchName}`,
      };
    }

    if (operation === "delete") {
      onProgress(`⎇  Deleting branch ${branchName}...`);
      await git.deleteLocalBranch(branchName);
      return {
        success: true,
        output: "",
        message: `Deleted branch: ${branchName}`,
      };
    }

    return {
      success: false,
      output: "",
      message: `Unknown branch operation: ${operation}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git branch failed",
    };
  }
}

// ── PUSH
async function gitPush(onProgress: GitProgressCallback): Promise<GitResult> {
  const git = getGit();
  try {
    onProgress("⎇  Running safety check...");
    const safetyResult = await safetyCheck(onProgress);
    if (!safetyResult.success) return safetyResult;

    onProgress("⎇  Pushing to remote...");
    const status = await git.status();
    await git.push("origin", status.current ?? "main");

    return {
      success: true,
      output: "",
      message: `Pushed to origin/${status.current}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git push failed",
    };
  }
}

// ── PULL
async function gitPull(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("⎇  Pulling from remote...");
  const git = getGit();
  try {
    const result = await git.pull();
    const summary = result.summary;
    return {
      success: true,
      output: `${summary.changes} change(s), ${summary.insertions} insertion(s), ${summary.deletions} deletion(s)`,
      message: "Pulled from remote successfully",
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git pull failed",
    };
  }
}

// ── DIFF
async function gitDiff(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("⎇  Reading changes...");
  const git = getGit();
  try {
    const diff = await git.diff();
    if (!diff.trim()) {
      return {
        success: true,
        output: "No unstaged changes.",
        message: "Diff complete",
      };
    }
    return {
      success: true,
      output: diff,
      message: "Diff complete",
      data: { type: "diff" },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git diff failed",
    };
  }
}

// ── UNDO
async function gitUndo(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("⎇  Undoing last commit...");
  const git = getGit();
  try {
    await git.reset(["--soft", "HEAD~1"]);
    return {
      success: true,
      output: "",
      message: "Last commit undone — changes preserved in working tree",
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "git undo failed",
    };
  }
}

// ── SAFETY CHECK
async function safetyCheck(
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  onProgress("⎇  Scanning for issues...");
  const git = getGit();
  try {
    const diff = await git.diff(["HEAD"]);
    const status = await git.status();
    const issues: string[] = [];

    const secretPatterns = [
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /password\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i,
      /GROQ_API_KEY\s*=\s*[^$\n]+/,
      /sk-[a-zA-Z0-9]{20,}/,
      /gsk_[a-zA-Z0-9]{20,}/,
    ];

    secretPatterns.forEach((pattern) => {
      if (pattern.test(diff)) {
        issues.push("Possible secret or API key detected in diff");
      }
    });

    status.files.forEach((f) => {
      if (f.path.endsWith(".env")) issues.push(`.env file staged: ${f.path}`);
      if (f.path.includes("node_modules"))
        issues.push(`node_modules staged: ${f.path}`);
    });

    if (diff.includes("console.log")) {
      issues.push("console.log statements found in changes");
    }

    return {
      success: true,
      output: issues.length === 0 ? "clean" : issues.join("\n"),
      message:
        issues.length === 0
          ? "Safe to push"
          : `${issues.length} issue(s) found`,
      data: { type: "safety", issues },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "safety check failed",
    };
  }
}

// ── STANDUP GENERATOR
async function gitStandup(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("⎇  Reading yesterday's commits...");
  const git = getGit();
  try {
    const log = await git.log({
      "--since": "yesterday",
      "--until": "now",
    } as never);

    if (log.all.length === 0) {
      return {
        success: true,
        output: "No commits found since yesterday.",
        message: "Standup generated",
      };
    }

    const commits = log.all
      .map((c) => `- ${c.message} (${c.author_name})`)
      .join("\n");

    onProgress("⎇  AI is writing your standup...");
    const standup = await groqSummarize(
      `These are my git commits from yesterday/today:\n\n${commits}`,
      `You are a helpful assistant. Generate a concise daily standup update based on these commits.
Format it as:
✅ What I did:
[bullet points of completed work]

🔄 What I'm doing today:
[infer from the work pattern]

Write in first person. Be concise. Max 10 lines total. No extra commentary.`,
    );

    return {
      success: true,
      output: standup,
      message: "Standup generated from your commits",
      data: { type: "standup" },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "standup failed",
    };
  }
}

// ── PR DESCRIPTION
async function gitPRDescription(
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  const git = getGit();
  try {
    onProgress("⎇  Finding commits since main...");
    const log = await git.log(["main..HEAD"]);

    if (log.all.length === 0) {
      return {
        success: false,
        output: "",
        message:
          "No commits found ahead of main. Make sure you're on a feature branch.",
      };
    }

    onProgress("⎇  Reading diff from main...");
    const diff = await git.diff(["main..HEAD", "--stat"]);
    const commits = log.all.map((c) => `- ${c.message}`).join("\n");

    onProgress("⎇  AI is writing your PR description...");
    const pr = await groqSummarize(
      `Commits:\n${commits}\n\nFiles changed:\n${diff}`,
      `You are a senior developer. Write a professional GitHub PR description.
Format:
## What changed
[clear bullet points of changes]

## Why
[brief reason for the change]

## How to test
[simple test steps]

Be concise and specific. No filler text.`,
    );

    return {
      success: true,
      output: pr,
      message: "PR description generated",
      data: { type: "pr" },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "PR description failed",
    };
  }
}

// ── STASH MANAGER
async function gitStashList(
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  onProgress("⎇  Reading stashes...");
  const git = getGit();
  try {
    const stashList = await git.stashList();

    if (stashList.all.length === 0) {
      return {
        success: true,
        output: "No stashes found.",
        message: "No stashes",
        data: { type: "stashes", stashes: [] },
      };
    }

    onProgress("⎇  AI is summarizing stash contents...");
    const stashes = await Promise.all(
      stashList.all.slice(0, 5).map(async (s, i) => {
        const stashDiff = await git
          .show([`stash@{${i}}`, "--stat"])
          .catch(() => "");
        const summary = stashDiff
          ? await groqSummarize(
              `Stash contents:\n${stashDiff}`,
              "Summarize what code changes are in this git stash in one short sentence. Be specific about files/features.",
            )
          : "No diff available";
        return { index: i, message: s.message, summary: summary.trim() };
      }),
    );

    return {
      success: true,
      output: stashes
        .map((s) => `[${s.index}] ${s.message}\n    ${s.summary}`)
        .join("\n\n"),
      message: `Found ${stashes.length} stash(es)`,
      data: { type: "stashes", stashes },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "stash list failed",
    };
  }
}

// ── STALE BRANCHES
async function gitStaleBranches(
  daysThreshold: number,
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  onProgress("⎇  Scanning branches for last activity...");
  const git = getGit();
  try {
    const branches = await git.branchLocal();
    const now = Date.now();
    const stale: { name: string; lastCommit: string; daysAgo: number }[] = [];

    for (const branch of branches.all) {
      if (branch === branches.current) continue;
      const log = await git.log({ maxCount: 1, [branch]: null } as never);
      if (log.latest) {
        const lastDate = new Date(log.latest.date).getTime();
        const daysAgo = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        if (daysAgo >= daysThreshold) {
          stale.push({ name: branch, lastCommit: log.latest.message, daysAgo });
        }
      }
    }

    stale.sort((a, b) => b.daysAgo - a.daysAgo);

    return {
      success: true,
      output: stale
        .map((b) => `${b.name}  •  last commit ${b.daysAgo} days ago`)
        .join("\n"),
      message: `Found ${stale.length} stale branch(es) older than ${daysThreshold} days`,
      data: { type: "stale", branches: stale },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "stale branch scan failed",
    };
  }
}

// fetch remote
async function gitRemote(onProgress: GitProgressCallback): Promise<GitResult> {
  onProgress("🐼  Fetching remote info...");
  const git = getGit();
  try {
    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      return { success: false, output: "", message: "No remotes configured." };
    }
    const lines = remotes.map(
      (r) =>
        `${r.name}  →  fetch: ${r.refs.fetch ?? "—"}  push: ${r.refs.push ?? "—"}`,
    );
    return {
      success: true,
      output: lines.join("\n"),
      message: `Found ${remotes.length} remote(s)`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: error.message ?? "remote fetch failed",
    };
  }
}

// ── MAIN EXECUTOR
export async function executeGit(
  params: Record<string, string>,
  onProgress: GitProgressCallback,
): Promise<GitResult> {
  const { operation, message, branch, count, days } = params;

  switch (operation) {
    case "status":
      return gitStatus(onProgress);
    case "commit":
      return gitCommit(message ?? "auto", onProgress);
    case "log":
      return gitLog(parseInt(count ?? "10"), onProgress);
    case "branch":
      return gitBranch(params["sub"] ?? "list", branch ?? "", onProgress);
    case "push":
      return gitPush(onProgress);
    case "pull":
      return gitPull(onProgress);
    case "diff":
      return gitDiff(onProgress);
    case "undo":
      return gitUndo(onProgress);
    case "safety":
      return safetyCheck(onProgress);
    case "standup":
      return gitStandup(onProgress);
    case "pr":
      return gitPRDescription(onProgress);
    case "stash":
      return gitStashList(onProgress);
    case "remote":
      return gitRemote(onProgress);
    case "stale":
      return gitStaleBranches(parseInt(days ?? "30"), onProgress);
    default:
      return {
        success: false,
        output: "",
        message: `Unknown git operation: ${operation}`,
      };
  }
}
