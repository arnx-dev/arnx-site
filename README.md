# arnx website

Open-source AI code review with executable evidence. This checkout builds the static arnx.dev site; it is not the CLI or the proprietary Cloud service. The website code is licensed under **Apache License 2.0**, with third-party font notices retained.

## Local development

Node.js 22.18 or later is required. Install development dependencies with `npm ci`, then run `npm run dev`. `npm run build` writes only allowlisted public content to `dist/`; internal research, release notes, and artifacts are never copied.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, and `npm run test:browser`. Browser checks use Playwright; set `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome` to use an installed Chrome. HTTP and browser checks need permission to bind localhost.

## Release gates

`src/release.json` is the single source for GitHub links, public-source availability, CLI installation, canonical release docs, and Cloud availability. `scripts/release.mjs` validates it and expands shared HTML partials at build time. No release state is fetched at runtime.

The site documents arnx 0.1.11, checked on 2026-11-12 against tag v0.1.11 and the installed 0.1.11 help. npm lists `@arnx-dev/arnx@0.1.11` as latest, and `arnx skill install` ran in an empty repository. No review was run for this update. See [the release handoff](docs/public-release.md).

The version appears in one place, `src/release.json`; pages take it from the `{{CLI_VERSION}}` token. `npm run verify:release` compares it with npm and GitHub (network needed), and `tests/consistency.test.mjs` fails when a page documents another version, puts accepted tests in the project suite, or gives the old review exit codes.

Home and quickstart lead with install → init → review. The first review sets up only touched projects; whole-repository setup is optional. Product explains before/after evidence and includes the CLI README’s own remove-command example. Accepted tests live outside the project suite, pinned under `.arnx/`; security describes stand-ins and Cloud-only consent.

Cloud activation is documented through the CLI. New accounts start with $5 credit. Paid top-ups remain labeled “Top-ups open soon” until the owner confirms live payments. The credits page describes prepaid USD credit and per-role usage charges. GitHub Discussions remains omitted until enabled and verified.

The quickstart and security copy follow v0.1.7 docs and code; docs/CLOUD.md wins where sources disagree. Cloud processing is described separately from local tool calls, tests, before/after checks, and report generation. The CLI license does not cover proprietary Cloud infrastructure.

The homepage presents BYOM, Cloud, and Enterprise. Enterprise is an email inquiry for private deployment requirements and dedicated support, with scope agreed directly; it does not promise an existing self-hosted Cloud package, local inference, or an SLA. Cloud and Enterprise CTA events contain only curated action/location metadata.

## Pages and content

Permanent pages: product, quickstart, case study, community, license, security, privacy, terms, and Cloud credits. Content pages live in `src/content/` as body fragments with a JSON meta comment, and are served at `/agents/`, `/guides/`, `/case-studies/`, `/research/` and `/compare/`; `scripts/content.mjs` builds their head, breadcrumb and structured data. `llms.txt` and `llms-full.txt` are generated from the pages. See [docs/discovery.md](docs/discovery.md) for crawlers and the maintainer's account actions. `/privacy`, `/terms`, and `/credits` remain compatible with CLI links. The site defaults to light mode; the header toggle switches to dark mode and remembers the choice in local storage. The credits page is informational: it directs users to their own signed top-up link from `arnx credits`, with no payment form or shared checkout link. Paid top-ups are labeled “Top-ups open soon” and review pricing is described as “Pay as you go,” as approved by the owner. The build generates the sitemap, robots file, canonical metadata, and WebPage structured data. There are no ratings, fabricated transcripts, or synthetic testimonials.

Case studies cover public repositories and link to their upstream pull requests; the private Python/Postgres case stays as a workflow example. Research pages publish counts only from recorded, graded runs, with method and limits. Raw private code, logs, and private repository identifiers are not exported, and no finding is described before it was sent upstream. The final check's 54 passed / 0 failing / 1 skipped is a test result, not a bug-catch rate.

## Analytics

The shared build preserves GA4 `G-MMZS9QVW5F`; override with `GA_MEASUREMENT_ID`. Consent behavior is retained. GitHub and documentation links emit one `github_click` or `docs_click`; guided-pilot email links emit `pilot_click`. A successful copy of a released installation command emits `install_copy`. Copying workflow examples does not count as an installation.

Events contain only curated UI locations and destination categories. They do not include email URLs, user input, private repository identifiers, or source. The legacy pilot-form worker remains in `worker/` with its tests, but the public site no longer has a form or invite wall.

## Deployment

This task does not deploy or push. The existing GitHub Pages workflow deploys on a push to `main`; review release gates and the local `HANDOFF.md` before merging. Run build and checks on the final source. Font licenses and the website LICENSE/NOTICE are included in the build.
