# T-0006: Implement Spine Time `(when)` Validation

Status: Review complete; integration pending
Classification: High-risk
Baseline: `69a885f2f8f8708e93821e444be2d1c95eff38d6`
Branch: `task/T-0006-time-options`
Worktree: `.worktrees/T-0006-time-options`
Approved plan: Human approval in the Codex task on 2026-07-28

## Acceptance Criteria

- Freeze immutable `spine/time_options.proto` and required `spine/time.proto`
  inputs at Spine Time commit
  `4daeedfb6a1f961c0fa8dc3692b330d370dbfbbc`, recording raw URLs, retrieval
  date, destinations, and SHA-256 checksums.
- Implement `(when)` for Google `Timestamp` and Spine `YearMonth`,
  `LocalDate`, `LocalDateTime`, deprecated `OffsetDateTime`, and
  `ZonedDateTime`; reject unsupported option targets.
- Match approved JVM behavior for undefined options, equal-now boundaries,
  singular defaults, repeated/map defaults, one violation per offending
  element, field paths and values, template selection, unsupported
  placeholders, and conversion errors.
- Use Java-compatible IANA overlap and gap behavior for `ZonedDateTime`
  without introducing a broad dependency; document runtime tzdb dependence.
- Add exhaustive tests while preserving at least 90% statements, branches,
  functions, and lines.
- Add time-based options to the runnable example and update maintained user,
  contract, architecture, contributor, example, API, and protocol
  documentation. Root README changes remain necessary-only.
- Advance every workspace package consistently to
  `2.0.0-snapshot.6`.
- The reviewed task branch and merged `dev` pass fresh full gates and are
  pushed. `master` remains untouched.

## Human-Imposed Requirements Ledger

| Requirement                                                                                           | Source                       | Verification                            |
| ----------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| JVM Time may be used and runtime behavior must match Spine JVM Validation.                            | Human decision               | JVM comparison notes and behavior tests |
| Proto documentation remains the primary immutable contract source.                                    | Prior human decision         | Provenance and checksum gate            |
| Include time-based options in the example.                                                            | Human task                   | Example tests and compiled run          |
| Silently emit an empty diagnostic if `default_message` is absent and the JVM accepts the declaration. | Prior human decision         | Exact tests                             |
| Do not modify frozen Proto style to satisfy Buf.                                                      | Prior human decision         | Byte checksum and lint configuration    |
| Work autonomously, push task/integration refs, and keep `master` untouched.                           | Human task and branch policy | Remote-ref verification                 |

## Approved JVM Comparison Contract

- `TIME_UNDEFINED` disables validation.
- Equality with the current instant is valid for both past and future.
- Time is read once per scalar value or collection element.
- Singular default values are skipped; repeated and map default-valued
  elements are evaluated.
- Each offending collection element produces one violation on the collection
  field path with that element as `fieldValue`.
- `YearMonth` maps to its first day at UTC midnight; `LocalDate` to UTC
  midnight; `LocalDateTime` to UTC; `OffsetDateTime` uses its explicit offset;
  `ZonedDateTime` uses Java-compatible IANA gap and overlap resolution.
- Invalid temporal conversion throws rather than becoming a violation.
- `error_msg` overrides `default_message`; `msg_format` is ignored.
- Unsupported targets and diagnostic placeholders are configuration errors.
- JVM Validation adds no parent summary for nested validation.

## Dependency Boundary

Use `temporal-polyfill@1.0.1` only for the small, tree-shakeable
`ZonedDateTime` conversion seam. Do not integrate a broad date/time framework.
Exact historical IANA offsets depend on the runtime tzdb and must be documented.

## Agent Dispatch

| Role/function                | Agent ID                   | Expected model  | Expected reasoning | Scope                                                                         | Status                                       |
| ---------------------------- | -------------------------- | --------------- | ------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| Requirements split (initial) | `/root/t0006_requirements` | `gpt-5.6-sol`   | high               | Split Proto intake, JVM parity, temporal conversion, tests, example, and docs | Interrupted and closed after bounded timeout |
| Requirements split (final)   | `/root/t0006_split_final`  | `gpt-5.6-sol`   | high               | Final implementation/test/gate audit of the approved contract                 | Complete and closed                          |
| Implementation               | `/root/t0006_implementer`  | `gpt-5.6-terra` | medium             | Own T-0006 Proto, runtime, tests, dependency, example, version, and docs      | Complete and closed                          |
| TypeScript/API review        | `/root/t0006_api`          | `gpt-5.6-terra` | high               | Public API, descriptors, declarations, and Proto compatibility                | Complete and closed                          |
| Reliability review           | `/root/t0006_reliability`  | `gpt-5.6-terra` | high               | Temporal arithmetic, clocks, malformed values, zones, and bounded execution   | Complete and closed                          |
| Security review              | `/root/t0006_security`     | `gpt-5.6-terra` | high               | Dependency, untrusted temporal/zone inputs, provenance                        | Complete and closed                          |
| Documentation review         | `/root/t0006_docs`         | `gpt-5.6-terra` | medium             | Maintained user/agent/protocol/package/example documentation                  | Complete and closed                          |
| Style/maintainability review | `/root/t0006_style`        | `gpt-5.6-terra` | high               | Correctness, contract fixtures, ordering, and module ownership                | Complete and closed                          |

## Skills

| Skill                            | Selected? | Reason                                                                        |
| -------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `executing-plans`                | Yes       | Execute the approved behavior milestone with durable checkpoints.             |
| `subagent-driven-development`    | Yes       | Keep one writer across immutable Proto, runtime, fixtures, example, and docs. |
| `using-git-worktrees`            | Yes       | Isolate the high-risk serialized and runtime contract change.                 |
| `test-driven-development`        | Yes       | Specify JVM-matching time semantics before implementation.                    |
| `codebase-design`                | Yes       | Add a narrow temporal-conversion seam and keep validation orchestration deep. |
| `javascript-testing-patterns`    | Yes       | Cover deterministic clocks, collections, errors, zones, and public examples.  |
| `requesting-code-review`         | Yes       | Require correctness/API/reliability/documentation specialist review.          |
| `verification-before-completion` | Yes       | Require focused, canonical, package, and post-merge evidence.                 |

## Scope And Ownership

- One implementation owner owns all overlapping frozen Proto intake,
  generation configuration, runtime, tests, dependency/lockfile, example,
  versions, and maintained documentation.
- The orchestrator owns task/review records, review aggregation, verification,
  Git integration, remote synchronization, and worktree cleanup.
- Review agents are read-only and closed immediately after reporting.
- Excluded: Java regex compatibility, unrelated option behavior, public
  validator extensibility, recursion budgets, broad date/time frameworks,
  publication, and `master`.

## Implementation Plan

1. Freeze byte-identical `time_options.proto` and `spine/time/time.proto` in
   every package/test Proto module that needs them; update exact provenance,
   compilation, lint exceptions, and deterministic generation checks.
2. Add behavior-first fixtures and a deterministic clock seam for scalar,
   repeated, and map `(when)` validation across Timestamp and all approved
   Spine Temporal messages, including exact diagnostics and configuration
   errors.
3. Implement a narrow internal temporal conversion module. Use native
   arithmetic for UTC/offset types and `temporal-polyfill@1.0.1` only for
   Java-compatible `ZonedDateTime` IANA gap/overlap resolution.
4. Add `(when)` to the fixed internal field-validator sequence and exact option
   registry; preserve field order, collection element order, and one violation
   per offending element.
5. Advance every package/workspace to `2.0.0-snapshot.6`, add time scenarios to
   the tested/compiled example, and update maintained contract, user,
   architecture, contributor, example, package, TypeDoc, Proto, and protocol
   docs with necessary-only root README changes.
6. Run focused semantic/type/provenance/example checks, a complete specialist
   review wave, one deduplicated correction batch, independent `pnpm verify`,
   task push, `dev` integration, post-merge verification, and remote-ref
   confirmation.

Test groups must separately cover control flow/clock reads/default handling,
collection violation shape and order, every temporal conversion and invalid
value, diagnostics/configuration errors, nested leaf-only behavior and
validator order, and example execution. New York fixtures pin the Java
compatible gap result `2024-03-10T02:30 -> 07:30Z` and overlap result
`2024-11-03T01:30 -> 05:30Z`.

## Decisions And Questions

- Exact upstream checksums:
  `time_options.proto=933858bdbb118930a171d9a2383d884b498d7ed465a35664f2f411a72785f5be`;
  `spine/time/time.proto=da0e7482c69fb6e735441a4934222c054ec9795d7d4b46347751fccb5f692062`.
- JVM comparison source:
  Spine Time `4daeedfb6a1f961c0fa8dc3692b330d370dbfbbc` and JVM Validation
  `336d6f2bfab2ca6288283dbb64762456c61b31e0`.
- The approved contract above resolves all material human questions.

## Verification

| Command                         | Result                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline `pnpm verify`          | Passed: four generation-guard tests, 15 files / 300 tests, all canonical gates                                                            |
| Final focused `(when)` suites   | Passed: 18 tests                                                                                                                          |
| Final independent `pnpm verify` | Passed: 17 files / 319 tests; 94.71% statements, 91.51% branches, 99.19% functions, 95.96% lines; all canonical gates and packed consumer |
| Final documentation correction  | Prettier, `pnpm docs:check`, `git diff --check`, and documentation re-review passed                                                       |

Coverage: 94.07% statements, 91.56% branches, 99.03% functions, and 95.40%
lines.

## Review Dispositions

| Concern                 | Reviewer                  | Disposition | Evidence                                                                                     |
| ----------------------- | ------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Style/maintainability   | `/root/t0006_style`       | Clean       | Exact JVM Timestamp range, conversion, registry, ordering, and corrected tests reviewed.     |
| Documentation           | `/root/t0006_docs`        | Clean       | Contract, imports, provenance, technical spec, package/example, and root README reviewed.    |
| TypeScript/API          | `/root/t0006_api`         | Clean       | Descriptor/public error shape, unknown enum handling, package/API surface reviewed.          |
| Performance/reliability | `/root/t0006_reliability` | Clean       | Defaults, clocks, BCE, ranges, DST gap/overlap, collections, and malformed values reviewed.  |
| Security                | `/root/t0006_security`    | Clean       | Dependency, immutable provenance, bounded zone input, and stable cause-free errors reviewed. |

## Findings

See the canonical, deduplicated findings and dispositions in
`build-protocol/reviews/T-0006.md`.

## Integration

- Task head and push: `913f6bbb11f84b142e856e8368b55d7a6a378460`
  pushed to `origin/task/T-0006-time-options`; final documentation closure
  commit pending.
- `dev` merge:
- Post-merge verification:
- Remote refs:
- Worktree cleanup:
