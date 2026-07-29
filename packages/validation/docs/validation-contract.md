# Validation contract

The [package guide](../README.md) is the consumer entry point. This reference
defines the currently implemented Spine option surface.

The official [upstream options source](../proto/spine/options.proto) defines
option intent. Runtime code and generated-schema tests define implemented
TypeScript behavior where it differs. `validate(schema, message)` returns
ordered `ConstraintViolation` records for invalid data and throws
`ValidationConfigurationError` for invalid supported declarations. It starts
with message `(require)`, evaluates fields in descriptor order through a fixed
internal sequence, and finishes with oneof `(choice)`; that order is not a
public compatibility promise.

## Violations

For validators that use the standard `ConstraintViolation` structure, `typeName` is the fully qualified entry schema
name even for nested leaves. `fieldPath.fieldName` contains unqualified Proto
names joined by dots, without list indices or map keys. Message `(require)` and
oneof `(choice)` failures have an empty path. `fieldValue` is a descriptor-packed
`Any` when an offending value exists. `message` is present for these validators
and may have an empty template.

`Violations.failurePath()` returns the dot-separated path or `"unknown"`.
`Violations.formatMessage()` substitutes the template map, and
`Violations.formatAll()` produces the numbered collection presentation. Custom
`error_msg` overrides a default. These placeholders use namespaced
keys such as `${field.path}`, `${field.type}`, `${field.value}`, and
`${parent.type}`.

## Implemented options

| Option            | Valid target and behavior                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(required)`      | Message, enum, string, bytes, repeated, and map fields. It rejects absent or default presence targets; numeric and boolean scalars are unsupported.                                                                                      |
| `(pattern)`       | String fields evaluated with ECMAScript `RegExp`. Pattern results can use a different nested path and template shape; use a static `error_msg` when portable diagnostics matter.                                                         |
| `(min)` / `(max)` | Singular or repeated numeric scalars with exact inclusive/exclusive bounds and supported field references.                                                                                                                               |
| `(range)`         | Singular or repeated numeric scalars using bracket notation, with inclusive/exclusive endpoints.                                                                                                                                         |
| `(when)`          | `Timestamp` and Spine `YearMonth`, `LocalDate`, `LocalDateTime`, deprecated `OffsetDateTime`, or `ZonedDateTime`, including lists/maps. `TIME_UNDEFINED` disables it; singular defaults are skipped and collection elements are checked. |
| `(distinct)`      | Repeated or map fields; one violation per duplicated Protobuf-ES equality class.                                                                                                                                                         |
| `(validate)`      | Singular/repeated/map message values and known `Any` payloads; returns descendant leaves only.                                                                                                                                           |
| `(goes)`          | A presence-supported field whose named companion must also be present.                                                                                                                                                                   |
| `(require)`       | Message expression using `\|` alternatives and `&` conjunctions over fields or oneof names.                                                                                                                                              |
| `(choice)`        | Oneof; when `required = true`, rejects no selected member.                                                                                                                                                                               |

`(validate)` preserves the root type name for nested leaves. Empty and unknown
`Any` values are valid. `(distinct)` follows descriptor-aware Protobuf-ES
equality, not JavaScript object identity.

## Numeric and references

Integer declarations accept signed decimal digits inside the target type range.
Float and double declarations require a decimal point, with an optional
exponent. A bound may reference a dotted singular-message path ending in a
numeric scalar. Missing, repeated, map, or incompatible references are
configuration errors. A range is `[|(` + lower + `..` + upper + `]|)`, with
nonempty bounds and lower not greater than upper.

## Configuration errors

`ValidationConfigurationError` exposes `code`, `option`, `typeName`, optional
`fieldPath`, and optional `cause`; `option` is canonical and has no Proto
parentheses.

| Code                        | Meaning                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `UNSUPPORTED_OPTION_TARGET` | An option was declared on an unsupported field type or cardinality. |
| `INVALID_OPTION_VALUE`      | A required declaration value is empty or malformed.                 |
| `UNKNOWN_FIELD_REFERENCE`   | A named companion, bound, or require token does not exist.          |
| `INVALID_FIELD_REFERENCE`   | A named field exists but cannot serve as that option's target.      |

The human-readable error message is not a stable parsing surface. `(pattern)`
handles unsupported targets by ignoring them and malformed
regular expressions produce an ordinary violation.

## Limitations

Use `(choice)` instead of deprecated `(is_required)` and `(require)` instead
of deprecated `(required_field)`. `(set_once)`, `(if_set_again)`, `(if_invalid)`,
and deprecated `msg_format` are unsupported.

Official Spine documentation uses Java `Pattern` as its syntax baseline. The runtime
uses ECMAScript `RegExp`, does not contain a Java-pattern engine, and does not
promise Java dialect, flags, or full-match equivalence. Use portable, anchored
expressions.

Spine Time conversion follows Temporal compatible gap/overlap resolution and
the installed tzdb. Converted values must fit the JVM `Timestamp` instant range
from year 1 through year 9999; invalid or out-of-range conversions throw
`RangeError`.
