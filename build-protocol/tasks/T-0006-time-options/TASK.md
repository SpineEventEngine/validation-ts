# T-0006: Implement Spine Time `(when)` Validation

Status: Approved
Classification: High-risk
Baseline: Current `dev` after T-0005
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

Recorded when T-0006 becomes active.

## Verification

Pending.
