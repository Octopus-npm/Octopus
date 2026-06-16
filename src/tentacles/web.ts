import path from "path";
import os from "os";
import fs from "fs/promises";
import { chromium, Browser } from "playwright";
import Groq from "groq-sdk";
import { config } from "../config/keys.js";
import https from "https";

// ── Result type

export interface WebResult {
  success: boolean;
  output: string;
  message: string;
}

// ── Browser singleton — stays alive across commands
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// ── Anti-bot helpers
async function createStealthPage(browser: Browser) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const page = await context.newPage();

  // Remove automation markers
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  return { page, context };
}

// ── Path helper

function expandHome(filePath: string): string {
  const home = os.homedir();
  if (os.platform() === "win32") {
    return filePath
      .replace(/^~[/\\]/, home + "\\")
      .replace(/^~$/, home)
      .replace(/%USERPROFILE%/gi, home)
      .replace(/\//g, "\\");
  }
  return filePath.replace(/^~\//, home + "/").replace(/^~$/, home);
}

// ── Scrape

async function scrape(url: string): Promise<WebResult> {
  let page;
  let context;

  try {
    const browser = await getBrowser();
    ({ page, context } = await createStealthPage(browser));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Extract clean readable text
    const content = await page.evaluate(() => {
      // Remove noise elements
      const noise = document.querySelectorAll(
        "script, style, nav, footer, header, iframe, noscript, [aria-hidden='true']",
      );
      noise.forEach((el) => el.remove());

      // Get main content
      const main =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector(".content") ||
        document.body;

      return main?.innerText ?? document.body.innerText;
    });

    // Trim and limit output
    const cleaned = content
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 3000);

    await context.close();

    return {
      success: true,
      output: cleaned,
      message: `Scraped: ${url}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (context) await context.close().catch(() => {});
    return {
      success: false,
      output: "",
      message: `Failed to scrape: ${error.message ?? "unknown error"}`,
    };
  }
}

// ── Screenshot

async function screenshot(
  url: string,
  savePath: string,
  onProgress?: (text: string) => void,
): Promise<WebResult> {
  let context;

  try {
    const browser = await getBrowser();
    const result = await createStealthPage(browser);
    const page = result.page;
    context = result.context;

    onProgress?.("Navigating to page...");
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    onProgress?.("Taking screenshot...");
    const resolvedPath = expandHome(savePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await page.screenshot({ path: resolvedPath, fullPage: true });

    await context.close();

    return {
      success: true,
      output: resolvedPath,
      message: `Screenshot saved to ${savePath}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (context) await context.close().catch(() => {});
    return {
      success: false,
      output: "",
      message: `Screenshot failed: ${error.message ?? "unknown error"}`,
    };
  }
}

// ── Summarize

async function summarize(
  url: string,
  onProgress?: (text: string) => void,
): Promise<WebResult> {
  onProgress?.("Fetching page...");
  const scraped = await scrape(url);

  if (!scraped.success) return scraped;

  onProgress?.("Summarizing with AI...");

  try {
    const groq = new Groq({ apiKey: config.groq.apiKey });

    const response = await groq.chat.completions.create({
      model: config.groq.model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Summarize the following webpage content in clear bullet points. Be concise — max 10 bullets. Focus on the most important information.",
        },
        {
          role: "user",
          content: `Summarize this page content:\n\n${scraped.output}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const summary =
      response.choices[0].message.content ?? "Could not generate summary.";

    return {
      success: true,
      output: summary,
      message: `Summarized: ${url}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: `Summarization failed: ${error.message ?? "unknown error"}`,
    };
  }
}

// ── Web Search
async function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          resolve(res.headers.location);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function resolveGoogleNewsUrl(encodedUrl: string): Promise<string> {
  try {
    // Google News article URLs are in <link> tag after the <guid>
    // Try to resolve by hitting the URL and getting the Location header
    return new Promise((resolve) => {
      https
        .get(
          encodedUrl,
          { headers: { "User-Agent": "Mozilla/5.0" } },
          (res) => {
            if (res.headers.location) {
              resolve(res.headers.location);
            } else {
              resolve(encodedUrl);
            }
            res.destroy();
          }
        )
        .on("error", () => resolve(encodedUrl));
    });
  } catch {
    return encodedUrl;
  }
}

async function search(query: string): Promise<WebResult> {
  try {
    // Fetch RSS directly with Node.js https — no Playwright needed
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const xml = await fetchUrl(rssUrl);

    // Parse items from XML string
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    const rawResults = itemMatches.slice(0, 5).map((item) => {
      const title = item
        .match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?.trim() ?? item.match(/<title>(.*?)<\/title>/)?.[1]?.trim() ?? "";

      const source = item
        .match(/<source[^>]*>(.*?)<\/source>/)?.[1]
        ?.trim() ?? "";

      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";

      // Real link is in <link> tag — it's between </guid> and next tag
      const link =
        item.match(/<link\/?>(.*?)\n/)?.[1]?.trim() ??
        item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ??
        "";

      return { title, source, pubDate, link };
    });

    // Resolve real URLs by following redirects
    const results = await Promise.all(
      rawResults.map(async (r) => {
        const resolvedLink = r.link ? await resolveGoogleNewsUrl(r.link) : "";
        return { ...r, link: resolvedLink };
      })
    );

    if (results.length === 0) {
      return {
        success: false,
        output: "",
        message: `No results found for "${query}"`,
      };
    }

    const formatted = results
      .map((r, i) => {
        const cleanDate = r.pubDate
          ? new Date(r.pubDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        return `${i + 1}. ${r.title}\n   📰 ${r.source}  •  ${cleanDate}\n   🔗 ${r.link}`;
      })
      .join("\n\n");

    return {
      success: true,
      output: formatted,
      message: `Top ${results.length} results for "${query}"`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: `Search failed: ${error.message ?? "unknown error"}`,
    };
  }
}

// ── Main executor
export async function executeWeb(
  params: Record<string, string>,
  onProgress?: (text: string) => void,
): Promise<WebResult> {
  const { operation, url, query, savePath } = params;

  switch (operation) {
    case "scrape":
      if (!url)
        return { success: false, output: "", message: "No URL provided." };
      onProgress?.("Fetching page...");
      return scrape(url);

    case "screenshot":
      if (!url)
        return { success: false, output: "", message: "No URL provided." };
      return screenshot(
        url,
        savePath ?? "~/Desktop/screenshot.png",
        onProgress,
      );

    case "summarize":
      if (!url)
        return { success: false, output: "", message: "No URL provided." };
      return summarize(url, onProgress);

    case "search":
      if (!query)
        return {
          success: false,
          output: "",
          message: "No search query provided.",
        };
      onProgress?.("Searching the web...");
      return search(query);

    default:
      return {
        success: false,
        output: "",
        message: `Unknown web operation: ${operation}`,
      };
  }
}
