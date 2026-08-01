import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkDocumentation, findMaintainedMarkdown } from "./check-documentation.mjs";

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "validation-docs-"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "packages", "validation", "src"), { recursive: true });
  mkdirSync(join(root, "packages", "validation", "docs"), { recursive: true });
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
  writeFileSync(join(root, "packages", "validation", "README.md"), "# Package\n");
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

function withPublicImport(content) {
  return `${content}\n\n\`\`\`typescript\nimport { aliasedValue } from "@spine-event-engine/validation";\nconsole.log(aliasedValue);\n\`\`\``;
}

function expectFailure(root, expression) {
  assert.throws(() => checkDocumentation({ root }), expression);
}

function writeRepositoryGuides(root, { developmentSetup, exampleSetup, rootSetup }) {
  writeReadme(root, withPublicImport(rootSetup));
  writeFileSync(
    join(root, "packages", "example", "README.md"),
    ["# Example", "", exampleSetup].join("\n"),
  );
  writeFileSync(
    join(root, "packages", "validation", "docs", "development.md"),
    ["# Development", "", "See the [package guide](../README.md).", "", developmentSetup].join(
      "\n",
    ),
  );
  writeFileSync(
    join(root, "packages", "validation", "docs", "contributing.md"),
    ["# Contributing", "", "See the [package guide](../README.md).", "", developmentSetup].join(
      "\n",
    ),
  );
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
    assert.equal(checkDocumentation({ root }).length, 3);

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
    assert.equal(checkDocumentation({ root }).length, 3);

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
    assert.equal(checkDocumentation({ root }).length, 3);

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

    writeReadme(root, withPublicImport("[absolute](/tmp/outside.md)"));
    expectFailure(root, /escapes the repository root/);

    writeReadme(root, withPublicImport("[traversal](../../outside.md)"));
    expectFailure(root, /escapes the repository root/);

    const outside = mkdtempSync(join(tmpdir(), "validation-docs-outside-"));
    try {
      writeFileSync(join(outside, "outside.md"), "# Outside\n");
      symlinkSync(outside, join(root, "docs", "outside"), "dir");
      writeReadme(root, withPublicImport("[symlink](docs/outside/outside.md)"));
      expectFailure(root, /escapes the repository root/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
      rmSync(join(root, "docs", "outside"), { force: true });
    }

    writeReadme(root, withPublicImport("[missing heading](docs/target.md#missing-heading)"));
    expectFailure(root, /Broken local anchor missing-heading/);

    writeReadme(root, withPublicImport("[target heading](docs/target.md#target)"));
    assert.equal(checkDocumentation({ root }).length, 3);

    writeReadme(
      root,
      withPublicImport(
        [
          "```sh",
          "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf",
          "pnpm add @spine-event-engine/validation@2.0.0-snapshot.6 @bufbuild/protobuf",
          "```",
        ].join("\n"),
      ),
    );
    expectFailure(root, /exactly one executable command/);

    for (const chainedInstall of [
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf && echo done",
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf; echo done",
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf || echo done",
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf | tee install.log",
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf & echo done",
      "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf \\\n+echo done",
    ]) {
      writeReadme(root, withPublicImport(`\`\`\`sh\n${chainedInstall}\n\`\`\``));
      expectFailure(root, /must not use shell chaining or operators/);
    }

    writeReadme(
      root,
      withPublicImport(
        "```sh\npnpm add '@spine-event-engine/validation@snapshot&&literal' @bufbuild/protobuf\n```",
      ),
    );
    assert.equal(checkDocumentation({ root }).length, 3);

    writeReadme(
      root,
      withPublicImport(
        [
          "## Install",
          "```sh",
          "pnpm add @spine-event-engine/validation@2.0.0-snapshot.6 @bufbuild/protobuf",
          "```",
        ].join("\n"),
      ),
    );
    expectFailure(root, /separately labelled alternative/);

    writeReadme(
      root,
      withPublicImport(
        [
          "## Install",
          "```sh",
          "pnpm add @spine-event-engine/validation@snapshot @bufbuild/protobuf",
          "```",
          "## Alternative: exact preview",
          "```sh",
          "pnpm add @spine-event-engine/validation@2.0.0-snapshot.6 @bufbuild/protobuf",
          "```",
        ].join("\n"),
      ),
    );
    writeFileSync(
      join(root, "packages", "validation", "docs", "architecture.md"),
      "# Architecture\n",
    );
    expectFailure(root, /link back to the package README/);
    writeFileSync(
      join(root, "packages", "validation", "docs", "architecture.md"),
      "# Architecture\n\nSee the [package guide](../README.md).\n",
    );

    writeReadme(
      root,
      withPublicImport("A historical implementation task is not reader documentation."),
    );
    expectFailure(root, /Prohibited historical workflow language/);

    writeReadme(root, withPublicImport("The frozen contract has an intake record."));
    expectFailure(root, /Prohibited historical workflow language/);

    writeReadme(root, withPublicImport("A shared-envelope uses a legacy adapter."));
    expectFailure(root, /Prohibited historical workflow language/);

    writeReadme(root, withPublicImport("The implementation seams follow approved direction."));
    expectFailure(root, /Prohibited historical workflow language/);

    writeReadme(root, withPublicImport("Use `pnpm install --frozen-lockfile`."));
    assert.equal(checkDocumentation({ root }).length, 4);

    writeReadme(root, "{field}");
    expectFailure(root, /Stale unnamespaced placeholder/);

    writeReadme(root, "No imports needed for this failure.");
    writeFileSync(
      join(root, "packages", "example", "proto", "user.proto"),
      "bool legacy = 1 [(is_required) = true];\n",
    );
    expectFailure(root, /Deprecated active option/);

    writeFileSync(join(root, "packages", "example", "proto", "user.proto"), 'syntax = "proto3";\n');
    writeReadme(root, withPublicImport("[target heading](docs/target.md#target)"));
    writeFileSync(
      join(root, "packages", "validation", "README.md"),
      [
        "## Complete Proto Example",
        "",
        "```protobuf",
        'import "google/protobuf/timestamp.proto";',
        "// Describes an account user.",
        "message User {}",
        "```",
        "",
      ].join("\n"),
    );
    expectFailure(root, /must demonstrate \(when\)/);

    writeFileSync(
      join(root, "packages", "validation", "README.md"),
      [
        "## Complete Proto Example",
        "",
        "```protobuf",
        'import "google/protobuf/timestamp.proto";',
        "// Describes an account user.",
        "message User {",
        "// Describes a duplicate account user.",
        "message User {",
        "  // Stores the account expiration time.",
        "  google.protobuf.Timestamp expires_at = 11 [(when).in = FUTURE];",
        "}",
        "```",
        "",
      ].join("\n"),
    );
    expectFailure(root, /immediately duplicate a message declaration/);

    writeFileSync(
      join(root, "packages", "validation", "README.md"),
      [
        "## Complete Proto Example",
        "",
        "```protobuf",
        'import "google/protobuf/timestamp.proto";',
        "// Describes an account user.",
        "message User {",
        "  // Stores the account expiration time.",
        "  google.protobuf.Timestamp expires_at = 11 [(when).in = FUTURE];",
        "}",
        "```",
        "",
      ].join("\n"),
    );
    assert.equal(checkDocumentation({ root }).length, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = createFixture();
  try {
    const documentedFence = [
      "```protobuf",
      "// Describes an account user.",
      "message User {",
      "  // Stores the account identifier.",
      "  string id = 1;",
      "",
      "  // Lists account roles.",
      "  enum Role {",
      "    // Marks a user without a selected role.",
      "    ROLE_UNSPECIFIED = 0;",
      "",
      "    // Marks a regular account user.",
      "    ROLE_MEMBER = 1;",
      "  }",
      "",
      "  // Selects one contact method.",
      "  oneof contact {",
      "    // Stores an email address.",
      "    string email = 2;",
      "",
      "    // Stores a phone number.",
      "    string phone = 3;",
      "  }",
      "}",
      "```",
    ].join("\n");
    writeReadme(root, withPublicImport(documentedFence));
    assert.equal(checkDocumentation({ root }).length, 3);

    writeReadme(
      root,
      withPublicImport(documentedFence.replace("  // Stores the account identifier.\n", "")),
    );
    expectFailure(root, /README\.md.*field id.*leading comment/);

    writeReadme(
      root,
      withPublicImport(documentedFence.replace("  string id = 1;\n\n", "  string id = 1;\n")),
    );
    expectFailure(root, /README\.md.*field id.*exactly one empty line/);

    writeReadme(
      root,
      withPublicImport(documentedFence.replace("  string id = 1;\n\n", "  string id = 1;\n\n\n")),
    );
    expectFailure(root, /README\.md.*field id.*exactly one empty line/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = createFixture();
  try {
    writeReadme(root, withPublicImport("# Root"));
    writeFileSync(join(root, "docs", "z-last.md"), "{field}");
    writeFileSync(join(root, "docs", "a-first.md"), "{value}");
    const markdown = findMaintainedMarkdown(root);
    assert.deepEqual(
      markdown,
      [...markdown].sort((left, right) => left.localeCompare(right)),
    );
    expectFailure(root, /docs\/a-first\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = createFixture();
  try {
    writeReadme(root, withPublicImport("# Root"));
    writeFileSync(
      join(root, "packages", "validation", "src", "z-last.ts"),
      "/** legacy adapter. */\nexport const last = 1;\n",
    );
    writeFileSync(
      join(root, "packages", "validation", "src", "a-first.ts"),
      "/** legacy adapter. */\nexport const first = 1;\n",
    );
    expectFailure(root, /packages\/validation\/src\/a-first\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = createFixture();
  try {
    const directSetup =
      "```bash\ncorepack pnpm install --frozen-lockfile\ncorepack pnpm build\ncorepack pnpm test:example\n```";
    writeRepositoryGuides(root, {
      rootSetup: directSetup,
      exampleSetup: directSetup,
      developmentSetup: directSetup,
    });
    assert.equal(checkDocumentation({ root }).length, 6);

    writeRepositoryGuides(root, {
      rootSetup: "```bash\ncorepack enable pnpm\ncorepack pnpm install --frozen-lockfile\n```",
      exampleSetup: directSetup,
      developmentSetup: directSetup,
    });
    expectFailure(root, /must not use corepack enable pnpm/);

    writeRepositoryGuides(root, {
      rootSetup:
        "Run `corepack pnpm install --frozen-lockfile`.\n\n```bash\npnpm install --frozen-lockfile\n```",
      exampleSetup: directSetup,
      developmentSetup: directSetup,
    });
    expectFailure(root, /must begin with corepack pnpm/);

    writeRepositoryGuides(root, {
      rootSetup:
        "```bash\ncorepack pnpm install --frozen-lockfile\ncorepack pnpm test:example\n```",
      exampleSetup: directSetup,
      developmentSetup: directSetup,
    });
    expectFailure(root, /must run corepack pnpm build before corepack pnpm test:example/);
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
