# Public release handoff

This branch prepares the site for arnx 0.1.0. It must not be pushed to main or deployed by this task. The owner publishes the site after the public repository and npm package are live. No announcement, launch banner, or social sharing campaign is included.

## Source of truth

Copy was checked against the prepared public CLI README and source in the sibling arnx-public checkout, commit e902fb1, on October 22, 2026. The publication target is https://github.com/arnx-dev/arnx, Apache License 2.0, npm @arnx-dev/arnx version 0.1.0.

The final owner decisions are telemetry off by default and Cloud billing described as prepaid USD credit charged for actual review usage, shown per role. New accounts get $5 free; packs add $25 or $100 at face value. Paid top-ups remain closed until the owner switches Stripe to live.

## Before the owner deploys

1. Confirm public README, LICENSE, CONTRIBUTING.md, SECURITY.md, DEVELOPING.md, and src/prompts.ts URLs resolve.
2. Confirm npm has @arnx-dev/arnx 0.1.0 with its executable. Install without private registry credentials using `npm install -g @arnx-dev/arnx`. Check `arnx --version` and `arnx --help`, then run a Docker setup/review/triage/accept/prompt/check smoke test in a disposable repository.
3. Confirm GitHub Releases has macOS/Linux binaries for x64 and arm64 and their SHA256SUMS.
4. Record the actual installation date and evidence in `cli.verifiedAt` and `cli.verificationRecord` in src/release.json. They are null in this branch because registry installation has not been verified.
5. Run format:check, lint, typecheck, test, build, and test:browser on the final source. Review the page at phone width in light and dark themes.
6. Deploy only when those checks are complete. Pushing main triggers the existing GitHub Pages workflow.

## Presentation flags

`repository.publicSource` and `cli.available` are true in this branch to render the requested publication copy locally. They are presentation flags, not proof of publication. The README and this handoff are not copied into the public site. The existing flags can hide installation again if publication is delayed.

Stripe activation is separate from CLI publication. Keep “Top-ups open soon” on /credits until paid top-ups are confirmed working in production.
