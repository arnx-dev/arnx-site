type AnalyticsEvent =
  | "github_click"
  | "docs_click"
  | "install_copy"
  | "pilot_click"
  | "cloud_click"
  | "enterprise_click";
type EventParams = {
  location?: string;
  destination?: string;
  label?: string;
};

declare global {
  interface Window {
    gtag?: (
      command: "event",
      name: AnalyticsEvent,
      params?: EventParams,
    ) => void;
  }
}

// Pass only curated UI metadata here, never user input or form contents.
export function trackEvent(name: AnalyticsEvent, params?: EventParams): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function")
    return;
  try {
    window.gtag("event", name, params);
  } catch {
    // Analytics must never interrupt a site action.
  }
}
