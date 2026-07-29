import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkDocumentation } from "./check-documentation.mjs";

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "validation-docs-"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "packages", "validation", "src"), { recursive: true });
  mkdirSync(join(root, "packages", "example", "proto"), { recursive: true });
  writeFileSync(
    join(root, "packages", "validation", "src", "index.ts"),
    "export { publicValue as aliasedValue } from './value';\nexport type { PublicType } from './types';\n",
  );
  writeFileSync(
    join(root, "packages", "validation", "src", "value.ts"),
    "export const publicValue = 1;\n",
  );
  writeFileSync(
    join(root, "packages", "validation", "src", "types.ts"),
    "export interface PublicType {}\n",
  );
  writeFileSync(
    join(root, "packages", "validation", "src", "validation.ts"),
    "/** Current ${field.path}. */\n",
  );
  writeFileSync(join(root, "docs", "target.md"), "# Target\n");
  writeFileSync(join(root, "packages", "example", "proto", "user.proto"), 'syntax = "proto3";\n');
  writeFileSync(
    join(root, "packages", "example", "proto", "product.proto"),
    'syntax = "proto3";\n',
  );
  return root;
}

function writeReadme(root, content) {
  writeFileSync(join(root, "README.md"), content);
}

function expectFailure(root, expression) {
  assert.throws(() => checkDocumentation({ root }), expression);
}

{
  const root = createFixture();
  try {
    writeReadme(
      root,
      [
        "[target](docs/target.md)",
        "```typescript",
        'import { aliasedValue, type PublicType } from "@spine-event-engine/validation";',
        "const valid: PublicType = {} as PublicType;",
        "console.log(aliasedValue, valid);",
        "```",
      ].join("\n"),
    );
    assert.equal(checkDocumentation({ root }).length, 2);

    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** Stale {value}. */\n",
    );
    expectFailure(root, /Stale unnamespaced placeholder/);
    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** Current ${field.path}. */\n",
    );

    writeReadme(
      root,
      '```typescript\nimport { aliasedValue } from "@spine-event-engine/validation";\nconsole.log(aliasedValue);\n```',
    );
    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** Stale ${value}. */\n",
    );
    expectFailure(root, /Stale unnamespaced placeholder/);
    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** Current ${field.path}. */\n",
    );

    writeReadme(root, "Legacy ${field} placeholder.");
    expectFailure(root, /Stale unnamespaced placeholder/);
    writeReadme(
      root,
      '```typescript\nimport { aliasedValue } from "@spine-event-engine/validation";\nconsole.log(aliasedValue);\n```',
    );
    assert.equal(checkDocumentation({ root }).length, 2);

    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** @example\n * ```typescript\n * const value: string = 1;\n * ```\n */\n",
    );
    expectFailure(root, /Non-compilable TypeScript snippet/);
    writeFileSync(
      join(root, "packages", "validation", "src", "validation.ts"),
      "/** Current ${field.path}. */\n",
    );

    writeReadme(root, "```typescript\nconst = ;\n```");
    expectFailure(root, /Non-compilable TypeScript snippet/);

    writeReadme(root, "```typescript\nconst value: string = 1;\n```");
    expectFailure(root, /Non-compilable TypeScript snippet/);

    writeReadme(
      root,
      '```typescript\nimport validation from "@spine-event-engine/validation";\nconsole.log(validation);\n```',
    );
    expectFailure(root, /Non-compilable TypeScript snippet/);

    writeReadme(
      root,
      '```typescript\nimport * as validation from "@spine-event-engine/validation";\nvalidation.notExported();\n```',
    );
    expectFailure(root, /Non-compilable TypeScript snippet/);

    writeReadme(
      root,
      '```typescript\nimport { aliasedValue, type PublicType as PublicAlias } from "@spine-event-engine/validation";\nconst valid: PublicAlias = {} as PublicAlias;\nconsole.log(aliasedValue, valid);\n```',
    );
    assert.equal(checkDocumentation({ root }).length, 2);

    writeReadme(
      root,
      '```typescript\nimport { value } from "./missing";\nconsole.log(value);\n```',
    );
    expectFailure(root, /Non-compilable TypeScript snippet/);

    writeReadme(
      root,
      '```typescript\nimport { privateValue } from "@spine-event-engine/validation";\n```',
    );
    expectFailure(root, /Non-public import privateValue/);

    writeReadme(root, "[missing](docs/missing.md)");
    expectFailure(root, /Broken local link docs\/missing.md/);

    writeReadme(root, "{field}");
    expectFailure(root, /Stale unnamespaced placeholder/);

    writeReadme(root, "No imports needed for this failure.");
    writeFileSync(
      join(root, "packages", "example", "proto", "user.proto"),
      "bool legacy = 1 [(is_required) = true];\n",
    );
    expectFailure(root, /Deprecated active option/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const workspaceRoot = join(import.meta.dirname, "..");
const workspaceManifest = JSON.parse(readFileSync(join(workspaceRoot, "package.json"), "utf8"));

assert.equal(
  workspaceManifest.devDependencies["@bufbuild/protobuf"],
  "2.13.0",
  "root documentation tooling must directly own @bufbuild/protobuf",
);
assert.ok(checkDocumentation({ root: workspaceRoot }).length > 0);
console.log("Documentation checker regression tests passed.");
