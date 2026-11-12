# Public release handoff

This branch updates the site to arnx 0.1.11 and adds the agent, guide, case-study, research and comparison pages. Do not push, merge or deploy it: the owner publishes the site. Pushing main triggers the existing deployment workflow.

## Source of truth

Copy checked on 2026-11-12 against tag v0.1.11 in the sibling public CLI repository: README.md, docs/WORKFLOW.md, docs/MODELS.md, docs/SAFETY.md, docs/CLOUD.md, skills/arnx/SKILL.md and relevant code. The sibling checkout was read through git show and left unchanged. Code and docs/CLOUD.md take precedence over conflicting prose. Commands and flags were checked with installed arnx 0.1.11 help; no model was called for this website update.

## Verification record

npm lists @arnx-dev/arnx@0.1.11 as latest (2026-11-12). `arnx skill install` and `npx skills add arnx-dev/arnx` each ran in an empty repository. arnx cloud was checked live with 0.1.11 on 2026-11-09. No review was run for this update.

## Owner deployment

Review the committed diff and final check results before publication. Keep “Top-ups open soon” on /credits: paid top-ups are not live. This task includes no announcement or deployment.
