import { test } from "node:test";
import assert from "node:assert/strict";
import {
  release,
  releaseTokens,
  renderPage,
  validateRelease,
} from "../scripts/release.mjs";

test("release gates reject incomplete source, CLI, or Cloud metadata", () => {
  const config = structuredClone(release);
  config.cli.readinessRecord = null;
  assert.throws(() => validateRelease(config), /release readiness/);
  config.cli.available = false;
  config.repository.publicSource = true;
  config.repository.licenseUrl = null;
  assert.throws(() => validateRelease(config), /LICENSE/);
  config.repository.publicSource = false;
  config.cloud.available = true;
  config.cloud.verificationRecord = null;
  assert.throws(() => validateRelease(config), /readiness verification/);
  config.cloud.available = false;
  config.repository.url = "javascript:alert(1)";
  assert.throws(() => validateRelease(config), /HTTPS/);
});

test("Cloud activation is available independently of pending public CLI installation", () => {
  const pending = structuredClone(release);
  pending.cli.available = false;
  pending.repository.publicSource = false;
  pending.repository.licenseUrl = null;
  const tokens = releaseTokens(pending);
  assert(!tokens.INSTALLATION.includes("install-code"));
  assert.equal(tokens.CLOUD_STATUS, "Available");
  assert(tokens.CLOUD_ACTION.includes("./quickstart.html#cloud"));
  assert(tokens.CLOUD_DESCRIPTION.includes("$5"));
  assert(!tokens.CLOUD_ACTION.includes("api.arnx.dev"));
  assert.equal(tokens.DISCUSSIONS_LINK, "");
  assert(!tokens.REPOSITORY_LICENSE.includes("/blob/"));
  const config = structuredClone(release);
  config.cloud.available = false;
  config.cloud.pilot = true;
  assert.equal(releaseTokens(config).CLOUD_STATUS, "Early pilot");
  assert(releaseTokens(config).CLOUD_ACTION.includes("mailto:"));
  config.cloud.pilot = false;
  assert.equal(releaseTokens(config).CLOUD_STATUS, "Coming soon");
  assert(!releaseTokens(config).CLOUD_ACTION.includes("mailto:"));
});

test("a verified release enables its exact command and canonical source links safely", async () => {
  const config = structuredClone(release);
  config.repository.publicSource = true;
  config.repository.licenseUrl =
    "https://github.com/arnx-dev/arnx/blob/main/LICENSE";
  config.cli = {
    available: true,
    version: "test-version",
    installCommand: 'npm install --global @example/test@1.0.0 && echo "<ok>"',
    verifiedAt: "2026-10-21",
    verificationRecord: "docs/install-verification.md",
    readinessRecord: "docs/public-release.md",
  };
  const html = await renderPage(
    "{{INSTALLATION}} {{REPOSITORY_LICENSE}}",
    config,
  );
  assert(html.includes('id="install-code"'));
  assert(html.includes("&amp;&amp;") && html.includes("&lt;ok&gt;"));
  assert(html.includes(config.repository.licenseUrl));
  assert(!html.includes("<ok>"));
  await assert.rejects(() => renderPage("{{UNKNOWN_TOKEN}}"), /Unresolved/);
});

test("public release presents versioned instructions without inventing installation verification", () => {
  const tokens = releaseTokens();
  assert.equal(release.cli.version, "0.1.0");
  assert(tokens.INSTALLATION.includes("npm install -g @arnx-dev/arnx"));
  assert(!tokens.INSTALLATION.includes("Verified"));
  assert(tokens.REPOSITORY_LICENSE.includes("/blob/main/LICENSE"));
  assert(tokens.CONTRIBUTING_LINK.includes("/blob/main/CONTRIBUTING.md"));
  const config = structuredClone(release);
  config.cli.verifiedAt = "2026-10-22";
  assert.throws(() => validateRelease(config), /both a date and record/);
});
