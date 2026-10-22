import { trackEvent } from "./analytics";
import { initConsent } from "./consent";
void initConsent();
// Event names and destinations are curated UI metadata, never URL query strings or user data.
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const action = event.target.closest<HTMLAnchorElement>("a[data-event]");
  if (!action) return;
  const name = action.dataset.event;
  if (
    name !== "github_click" &&
    name !== "docs_click" &&
    name !== "pilot_click" &&
    name !== "cloud_click" &&
    name !== "enterprise_click"
  )
    return;
  const location = action.closest("header")
    ? "nav"
    : action.closest("footer")
      ? "footer"
      : action.closest(".hero")
        ? "hero"
        : action.closest(".final-cta")
          ? "final_cta"
          : "content";
  trackEvent(name, {
    location,
    destination:
      name === "github_click"
        ? "github"
        : name === "docs_click"
          ? "docs"
          : name === "cloud_click" && !action.href.startsWith("mailto:")
            ? "docs"
            : "email",
  });
});
const menu = document.querySelector<HTMLButtonElement>(".menu-toggle");
const navigation = document.querySelector<HTMLElement>("#mobile-nav");
function closeMenu() {
  if (menu && navigation) {
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    navigation.hidden = true;
  }
}
menu?.addEventListener("click", () => {
  if (!navigation) return;
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  navigation.hidden = !open;
});
navigation?.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menu?.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menu.focus();
  }
});
window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-copy]",
)) {
  button.addEventListener("click", async () => {
    const code = document.getElementById(button.dataset.copy || "");
    const install = button.dataset.install === "true";
    const status = document.querySelector(
      install ? "#install-status" : "#copy-status",
    );
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent || "");
      button.textContent = "Copied";
      if (status)
        status.textContent = install
          ? "Install command copied."
          : "Workflow commands copied.";
      if (install)
        trackEvent("install_copy", {
          location: "quickstart",
          destination: "clipboard",
        });
    } catch {
      if (status)
        status.textContent =
          "Copy unavailable. Select the commands and copy them manually.";
    }
  });
}
