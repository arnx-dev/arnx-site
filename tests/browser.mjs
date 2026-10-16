import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { serve } from "../scripts/serve.mjs";
import { buildSite } from "../scripts/build.mjs";
await buildSite();
await mkdir("artifacts", { recursive: true });
const server = serve(0);
await new Promise((resolve) =>
  server.listening ? resolve() : server.once("listening", resolve),
);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  // Keep browser tests offline for analytics; inspect the local event queue.
  await context.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ body: "", contentType: "application/javascript" }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Overflow at ${width}`,
    );
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(
      await page.evaluate(() =>
        [...document.images]
          .filter((image) => image.loading !== "lazy")
          .every((image) => image.complete && image.naturalWidth > 0),
      ),
      true,
    );
    if (width === 1440 || width === 390) {
      await page.evaluate(async () => {
        for (const image of document.images) image.loading = "eager";
        await Promise.all(
          [...document.images].map((image) => image.decode().catch(() => {})),
        );
      });
      await page.screenshot({
        path: `artifacts/landing-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({ path: `artifacts/hero-${width}.png` });
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      accessibility.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `Accessibility ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator(".skip-link")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Open navigation" }).click();
  assert.equal(await page.locator("#mobile-nav").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#mobile-nav").isVisible(), false);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("#mobile-nav a").first().click();
  assert.equal(await page.locator("#mobile-nav").isVisible(), false);
  await page.getByText("Does arnx fix my code?", { exact: true }).click();
  assert.equal(
    await page
      .locator("details")
      .filter({
        has: page.getByText("Does arnx fix my code?", { exact: true }),
      })
      .getAttribute("open"),
    "",
  );
  await page.getByRole("button", { name: "Copy workflow commands" }).click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /arnx check/,
  );
  await page.locator("#email").fill("dev@example.com");
  await page.locator("#project").fill("A Python project");
  await page.locator("#pilot-form button").click();
  assert.match(await page.locator("#form-status").innerText(), /not connected/);
  assert.match(
    await page.locator("#form-status a").getAttribute("href"),
    /^mailto:info@arnx.dev/,
  );
  const analytics = await page.evaluate(() => {
    window.dataLayer.length = 0;
    for (const selector of [
      ".nav-cta",
      '#mobile-nav a[href="#pilot"]',
      '.hero a[href="#pilot"]',
      '.faq a[href^="mailto:"]',
      "#pilot-form button",
      "#form-status a",
      ".direct-email a",
      'footer a[href^="mailto:"]',
      ".copy-button",
    ]) {
      const action = document.querySelector(selector);
      action.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
      action.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    }
    return window.dataLayer.map((args) => Array.from(args));
  });
  assert.equal(analytics.length, 8);
  assert(
    analytics.every(
      ([command, name]) => command === "event" && name === "pilot_click",
    ),
  );
  assert.deepEqual(
    analytics.map(([, , params]) => params.location),
    [
      "nav",
      "nav",
      "hero",
      "faq",
      "pilot_section",
      "pilot_section",
      "pilot_section",
      "footer",
    ],
  );
  assert(
    !/dev@example|info@arnx|Python project|subject=|body=/.test(
      JSON.stringify(analytics),
    ),
  );
  await page.evaluate(() => {
    delete window.gtag;
  });
  await page.locator('.hero a[href="#pilot"]').click();
  assert.equal(new URL(page.url()).hash, "#pilot");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  await page.goto(`${url}/case-study.html`);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations.length,
    0,
  );
  const caseStudyEvents = await page.evaluate(() => {
    window.dataLayer.length = 0;
    for (const action of document.querySelectorAll(
      'a[href$="#pilot"], footer a[href^="mailto:"]',
    )) {
      action.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
      action.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    }
    return window.dataLayer.map((args) => Array.from(args));
  });
  assert.deepEqual(
    caseStudyEvents.map(([, , params]) => params.location),
    ["nav", "nav", "case_study", "footer"],
  );
  // Rebuild with a mock-only endpoint, never send live mail.
  process.env.PILOT_ENDPOINT = "https://forms.example.test/pilot";
  await buildSite();
  let mode = "failure",
    count = 0;
  await page.route("https://forms.example.test/pilot", async (route) => {
    count++;
    assert.equal(route.request().method(), "POST");
    await route.fulfill({
      status: mode === "success" ? 200 : 502,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: mode === "success" }),
    });
  });
  await page.goto(url);
  await page.locator("#email").fill("dev@example.com");
  await page.locator("#pilot-form button").click();
  await page.waitForFunction(
    () => document.querySelector("#form-status").dataset.state === "error",
  );
  assert.equal(await page.locator("#email").inputValue(), "dev@example.com");
  mode = "success";
  await page.locator("#pilot-form button").click();
  await page.waitForFunction(
    () => document.querySelector("#form-status").dataset.state === "success",
  );
  assert.equal(await page.locator("#email").inputValue(), "");
  assert.equal(count, 2);
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: 5 viewport widths, WCAG AA axe scan, keyboard/menu, FAQ, copy, reduced motion, case study and form fallback/error/success.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  delete process.env.PILOT_ENDPOINT;
  await buildSite();
}
