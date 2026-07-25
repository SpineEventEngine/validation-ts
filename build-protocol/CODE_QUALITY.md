# Code Quality

## Design

- Prefer the smallest API that expresses documented Proto behavior.
- Keep validation-option implementations modular and behavior-focused.
- Do not claim dynamic extensibility unless a supported registration API
  exists.
- Do not invent JVM tooling or plugin concepts that have no TypeScript
  equivalent.
- Use explicit types at public boundaries and reduce `any` when the affected
  task can do so without speculative abstraction.
- Keep errors actionable and avoid leaking entire message payloads.

## TypeScript And Packaging

- Use strict TypeScript compilation.
- Document public exports with TSDoc that TypeDoc can render.
- Keep package metadata, exports, declarations, examples, and README imports
  consistent with `@spine-event-engine/validation`.
- npm, Jest, and CommonJS remain until an approved migration.
- Generated Protobuf-ES output is ignored and regenerated.
- `package-lock.json` is committed; CI uses `npm ci`.
- Pin development Node through `.node-version` and enforce supported engines.

## Source Layout

- Production source lives under `packages/validation/src/`.
- Tests live under `packages/validation/tests/`.
- The smoke consumer lives under `packages/example/`.
- Generated code stays in ignored `src/generated/` and `tests/generated/`.
- Shared verification scripts live under root `scripts/`.

## Formatting And Lint

- Prettier is the canonical formatter.
- ESLint enforces TypeScript correctness and maintainability.
- Prefer 100-character lines; the hard ceiling is 120 where reflow would harm
  clarity.
- Generated sources, coverage, distributions, API output, worktrees, and
  immutable vendored Proto files are excluded from inappropriate checks.
- `npm run format:check` and `npm run lint` are required gates.

## Testing

- Use behavior-focused unit tests for each option.
- Add integration tests for combinations and nested field paths.
- Every bug fix receives a regression test.
- Public package changes receive a package-contents and consumer-install test.
- Keep test compilation strict; do not weaken TypeScript only for Jest.
- The enforced coverage gate is at least 90% statements, branches, functions,
  and lines.

## Protobuf

- Treat frozen upstream Proto files as immutable contract inputs.
- Record exact upstream commit and SHA-256.
- Never patch their content for local formatting or Buf style.
- Lint project-owned Proto files and compile all required Proto inputs.
- Generated source compatibility patches must fail loudly if expected output
  is absent or changes unexpectedly.

## Documentation

Update only affected surfaces:

- root README for repository and contributor workflow;
- package README for installation, public API, and behavior;
- example README for the consumer workflow;
- TypeDoc comments for public declarations;
- technical baseline for behavior or boundary changes;
- decision log for architectural, tooling, dependency, or compatibility
  decisions.

Claims must match verified code. Avoid counts or coverage percentages unless a
gate maintains them automatically or the date/evidence is explicit.

## Reliability And Security

Review runtime changes for:

- unbounded nested validation;
- unsafe or catastrophic regular expressions;
- descriptor and message shape assumptions;
- duplicate or misleading violations;
- deterministic generation;
- memory retention and repeated metadata work;
- dependency install and publishing integrity;
- sensitive values in diagnostic output.

Security review is required before a ready-for-use release and earlier only
when explicitly requested.

## Dependency Selection

Before adding or upgrading a library, record:

- current stable version and source;
- maintenance and Node/TypeScript support;
- compatibility with the retained npm/Jest/CommonJS stack;
- why an existing dependency or platform feature is insufficient; and
- the rejected alternatives that materially affected the choice.

Pin development tools in the lockfile. Public runtime compatibility belongs in
peer dependencies and engines.
