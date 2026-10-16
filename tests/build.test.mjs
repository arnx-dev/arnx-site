import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { buildSite, publicAssets } from "../scripts/build.mjs";
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
      [
        ...html.matchAll(
          /src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/g,
        ),
      ].length,
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
