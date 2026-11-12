// IndexNow: tells Bing and the other participating engines which URLs changed.
// The maintainer runs it after a deployment, with the same key the build used:
//   INDEXNOW_KEY=<key> node scripts/indexnow.mjs
// The build writes dist/<key>.txt only when INDEXNOW_KEY is set.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { origin } from "./discovery.mjs";

export function indexNowKey(value = process.env.INDEXNOW_KEY) {
  if (!value) return null;
  if (!/^[A-Za-z0-9-]{8,128}$/.test(value))
    throw new Error("INDEXNOW_KEY must be 8 to 128 letters, digits or hyphens");
  return value;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const key = indexNowKey();
  if (!key) throw new Error("Set INDEXNOW_KEY");
  const live = await fetch(`${origin}/${key}.txt`);
  if (!live.ok || (await live.text()).trim() !== key)
    throw new Error(
      `${origin}/${key}.txt is not live yet: deploy with INDEXNOW_KEY set first`,
    );
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(origin).host,
      key,
      keyLocation: `${origin}/${key}.txt`,
      urlList,
    }),
  });
  console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URLs`);
  if (![200, 202].includes(response.status)) process.exit(1);
}
