# @spine-event-engine/validation

Experimental runtime validation for Protobuf-ES v2 messages carrying Spine
validation options. It validates generated descriptors; it does not support
handwritten bindings or other TypeScript Protobuf generators.

The package is ESM-only. Use an ESM `import`; CommonJS `require()` is not
supported. Use Node.js 24 or later; this workspace pins and tests Node.js
24.18.0. TypeScript consumers need TypeScript 5.4 or later because the public
declarations use the built-in `NoInfer` utility type.

## Install

Install the package and its required peer dependency together:

```sh
npm install @spine-event-engine/validation@snapshot @bufbuild/protobuf
npm install @spine-event-engine/validation@2.0.0-snapshot.6 @bufbuild/protobuf
```

`snapshot` is a moving dist-tag for previews. Use the exact version command
when you need a reproducible installation.

Use Buf and `@bufbuild/protoc-gen-es` to generate the message schema. Keep an
immutable, provenance-recorded copy of `spine/options.proto` on your Proto
import path. The full setup, including Buf configuration, is in the
[user guide](../../docs/user-guide.md).

## Use

```ts
import { create } from "@bufbuild/protobuf";
import { validate, Violations } from "@spine-event-engine/validation";
import { UserSchema } from "./generated/user_pb.js";

const user = create(UserSchema, { email: "invalid" });
const violations = validate(UserSchema, user);
for (const violation of violations) {
  console.error(violation.typeName, Violations.failurePath(violation));
  console.error(Violations.formatMessage(violation));
}
```

`validate()` returns data violations and throws `ValidationConfigurationError`
when a supported option is declared with an invalid target, value, or field
reference. Its public fields are `code`, `option`, `typeName`, optional
`fieldPath`, and optional `cause`.

The generated schema and message must be a matching pair. This relationship is
checked by TypeScript, so `validate(UserSchema, messageFromAnotherSchema)` is
rejected before runtime.

## Supported surface

Implemented families are field `(required)`, `(pattern)`, `(min)`, `(max)`,
`(range)`, `(distinct)`, `(validate)`, `(goes)`, and Spine Time `(when)`;
message `(require)`; and oneof `(choice)`. `(when)` supports `Timestamp`,
`YearMonth`, `LocalDate`, `LocalDateTime`, deprecated `OffsetDateTime`, and
`ZonedDateTime`; `TIME_UNDEFINED` disables it, singular defaults are skipped,
and list/map elements are evaluated. The exact target rules, violation envelope, placeholder keys,
numeric/reference grammar, nested/`Any` behavior, and configuration errors are
normative in the [validation contract](../../docs/validation-contract.md).

Use `(choice)` rather than deprecated `(is_required)` and `(require)` rather
than deprecated `(required_field)`. `(set_once)` and `(if_set_again)` are not
implemented. Although frozen Proto documentation names Java `Pattern` as a
syntax baseline, this package currently executes ECMAScript `RegExp`; Java
regex compatibility is unresolved.

## Development

Run focused package tests with `pnpm test:validation`, documentation checks
with `pnpm docs:check`, and the repository gate with `pnpm verify` from
the workspace root. Contributors should start with [the contributing guide](../../docs/contributing.md).
