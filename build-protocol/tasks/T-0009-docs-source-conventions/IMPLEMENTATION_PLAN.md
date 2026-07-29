# T-0009 Implementation Plan

## Outcome And Invariants

T-0009 restores `packages/validation/README.md` as the authoritative consumer
guide, relocates repository-only development material to
`packages/validation/docs/`, and makes the approved source conventions
deterministically enforceable. It intentionally changes the experimental
public package surface but not validation results, traversal, ordering,
configuration errors, template substitution, or formatted text.

The implementation owner must preserve these invariants throughout every
slice:

- `validate(schema, message)` remains the only standalone function in
  `packages/validation/src/` and `packages/example/src/`.
- The public value exports are `validate`, `Violations`, and
  `ValidationConfigurationError`. The existing public generated types and
  configuration-error types remain exported.
- `formatViolations` and `formatTemplateString` disappear from the package
  entry point and generated declarations without aliases or a deprecation
  cycle.
- `Violations.formatAll(violations)` produces exactly the former
  `formatViolations(violations)` output. Template substitution remains an
  internal operation owned by `TemplateStrings` and is exercised through
  `Violations.formatMessage()` and `Violations.formatAll()`.
- All other module-scope production and example functions move behind cohesive
  object or class interfaces. Inline callbacks and methods are not standalone
  functions.
- Runtime validator sequence, field traversal, diagnostics, error codes,
  clock-read cadence, nested registry construction, and all existing test
  results remain unchanged.
- The package README is the only consumer guide. Development documents are
  repository-only, live below `packages/validation/docs/`, link back to
  `../README.md`, and are absent from the packed npm artifact.
- Quick-install paths show one executable command. The primary root and package
  commands use the moving `snapshot` tag; an exact preview-version command may
  appear only in a separately labelled alternative section.
- TypeScript convention checks use the TypeScript compiler API. Proto
  convention checks use a project-owned tokenizer; neither check is based on
  generated output or Buf comment lint.
- Every Proto path listed in
  `build-protocol/proto/UPSTREAM_SOURCES.json` is immutable and excluded from
  project-owned comment and naming remediation. Its bytes and checksum must not
  change.
- No dependency, package manager, test runner, module format, publishing
  workflow, or Buf lint policy is changed. In particular, no Buf comment rule
  is added.

## Ownership And Change Boundaries

One `implementer` using `gpt-5.6-terra` with medium reasoning owns all
overlapping files sequentially:

- production and example TypeScript sources and tests;
- project-owned example and test Proto sources;
- `scripts/check-documentation.*` and the new source-convention checker;
- root/package/example Markdown, `typedoc.json`, and package metadata/checks;
- root scripts in `package.json`; and
- T-0009 work logs and task evidence.

The orchestrator owns review dispatch and aggregation, final verification, Git
integration, remote synchronization, and cleanup. Reviewers are read-only.
Generated sources, all frozen Proto files, `master`, publishing, unrelated
baseline debt, Java regular-expression compatibility, validation semantics,
new dependencies, and speculative public helpers are excluded.

The following ownership map is fixed so the refactor deepens existing modules
instead of creating pass-through namespaces:

| Source area                                              | Owning interface                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Validation traversal and registry closure                | Internal `ValidationEngine` object                                                                                                    |
| Template placeholder substitution                        | Internal `TemplateStrings` object                                                                                                     |
| Public violation presentation                            | Public `Violations` object, including `formatAll`                                                                                     |
| Clock reads and test override                            | Internal `ValidationClock` object                                                                                                     |
| Descriptor presence                                      | Internal `Presence` object                                                                                                            |
| Generated option lookup                                  | Internal `ValidationOptions` object                                                                                                   |
| Context creation and field access                        | `ValidationContext` plus internal `MessageFields`                                                                                     |
| Violation envelope construction and legacy normalization | Internal `ViolationFactory` and `ValidationOrchestration` objects                                                                     |
| Numeric parsing, reference resolution, and comparison    | Internal `NumericValues` object                                                                                                       |
| Each option implementation                               | One existing option module object such as `Required`, `Pattern`, `Range`, or `When`; private helpers become methods on the same owner |
| Runnable example scenarios                               | `ExampleScenarios` object                                                                                                             |
| Example console presentation                             | Internal `ConsoleOutput` object                                                                                                       |

Names may be adjusted only when the convention checker demonstrates a
violation, but the replacement must remain at most four semantic words and
must not alter behavior. Generated names are handled with local aliases rather
than generated-file edits.

## Deterministic Checker Contract

Create `scripts/check-source-conventions.mjs` and
`scripts/check-source-conventions.test.mjs`, then expose them through
`pnpm source:check` and the canonical `verify` chain.

The checker contract is:

- Scan checked-in `.ts` files below `packages/validation/` and
  `packages/example/`, excluding generated output, `dist/`, `coverage/`, and
  dependency directories. Apply documentation and standalone-function rules
  only to the two production/example `src/` trees; apply naming rules to
  project-owned source and test TypeScript.
- Parse TypeScript with `ts.createSourceFile`; do not enforce declarations with
  regular expressions.
- Reject every module-scope function declaration or function-valued variable
  except the exported `validate` declaration. Object/class methods and inline
  callbacks are allowed.
- Require TSDoc on module-scope functions, classes, interfaces, type aliases,
  enums, and named object declarations, plus their declared methods,
  properties, enum members, and constructors. Local variables and anonymous
  callback parameters are not documentation declarations.
- Require a callable summary beginning with a third-person present-tense verb,
  one `@param` for every declared parameter, and `@returns` for every
  non-`void`/non-`never` return. The deterministic summary check accepts the
  irregular first words `is`, `has`, and `does`, or a first word ending in
  `s`; documentation review rejects nouns or meaningless prose that happen to
  match. Validate tag names and parameter coverage through AST/JSDoc nodes.
- Reject task IDs, chat transcripts, implementation-history shorthand, and
  workflow/agent language in product TSDoc. Protocol and task files are outside
  the scan.
- Count semantic words by splitting snake/kebab separators and camel/Pascal
  transitions, with a contiguous initialism or numeric run counting as one
  word. Check named TypeScript declarations, members, parameters, local
  variables, and imported bindings across the project-owned source and test
  roots; reject more than four words and report file, line, name, and count in
  stable path/order.
- Read `build-protocol/proto/UPSTREAM_SOURCES.json` and exclude every
  `frozenFiles[].localPath`. Scan the remaining checked-in `.proto` files below
  `packages/validation/proto/`, `packages/validation/tests/proto/`, and
  `packages/example/proto/`.
- Tokenize whitespace, line/block comments, strings, identifiers, punctuation,
  and braces. Associate the immediately preceding documentation comment with
  every message, field, enum, enum value, and oneof, including nested,
  multiline, map, option-bearing, and one-line declarations.
- Reject missing declaration comments and names over four semantic words.
  Report findings deterministically. Do not inspect comment wording with Buf
  or add any `COMMENTS` rule to a `buf.yaml`.

Fixture tests must cover valid and invalid TypeScript declarations, aliases,
generics, optional/rest parameters, explicit and inferred return types,
constructors, object methods, function-valued variables, the `validate`
exception, word splitting, nested/multiline/one-line Proto declarations,
comments containing declaration-like text, strings containing braces, map
fields, enum values, oneofs, and manifest-based frozen-file exclusion.

## Task 1: Lock Convention Tooling With RED/GREEN

Write checker fixtures before implementation.

### RED

Add one minimal fixture expectation for each checker behavior and run:

```bash
node --test scripts/check-source-conventions.test.mjs
```

Record failure because the checker behavior is absent, not because the fixture
cannot load. Implement the TypeScript AST traversal and Proto tokenizer only
after observing the expected failures.

### GREEN

Make the fixture suite pass, add `source:check` to `package.json`, and invoke
the checker against the repository once. The live scan is expected to fail at
this point and its stable report becomes the remediation inventory for Slices
2 and 3.

```bash
node --test scripts/check-source-conventions.test.mjs
pnpm source:check
```

### Acceptance

- Fixture tests prove every rule in the deterministic checker contract.
- Repeated live runs produce byte-identical, path-sorted diagnostics.
- The live failure contains only actionable project-owned TypeScript/Proto
  findings and never reports a generated or manifest-frozen source.
- Existing `buf.yaml` files contain no newly added comment lint configuration.

### Risks

AST aliases, inferred returns, overload-like declarations, nested Proto
declarations, and braces inside strings can create false results. Resolve them
in tokenizer/AST fixtures rather than with path-specific exemptions.

## Task 2: Change The Public Interface And Deepen Source Ownership

Write public-surface and behavior tests before editing production sources.
Update existing internal tests to cross the new owning interfaces instead of
retaining aliases for removed standalone functions.

### RED

Add expectations that:

- `Violations.formatAll()` exists and preserves empty, field, and fallback
  formatting;
- package entry exports do not include `formatViolations` or
  `formatTemplateString`;
- `validate` remains a callable standalone export with its descriptor/message
  type pairing;
- template replacement still treats placeholder keys literally and preserves
  dollar-valued replacements; and
- the example uses `ExampleScenarios.run()` and retains all scenario outputs.

Run:

```bash
pnpm generate
pnpm exec vitest run packages/validation/tests/basic-validation.test.ts \
  packages/validation/tests/validation-contract.test.ts \
  packages/validation/tests/integration.test.ts \
  packages/validation/tests/ordering.test.ts \
  packages/example/tests/scenarios.test.ts
```

Confirm RED is caused by the wished-for object methods/export removals.

### GREEN

Apply the fixed ownership map across all production/example modules. Preserve
existing method bodies and call order while moving them; do not mix semantic
cleanup into the ownership change. Remove both helper exports from
`packages/validation/src/index.ts`, add `Violations.formatAll`, update all
imports/call sites, and keep `TemplateStrings` internal.

Run:

```bash
pnpm generate
pnpm exec vitest run packages/validation/tests \
  packages/example/tests/scenarios.test.ts
pnpm typecheck:generated
```

Then run `pnpm source:check`; standalone-function findings must be gone, while
documentation/naming findings may remain for Slice 3.

### Acceptance

- `validate` is the only standalone function in both checked source roots.
- The package entry point and emitted declarations omit both removed names and
  expose `Violations.formatAll`.
- Formatting output, template substitution, all 319 baseline test behaviors,
  validator ordering, time-clock behavior, and example scenario values remain
  unchanged.
- No compatibility alias or deprecated forwarding export exists.
- New owning objects reduce caller knowledge and keep private helpers within
  their existing module rather than introducing new cross-module seams.

### Risks

Object-method extraction can change `this`, initialization order, recursion, or
callback binding. Use explicit owner references, preserve array ordering, and
verify recursive validation, clock reads, and mapped method callbacks
specifically.

## Task 3: Complete TypeScript TSDoc, Names, And Project-Owned Proto Comments

Use the stable live checker inventory from Slice 1. Work file-by-file, with
TypeScript source first and project-owned Proto fixtures second. Do not touch a
manifest-frozen Proto even if its style would fail a project rule.

### RED

For each rule category, retain a minimal failing fixture test and capture a
representative live failure:

```bash
pnpm source:check
```

The failure must identify the exact undocumented/overlong declaration before
remediation.

### GREEN

- Add reader-facing TSDoc to every checked declaration and member. Callable
  summaries start with a third-person verb; all parameters and non-void returns
  have tags.
- Enable TypeDoc missing-documentation validation for the exported API,
  configure the required reflection kinds, and keep validation warnings fatal.
- Replace historical/task/chat wording with current purpose, inputs, results,
  invariants, and error behavior.
- Rename only checker-proven names over four semantic words, updating tests and
  imports. Alias unavoidable generated names locally.
- Add meaningful comments to every message, field, enum, enum value, and oneof
  in project-owned production, example, and test Proto files. Comments on
  deliberately invalid fixtures describe the fixture purpose without implying
  supported behavior.

Run:

```bash
pnpm source:check
pnpm proto:verify
pnpm proto:lint
pnpm generate
pnpm typecheck:generated
pnpm exec vitest run packages/validation/tests packages/example/tests
```

### Acceptance

- The full convention scan is clean without suppressing a project-owned path.
- TypeDoc accepts all public comments without warnings.
- Every project-owned Proto declaration is documented and within the naming
  limit.
- `pnpm proto:verify` proves all frozen checksums unchanged.
- Generated sources remain deterministic and are not hand-edited.
- Validation and example tests prove comment/naming-only changes did not alter
  runtime behavior.

### Risks

Fixture renames change generated symbol imports, while option-bearing one-line
fixtures are easy to parse or document incorrectly. Regenerate after each
bounded fixture batch and keep invalid declarations semantically identical.

## Task 4: Restore The Authoritative Guide And Relocate Development Docs

Use the 507-line `packages/validation/README.md` from `23335b1^` as the
editorial baseline, not as text to copy blindly. Preserve its useful
prerequisites, setup, quick start, public interface, option overview, behavior,
examples, and limitations while reconciling every claim with current code and
package metadata.

### RED

Extend `scripts/check-documentation.test.mjs` first. Fixtures must fail for:

- two executable commands in one quick-install sequence;
- a moving-tag and exact-version command in the same sequence;
- an exact preview command outside a separately labelled alternative section;
- a broken package-local link;
- package docs that do not link back to the package README;
- removed public helper imports; and
- product Markdown/TSDoc containing prohibited historical workflow language.

Run:

```bash
node --test scripts/check-documentation.test.mjs
```

Confirm the new expectations fail for the intended missing rules.

### GREEN

- Rebuild `packages/validation/README.md` from the historical baseline with the
  current package name/version, Node/Buf/Protobuf-ES/pnpm toolchain, implemented
  options including Spine Time `(when)`, error behavior, regex limitation,
  `validate`, `ValidationConfigurationError`, and all `Violations` methods.
- Put the primary `@snapshot` install command in its own one-command sequence.
  Put the manifest's exact preview version in a clearly separate alternative
  section, also with one command.
- Move `docs/README.md`, `architecture.md`, `contributing.md`, and
  `validation-contract.md` to `packages/validation/docs/`, fixing links.
  Fold useful consumer material from `docs/user-guide.md` into the package
  README and remove that duplicate guide.
- Make the package-local index link to `../README.md`. Keep development docs
  optimized for direct navigation and source ownership without task history,
  chat transcripts, or agent-workflow prose; link to internal protocol
  artifacts when workflow detail is needed.
- Update root and example READMEs to point first to the package guide and then
  to repository-only development references.
- Move TypeDoc output to
  `packages/validation/docs/api/reference/`. Do not add package docs to the
  published `files` allowlist.
- Update all TSDoc and Markdown examples to use `Violations.formatAll` and the
  current public interface.

Run:

```bash
node --test scripts/check-documentation.test.mjs
pnpm docs:check
pnpm source:check
pnpm format:check
```

### Acceptance

- The package README is recognizably restored from the pre-`23335b1` guide but
  contains no obsolete npm/Jest/CommonJS/generated-patching or unsupported
  behavior claims.
- No second consumer guide remains.
- Root, package, example, and development documentation have valid local links
  and compilable TypeScript examples using only public exports.
- Each quick-install sequence contains exactly one command, and exact/moving
  preview installs are visibly alternative choices.
- Reader-facing Markdown and TSDoc contain no task history, chat language, or
  implementation-history shorthand.
- TypeDoc generates below the validation package and reports no warnings.

### Risks

The historical guide contains obsolete generator patching and pre-pnpm
instructions. Treat its organization and explanatory depth as the baseline;
verify every technical statement against current manifests, source, examples,
and frozen contracts.

## Task 5: Package Contract And Canonical Gate Integration

Update `scripts/check-package.mjs` test-first so the installed-consumer smoke
test asserts the new public interface and repository-only docs boundary.

### RED

Require the packed module to expose `validate`, `Violations.formatAll`, and
`ValidationConfigurationError`, reject both removed helper exports, and reject
`docs/` from the archive:

```bash
pnpm package:check
```

Observe the expected failure against the old smoke assertions or package
surface before changing the checker/remaining metadata.

### GREEN

Finish the package checker, ensure `pnpm source:check` is in `pnpm verify`, and
run the pre-review mechanical set:

```bash
pnpm source:check
pnpm docs:check
pnpm proto:verify
pnpm proto:lint
pnpm typecheck:generated
pnpm lint
pnpm format:check
pnpm test:coverage
pnpm proto:check-generated
pnpm package:check
pnpm git:check
git diff --check
```

### Acceptance

- The packed ESM consumer loads the intended new interface and proves both old
  helper names absent.
- Repository-only package docs are not published; the authoritative package
  README is published.
- All four coverage dimensions remain at least 90%.
- Immutable-source verification and generated-output cleanliness pass.
- `verify` invokes deterministic source and documentation convention checks.
- The diff contains no unrelated file, generated-file edit, frozen Proto edit,
  Buf comment policy, dependency change, or `master` change.

## Review And Correction Cadence

The implementer records each observed RED and GREEN command/result in the
T-0009 work log before starting the next slice. After every slice, the
orchestrator receives a concise outcome and next action. Focused checks happen
inside each slice; do not dispatch partial specialist reviews against a moving
diff.

After Slice 5 and the pre-review scan, freeze one diff basis and dispatch one
complete concurrent wave:

- `style_maintainability_reviewer` (`gpt-5.6-terra`, high): module depth,
  ownership, naming, deterministic checker quality, and accidental behavior
  change;
- `documentation_reviewer` (`gpt-5.6-terra`, medium): historical restoration,
  authoritative/package-local split, install alternatives, TSDoc, Proto
  comments, links, and reader-facing language;
- `typescript_api_reviewer` (`gpt-5.6-terra`, high): export removal,
  `Violations.formatAll`, declarations, TypeDoc, type pairing, and installed
  consumer surface; and
- `performance_reliability_reviewer` (`gpt-5.6-terra`, high): bounded,
  deterministic AST/token scans, immutable exclusions, generation, and gate
  wiring.

Security remains a concrete N/A because this task adds no dependency, trust
boundary, publishing change, credential handling, or runtime input behavior.

Collect the whole wave, deduplicate findings, and send one correction batch to
the same implementer. Re-run focused commands for affected slices and reopen
only substantively affected review lanes. Use no more than two complete waves
unless a P0/P1 remains.

After review converges, run fresh:

```bash
pnpm verify
```

The task may proceed to integration only when the full gate passes, coverage is
at least 90% in every dimension, every review concern has a clean/accepted/N/A
disposition, frozen checksums match, and the final diff satisfies every
invariant and exclusion above.
