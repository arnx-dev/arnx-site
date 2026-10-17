import { build } from "esbuild";
import { mkdir, rm, copyFile, readFile, writeFile } from "node:fs/promises";
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
export async function buildSite() {
  const measurementId = process.env.GA_MEASUREMENT_ID || "G-MMZS9QVW5F";
  if (!/^G-[A-Z0-9]+$/.test(measurementId))
    throw new Error("GA_MEASUREMENT_ID must be a GA4 measurement ID (G-...)");
  const googleTag = `
    <!-- Google tag (gtag.js) -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${measurementId}');
      // Keep analytics off the initial rendering/network path; preserve queued events.
      window.addEventListener('load', function () {
        setTimeout(function () {
          var tag = document.createElement('script');
          tag.async = true;
          tag.src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';
          document.head.appendChild(tag);
        }, 1500);
      }, { once: true });
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
  for (const page of ["index.html", "case-study.html"]) {
    const html = await readFile(`src/${page}`, "utf8");
    await writeFile(
      `dist/${page}`,
      html.replace("<head>", `<head>${googleTag}`),
    );
  }
  for (const asset of publicAssets)
    await copyFile(`public/brand/${asset}`, `dist/brand/${asset}`);
  await copyFile("public/og.png", "dist/og.png");
  await mkdir("dist/licenses", { recursive: true });
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
  console.log(
    "Built dist/: two pages, responsive brand assets, bundled fonts, CSS and JS. No internal documents.",
  );
}
if (process.argv[1]?.endsWith("build.mjs")) await buildSite();
