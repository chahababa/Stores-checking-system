import { chromium } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const role = process.argv[2];
const supportedRoles = new Set(["owner", "leader"]);

if (!role || !supportedRoles.has(role)) {
  console.error("Usage: node scripts/create-playwright-storage-state.mjs <owner|leader>");
  process.exit(1);
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const authDir = path.resolve("playwright/.auth");
const outputPath = path.join(authDir, `${role}.json`);

await mkdir(authDir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
const rl = readline.createInterface({ input, output });

try {
  console.log("");
  console.log(`Opening ${baseURL}/login for ${role} storage state capture...`);
  console.log("Complete the Google login flow in the opened browser window.");
  console.log("Wait until you are back inside the app, then press Enter here to save the session.");
  console.log("");

  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await rl.question("Press Enter after the role has finished signing in...");

  const currentUrl = page.url();
  if (!currentUrl.startsWith(baseURL) || currentUrl.includes("/login")) {
    throw new Error(
      `The browser is still not on an authenticated app page. Current URL: ${currentUrl}`,
    );
  }

  await page.waitForLoadState("networkidle");
  await context.storageState({ path: outputPath });

  console.log("");
  console.log(`Saved ${role} storage state to: ${outputPath}`);
  console.log(`Use it with PLAYWRIGHT_${role.toUpperCase()}_STORAGE_STATE=${outputPath}`);
  console.log("");
} finally {
  await rl.close();
  await browser.close();
}
