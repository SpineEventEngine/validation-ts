# T-0002 Implementation Plan

## Global Constraints

- The frozen Proto documentation is the runtime contract. Do not edit frozen
  Proto files.
- Java-regex compilation, matching, dialect, modifiers, and acceptance behavior
  are excluded. Pattern code may only be adapted mechanically to shared
  orchestration and violation construction.
- Violation traversal is deterministic: message-level `(require)`, then fields
  in declaration order, validators in the fixed order `required`, `pattern`,
  `min`, `max`, `range`, `distinct`, `validate`, `goes`, then oneofs in
  declaration order for `(choice)`. This order is not a public compatibility
  guarantee.
- `FieldPath` contains unqualified Proto field names only. Repeated indices and
  map keys are not field names and must not be inserted into the path.
- Every violation uses the root validation-entry `typeName`, the complete field
  path, a descriptor-aware packed `fieldValue` when a violating value exists,
  and a present `TemplateString`.
- If both custom and default diagnostic text are empty, emit a present empty
  `TemplateString`; do not throw, log, or invent fallback wording.
- The public configuration-error code vocabulary is exactly
  `UNSUPPORTED_OPTION_TARGET`, `INVALID_OPTION_VALUE`,
  `UNKNOWN_FIELD_REFERENCE`, and `INVALID_FIELD_REFERENCE`. Canonical `option`
  values omit parentheses.
- One implementation owner sequentially owns all overlapping production code,
  tests and fixtures, Jest thresholds, and directly affected README/API docs.
- Use behavior-focused TDD for every runtime change: capture the failing command
  and expected failure before production changes, then the passing command.
- Preserve npm, Jest, CommonJS, current dependencies, immutable Proto sources,
  and all unrelated user changes.
- Do not add Java-regex dependencies or an engine, change
  `spine/time_options.proto`, publish, or merge/push `master`.

## Task 1: Contract Kernel And Public Diagnostics

Create the shared validation context and violation-construction kernel:

- root validation-entry type and current Proto field path;
- descriptor-aware field-value formatting and `Any` packing for scalar wrappers,
  bytes, enums, messages, and packable collection elements;
- default/custom/empty `TemplateString` resolution and documented placeholders;
- exported `ValidationConfigurationError` with stable `code`, `option`,
  `typeName`, optional `fieldPath`, and optional `cause`.

`fieldValue` may be absent only when a constraint has no individual offending
value that the frozen violation schema can represent. Do not change frozen
Proto files.

Acceptance tests must cover primitive, bytes, enum, and message packing; root
type and field path; custom/default/empty templates; and all public error
properties.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/validation-contract.test.ts tests/basic-validation.test.ts
```

## Task 2: Deterministic Orchestration

Introduce one internal field-validator interface over the shared context and
change `validate()` to the fixed ordering in Global Constraints. Adapt every
implemented option to that interface. The pattern adapter must preserve all
existing regex compilation and matching behavior; only its orchestration and
shared violation envelope may change.

Acceptance tests must prove field-first ordering, stable validator ordering,
stable repeated-element ordering, root type, and field-name-only paths.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/ordering.test.ts tests/integration.test.ts
```

Depends on Task 1.

## Task 3: Presence Semantics

Correct `(required)`, message-level `(require)`, `(goes)`, and oneof `(choice)`
using one descriptor-aware presence implementation:

- messages and enums are set only when non-default;
- strings and bytes are set only when non-empty;
- repeated fields and maps are set only when non-empty;
- numeric and boolean fields are unsupported targets except when referenced
  through a oneof name in `(require)`;
- `(require).fields` supports Proto-documented `&` groups and `|` alternatives,
  including oneof names; parentheses are not part of the grammar;
- missing or incompatible targets throw the approved structured configuration
  error rather than warning or silently passing.

Acceptance tests must cover exact default/custom/empty templates, placeholders,
field-name-only paths, packed values, one violation per failed option, invalid
targets, invalid expressions, and oneof presence.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/required.test.ts tests/required-field.test.ts \
  tests/goes.test.ts tests/choice.test.ts
```

Depends on Tasks 1 and 2.

## Task 4: Exact Numeric Bounds And References

Correct `(min)`, `(max)`, and `(range)`:

- complete-string integer and floating grammars;
- scalar range checks and unsigned-negative rejection;
- bigint-safe 64-bit comparison;
- inclusive and exclusive bounds;
- nested numeric field references resolved through descriptors;
- missing, non-numeric, repeated, or map references rejected with the approved
  configuration errors;
- documented reference and actual-value placeholders;
- identical behavior for singular and repeated numeric values, using the
  collection field path and packing the failing element.

Acceptance tests must include malformed suffixes, wrong integer/float syntax,
overflow, unsigned negatives, 64-bit precision, nested references, mixed
numeric field types, and reference-driven bounds.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/min-max.test.ts tests/range.test.ts
```

Depends on Tasks 1 through 3.

## Task 5: Buf-Equality Distinct

Correct `(distinct)` with Buf equality:

- `scalarEquals()` for scalar and bytes values;
- numeric equality for enum values;
- `equals()` with the value message schema for message values;
- equality classes retained in first-occurrence order;
- exactly one violation per class occurring more than once;
- collection field path, one packed duplicate representative, the whole
  collection in `${field.value}`, and a singleton duplicate list in
  `${field.duplicates}`.

Acceptance tests must cover repeated and map values, structural messages,
bytes, bigint, and `[A, A, A, A, B, B, C]`.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/distinct.test.ts
```

Depends on Tasks 1 and 2 and follows Task 4 to preserve one writer.

## Task 6: Leaf-Only Nested Validation

Correct `(validate)`:

- recurse with the original root context;
- prefix field-name-only paths for singular, repeated, and map values;
- propagate leaf violations only;
- singular absent/default messages remain valid;
- repeated and map default elements are validated;
- known packed `Any` messages are unpacked and validated using a registry built
  from the root schema file and dependency descriptor closure;
- empty and unknown `Any` values remain valid;
- preserve packed leaf field values and messages.

Acceptance tests must cover root `typeName`, complete paths, absence of a
synthetic parent violation, singular/repeated/map messages, and known,
unknown, and empty `Any`.

Focused command:

```bash
npm test --workspace=@spine-event-engine/validation -- --runInBand \
  tests/validate.test.ts tests/integration.test.ts
```

Depends on all prior semantic tasks.

## Task 7: Coverage, Documentation, And Gates

Add branch-focused behavior tests until statements, branches, functions, and
lines are each at least 90%, then commit global Jest thresholds of 90 for all
four metrics.

Update README and API-facing documentation for corrected option semantics,
structured configuration errors, deterministic ordering, leaf-only recursion,
correct violation values, and the explicit unresolved Java-regex limitation.
Do not claim regex parity.

Before specialist review, run:

```bash
npm run typecheck:generated
npm run test:coverage
```

After the complete specialist review and accepted correction batch, run:

```bash
npm run verify
```

Depends on all prior tasks.
