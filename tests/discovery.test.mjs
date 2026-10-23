import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectHtml } from "../scripts/verify-discovery.mjs";
import { robots } from "../scripts/discovery.mjs";
import { renderPage } from "../scripts/release.mjs";

test("discovery audit rejects conflicting canonical and indexing exclusions", async () => {
  const html = await renderPage(await readFile("src/quickstart.html", "utf8"));
  const url = "https://arnx.dev/quickstart.html";
  const valid = html.replace(
    "</head>",
    `<script type="application/ld+json">${JSON.stringify({ "@type": "WebPage", url })}</script></head>`,
  );
  inspectHtml(valid, url);
  for (const directive of [
    '<meta name="robots" content="noindex">',
    '<meta name="bingbot" content="none">',
    '<link rel="canonical" href="https://example.com/">',
  ]) {
    assert.throws(() =>
      inspectHtml(valid.replace("</head>", `${directive}</head>`), url),
    );
  }
  assert.throws(() =>
    inspectHtml(valid.replace(/<main[\s\S]*?<\/main>/, "<main></main>"), url),
  );
});
test("training permissions remain independent of public search access", () => {
  const blocked = robots({ GPTBot: "disallow", ClaudeBot: "disallow" });
  assert.match(blocked, /User-agent: \*\nAllow: \//);
  assert.match(blocked, /User-agent: GPTBot\nDisallow: \//);
  assert(!blocked.includes("OAI-SearchBot"));
  assert.throws(() => robots({ GPTBot: "invalid" }));
});
