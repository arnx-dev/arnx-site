# Public release handoff

This branch updates the site to arnx 0.1.7. Do not push, merge or deploy it: the owner publishes the site. Pushing main triggers the existing deployment workflow.

## Source of truth

Copy checked on 2026-11-03 against tag v0.1.7 in the sibling public CLI repository, source commit 7572415: README.md, docs/WORKFLOW.md, docs/MODELS.md, docs/SAFETY.md, docs/CLOUD.md, skills/arnx/SKILL.md and relevant code. The sibling checkout was read through git show and left unchanged. Code and docs/CLOUD.md take precedence over conflicting prose. Commands and flags were checked with installed arnx 0.1.7 help; no model was called for this website update.

## Verification record

Installed from npm as @arnx-dev/arnx@0.1.7, then one arnx review ran end to end with arnx cloud. Both verification dates are 2026-11-03. This records only that verification; it does not claim a full setup/accept/check smoke test.

## Owner deployment

Review the committed diff and final check results before publication. Keep “Top-ups open soon” on /credits: paid top-ups are not live. This task includes no announcement or deployment.
