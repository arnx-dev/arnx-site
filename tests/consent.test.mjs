import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHOICE_KEY,
  CONSENT_COUNTRIES,
  clearAnalyticsCookies,
  countryFromTrace,
  needsConsent,
  readChoice,
  visitorCountry,
  writeChoice,
} from "../src/consent.ts";

test("the banner is for the EU, the EEA and the UK, and for visitors whose country is unknown", () => {
  assert.equal(CONSENT_COUNTRIES.size, 31);
  for (const country of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", null])
    assert.equal(needsConsent(country), true, String(country));
  for (const country of ["US", "BR", "CH", "IN", "JP"])
    assert.equal(needsConsent(country), false, country);
});

test("the country comes from the loc= line of Cloudflare's trace; XX and Tor count as unknown", () => {
  assert.equal(
    countryFromTrace("fl=1\nh=arnx.dev\nloc=DE\ntls=TLSv1.3\n"),
    "DE",
  );
  assert.equal(countryFromTrace("loc=XX\n"), null);
  assert.equal(countryFromTrace("loc=T1\n"), null);
  assert.equal(countryFromTrace("<html>Not found</html>"), null);
});

test("an unreachable or failing trace gives no country, so the banner shows", async () => {
  const ok = async () => new Response("h=arnx.dev\nloc=US\n");
  assert.equal(await visitorCountry(ok), "US");
  assert.equal(
    await visitorCountry(async () => new Response("nope", { status: 404 })),
    null,
  );
  assert.equal(
    await visitorCountry(async () => {
      throw new TypeError("offline");
    }),
    null,
  );
});

test("the choice is kept in this browser; storage that throws counts as no choice", () => {
  const items = new Map();
  const storage = () => ({
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  });
  assert.equal(readChoice(storage), null);
  writeChoice("denied", storage);
  assert.equal(items.get(CHOICE_KEY), "denied");
  assert.equal(readChoice(storage), "denied");
  items.set(CHOICE_KEY, "maybe");
  assert.equal(readChoice(storage), null);
  const broken = () => {
    throw new Error("blocked");
  };
  assert.equal(readChoice(broken), null);
  assert.doesNotThrow(() => writeChoice("granted", broken));
});

test("Reject expires Google Analytics' cookies on the host and each parent domain, and no others", () => {
  const written = [];
  const doc = {
    location: { hostname: "www.arnx.dev" },
    get cookie() {
      return "_ga=GA1.1.1; theme=dark; _ga_MMZS9QVW5F=GS1.1; _gat=1";
    },
    set cookie(value) {
      written.push(value);
    },
  };
  clearAnalyticsCookies(doc);
  const names = [...new Set(written.map((c) => c.split("=")[0]))];
  assert.deepEqual(names, ["_ga", "_ga_MMZS9QVW5F"]);
  assert(written.every((c) => c.includes("expires=Thu, 01 Jan 1970")));
  assert.deepEqual(
    written
      .filter((c) => c.startsWith("_ga="))
      .map((c) => c.split("; ").at(-1)),
    ["path=/", "domain=.www.arnx.dev", "domain=.arnx.dev"],
  );
});
