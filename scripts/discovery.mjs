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
export function softwareApplication(release) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${origin}/#software`,
    name: "arnx",
    url: `${origin}/`,
    description:
      "arnx is an Apache-2.0 open-source CLI that investigates code changes, generates and executes tests for suspected bugs, and retains accepted tests as regression checks.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    sameAs: release.repository.url,
    installUrl: `${origin}/quickstart.html`,
    featureList: [
      "Code change investigation",
      "Test generation and execution for suspected bugs",
      "Accepted regression tests",
    ],
  };
}
export function llms(release) {
  return `# arnx\n\n> Apache-2.0 open-source CLI for AI code review with executable evidence.\n\narnx investigates code changes, generates and executes tests for suspected bugs, and retains accepted tests as regression checks. Tool calls and Docker tests run locally. Model processing can use your own API keys or arnx Cloud; Cloud is a separate proprietary service. See the security and privacy pages for data flow.\n\n## Product and documentation\n- [Product](${origin}/product.html)\n- [Documentation](${release.repository.docsUrl})\n- [Installation and quickstart](${origin}/quickstart.html)\n- [Source code](${release.repository.url})\n- [License](${origin}/license.html)\n\n## Case studies\n- [A real review, accepted tests, and a checked fix](${origin}/case-study.html): an individual workflow example, not a general benchmark.\n\n## Policies\n- [Security](${origin}/security.html)\n- [Privacy](${origin}/privacy)\n- [Terms](${origin}/terms)\n- [Cloud credits](${origin}/credits)\n- [Contributing](${origin}/community.html)\n\nThis optional overview does not replace the pages, sitemap, or robots.txt and does not guarantee AI search discovery.\n`;
}
