# arnx website

Open-source AI code review with executable evidence. This checkout builds the static arnx.dev site; it is not the CLI or the proprietary Cloud service. The website code is licensed under **Apache License 2.0**, with third-party font notices retained.

## Local development

Node.js 22.18 or later is required. Install development dependencies with `npm ci`, then run `npm run dev`. `npm run build` writes only allowlisted public content to `dist/`; internal research, release notes, and artifacts are never copied.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, and `npm run test:browser`. Browser checks use Playwright; set `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome` to use an installed Chrome. HTTP and browser checks need permission to bind localhost.

## Release gates

`src/release.json` is the single source for GitHub links, public-source availability, CLI installation, canonical release docs, and Cloud availability. `scripts/release.mjs` validates it and expands shared HTML partials at build time. No release state is fetched at runtime.

This branch is prepared for arnx 0.1.0. Source and CLI presentation flags are enabled, so the local build displays the public repository and installation command. **Do not deploy until the owner confirms the repository, npm package, and release binaries are public.** The metadata describes the intended release, not a claim that the package was installed from npm. `cli.verifiedAt` and `cli.verificationRecord` stay null until that check actually happens. `cli.readinessRecord` points to [the publication handoff](docs/public-release.md).

Before deployment, install 0.1.0 without private registry credentials, verify `arnx --version` and `arnx --help`, and complete a Docker setup/review/accept/check smoke test. Check the LICENSE, CONTRIBUTING, SECURITY, release binaries and SHA256SUMS links. Record installation verification afterward. The build checks metadata completeness; it does not prove publication or service readiness.

Cloud activation is documented through the CLI. New accounts start with $5 credit. Paid top-ups remain labeled “Top-ups open soon” until the owner confirms live payments. The credits page describes prepaid USD credit and per-role usage charges. GitHub Discussions remains omitted until enabled and verified.

The quickstart and privacy/security copy follow the public CLI README: telemetry is off by default, `arnx init` writes `telemetry = false`, and users opt in with `telemetry = true`. Environment opt-out controls override configuration. Cloud processing is described separately from local tool calls, tests, before/after checks, and report generation. The CLI license does not cover proprietary Cloud infrastructure.

The homepage presents BYOM, Cloud, and Enterprise. Enterprise is an email inquiry for private deployment requirements and dedicated support, with scope agreed directly; it does not promise an existing self-hosted Cloud package, local inference, or an SLA. Cloud and Enterprise CTA events contain only curated action/location metadata.

## Pages and content

Permanent pages: product, quickstart, case study, community, license, security, privacy, terms, and Cloud credits. `/privacy`, `/terms`, `/credits`, and `/privacy#telemetry` remain compatible with CLI links. The credits page is informational: it directs users to their own signed top-up link from `arnx credits`, with no payment form or shared checkout link. Paid top-ups are labeled “Top-ups open soon” and review pricing is described as “Pay as you go,” as approved by the owner. The build generates the sitemap, robots file, canonical metadata, and WebPage structured data. There are no ratings, fabricated transcripts, or synthetic testimonials.

Only the existing public case study is included. Internal evaluations must not be added to website content or committed to this repository. Raw private code, logs, and repository identifiers are not exported. The final check's 54 passed / 0 failing / 1 skipped is a test result, not a bug-catch rate.

## Analytics

The shared build preserves GA4 `G-MMZS9QVW5F`; override with `GA_MEASUREMENT_ID`. Consent behavior is retained. GitHub and documentation links emit one `github_click` or `docs_click`; guided-pilot email links emit `pilot_click`. A successful copy of a released installation command emits `install_copy`. Copying workflow examples does not count as an installation.

Events contain only curated UI locations and destination categories. They do not include email URLs, user input, private repository identifiers, or source. The legacy pilot-form worker remains in `worker/` with its tests, but the public site no longer has a form or invite wall.

## Deployment

This task does not deploy or push. The existing GitHub Pages workflow deploys on a push to `main`; review release gates and the local `HANDOFF.md` before merging. Run build and checks on the final source. Font licenses and the website LICENSE/NOTICE are included in the build.
