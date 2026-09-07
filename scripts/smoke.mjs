import { createRequire } from "module";
const require = createRequire(
  "/Users/shk/experiments/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/",
);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:4173";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

  // 1. Load start screen
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".start-title", { timeout: 8000 });
  console.log("✓ Start screen rendered:", await page.textContent(".start-title"));

  // 2. Start a fantasy game
  await page.click(".genre-card:has-text('Fantasy')");
  await page.click(".start-button");
  await page.waitForSelector(".dm-prose", { timeout: 60000 });
  const opening = await page.textContent(".dm-prose");
  console.log("✓ DM opening narration (first 80):", opening.slice(0, 80).replace(/\n/g, " "));

  // wait for inventory sidebar to populate from STATE line
  await page.waitForTimeout(500);
  const hpText = await page.textContent(".hp-label");
  console.log("✓ HP label:", hpText);

  // 3. Send a player action
  await page.fill('input[name="action"]', "look around for anything useful");
  await page.press('input[name="action"]', "Enter");
  await page.waitForFunction(
    () => document.querySelectorAll(".dm-block").length >= 2,
    { timeout: 60000 },
  );
  const dmBlocks = await page.locator(".dm-block").count();
  console.log("✓ DM responded, dm blocks:", dmBlocks);

  // 4. Check inventory list exists
  await page.waitForTimeout(400);
  const invItems = await page.locator(".inventory-item").count();
  console.log("✓ inventory items rendered:", invItems);

  // 4b. localStorage resume: reload mid-game and confirm it resumes
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".game-shell", { timeout: 8000 });
  const resumedBlocks = await page.locator(".dm-block").count();
  const resumedHp = await page.textContent(".hp-label");
  console.log("✓ resumed after reload — dm blocks:", resumedBlocks, "HP:", resumedHp);

  // 5. Hint button
  await page.click("button:has-text('Hint')");
  await page.waitForSelector(".hint-block", { timeout: 60000 });
  console.log("✓ hint shown:", (await page.textContent(".hint-text")).slice(0, 60));

  // 6. Restart
  await page.click("button:has-text('Restart')");
  await page.waitForSelector(".start-title", { timeout: 8000 });
  console.log("✓ Restart returns to start screen");

  const errors = logs.filter((l) => l.startsWith("[pageerror]") || l.startsWith("[error]"));
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await browser.close();
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e.message);
  process.exit(1);
});
