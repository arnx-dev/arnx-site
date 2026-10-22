import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { buildSite, pages, publicAssets } from "../scripts/build.mjs";
import { serve } from "../scripts/serve.mjs";

test("public build: metadata, licensing, real destinations, and all internal fragments resolve", async () => {
  await buildSite();
  assert.equal((await readFile("dist/CNAME", "utf8")).trim(), "arnx.dev");
  const files = await readdir("dist", { recursive: true });
  assert(
    !files.some((file) =>
      /\.md$|docs|reference|brandguide|draft|\.env|\.map$|worker/.test(file),
    ),
  );
  assert.deepEqual(
    (await readdir("dist/brand")).sort(),
    [...publicAssets].sort(),
  );
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  assert.match(
    await readFile("dist/robots.txt", "utf8"),
    /Sitemap: https:\/\/arnx.dev\/sitemap.xml/,
  );
  for (const page of pages) {
    const html = await readFile(`dist/${page}`, "utf8");
    assert.equal((html.match(/<h1(?:\s[^>]*)?>/g) || []).length, 1, page);
    assert(
      !/\{\{[A-Z_]+\}\}|\bMIT\b|Private developer pilot|Request a pilot invite|noindex/.test(
        html,
      ),
      page,
    );
    assert(
      html.includes('href="./privacy.html"') &&
        html.includes('href="./security.html"') &&
        html.includes('href="./license.html"'),
      page,
    );
    assert(
      html.includes('name="twitter:card"') &&
        html.includes('property="og:image"'),
      page,
    );
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert(sitemap.includes(`<loc>${canonical}</loc>`), page);
    const schema = JSON.parse(
      html.match(/type="application\/ld\+json">([^<]+)<\/script>/)[1],
    );
    assert.equal(schema.url, canonical);
    assert.equal(schema.name, title);
    assert.equal(schema["@type"], "WebPage");
    assert(!schema.aggregateRating && !schema.offers);
    const measurementId = process.env.GA_MEASUREMENT_ID || "G-MMZS9QVW5F";
    assert.equal(
      [...html.matchAll(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/g)]
        .length,
      1,
      page,
    );
    assert(html.includes(`gtag('config', '${measurementId}')`));
    assert(html.includes("ad_storage: 'denied'"));
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const target = new URL(href, `https://arnx.dev/${page}`);
      let filename =
        target.pathname === "/" ? "index.html" : target.pathname.slice(1);
      if (pages.includes(`${filename}.html`)) filename += ".html";
      const content = await readFile(`dist/${filename}`, "utf8");
      if (target.hash)
        assert(
          content.includes(`id="${target.hash.slice(1)}"`),
          `${page}: broken ${href}`,
        );
    }
  }
  assert.equal(
    await readFile("dist/licenses/Apache-2.0.txt", "utf8"),
    await readFile("LICENSE", "utf8"),
  );
  assert.match(
    await readFile("LICENSE", "utf8"),
    /Apache License[\s\S]+Version 2.0, January 2004/,
  );
  assert.equal(
    JSON.parse(await readFile("package.json", "utf8")).license,
    "Apache-2.0",
  );
  assert.equal(
    JSON.parse(await readFile("package-lock.json", "utf8")).packages[""]
      .license,
    "Apache-2.0",
  );
  const privacy = await readFile("dist/privacy.html", "utf8");
  assert.equal(privacy.match(/id="telemetry"/g).length, 1);
  assert.match(privacy, /CLI usage telemetry is off by default/);
  const quickstart = await readFile("dist/quickstart.html", "utf8");
  assert(
    quickstart.includes('id="install-code">npm install -g @arnx-dev/arnx'),
  );
  assert(
    quickstart.includes("https://github.com/arnx-dev/arnx/releases/latest"),
  );
  assert(quickstart.includes("SHA256SUMS"));
  assert(!quickstart.includes("Public CLI distribution is pending"));
  for (const name of [
    "privacy",
    "security",
    "product",
    "credits",
    "quickstart",
  ]) {
    const content = await readFile(`dist/${name}.html`, "utf8");
    assert(
      content.includes("Tool calls, Docker tests, the before/after check"),
      `${name}: local execution`,
    );
    assert(
      content.includes("then passes them to its model providers"),
      `${name}: Cloud data flow`,
    );
  }
  const credits = await readFile("dist/credits.html", "utf8");
  assert(credits.includes('rel="canonical" href="https://arnx.dev/credits"'));
  assert(credits.includes("<title>Cloud credits: arnx</title>"));
  assert(!sitemap.includes("https://arnx.dev/credits.html"));
  assert(credits.includes('href="/terms"'));
  assert(!/<form\b|<iframe\b/i.test(credits), "credits is informational only");
  assert(
    !/href="[^"]*(?:billing\/topup|checkout\.stripe\.com)/i.test(credits),
    "top-ups must use the user's signed CLI link",
  );
  assert.deepEqual(
    [...credits.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]),
    ["./assets/app.js"],
    "credits uses only the shared application script",
  );
});

test("extensionless CLI links work and missing pages return 404", async () => {
  const server = serve(0);
  await new Promise((resolve) =>
    server.listening ? resolve() : server.once("listening", resolve),
  );
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [path, heading] of [
      ["/terms", "Terms of Service"],
      ["/privacy", "Privacy Policy"],
      ["/credits", "arnx Cloud credits"],
      ["/credits.html", "arnx Cloud credits"],
      ["/terms.html", "Terms of Service"],
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get("content-type"), /^text\/html/);
      assert((await response.text()).includes(`<h1>${heading}</h1>`));
    }
    assert.equal((await fetch(`${base}/no-such-page`)).status, 404);
    assert.equal((await fetch(`${base}/brand/missing.webp`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
