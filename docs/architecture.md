# Architecture and navigation

The validation package is a descriptor-driven runtime: Buf generates schemas, `validate()` builds a root context and registry, then invokes validators in fixed declaration and validator order. Each violation retains the root entry type and a complete Proto field path. The example is deliberately a small module: `runExampleScenarios()` returns inspectable records while `index.ts` is only a console adapter.

Navigation: use this directory for maintained guidance, `packages/validation` for the publishable package, `packages/example` for executable generated-schema usage, and `build-protocol` for the governed delivery record. Immutable upstream Proto files define option intent; generated files are disposable artifacts.

Contributors should make behavior changes test-first, preserve vendored sources, keep invalid declarations in test-only fixtures, and run the root verification gate. The current unresolved compatibility boundary is Java `Pattern`: this runtime uses ECMAScript `RegExp` and makes no Java-dialect parity promise.
