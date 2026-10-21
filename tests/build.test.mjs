import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { buildSite, pages, publicAssets } from "../scripts/build.mjs";
import { serve } from "../scripts/serve.mjs";
test("build only includes public allowlist, not internal docs, reference boards or secrets", async () => {
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
  for (const page of ["index.html", "case-study.html"]) {
    const html = await readFile(`dist/${page}`, "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    const measurementId = process.env.GA_MEASUREMENT_ID || "G-MMZS9QVW5F";
    assert.equal(
      [...html.matchAll(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/g)]
        .length,
      1,
    );
    assert(head.includes(`gtag/js?id=${measurementId}`));
    assert(head.includes(`gtag('config', '${measurementId}')`));
    assert(head.includes("window.dataLayer = window.dataLayer || []"));
    // The tag only loads when src/consent.ts calls window.arnxAnalytics.load().
    assert(head.includes(`id: '${measurementId}'`));
    assert.match(head, /load: function \(\) \{/);
    assert(head.includes("ad_storage: 'denied'"));
    assert(!html.includes("gtm.js"));
    assert(!html.includes("../docs"));
    assert.match(html, /54/);
    for (const match of html.matchAll(
      /(?:href|src)="(\.\/[^"#]+)(?:#[^"]*)?"/g,
    )) {
      await readFile(`dist/${match[1].slice(2)}`);
    }
  }
});

// The arnx CLI links to https://arnx.dev/terms, https://arnx.dev/privacy and
// https://arnx.dev/privacy#telemetry: those paths and that anchor must work.
test("terms and privacy pages are built, filled in, unlinked and not indexed", async () => {
  await buildSite();
  assert(pages.includes("terms.html") && pages.includes("privacy.html"));
  for (const page of ["terms.html", "privacy.html"]) {
    const html = await readFile(`dist/${page}`, "utf8");
    const name = page.replace(".html", "");
    assert.match(html, /^<!doctype html>\s*<!--\s*DRAFT:/);
    assert.equal(html.match(/<h1>/g).length, 1);
    assert(
      html.includes(`<link rel="canonical" href="https://arnx.dev/${name}"`),
    );
    assert(html.includes("gtag/js?id="));
    // Every owner blank is filled.
    assert.deepEqual(
      html.replace(/<!--[\s\S]*?-->/g, "").match(/\[[A-Z][^\]]*\]/g),
      null,
      `${page} has a blank left`,
    );
    assert(html.includes("ARNX<br />"), `${page} lacks the contact block`);
    assert(html.includes('href="mailto:info@arnx.dev"'));
    for (const match of html.matchAll(
      /(?:href|src)="(\.\/[^"#]+)(?:#[^"]*)?"/g,
    ))
      await readFile(`dist/${match[1].slice(2)}`);
  }
  const privacy = await readFile("dist/privacy.html", "utf8");
  assert.equal(privacy.match(/id="telemetry"/g).length, 1);
  // Drafts: reached only by the CLI's direct links, so no page links them and search engines skip them.
  for (const page of ["terms.html", "privacy.html"]) {
    const html = await readFile(`dist/${page}`, "utf8");
    assert(
      html.includes('<meta name="robots" content="noindex" />'),
      `${page} lacks noindex`,
    );
  }
  for (const page of ["index.html", "case-study.html"]) {
    const html = await readFile(`dist/${page}`, "utf8");
    assert(
      !html.includes("terms.html") && !html.includes("privacy.html"),
      `${page} links a draft`,
    );
  }
});

test("local preview serves /terms and /privacy without the .html, as GitHub Pages does", async () => {
  await buildSite();
  const server = serve(0);
  await new Promise((resolve) =>
    server.listening ? resolve() : server.once("listening", resolve),
  );
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [path, heading] of [
      ["/terms", "Terms of Service"],
      ["/privacy", "Privacy Policy"],
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
