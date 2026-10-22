import { build } from "esbuild";
import { mkdir, rm, copyFile, readFile, writeFile } from "node:fs/promises";
import { renderPage, release, validateRelease } from "./release.mjs";
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
export async function buildSite() {
  validateRelease(release);
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
  for (const page of pages) {
    const html = await renderPage(await readFile(`src/${page}`, "utf8"));
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    const structuredData = `<script type="application/ld+json">${JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        url: canonical,
        name: html.match(/<title>([^<]+)<\/title>/)[1],
        isPartOf: {
          "@type": "WebSite",
          name: "arnx",
          url: "https://arnx.dev/",
        },
      },
    ).replaceAll("<", "\\u003c")}</script>`;
    await writeFile(
      `dist/${page}`,
      html.replace("<head>", `<head>${googleTag}${structuredData}`),
    );
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
  const urls = pages.map(
    (page) =>
      `https://arnx.dev/${page === "index.html" ? "" : ["privacy.html", "terms.html", "credits.html"].includes(page) ? page.replace(".html", "") : page}`,
  );
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>\n`,
  );
  await writeFile(
    "dist/robots.txt",
    "User-agent: *\nAllow: /\nSitemap: https://arnx.dev/sitemap.xml\n",
  );
  console.log(
    `Built dist/: ${pages.length} pages, responsive brand assets, bundled fonts, CSS and JS. No internal documents.`,
  );
}
if (process.argv[1]?.endsWith("build.mjs")) await buildSite();
