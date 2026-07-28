# Immutable Proto Provenance

`UPSTREAM_SOURCES.json` is the machine-checked baseline for vendored Spine
Proto files.

The pre-existing local `options.proto` copies are byte-identical to each other
but not to the upstream `base-libraries` master file observed on 2026-07-24.
Their original upstream commit cannot be established from repository history,
so they are explicitly classified as a frozen legacy baseline rather than
falsely attributed to the current upstream commit.

The manifest records immutable checksums for the frozen `options.proto`,
`time_options.proto`, and `spine/time/time.proto` inputs. Replacing or adding
a Proto file requires a separately approved intake task, byte-for-byte
retrieval from the recorded commit, compatibility review, and manifest update.

Run:

```bash
npm run proto:verify
```

Never edit a frozen Proto to satisfy local Buf style. Every module uses the
`STANDARD` ruleset, with path-and-rule-specific exceptions for immutable Spine
inputs and pre-existing fixture names or package layouts. New project-owned
Proto files receive the full ruleset. Compilation, generation, and checksum
verification remain mandatory.

# Spine Time intake

T-0006 freezes `time_options.proto` and `spine/time/time.proto` at the recorded
Spine Time commit. Each validation, test, and example copy is a regular file
with a SHA-256 entry in `UPSTREAM_SOURCES.json`.
