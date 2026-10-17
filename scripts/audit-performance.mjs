import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { mkdir, writeFile } from "node:fs/promises";
// Run after npm run build. Third-party responses are stubbed for comparable local payloads.
if (!/^[a-z0-9-]+$/.test(process.argv[2] || ""))
  throw new Error("Usage: node scripts/audit-performance.mjs <label>");
await mkdir("artifacts/performance", { recursive: true });
const server = serve(0);
await new Promise((r) => server.on("listening", r));
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
});
const results = [];
for (const [width, height, dpr] of [
  [1440, 1000, 1],
  [1440, 1000, 2],
  [390, 844, 3],
  [768, 1000, 2],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  await context.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.fulfill({ body: "", contentType: "application/javascript" }),
  );
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.lcp = [];
    new PerformanceObserver((l) =>
      window.lcp.push(
        ...l.getEntries().map((e) => ({
          time: e.startTime,
          element: e.element?.outerHTML.slice(0, 200),
        })),
      ),
    ).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const initial = await page.evaluate(() => ({
    images: [...document.images].map((i) => ({
      src: i.currentSrc.split("/").pop(),
      width: i.getBoundingClientRect().width,
      height: i.getBoundingClientRect().height,
      top: i.getBoundingClientRect().top,
      natural: i.naturalWidth,
      loading: i.loading,
    })),
    resources: performance.getEntriesByType("resource").map((r) => ({
      name: r.name.split("/").pop(),
      bytes: r.decodedBodySize,
    })),
    html: performance.getEntriesByType("navigation")[0].decodedBodySize,
    lcp: window.lcp,
  }));
  await page.evaluate(async () => {
    for (const i of document.images) i.loading = "eager";
    await Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    );
  });
  const full = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((r) => ({
      name: r.name.split("/").pop(),
      bytes: r.decodedBodySize,
    })),
  );
  await page.screenshot({
    path: `artifacts/performance/${process.argv[2]}-${width}-${dpr}.png`,
    fullPage: true,
  });
  results.push({ width, height, dpr, initial, full });
  await context.close();
}
await writeFile(
  `artifacts/performance/${process.argv[2]}.json`,
  JSON.stringify(results, null, 2),
);
await browser.close();
server.close();
