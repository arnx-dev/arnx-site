import { readFile } from "node:fs/promises";
export const release = JSON.parse(
  await readFile(new URL("../src/release.json", import.meta.url), "utf8"),
);
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
function https(value, field) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error(`${field} must be a public HTTPS URL`);
  return value;
}
export function validateRelease(config) {
  const { repository, cli, cloud } = config;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.checkedAt))
    throw new Error("Release check date required");
  for (const [key, value] of Object.entries(repository)) {
    if (key.endsWith("Url") || key === "url") {
      if (value) https(value, key);
    }
  }
  if (!repository.url || !repository.issuesUrl)
    throw new Error("Verified GitHub and issues URLs required");
  if (repository.publicSource && !repository.licenseUrl)
    throw new Error(
      "Public source requires a verified repository LICENSE link",
    );
  if (
    cli.available &&
    (!repository.publicSource ||
      !cli.version ||
      !cli.installCommand ||
      !cli.readinessRecord)
  ) {
    throw new Error(
      "CLI availability requires public licensed source, a version, install command, and a release readiness record",
    );
  }
  if (Boolean(cli.verifiedAt) !== Boolean(cli.verificationRecord))
    throw new Error(
      "Installation verification requires both a date and record",
    );
  if (cloud.available) {
    if (!cloud.verifiedAt || !cloud.verificationRecord)
      throw new Error(
        "Cloud availability requires a dated readiness verification record",
      );
  }
}
export function releaseTokens(config = release) {
  validateRelease(config);
  const { repository: repo, cli, cloud } = config;
  const github = escape(repo.url);
  const link = (url, text) =>
    `<a href="${escape(url)}" data-event="github_click">${text}</a>`;
  return {
    GITHUB_URL: github,
    ISSUES_URL: escape(repo.issuesUrl),
    RELEASE_NOTE: cli.available
      ? `arnx ${escape(cli.version)} · Bring your own model keys, or use arnx cloud.`
      : repo.publicSource
        ? "Source is public. Packaged CLI installation is awaiting verification."
        : "Public beta release in preparation. GitHub currently has no CLI source; the npm package is a placeholder. Installation is not available yet.",
    LICENSE_STATUS: "arnx Open Source is licensed under Apache License 2.0.",
    CLI_DISTRIBUTION_STATUS: cli.available
      ? `CLI version ${escape(cli.version)}.`
      : "Public CLI distribution is pending.",
    SOURCE_STATUS: repo.publicSource
      ? `Source is available on ${link(repo.url, "GitHub")}.`
      : `The ${link(repo.url, "public GitHub repository")} is reserved; CLI source has not been published yet.`,
    CLOUD_STATUS: cloud.available
      ? "Available"
      : cloud.pilot
        ? "Early pilot"
        : "Coming soon",
    CLOUD_DESCRIPTION: cloud.available
      ? "Start with $5 in Cloud credit."
      : cloud.pilot
        ? "Managed models are in an early pilot; public signup and paid billing are not open yet. Tests run in your local Docker environment."
        : "Managed models and billing are not publicly available yet. Tests currently run in your local Docker environment.",
    CLOUD_DATA_FLOW:
      "Tool calls, Docker tests, the before/after check, and report generation run on your machine. arnx cloud receives the diff, the files the agent reads, the tests it writes and their output, then passes them to its model providers.",
    CLOUD_ACTION: cloud.available
      ? '<a class="text-link" href="./quickstart.html#cloud" data-event="cloud_click">Get started with Cloud ↗</a>'
      : cloud.pilot
        ? '<a class="text-link" href="mailto:info@arnx.dev?subject=arnx%20Cloud%20pilot" data-event="cloud_click">Ask about the Cloud pilot ↗</a>'
        : '<a class="text-link" href="./security.html">Read the execution boundaries ↗</a>',
    INSTALLATION: cli.available
      ? `<p>Install arnx ${escape(cli.version)} with npm (Node 20 or later):</p><div class="terminal"><div class="terminal-header"><span>Install arnx</span><button class="copy-button" data-copy="install-code" data-install="true" aria-label="Copy install command">Copy command</button></div><pre><code id="install-code">${escape(cli.installCommand)}</code></pre></div><p id="install-status" role="status"></p><p>Or download a standalone binary from ${link(`${repo.url}/releases/latest`, "GitHub Releases")}, with no Node installation needed. Choose macOS or Linux, x64 or arm64, and verify the download against <code>SHA256SUMS</code> on the release page.</p><p>Run <code>arnx --version</code> to check your installation.</p>`
      : `<p><strong>The public CLI is not installable yet.</strong> Checked ${escape(config.checkedAt)}: ${repo.publicSource ? "source is public, but packaged installation has not been verified." : "GitHub has no published CLI source, and npm’s <code>@arnx-dev/arnx</code> package is a placeholder without an executable."} We will add an installation command here after a public release passes a clean-install check.</p><p>No invitation or email is required to read these docs. You can ${link(repo.url, "follow the release on GitHub")}.</p>`,
    CANONICAL_DOCS: repo.docsUrl
      ? `The ${link(repo.docsUrl, "release documentation")} is canonical for your installed version.`
      : "Canonical release documentation will be linked here when the source is published. Commands and defaults may change before that release.",
    REPOSITORY_LICENSE: repo.licenseUrl
      ? `See the ${link(repo.licenseUrl, "repository LICENSE file")}.`
      : "The repository LICENSE link will be added when the licensed source is public; no published CLI license file is available to link yet.",
    CONTRIBUTING_LINK: repo.contributingUrl
      ? `Read the ${link(repo.contributingUrl, "canonical contributing guidelines")}.`
      : "Source contributions will open with the source release; the guidance below covers reports you can make now.",
    DISCUSSIONS_LINK: repo.discussionsUrl
      ? `Join ${link(repo.discussionsUrl, "GitHub Discussions")}.`
      : "",
  };
}
export async function renderPage(html, config = release) {
  const tokens = releaseTokens(config);
  for (const name of ["header", "footer"])
    html = html.replaceAll(
      `{{${name.toUpperCase()}}}`,
      await readFile(
        new URL(`../src/partials/${name}.html`, import.meta.url),
        "utf8",
      ),
    );
  for (const [key, value] of Object.entries(tokens))
    html = html.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("Unresolved page token");
  return html;
}
