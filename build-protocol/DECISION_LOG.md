# Decision Log

## D-0001: Adopt the Spine TS agentic protocol structure

Date: 2026-07-24

Use the reusable risk classification, resumability records, selective
specialist reviews, worktree ownership, verification cadence, and remote
closure rules from `/Users/armiol/development/experiments/spine-ts`. Do not
copy its historical task corpus or server-, transport-, DDD-, or example-
specific product rules.

## D-0002: Require plan approval before implementation

Date: 2026-07-24

For every user-supplied task, investigate, resolve material questions, present
a plan, and wait for explicit approval. After approval, continue autonomously
through verification, review, integration, and push unless a defined blocker
occurs.

## D-0003: Use only dispatchable Sol and Terra profiles

Date: 2026-07-24

Use Sol Medium for orchestration, Sol High for architecture-significant
planning, Terra Medium for implementation and mechanical/documentation work,
and Terra High for difficult correctness and specialist review. Do not retain
unexecutable Luna profiles.

## D-0004: Integrate through dev

Date: 2026-07-24

`master` remains the publishing branch and is changed only through a
human-requested PR. `dev` is the primary integration branch. Task branches and
worktrees start from `dev`, merge back into `dev`, and both refs are pushed and
verified at closure. Automatic publication on `master` push remains enabled.

## D-0005: Rename the npm package

Date: 2026-07-24

Rename every legacy package, workspace, directory, import, and documentation
surface consistently to `@spine-event-engine/validation`. T-0001 advances the version to
`2.0.0-snapshot.5`.

## D-0006: Establish a coverage ratchet

Date: 2026-07-24

Initially enforce at least 80% statements, 80% lines, 70% branches, and 90%
functions without regression. Reach 90% in every dimension before substantial
behavioral expansion.

## D-0007: Freeze upstream Proto sources

Date: 2026-07-24

The documentation in `spine/options.proto` and later
`spine/time_options.proto` is the primary contract source. Pin every intake to
an upstream commit and checksum. Never edit vendored Proto files. Exempt their
upstream style from local Buf style enforcement while continuing compilation
and provenance verification.

## D-0008: Defer broad toolchain migration

Date: 2026-07-24

T-0001 adds a committed npm lockfile, Node/tool pins, verification scripts,
coverage, lint, formatting, API docs, deterministic generation checks, and PR
CI. Migration from npm/Jest/CommonJS to the corresponding current Spine TS
pnpm/Vitest/ESM stack requires a separately approved task.

## D-0009: Preserve the legacy Proto baseline

Date: 2026-07-24

The three pre-existing local `options.proto` copies are identical to each other
but do not byte-match the current upstream `base-libraries` file. Their original
upstream commit is not established by repository history. Freeze and checksum
the existing files without false provenance, record current upstream
`options.proto` and `time_options.proto` commits separately, and require a
future approved intake task before replacement or addition.

## D-0010: Use minimal Buf style enforcement during bootstrap

Date: 2026-07-24

Use Buf `STANDARD` lint for every module. Apply path-and-rule-specific
exceptions only where a frozen upstream input or pre-existing fixture layout
cannot comply without changing its contract or location. Compilation,
generation, and checksum verification remain mandatory for frozen inputs.
