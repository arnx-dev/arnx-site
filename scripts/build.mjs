import { build } from "esbuild";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";
export const publicAssets = [
  "mascot-inspecting.png",
  "mascot-questioning.png",
  "mascot-greencheck.png",
  "arnx-favicon.svg",
];
export async function buildSite() {
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
  for (const page of ["index.html", "case-study.html"])
    await copyFile(`src/${page}`, `dist/${page}`);
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
    "Built dist/: two pages, four selected brand assets, bundled fonts, CSS and JS. No internal documents.",
  );
}
if (process.argv[1]?.endsWith("build.mjs")) await buildSite();
