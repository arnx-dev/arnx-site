import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pages } from "./build.mjs";
import { origin, robots } from "./discovery.mjs";
import { serve } from "./serve.mjs";

const attrs = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [
      m[1].toLowerCase(),
      m[2],
    ]),
  );
export function inspectHtml(html, canonical) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert(head, `${canonical}: missing head`);
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((m) =>
    attrs(m[0]),
  );
  const meta = (key) => {
    const matches = tags.filter((a) => a.name === key || a.property === key);
    assert.equal(matches.length, 1, `${canonical}: ${key} must occur once`);
    assert(matches[0].content?.trim(), `${canonical}: empty ${key}`);
    return matches[0].content;
  };
  const titles = [...head.matchAll(/<title>([^<]+)<\/title>/gi)];
  assert.equal(titles.length, 1, `${canonical}: title`);
  const title = titles[0][1];
  const description = meta("description");
  assert.deepEqual(
    tags
      .filter((a) => a.rel?.split(/\s+/).includes("canonical"))
      .map((a) => a.href),
    [canonical],
  );
  for (const a of tags)
    if (/robots|googlebot|bingbot/i.test(a.name || ""))
      assert(
        !/noindex|none|nofollow|nosnippet/i.test(a.content),
        `${canonical}: restrictive meta`,
      );
  assert.equal(meta("og:url"), canonical);
  assert.equal(meta("og:title"), title);
  assert.equal(meta("og:description"), description);
  assert.equal(meta("og:type"), "website");
  assert.equal(meta("og:image"), `${origin}/og.png`);
  meta("og:image:alt");
  assert.equal(meta("twitter:card"), "summary_large_image");
  const body = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  assert(
    body && body.replace(/<[^>]*>/g, "").trim().length > 200,
    `${canonical}: insufficient static content`,
  );
  assert(/<h1\b/i.test(body), `${canonical}: missing static heading`);
  const schemas = [
    ...head.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => JSON.parse(m[1]));
  assert(schemas.some((s) => s["@type"] === "WebPage" && s.url === canonical));
  if ([`${origin}/`, `${origin}/product.html`].includes(canonical)) {
    const app = schemas.find((s) => s["@type"] === "SoftwareApplication");
    assert(app, `${canonical}: missing SoftwareApplication`);
    assert.equal(app.name, "arnx");
    assert.equal(app.license, "https://www.apache.org/licenses/LICENSE-2.0");
    assert.equal(app.applicationCategory, "DeveloperApplication");
    assert.equal(app.url, `${origin}/`);
    assert(app.description.includes("regression"));
    assert(!app.aggregateRating && !app.review, "No fabricated ratings");
  }
  return { title, description };
}
export async function verify(base) {
  const get = async (path, status = 200, userAgent) => {
    const response = await fetch(new URL(path, base), {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: userAgent ? { "User-Agent": userAgent } : {},
    });
    assert.equal(
      response.status,
      status,
      `${path}: HTTP ${response.status}, expected ${status}`,
    );
    assert(
      !/noindex|none|nofollow|nosnippet/i.test(
        response.headers.get("x-robots-tag") || "",
      ),
      `${path}: X-Robots-Tag`,
    );
    assert(
      !/rel\s*=\s*["']?canonical/i.test(response.headers.get("link") || ""),
      `${path}: unexpected HTTP canonical; review for conflict`,
    );
    return {
      text: await response.text(),
      type: response.headers.get("content-type") || "",
    };
  };
  const rules = await get("/robots.txt");
  assert.match(rules.type, /text\/plain/);
  // Exact policy comparison fails closed on injected CDN crawler restrictions.
  assert.equal(
    rules.text.trim(),
    robots().trim(),
    "robots.txt differs from configured policy",
  );
  const sitemap = await get("/sitemap.xml");
  assert.match(sitemap.type, /xml/);
  assert.match(
    sitemap.text,
    /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/,
  );
  const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1],
  );
  const expected = pages.map(
    (p) =>
      `${origin}/${p === "index.html" ? "" : ["privacy.html", "terms.html", "credits.html"].includes(p) ? p.replace(".html", "") : p}`,
  );
  assert.deepEqual(
    [...urls].sort(),
    expected.sort(),
    "Sitemap must contain exactly the public canonicals",
  );
  const titles = new Set(),
    descriptions = new Set();
  for (const url of urls) {
    const path = new URL(url).pathname;
    const page = await get(path);
    assert.match(page.type, /text\/html/);
    const metadata = inspectHtml(page.text, url);
    assert(
      !titles.has(metadata.title) && !descriptions.has(metadata.description),
      `${url}: duplicate metadata`,
    );
    titles.add(metadata.title);
    descriptions.add(metadata.description);
    for (const agent of [
      "Googlebot",
      "bingbot",
      "OAI-SearchBot",
      "Claude-SearchBot",
      "PerplexityBot",
    ]) {
      const crawled = await get(path, 200, agent);
      inspectHtml(crawled.text, url);
    }
  }
  for (const page of pages) {
    const alias =
      page === "index.html"
        ? "/index.html"
        : ["privacy.html", "terms.html", "credits.html"].includes(page)
          ? `/${page}`
          : `/${page.replace(".html", "")}`;
    const canonical = expected.find(
      (u) =>
        new URL(u).pathname ===
        (page === "index.html"
          ? "/"
          : ["privacy.html", "terms.html", "credits.html"].includes(page)
            ? alias.replace(".html", "")
            : `/${page}`),
    );
    const response = await fetch(new URL(alias, base), {
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, `${alias}: broken alias/redirect`);
    inspectHtml(await response.text(), canonical);
  }
  const overview = await get("/llms.txt");
  assert.match(overview.type, /text\/plain/);
  for (const link of [
    "https://github.com/arnx-dev/arnx",
    "/quickstart.html",
    "/case-study.html",
    "#readme",
  ])
    assert(overview.text.includes(link));
  assert.match((await get("/og.png")).type, /image\/png/);
  await get("/discovery-audit-nonexistent-404", 404);
  await get("/brand/discovery-audit-missing.png", 404);
  console.log(
    `Discovery checks passed: ${urls.length} canonical pages, static HTML, crawler responses, metadata, JSON-LD, aliases, robots, sitemap, llms.txt, image and 404s (${base}).`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const remote = process.argv[2];
  const server = remote ? null : serve(0);
  try {
    if (server && !server.listening)
      await new Promise((resolve) => server.once("listening", resolve));
    await verify(remote || `http://127.0.0.1:${server.address().port}`);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
