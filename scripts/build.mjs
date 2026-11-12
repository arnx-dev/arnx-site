import { build } from "esbuild";
import { mkdir, rm, copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { indexNowKey } from "./indexnow.mjs";
import { renderPage, release, validateRelease } from "./release.mjs";
import {
  origin,
  robots,
  softwareApplication,
  organization,
  llms,
  llmsFull,
} from "./discovery.mjs";
import {
  content,
  contentSchemas,
  renderContentPage,
  rootLinks,
  sections,
  toMarkdown,
} from "./content.mjs";
export const publicAssets = [
  ...[320, 430, 640, 860, 960, 1254].map(
    (width) => `mascot-inspecting-${width}.webp`,
  ),
  ...[100, 165, 200, 330, 495].map(
    (width) => `mascot-questioning-${width}.webp`,
  ),
  ...[190, 380, 570].map((width) => `mascot-greencheck-${width}.webp`),
  "arnx-favicon.svg",
];
// Each page is served at /<name>.html and, on GitHub Pages, at /<name> too
// (the arnx CLI uses the clean terms, privacy, and credits URLs).
export const pages = [
  "index.html",
  "case-study.html",
  "terms.html",
  "privacy.html",
  "credits.html",
  "product.html",
  "quickstart.html",
  "community.html",
  "license.html",
  "security.html",
];
// Every built HTML file: the flat pages, then the nested content pages.
export const allPages = [...pages, ...content.map((page) => page.file)];
// Pages whose text goes into llms-full.txt, in reading order.
const fullTextPages = [
  "quickstart.html",
  "product.html",
  "security.html",
  ...content.map((page) => page.file),
  "case-study.html",
];
const jsonLd = (schema) =>
  `<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`;
export async function buildSite() {
  validateRelease(release);
  const theme = await build({
    entryPoints: ["src/theme.ts"],
    bundle: true,
    minify: true,
    write: false,
    format: "iife",
    target: "es2022",
  });
  const themeScript = `<script>${theme.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`;
  const measurementId = process.env.GA_MEASUREMENT_ID || "G-MMZS9QVW5F";
  if (!/^G-[A-Z0-9]+$/.test(measurementId))
    throw new Error("GA_MEASUREMENT_ID must be a GA4 measurement ID (G-...)");
  const googleTag = `
    <!-- Google tag (gtag.js) -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      gtag('js', new Date());

      gtag('config', '${measurementId}');
      // src/consent.ts calls load(): at once outside the EU, EEA and UK; there only after "Accept".
      // Keep analytics off the initial rendering/network path; preserve queued events.
      window.arnxAnalytics = {
        id: '${measurementId}',
        load: function () {
          if (window.arnxAnalytics.loaded) return;
          window.arnxAnalytics.loaded = true;
          function add() {
            setTimeout(function () {
              var tag = document.createElement('script');
              tag.async = true;
              tag.src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';
              document.head.appendChild(tag);
            }, 1500);
          }
          if (document.readyState === 'complete') add();
          else window.addEventListener('load', add, { once: true });
        },
      };
    </script>`;
  const endpoint = process.env.PILOT_ENDPOINT || "";
  if (
    endpoint &&
    (!endpoint.startsWith("https://") ||
      new URL(endpoint).username ||
      new URL(endpoint).password)
  )
    throw new Error(
      "PILOT_ENDPOINT must be a public HTTPS endpoint, without credentials",
    );
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist/brand", { recursive: true });
  await build({
    entryPoints: { app: "src/app.ts", styles: "src/styles.css" },
    bundle: true,
    minify: true,
    outdir: "dist/assets",
    assetNames: "fonts/[name]-[hash]",
    loader: { ".woff2": "file", ".woff": "file" },
    define: { PILOT_ENDPOINT: JSON.stringify(endpoint) },
    target: "es2022",
  });
  const urls = [];
  const built = new Map();
  const sources = [
    ...(await Promise.all(
      pages.map(async (page) => ({
        file: page,
        html: await renderPage(await readFile(`src/${page}`, "utf8")),
        schemas:
          page === "index.html"
            ? [softwareApplication(release), organization(release)]
            : page === "product.html"
              ? [softwareApplication(release)]
              : [],
      })),
    )),
    ...(await Promise.all(
      content.map(async (page) => ({
        file: page.file,
        html: rootLinks(await renderPage(renderContentPage(page))),
        schemas: contentSchemas(page, release),
      })),
    )),
  ];
  for (const { file, html, schemas } of sources) {
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    if (new URL(canonical).origin !== origin || urls.includes(canonical))
      throw new Error("Invalid or duplicate canonical");
    urls.push(canonical);
    const structuredData = jsonLd({
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: html.match(/<title>([^<]+)<\/title>/)[1],
      isPartOf: {
        "@type": "WebSite",
        name: "arnx",
        url: "https://arnx.dev/",
      },
    });
    await mkdir(dirname(`dist/${file}`), { recursive: true });
    await writeFile(
      `dist/${file}`,
      html.replace(
        "<head>",
        `<head>${themeScript}${googleTag}${structuredData}${schemas.map(jsonLd).join("")}`,
      ),
    );
    built.set(file, { canonical, html });
  }
  for (const asset of publicAssets)
    await copyFile(`public/brand/${asset}`, `dist/brand/${asset}`);
  await copyFile("public/og.png", "dist/og.png");
  await mkdir("dist/licenses", { recursive: true });
  await copyFile("LICENSE", "dist/licenses/Apache-2.0.txt");
  await copyFile("NOTICE", "dist/licenses/NOTICE.txt");
  for (const [pkg, name] of [
    ["inter", "Inter"],
    ["jetbrains-mono", "JetBrains-Mono"],
  ])
    await copyFile(
      `node_modules/@fontsource-variable/${pkg}/LICENSE`,
      `dist/licenses/${name}.txt`,
    );
  await writeFile("dist/.nojekyll", "");
  await copyFile("CNAME", "dist/CNAME");
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>\n`,
  );
  const key = indexNowKey();
  if (key) await writeFile(`dist/${key}.txt`, key);
  await writeFile("dist/robots.txt", robots());
  await writeFile("dist/llms.txt", llms(release, content, sections));
  await writeFile(
    "dist/llms-full.txt",
    llmsFull(
      release,
      fullTextPages.map((file) => ({
        url: built.get(file).canonical,
        markdown: toMarkdown(built.get(file).html, built.get(file).canonical),
      })),
    ),
  );
  console.log(
    `Built dist/: ${allPages.length} pages, responsive brand assets, bundled fonts, CSS and JS. No internal documents.`,
  );
}
if (process.argv[1]?.endsWith("build.mjs")) await buildSite();
