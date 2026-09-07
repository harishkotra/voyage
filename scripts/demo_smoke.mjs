import { createRequire } from "module";
const require = createRequire(
  "/Users/shk/experiments/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/",
);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:4173";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. Open in demo mode via URL param
  await page.goto(`${BASE}/?demo=1`, { waitUntil: "networkidle" });
  await page.waitForSelector(".start-title");
  const demoChecked = await page.isChecked(".demo-toggle input");
  console.log("✓ demo toggle auto-checked via ?demo=1:", demoChecked);

  // 2. Start (fantasy default)
  await page.click(".start-button");
  await page.waitForSelector(".dm-prose", { timeout: 5000 });
  console.log("✓ opening narration (demo, instant):", (await page.textContent(".dm-prose")).slice(0, 50));

  // 3. Take the sword → inventory updates
  await page.fill('input[name="action"]', "take the sword");
  await page.press('input[name="action"]', "Enter");
  await page.waitForSelector(".inventory-item", { timeout: 5000 });
  console.log("✓ inventory after taking sword:", await page.textContent(".inventory-item"));

  // 4. Attack → HP drops
  await page.fill('input[name="action"]', "attack the goblin");
  await page.press('input[name="action"]', "Enter");
  await page.waitForFunction(
    () => document.querySelector(".hp-label")?.textContent?.includes("70"),
    { timeout: 5000 },
  );
  console.log("✓ HP dropped to 70 after fight:", await page.textContent(".hp-label"));

  // 5. Search chest → YOU WIN
  await page.fill('input[name="action"]', "search the chest");
  await page.press('input[name="action"]', "Enter");
  await page.waitForSelector(".gameover-card", { timeout: 5000 });
  console.log("✓ YOU WIN overlay:", await page.textContent(".gameover-title"));

  // 6. Play again → lose path
  await page.click(".start-button");
  await page.waitForSelector(".start-title", { timeout: 5000 });
  await page.click(".start-button");
  await page.waitForSelector(".dm-prose", { timeout: 5000 });
  await page.fill('input[name="action"]', "give up");
  await page.press('input[name="action"]', "Enter");
  await page.waitForSelector(".gameover-card", { timeout: 5000 });
  console.log("✓ GAME OVER overlay:", await page.textContent(".gameover-title"));

  console.log("\nConsole/page errors:", errors.length ? errors : "none");
  await browser.close();
}

main().catch((e) => {
  console.error("DEMO SMOKE TEST FAILED:", e.message);
  process.exit(1);
});
