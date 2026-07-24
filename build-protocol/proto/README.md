# Immutable Proto Provenance

`UPSTREAM_SOURCES.json` is the machine-checked baseline for vendored Spine
Proto files.

The pre-existing local `options.proto` copies are byte-identical to each other
but not to the upstream `base-libraries` master file observed on 2026-07-24.
Their original upstream commit cannot be established from repository history,
so they are explicitly classified as a frozen legacy baseline rather than
falsely attributed to the current upstream commit.

The manifest separately records immutable commits and checksums for the current
`options.proto` and future `time_options.proto` sources. They are references,
not vendored inputs. Replacing or adding a Proto file requires a separately
approved intake task, byte-for-byte retrieval from the recorded commit,
compatibility review, and manifest update.

Run:

```bash
npm run proto:verify
```

Never edit a frozen Proto to satisfy local Buf style. The present Buf modules
use the `MINIMAL` ruleset because both vendored and existing fixture packages
predate current `STANDARD` naming rules. Compilation and generation remain
mandatory. A later task may split project-owned Proto files into a stricter
lint module without modifying upstream files.
