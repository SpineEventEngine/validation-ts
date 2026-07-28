# Validation contract

This is the project-owned reference for the currently implemented Spine option
surface. The frozen [upstream options source](../packages/validation/proto/spine/options.proto)
defines option intent; runtime code and generated-schema tests define the
implemented TypeScript behavior where the two differ.

`validate(schema, message)` accepts a generated schema and its matching
generated message shape, and returns ordered `ConstraintViolation` records for
invalid data and throws `ValidationConfigurationError` for invalid supported
declarations. It starts with message `(require)`, evaluates fields in descriptor
order through a fixed internal sequence, and finishes with oneof `(choice)`.
The order is deterministic today but not a public compatibility guarantee.

## Violation envelope, paths, and templates

For shared-envelope validators, `typeName` is the entry schema's fully qualified
name even for nested leaves. `fieldPath.fieldName` uses unqualified Proto names
joined by dots; it has no list index or map key. A message-level `(require)` or
oneof `(choice)` failure has an empty field path. `fieldValue` is an optional
descriptor-packed `Any`, supplied only when the validator has an offending
field value. `message` is always present and its `withPlaceholders` may be an
empty string when neither custom nor default diagnostic text exists.

`Violations.failurePath()` joins the path and returns `"unknown"` for an empty
path; `Violations.formatMessage()` applies the template map. A custom
`error_msg` overrides a default message. Strict Proto authoring uses the
namespaced keys `${field.path}`, `${field.type}`, `${field.value}`,
`${parent.type}`, and option-specific keys below for shared-envelope validators.

## Implemented options

| Option       | Scope and valid targets                                                                       | Data behavior                                                                                                                                                                | Violation details                                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(required)` | Field: messages, enums, strings, bytes, repeated fields, and maps.                            | When enabled, rejects an absent/default message or enum, empty string/bytes, or empty collection. Other scalar targets throw.                                                | Path is the field; no field value; custom `(if_missing).error_msg` or `IfMissingOption` default; `${field.path}`, `${field.type}`, `${parent.type}`.                                     |
| `(pattern)`  | Field: singular string or repeated string.                                                    | Tests ECMAScript `RegExp`; singular empty strings are skipped; each failing repeated element is checked. Unsupported field kinds are currently ignored rather than rejected. | Legacy adapter path is `field` or `field[index]`; it does not pack `fieldValue`; its message uses declared text or a local fallback and legacy `field`/`value` keys.                     |
| `(min)`      | Field: singular or repeated numeric scalar.                                                   | Rejects values below its bound, or at the bound when `exclusive = true`; `NaN` is invalid.                                                                                   | Path is the field; packed failing value; custom/default min template; `${min.value}`, `${min.operator}`, `${field.value}`, `${field.path}`, `${field.type}`, `${parent.type}`.           |
| `(max)`      | Field: singular or repeated numeric scalar.                                                   | Rejects values above its bound, or at the bound when `exclusive = true`; `NaN` is invalid.                                                                                   | Same envelope as min with `${max.value}` and `${max.operator}`.                                                                                                                          |
| `(range)`    | Field: singular or repeated numeric scalar.                                                   | Requires the parsed lower/upper range, honoring `[`/`]` inclusivity and `(`/`)` exclusivity; `NaN` is invalid.                                                               | Path is the field; packed failing value; custom/default range template; `${range.value}` plus common field keys.                                                                         |
| `(distinct)` | Field: repeated or map field.                                                                 | When enabled, emits one failure per duplicate Buf-equality class among list elements or map values.                                                                          | Path is the collection field; field value is the class representative; `${field.value}` is the whole collection and `${field.duplicates}` is that duplicate class.                       |
| `(validate)` | Field: singular message, repeated message, map with message values, or `google.protobuf.Any`. | Recurses into present known values and returns descendant leaves only; it never creates a parent summary.                                                                    | Descendant failures retain the original root type and leaf path. Collection indices/map keys are omitted. Singular default messages, empty `Any`, and unknown `Any` type URLs are valid. |
| `(goes)`     | Field with a presence-supported value; its companion must also be a presence-supported field. | A present target is invalid when its named `with` companion is absent.                                                                                                       | Path is the target field; packed target value; custom/default goes template with common field keys and `${goes.companion}`.                                                              |
| `(require)`  | Message option. Expression references presence-supported fields or any oneof name.            | At least one alternative must have every conjunction token present.                                                                                                          | Empty path and no field value; custom/default require template with `${message.type}` and `${require.fields}`.                                                                           |
| `(choice)`   | Oneof option.                                                                                 | When `required = true`, rejects a group with no selected member.                                                                                                             | Empty path and no field value; custom/default choice template with `${parent.type}` and `${group.path}`.                                                                                 |

The `pattern` implementation is retained through a legacy adapter and therefore
does not yet share all path/value/template normalization used by the other
families. The adapter cannot substitute the documented namespaced keys, so use
a static `(pattern).error_msg` until pattern normalization is implemented. For
nested pattern failures it currently reports the nested schema type and an
unprefixed local or indexed path, rather than the root type and prefixed leaf
path used by shared-envelope nested validators. These are current implementation
gaps under the postponed pattern work; do not rely on the legacy paths as a
general nested-path format.

The exact `(require)` grammar is `alternative ("|" alternative)*`, where an
`alternative` is `token ("&" token)*`. Thus `email | phone & country_code`
accepts either `email` alone or both `phone` and `country_code`.

## Exact numeric and reference grammar

Numeric fields include signed/unsigned integer and float/double scalars plus
their repeated forms. Integer targets accept `[+-]?` decimal digits only and
must remain inside the concrete scalar type range. Float/double targets require
a decimal point, optionally followed by an `e`/`E` exponent; `"1"` is invalid
for a float target while `"1.0"` is valid. Bounds are compared exactly as
`bigint` for 64-bit integers and as numbers for the other runtime types, so an
exact boundary such as `0.01` satisfies inclusive `min = "0.01"`.

A non-literal numeric declaration may be a dotted identifier reference:
`[A-Za-z_][A-Za-z0-9_]*(.[A-Za-z_][A-Za-z0-9_]*)*`. It resolves from the root
message through singular message fields to a singular numeric scalar. The
referenced scalar type need not equal the target type; repeated/map references,
missing names, and nonnumeric/intermediate-nonmessage paths are configuration
errors. `range.value` is `[|(` + lower + `..` + upper + `]|)` with optional
surrounding/inter-bound whitespace, nonempty bounds, and lower <= upper.

## Traversal and duplicate semantics

Nested validation preserves the original root `typeName` and reports only a
leaf, for example `category.id`, rather than a `category` summary. Repeated and
map traversal validates each nested value, but output field paths omit the
collection index/key. For `Any`, resolution is limited to the registry built
from the entry schema's Proto file and dependency closure; the runtime does not
invent a schema for an unknown URL.

`distinct` groups repeated values or map values with Protobuf-ES equality:
scalars use descriptor-aware scalar equality, enums compare numeric values, and
messages use Protobuf-ES message equality. It emits one violation for each
class whose count is at least two, not one violation for every repeated
occurrence.

## Configuration errors

`ValidationConfigurationError` has public `code`, `option`, `typeName`,
optional `fieldPath`, and optional `cause` fields. The canonical option name
does not have Proto parentheses.

| Code                        | Meaning                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED_OPTION_TARGET` | The option was placed on a field type/cardinality the runtime cannot validate.                                       |
| `INVALID_OPTION_VALUE`      | A required declaration value is empty or malformed, including numeric/range grammar and invalid `(require)` grammar. |
| `UNKNOWN_FIELD_REFERENCE`   | A declared companion, bound, or require token does not name a field/oneof.                                           |
| `INVALID_FIELD_REFERENCE`   | A named field exists but is not a valid presence/numeric/reference target.                                           |

Errors are part of the public API; their human-readable `message` is not a
stable parsing surface. The current `(pattern)` implementation is the notable
exception: unsupported targets are ignored rather than producing this error,
and a malformed regular expression follows the legacy adapter path by emitting
an ordinary violation rather than a `ValidationConfigurationError`.

## Deprecated, unsupported, and regex compatibility

Use `(choice)` instead of deprecated `(is_required)` and `(require)` instead of
deprecated `(required_field)`. Runnable examples must not use either. `(set_once)`
and its companion `(if_set_again)` require state across validations and are not
implemented. Deprecated `msg_format` and deprecated `(if_invalid)` are not the
current authoring surface; use `error_msg` and the implemented option families.

The frozen Proto documentation names Java `Pattern` as its syntax baseline.
This runtime constructs ECMAScript `RegExp`, does not provide a Java-pattern
engine, and does not promise Java dialect, flags, or full-match equivalence.
Use portable expressions and explicit anchors where appropriate; Java parity is
an unresolved project decision.

# Spine Time `(when)`

The frozen Spine Time intake supports `(when)` on `Timestamp`, `YearMonth`,
`LocalDate`, `LocalDateTime`, deprecated `OffsetDateTime`, and `ZonedDateTime`.
Singular descriptor-default messages are skipped; repeated and map elements,
including defaults, are evaluated independently. Diagnostics use `error_msg`
before the frozen default and expose `when.in`. Zoned conversion follows
Temporal compatible gap/overlap resolution and the runtime tzdb. Years outside
Temporal's direct range use a Gregorian 400-year-equivalent projection (a
pre-transition past band and a post-rule future band) to obtain the zone offset.
