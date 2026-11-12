// Compares src/release.json with what npm and GitHub publish today.
// Needs the network, so it is not part of `npm test`: run `npm run verify:release`
// before a deployment and after each arnx release.
import { release } from "./release.mjs";

const get = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "arnx-site-check" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};
const documented = release.cli.version;
const npm = (await get("https://registry.npmjs.org/@arnx-dev/arnx/latest"))
  .version;
const tag = (
  await get("https://api.github.com/repos/arnx-dev/arnx/releases/latest")
).tag_name;
console.log(`site ${documented} · npm ${npm} · GitHub ${tag}`);
if (npm !== documented || tag !== `v${documented}`) {
  console.error(
    "The site documents another version. Check the copy against the new release, then update src/release.json and package.json.",
  );
  process.exit(1);
}
