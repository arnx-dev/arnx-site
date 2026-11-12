import { readFile } from "node:fs/promises";
export const origin = "https://arnx.dev";
export const crawlerPolicy = JSON.parse(
  await readFile(new URL("../src/crawlers.json", import.meta.url), "utf8"),
);
export function robots(policy = crawlerPolicy) {
  const groups = [
    "# Public search access; training controls are configured in src/crawlers.json.",
    "User-agent: *\nAllow: /",
  ];
  for (const [agent, permission] of Object.entries(policy)) {
    if (
      !/^[A-Za-z0-9-]+$/.test(agent) ||
      !["allow", "disallow"].includes(permission)
    )
      throw new Error("Invalid crawler policy");
    groups.push(
      `User-agent: ${agent}\n${permission === "allow" ? "Allow" : "Disallow"}: /`,
    );
  }
  return groups.join("\n\n") + `\n\nSitemap: ${origin}/sitemap.xml\n`;
}
// The one factual product description, reused by metadata, JSON-LD and llms.txt.
export const productDescription =
  "arnx is an open-source AI code review CLI for coding agents. It investigates code changes, generates and executes tests for suspected bugs in Docker, compares behavior before and after the change, and lets developers retain accepted tests as regression checks.";
export function softwareApplication(release) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${origin}/#software`,
    name: "arnx",
    url: `${origin}/`,
    description: productDescription,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    softwareVersion: release.cli.version,
    sameAs: [release.repository.url, release.repository.npmUrl],
    downloadUrl: release.repository.npmUrl,
    installUrl: `${origin}/quickstart.html`,
    softwareHelp: `${origin}/quickstart.html`,
    softwareRequirements: "Docker; Node.js 20 or later for the npm package",
    publisher: { "@id": `${origin}/#organization` },
    featureList: [
      "Code change investigation",
      "Test generation and execution for suspected bugs in Docker",
      "Before and after comparison of each failing test",
      "Second-model challenge of each finding",
      "Accepted regression tests rerun without model calls",
      "Agent Skill for Claude Code, Codex and other coding agents",
    ],
  };
}
export function organization(release) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: "arnx",
    url: `${origin}/`,
    logo: `${origin}/brand/arnx-favicon.svg`,
    email: "info@arnx.dev",
    sameAs: [release.repository.organizationUrl],
  };
}
const label = (page) => page.listTitle || page.title.replace(/ \| arnx$/, "");
const links = (pages) =>
  pages.map((p) => `- [${label(p)}](${p.canonical}): ${p.summary}`).join("\n");
export function llms(release, content = [], sections = {}) {
  const repo = release.repository;
  const of = (section) =>
    content.filter((p) => p.section === section && p.kind !== "index");
  const group = (section) =>
    of(section).length
      ? `\n## ${sections[section]}\n${links(of(section))}\n`
      : "";
  return `# arnx

> ${productDescription}

- Latest release: arnx ${release.cli.version} (checked ${release.checkedAt}). Apache License 2.0.
- Install: \`${release.cli.installCommand}\` (Node 20 or later), or a standalone binary from GitHub Releases. Docker must be running. macOS and Linux; Windows through WSL 2.
- Languages and runners: Python (pytest); JavaScript and TypeScript (vitest, jest, node:test, bun); Rust (cargo-nextest, early). Go support is in test and not released.
- CLI workflow: \`arnx init\`, \`arnx review\`, \`arnx triage\`, \`arnx accept\`, \`arnx prompt\`, \`arnx check\`. "Pre-commit" here means the point in the workflow before you commit or open a pull request, not a Git pre-commit hook.
- Agent Skill: \`arnx skill install\` writes \`.agents/skills/arnx/\` and \`.claude/skills/arnx/\`. The agent runs one review and the fix loop; init, logins, triage, accept and commits stay with the developer.
- Cost: with your own keys you pay providers directly. Each review stops writing tests at \`review_usd\` (default $3.00). \`arnx check\` makes no model calls.
- Data: tests run in local Docker. The diff, files the reviewer reads, generated tests and their output go to your model providers, or to arnx Cloud when you choose it (it asks consent once per repository).
- Limits: changes up to 200 KB per review; works best on single-package Python and TypeScript repositories; tests that run only in a browser are not run; a failing generated test shows an assertion fails, not that the code is wrong; model replies vary between reviews.

## Start here
- [Quickstart](${origin}/quickstart.html): install, first review, Cloud, the agent skill, costs and common failures.
- [For coding agents](${origin}/agents/): when an agent should use arnx, what needs human approval, and the fix loop.
- [Product](${origin}/product.html): what a finding and a check mean.
- [Source code](${repo.url}): the Apache-2.0 CLI.
- [Agent Skill (SKILL.md)](${repo.skillUrl}): the instructions an agent follows.
- [Checkout demo](${repo.demoUrl}): a small public repository with a labelled planted bug to review.
- [Security and data boundaries](${origin}/security.html): what runs locally and what is sent.
${group("guides")}${group("case-studies")}- [A private Python and Postgres review](${origin}/case-study.html): an owner-run workflow example, not a benchmark.
${group("research")}${group("compare")}
## Optional
- [Full text for agents](${origin}/llms-full.txt): the pages above as one Markdown file.
- [Release documentation](${repo.docsUrl})
- [License](${origin}/license.html)
- [Privacy](${origin}/privacy)
- [Terms](${origin}/terms)
- [Cloud credits](${origin}/credits)
- [Contributing](${origin}/community.html)

This overview does not replace the pages, sitemap or robots.txt, and does not guarantee discovery by AI search.
`;
}
// documents: [{ url, markdown }], already converted from the built pages.
export function llmsFull(release, documents) {
  return `# arnx: full documentation text

> ${productDescription}

Generated from the pages of ${origin} for arnx ${release.cli.version} (checked ${release.checkedAt}). The release documentation at ${release.repository.docsUrl} is canonical for an installed version.

${documents.map((d) => `---\n\nSource: ${d.url}\n\n${d.markdown}`).join("\n\n")}
`;
}
