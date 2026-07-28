import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDirectGenerationCommands,
  assertGeneratorConfiguration,
} from "./check-generated-determinism.mjs";

test("accepts only the direct Buf generation commands", () => {
  assert.doesNotThrow(() =>
    assertDirectGenerationCommands({
      "package.json": {
        scripts: {
          generate:
            "pnpm --filter @spine-event-engine/validation generate && pnpm --filter @spine-event-engine/validation generate:tests && pnpm --filter @spine-event-engine/example-smoke generate",
        },
      },
      "packages/validation/package.json": {
        scripts: {
          generate: "buf generate",
          "generate:tests": "cd tests && buf generate",
        },
      },
      "packages/example/package.json": { scripts: { generate: "buf generate" } },
    }),
  );
});

test("rejects a renamed post-generation transform", () => {
  assert.throws(
    () =>
      assertDirectGenerationCommands({
        "package.json": {
          scripts: { generate: "pnpm generate && node scripts/rewrite-output.mjs" },
        },
        "packages/validation/package.json": {
          scripts: {
            generate: "buf generate",
            "generate:tests": "cd tests && buf generate",
          },
        },
        "packages/example/package.json": { scripts: { generate: "buf generate" } },
      }),
    /must be exactly/,
  );
});

test("requires the ESM import extension in each validation generator config", () => {
  assert.doesNotThrow(() =>
    assertGeneratorConfiguration(
      "packages/validation/buf.gen.yaml",
      "version: v2\nplugins:\n  - local: protoc-gen-es\n    out: src/generated\n    opt:\n      - target=ts\n      - import_extension=js\n",
    ),
  );
  assert.throws(
    () =>
      assertGeneratorConfiguration(
        "packages/validation/buf.gen.yaml",
        "version: v2\nplugins:\n  - local: protoc-gen-es\n    out: src/generated\n    opt:\n      - target=ts\n",
      ),
    /import_extension=js/,
  );
});
