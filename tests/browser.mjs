import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { serve } from "../scripts/serve.mjs";
import { buildSite, pages } from "../scripts/build.mjs";
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
    colorScheme: "light",
  });
  // Keep browser tests offline for analytics; inspect the local event queue.
  await context.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ body: "", contentType: "application/javascript" }),
  );
  // Cloudflare's country lookup: outside the EU, EEA and UK, so no banner here.
  await context.route("**/cdn-cgi/trace", (route) =>
    route.fulfill({ body: "h=arnx.dev\nloc=US\n", contentType: "text/plain" }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of pages) {
      await page.goto(`${url}/${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").count(), 1, route);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Overflow: ${route} at ${width}`,
      );
      if (width === 1440 || width === 320) {
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          `${route} at ${width}`,
        );
      }
      if (route === "index.html" && [1440, 390].includes(width)) {
        await page.locator(".hero-mascot").evaluate((image) => image.decode());
        await page.screenshot({
          path: `artifacts/landing-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  for (const width of [390, 320]) {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width, height: 844 });
    for (const route of pages) {
      await page.goto(`${url}/${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Dark overflow: ${route} at ${width}`,
      );
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).colorScheme,
        ),
        "dark",
      );
      if (width === 320) {
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          `Dark accessibility: ${route}`,
        );
      }
      if (
        ["index.html", "quickstart.html", "credits.html"].includes(route) &&
        width === 390
      ) {
        await page.screenshot({
          path: `artifacts/${route.replace(".html", "")}-dark-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  await page.keyboard.press("Enter");
  await page.locator(".menu-toggle").click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#mobile-nav").isVisible(), false);
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "menu-toggle",
  );
  await page.locator(".menu-toggle").click();
  await page.locator('#mobile-nav a[href="./index.html#how-it-works"]').click();
  assert.equal(await page.locator("#mobile-nav").isVisible(), false);
  await page.goto(`${url}/quickstart.html`);
  await page.locator('[data-copy="workflow-code"]').click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /arnx init[\s\S]+arnx setup[\s\S]+arnx accept[\s\S]+arnx check/,
  );
  assert.match(await page.locator("#copy-status").innerText(), /copied/);
  await page.evaluate(() => {
    window.dataLayer.length = 0;
  });
  await page.locator('[data-copy="install-code"]').click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "npm install -g @arnx-dev/arnx",
  );
  assert.match(await page.locator("#install-status").innerText(), /copied/);
  assert.equal(
    await page.evaluate(
      () =>
        window.dataLayer.filter(
          (args) => args[0] === "event" && args[1] === "install_copy",
        ).length,
    ),
    1,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.locator('[data-copy="workflow-code"]').click();
  assert.match(
    await page.locator("#copy-status").innerText(),
    /Copy unavailable/,
  );
  await page.goto(url);
  const events = await page.evaluate(() => {
    window.dataLayer.length = 0;
    const actions = [...document.querySelectorAll("a[data-event]")];
    for (const action of actions) {
      action.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
      action.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    }
    return {
      expected: actions.length,
      entries: window.dataLayer.map((args) => Array.from(args)),
    };
  });
  assert.equal(
    events.entries.length,
    events.expected,
    "each CTA fires exactly once",
  );
  assert(
    events.entries.every(
      ([command, event]) =>
        command === "event" &&
        [
          "github_click",
          "docs_click",
          "pilot_click",
          "cloud_click",
          "enterprise_click",
        ].includes(event),
    ),
  );
  assert(
    !/mailto|@|https:|subject=|body=|repo|source/.test(
      JSON.stringify(events.entries),
    ),
    "analytics contains only curated action metadata",
  );
  await page.evaluate(() => {
    delete window.gtag;
  });
  await page.locator('.hero a[data-event="docs_click"]').click();
  assert(new URL(page.url()).pathname.endsWith("quickstart.html"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  // Outside the EU, EEA and UK the tag loads after the page, with no banner.
  await page.goto(url);
  await page.waitForFunction(() =>
    document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
  );
  assert.equal(await page.locator(".consent").count(), 0);
  assert.equal(await page.locator(".consent-reopen").count(), 0);

  // In the EU, EEA and UK (and when the country is unknown) nothing loads before Accept.
  for (const trace of ["h=arnx.dev\nloc=DE\n", null]) {
    const eu = await browser.newContext();
    const tagRequests = [];
    await eu.route("https://www.googletagmanager.com/**", (route) => {
      tagRequests.push(route.request().url());
      return route.fulfill({ body: "", contentType: "application/javascript" });
    });
    await eu.route("**/cdn-cgi/trace", (route) =>
      trace
        ? route.fulfill({ body: trace, contentType: "text/plain" })
        : route.fulfill({ status: 404, body: "Not found" }),
    );
    const visitor = await eu.newPage();
    visitor.on("pageerror", (error) => errors.push(String(error)));
    for (const width of [1440, 320]) {
      await visitor.setViewportSize({ width, height: 800 });
      await visitor.goto(url);
      await visitor.locator(".consent").waitFor();
      assert.equal(
        await visitor.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Banner overflow at ${width}`,
      );
      assert.deepEqual(
        (
          await new AxeBuilder({ page: visitor })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations.map((v) => v.id),
        [],
        `Banner accessibility at ${width}`,
      );
    }
    assert.equal(
      await visitor.locator(".consent a").getAttribute("href"),
      "./privacy.html#website",
    );
    await visitor.waitForTimeout(2000);
    assert.deepEqual(tagRequests, [], "the tag loaded before a choice");
    await visitor.getByRole("button", { name: "Reject" }).click();
    assert.equal(await visitor.locator(".consent").count(), 0);
    await visitor.reload();
    await visitor.waitForTimeout(2000);
    assert.equal(await visitor.locator(".consent").count(), 0);
    assert.deepEqual(tagRequests, [], "the tag loaded after Reject");
    // The footer's "Cookies" button asks again; Accept loads the tag.
    await visitor.getByRole("button", { name: "Cookies" }).click();
    assert.equal(
      await visitor.evaluate(() => document.activeElement.textContent),
      "Reject",
    );
    await visitor.getByRole("button", { name: "Accept" }).click();
    await visitor.waitForFunction(() =>
      document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
    );
    assert.equal(tagRequests.length, 1);
    await visitor.goto(`${url}/privacy`);
    await visitor.waitForTimeout(2000);
    assert.equal(await visitor.locator(".consent").count(), 0);
    assert.equal(tagRequests.length, 2, "an accepted choice is remembered");
    // Reject after Accept turns the tag off and deletes its cookies.
    await visitor.evaluate(() => {
      document.cookie = "_ga=GA1.1.test; path=/";
    });
    await visitor.getByRole("button", { name: "Cookies" }).click();
    await visitor.getByRole("button", { name: "Reject" }).click();
    assert.deepEqual(
      await visitor.evaluate(() => [
        document.cookie.includes("_ga="),
        window["ga-disable-" + window.arnxAnalytics.id],
      ]),
      [false, true],
    );
    await eu.close();
  }

  assert.deepEqual(errors, []);
  console.log(
    `Browser checks passed: ${pages.length} pages × 5 widths; light/dark phone layouts; WCAG AA scans at desktop/mobile; navigation, clipboard success/failure, CTA events, reduced motion, and consent behavior.`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
