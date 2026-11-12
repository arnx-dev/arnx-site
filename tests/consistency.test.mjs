// Documentation consistency: one release version, one account of where
// accepted tests live, and the current exit codes, on every built page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSite, allPages } from "../scripts/build.mjs";
import { release } from "../scripts/release.mjs";
import { productDescription } from "../scripts/discovery.mjs";

const text = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

test("every page agrees with the release record", async () => {
  await buildSite();
  const version = release.cli.version;
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, version, "package.json follows src/release.json");
  for (const file of [...allPages, "llms.txt", "llms-full.txt"]) {
    const page = text(await readFile(`dist/${file}`, "utf8"));
    // A page may name an older version only as history ("with arnx 0.1.7 on
    // 2026-11-03"), never as the version it documents.
    for (const [phrase] of page.matchAll(
      /(?:covers|documents|Install|against|Latest release:|for) arnx \d+\.\d+\.\d+/g,
    ))
      assert(phrase.endsWith(` ${version}`), `${file}: "${phrase}"`);
    assert(
      !/accepted tests? (?:are|is) (?:added|copied|written) (?:to|into) (?:your|the project(?:'s|’s)) (?:own )?(?:test )?suite/i.test(
        page,
      ),
      `${file}: accepted tests live in .arnx/tests/, not the project suite`,
    );
    assert(
      !/1 confirmed findings|exits? 1 (?:when|if|on) (?:a )?confirmed/i.test(
        page,
      ),
      `${file}: confirmed findings do not fail a review since 0.1.9`,
    );
    assert(
      !/separate setup step is required|must run arnx setup (?:first|before)/i.test(
        page,
      ),
      `${file}: the first review sets up what it needs`,
    );
    assert(!/telemetry/i.test(page), `${file}: no telemetry copy on the site`);
  }
  const quickstart = text(await readFile("dist/quickstart.html", "utf8"));
  assert(quickstart.includes(`This guide covers arnx ${version}.`));
  assert(quickstart.includes(".arnx/tests/"));
  const home = await readFile("dist/index.html", "utf8");
  assert(home.includes(`arnx ${version} ·`));
  assert(
    home.includes(JSON.stringify(productDescription).slice(1, -1)),
    "the home page's structured data carries the product description",
  );
  assert(
    (await readFile("dist/llms.txt", "utf8")).includes(productDescription),
  );
});
