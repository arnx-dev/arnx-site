// Runs in the head before styles load so a saved preference applies on first paint.
const themeStorageKey = "arnx.theme";
let theme = "light";
try {
  if (localStorage.getItem(themeStorageKey) === "dark") theme = "dark";
} catch {
  // Light remains the default when browser storage is unavailable.
}
document.documentElement.dataset.theme = theme;

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector<HTMLButtonElement>(".theme-toggle");
  const sync = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    toggle?.setAttribute("aria-pressed", String(dark));
    toggle?.setAttribute("title", `Switch to ${dark ? "light" : "dark"} mode`);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0f1115" : "#faf8f3");
  };
  sync();
  toggle?.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // The toggle still works for this page when preferences cannot be saved.
    }
    sync();
  });
});

export {};
