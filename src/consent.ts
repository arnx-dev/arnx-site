// Google Analytics on arnx.dev. Visitors in the EU, the EEA and the UK get it only after they click Accept in a
// banner; elsewhere it loads as before. The country comes from Cloudflare's /cdn-cgi/trace on this domain (no
// worker). When the country can't be read, the banner shows. The choice is kept in this browser only.

// EU, plus the EEA (Iceland, Liechtenstein, Norway), plus the UK.
export const CONSENT_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
]);
export const CHOICE_KEY = "arnx-analytics-consent";
export type Choice = "granted" | "denied";

declare global {
  interface Window {
    /** Set by the Google tag in each page's head (scripts/build.mjs). */
    arnxAnalytics?: { id: string; load: () => void };
  }
}

/** The country Cloudflare saw, from the `loc=` line; null when absent or not a country (XX unknown, T1 Tor). */
export function countryFromTrace(text: string): string | null {
  const loc = /^loc=([A-Z0-9]{2})$/m.exec(text)?.[1];
  return loc && loc !== "XX" && loc !== "T1" ? loc : null;
}

/** True when the visitor must agree first: in a consent country, or in an unknown one. */
export const needsConsent = (country: string | null) =>
  country === null || CONSENT_COUNTRIES.has(country);

export async function visitorCountry(
  get: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<string | null> {
  try {
    const response = await get("/cdn-cgi/trace", {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? countryFromTrace(await response.text()) : null;
  } catch {
    return null;
  }
}

export function readChoice(
  storage: () => Storage = () => localStorage,
): Choice | null {
  try {
    const value = storage().getItem(CHOICE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeChoice(
  choice: Choice,
  storage: () => Storage = () => localStorage,
): void {
  try {
    storage().setItem(CHOICE_KEY, choice);
  } catch {
    // Private windows can refuse storage: the banner then asks again on the next page.
  }
}

/** Expires Google Analytics' cookies (`_ga`, `_ga_<id>`) on this host and each parent domain. */
export function clearAnalyticsCookies(doc: Document): void {
  const parts = doc.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < parts.length - 1; i++)
    domains.push(`; domain=.${parts.slice(i).join(".")}`);
  for (const cookie of doc.cookie.split(";")) {
    const name = cookie.split("=")[0]!.trim();
    if (!/^_ga(_|$)/.test(name)) continue;
    for (const domain of domains)
      doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  }
}

function apply(choice: Choice, win: Window): void {
  const analytics = win.arnxAnalytics!;
  (win as unknown as Record<string, boolean>)[`ga-disable-${analytics.id}`] =
    choice === "denied";
  if (choice === "granted") analytics.load();
  else clearAnalyticsCookies(win.document);
}

function showBanner(win: Window, opener?: HTMLElement): void {
  const doc = win.document;
  doc.querySelector(".consent")?.remove();
  const banner = doc.createElement("section");
  banner.className = "consent";
  banner.setAttribute("aria-label", "Cookie choice");
  const text = doc.createElement("p");
  text.append(
    "Can we use Google Analytics cookies to count visits? Nothing goes to Google unless you accept. ",
  );
  const link = doc.createElement("a");
  link.href = "./privacy.html#website";
  link.textContent = "Privacy";
  text.append(link);
  const actions = doc.createElement("div");
  actions.className = "consent-actions";
  for (const [choice, label] of [
    ["denied", "Reject"],
    ["granted", "Accept"],
  ] as const) {
    const button = doc.createElement("button");
    button.type = "button";
    button.dataset.choice = choice;
    button.textContent = label;
    button.addEventListener("click", () => {
      writeChoice(choice);
      banner.remove();
      apply(choice, win);
      opener?.focus();
    });
    actions.append(button);
  }
  banner.append(text, actions);
  doc.body.append(banner);
  if (opener) actions.querySelector("button")!.focus();
}

/** A "Cookies" button in the footer, to change the choice later. */
function addReopen(win: Window): void {
  const doc = win.document;
  const place = doc.querySelector("footer > span");
  if (!place || place.querySelector(".consent-reopen")) return;
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "consent-reopen";
  button.textContent = "Cookies";
  button.addEventListener("click", () => showBanner(win, button));
  place.append(" · ", button);
}

export async function initConsent(
  win: Window = window,
  country = () => visitorCountry(),
): Promise<void> {
  if (!win.arnxAnalytics) return;
  const choice = readChoice();
  if (choice) {
    // Only visitors who were asked have a choice kept.
    addReopen(win);
    apply(choice, win);
    return;
  }
  if (!needsConsent(await country())) {
    win.arnxAnalytics.load();
    return;
  }
  addReopen(win);
  showBanner(win);
}
