# Validation TS Build Protocol

This directory contains the permanent workflow and technical baseline for
autonomous development of `@spine-event-engine/validation`.

## Governing Documents

1. [BUILD_PROTOCOL.md](BUILD_PROTOCOL.md) — approved task lifecycle, roles,
   review, Git integration, remote synchronization, and blocker policy.
2. [CODE_QUALITY.md](CODE_QUALITY.md) — TypeScript, testing, documentation,
   dependency, generated-source, and compatibility standards.
3. [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) — current product and contract
   boundary.
4. [CONTRIBUTOR_WORKFLOW.md](CONTRIBUTOR_WORKFLOW.md) — concise task-agent and
   reviewer operating guide.
5. [PROJECT_PLAN.md](PROJECT_PLAN.md) — active milestones and known follow-up
   work.
6. [DECISION_LOG.md](DECISION_LOG.md) — accepted architectural and workflow
   decisions.

Task records live under `tasks/`, branch work logs under `work-logs/`, review
evidence under `reviews/`, unresolved questions under `questions/`, immutable
Proto provenance under `proto/`, and reusable records under `templates/`.

Historical artifacts from the Spine TS reference project are intentionally not
copied. Only the reusable protocol structure and rules applicable to this
smaller library are retained.
