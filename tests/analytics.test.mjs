import { test } from "node:test";
import assert from "node:assert/strict";
import { trackEvent } from "../src/analytics.ts";

test("analytics safely handles absent GA4 and forwards curated event metadata", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    delete globalThis.window;
    assert.doesNotThrow(() => trackEvent("pilot_click"));
    globalThis.window = {};
    assert.doesNotThrow(() => trackEvent("pilot_click"));
    const calls = [];
    window.gtag = (...args) => calls.push(args);
    const params = {
      location: "hero",
      destination: "#pilot",
      label: "Request a pilot invite",
    };
    trackEvent("pilot_click", params);
    assert.deepEqual(calls, [["event", "pilot_click", params]]);
    window.gtag = () => {
      throw new Error("Analytics unavailable");
    };
    assert.doesNotThrow(() => trackEvent("pilot_click"));
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});
