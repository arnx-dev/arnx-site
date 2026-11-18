# Public release handoff

This branch updates the site to arnx 0.1.15: `arnx scan` before the review, Go (early) among the languages, and 20 minutes for a first Go or Rust setup. Do not push, merge or deploy it: the owner publishes the site. Pushing main triggers the existing deployment workflow.

## Source of truth

Copy checked on 2026-11-18 against arnx main 3ee9922 (v0.1.15 plus the scan-first README) in the sibling public CLI repository: README.md, docs/WORKFLOW.md, docs/MODELS.md, docs/SAFETY.md, docs/CLOUD.md, plugin/skills/arnx/SKILL.md and relevant code. Code and docs/CLOUD.md take precedence over conflicting prose. Commands and flags were checked with the installed 0.1.15 help.

## Verification record

npm lists @arnx-dev/arnx@0.1.15 as latest (2026-11-18). The README was followed on checkout-demo with 0.1.15 on 2026-11-18: scan, init and review. arnx cloud was checked live with 0.1.15 after its deployment: a scan without model keys and a review, 2026-11-18.

## Owner deployment

Review the diff and final check results before publication. Keep “Top-ups open soon” on /credits: paid top-ups are not live. This task includes no announcement or deployment.
