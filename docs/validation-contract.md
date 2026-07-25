# Validation contract

`validate(schema, message)` walks declared fields in descriptor order with a fixed internal validator order. It returns ordered `ConstraintViolation` records. Every nested violation keeps the entry-point root `typeName`; `fieldPath.fieldName` is the complete Proto path. Traversal order is useful for presentation but not a compatibility promise.

| Option                            | Valid target                                                          | Behavior                                                               |
| --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `(required)`                      | supported message, enum, string, bytes, repeated/map presence targets | reports a missing/non-default value                                    |
| `(pattern)`                       | string/repeated string                                                | evaluates ECMAScript `RegExp`                                          |
| `(min)`, `(max)`, `(range)`       | numeric scalar/repeated numeric                                       | inclusive/exclusive bound checking; exact declared values are accepted |
| `(distinct)`                      | repeated/map                                                          | one violation per Buf-equality duplicate class                         |
| `(validate)`                      | message/repeated/map message and `Any`                                | returns only descendant leaf violations                                |
| `(require)`, `(choice)`, `(goes)` | declared message/oneof/field scopes                                   | applies the corresponding descriptor constraint                        |

Diagnostics are always present but may contain an empty template when the declaration has no custom/default text. Supported placeholders are namespaced: `${field.path}`, `${field.type}`, `${field.value}`, `${parent.type}`, `${min.value}`, and `${field.duplicates}`. `Violations.formatMessage()` formats them. Numeric parsing rejects invalid declarations; `0.01` exactly satisfies a `min` of `0.01`.

Distinct uses descriptor-aware equality and exposes the whole collection in `field.value` and each duplicate class in `field.duplicates`. Nested validation never adds a parent summary: a `category.id` failure stays a leaf. Known `Any` payloads recurse; empty/unknown payloads are valid.

Unsupported option placement throws `ValidationConfigurationError` with codes `UNSUPPORTED_OPTION_TARGET`, `INVALID_OPTION_VALUE`, `UNKNOWN_FIELD_REFERENCE`, or `INVALID_FIELD_REFERENCE`, plus `option`, root `typeName`, and `fieldPath`. Deprecated `(is_required)` and `(required_field)` are not used by runnable examples; use `(choice)` and `(require)`. `(set_once)` is unsupported. The upstream contract uses Java `Pattern` as a syntax baseline, but this runtime currently uses ECMAScript `RegExp`; Java parity remains unresolved.
