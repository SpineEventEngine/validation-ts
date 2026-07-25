# @spine-event-engine/validation

Experimental runtime validation for Protobuf-ES v2 messages carrying Spine
validation options. It validates generated descriptors; it does not support
handwritten bindings or other TypeScript Protobuf generators.

## Install

Install the package and its required peer dependency together:

```sh
npm install @spine-event-engine/validation@snapshot @bufbuild/protobuf
npm install @spine-event-engine/validation@2.0.0-snapshot.5 @bufbuild/protobuf
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
import { UserSchema } from "./generated/user_pb";

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

## Supported surface

Implemented families are field `(required)`, `(pattern)`, `(min)`, `(max)`,
`(range)`, `(distinct)`, `(validate)`, and `(goes)`; message `(require)`; and
oneof `(choice)`. The exact target rules, violation envelope, placeholder keys,
numeric/reference grammar, nested/`Any` behavior, and configuration errors are
normative in the [validation contract](../../docs/validation-contract.md).

Use `(choice)` rather than deprecated `(is_required)` and `(require)` rather
than deprecated `(required_field)`. `(set_once)` and `(if_set_again)` are not
implemented. Although frozen Proto documentation names Java `Pattern` as a
syntax baseline, this package currently executes ECMAScript `RegExp`; Java
regex compatibility is unresolved.

## Development

Run focused package tests with `npm run test:validation`, documentation checks
with `npm run docs:check`, and the repository gate with `npm run verify` from
the workspace root. Contributors should start with [the contributing guide](../../docs/contributing.md).
