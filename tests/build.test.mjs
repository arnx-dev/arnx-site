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
test("terms and privacy pages are built, linked and marked as drafts", async () => {
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
    for (const placeholder of [
      "[LEGAL ENTITY NAME]",
      "[CONTACT EMAIL]",
      "[POSTAL ADDRESS]",
      "[EFFECTIVE DATE]",
    ])
      assert(html.includes(placeholder), `${page} lacks ${placeholder}`);
    for (const match of html.matchAll(
      /(?:href|src)="(\.\/[^"#]+)(?:#[^"]*)?"/g,
    ))
      await readFile(`dist/${match[1].slice(2)}`);
  }
  const terms = await readFile("dist/terms.html", "utf8");
  for (const placeholder of ["[GOVERNING LAW / COURTS]", "[REFUND POLICY]"])
    assert(terms.includes(placeholder));
  const privacy = await readFile("dist/privacy.html", "utf8");
  assert.equal(privacy.match(/id="telemetry"/g).length, 1);
  for (const page of ["index.html", "case-study.html"]) {
    const html = await readFile(`dist/${page}`, "utf8");
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    assert(footer.includes('href="./terms.html"'));
    assert(footer.includes('href="./privacy.html"'));
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
