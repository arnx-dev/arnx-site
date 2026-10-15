export {};
declare const PILOT_ENDPOINT: string;
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
const copy = document.querySelector<HTMLButtonElement>(".copy-button");
copy?.addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  try {
    await navigator.clipboard.writeText(
      "arnx review\narnx accept <id>\narnx prompt <id>\n# After your coding agent makes the fix:\narnx check",
    );
    copy.textContent = "Copied";
    if (status) status.textContent = "Workflow commands copied.";
  } catch {
    if (status)
      status.textContent =
        "Copy unavailable. Select the commands and copy them manually.";
  }
});
const form = document.querySelector<HTMLFormElement>("#pilot-form");
const status = document.querySelector<HTMLElement>("#form-status");
let submissionId = crypto.randomUUID();
let previousPayload = "";
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || !status) return;
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  if (button.disabled) return;
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const project = String(data.get("project") ?? "").trim();
  if (!PILOT_ENDPOINT) {
    status.dataset.state = "info";
    status.textContent = "Online requests are not connected yet. ";
    const link = document.createElement("a");
    link.textContent = "Email your pilot request to info@arnx.dev";
    link.href = `mailto:info@arnx.dev?subject=${encodeURIComponent("arnx pilot request")}&body=${encodeURIComponent(`Email: ${email}\n\nProject: ${project}`)}`;
    status.append(link);
    return;
  }
  const payload = JSON.stringify({ email, project });
  if (previousPayload && payload !== previousPayload)
    submissionId = crypto.randomUUID();
  previousPayload = payload;
  button.disabled = true;
  button.textContent = "Sending request…";
  status.textContent = "";
  status.removeAttribute("data-state");
  try {
    const response = await fetch(PILOT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        project,
        website: String(data.get("website") ?? ""),
        submissionId,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Please wait a minute before trying again."
          : "We couldn’t send your request. Please try again or email info@arnx.dev.",
      );
    const result = await response.json();
    if (result.ok !== true)
      throw new Error(
        "We couldn’t confirm your request. Please email info@arnx.dev.",
      );
    status.dataset.state = "success";
    status.textContent =
      "Request sent. We’ll follow up by email about your project and pilot fit.";
    form.reset();
    submissionId = crypto.randomUUID();
    previousPayload = "";
  } catch (error) {
    status.dataset.state = "error";
    status.textContent =
      error instanceof Error &&
      error.name !== "TimeoutError" &&
      error.name !== "TypeError"
        ? error.message
        : "Connection interrupted. Please try again or email info@arnx.dev.";
  } finally {
    button.disabled = false;
    button.textContent = "Request a pilot invite ↗";
  }
});
