# Unresolved Questions

## Q-0001: How should Validation TS execute Java regular expressions?

Status: Advisory
Task: T-0002 follow-up
Raised: 2026-07-24

### Context

The frozen `(pattern)` option documentation says that `regex` is supplied to
Java `Pattern.compile()`. The current TypeScript implementation uses native
ECMAScript `RegExp`, whose dialect, whole-match behavior, Unicode semantics,
and modifiers are not equivalent.

Scala.js was considered behaviorally relevant but rejected as a
disproportionately large integration. No small maintained dependency was
identified that implements Java `Pattern` semantics. A project-owned
compatibility engine was proposed and rejected for now because of its
maintenance burden.

### Options

1. Adopt a maintained Java-compatible dependency with acceptable runtime and
   package cost.
2. Implement and maintain a project-owned compatibility layer.
3. Define a deliberately smaller cross-platform pattern contract in an
   upstream Proto revision.
4. Identify another solution that preserves shared JVM/TypeScript schemas.

### Human Answer Or Decision

Postpone the issue until the other correctness and coverage work is complete.
Do not integrate a large third-party library or create a project-owned engine
in T-0002.

### Incorporated In

- `../PROJECT_PLAN.md`
- `../TECHNICAL_SPEC.md`
- `../tasks/T-0002-validation-correctness/TASK.md`

Resolved T-0001 questions and human answers remain recorded in
`../tasks/T-0001-protocol-bootstrap/TASK.md` and `../DECISION_LOG.md`.
