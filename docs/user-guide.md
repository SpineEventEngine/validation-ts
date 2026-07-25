# User guide

Install `@spine-event-engine/validation` and its peer dependency `@bufbuild/protobuf`. Copy the upstream-compatible `spine/options.proto` into your Proto intake according to the package's generated/provenance workflow; do not hand-edit the vendored source. Configure Buf with the Protobuf-ES plugin, generate TypeScript, then import the public validator and your generated schema.

```ts
import { create } from "@bufbuild/protobuf";
import { formatViolations, validate } from "@spine-event-engine/validation";

const message = create(UserSchema, { name: "", email: "" });
const violations = validate(UserSchema, message);
console.log(formatViolations(violations));
```

Use `(validate) = true` on message, repeated-message, map-message, or `google.protobuf.Any` fields to recurse. Known `Any` type URLs are unpacked using the root descriptor registry; empty and unknown payloads are valid. Catch `ValidationConfigurationError` when an option is placed on an unsupported target; inspect its `code`, `option`, `typeName`, and `fieldPath` rather than parsing its message.

Commands: `npm run generate`, `npm run build`, `npm run test:validation`, `npm run test:example`, `npm run example`, and `npm run verify`. If generated imports fail, regenerate; if a clean example start cannot resolve the workspace package, use the root `npm run example`, which builds validation first. Java `Pattern` syntax is not guaranteed: patterns run through ECMAScript `RegExp`.
