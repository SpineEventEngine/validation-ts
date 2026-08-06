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
    join(root, "packages", "example", "proto", "user.proto"),
    [
      'syntax = "proto3";',
      "message UserId { string value = 1 [(required) = true]; }",
      "message User { UserId id = 1 [(required) = true, (validate) = true]; }",
      "message GetUserRequest { UserId user_id = 1 [(required) = true, (validate) = true]; }",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "packages", "example", "proto", "product.proto"),
    [
      'syntax = "proto3";',
      'message ProductId { string value = 1 [(required) = true, (pattern).regex = "^prod-[0-9]+$"]; }',
      "message Product { ProductId id = 1 [(required) = true, (validate) = true]; }",
      "message CategoryId { string value = 1 [(required) = true]; }",
      "message Category { CategoryId id = 1 [(required) = true, (validate) = true]; }",
      "",
    ].join("\n"),
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

    writeFileSync(
      join(root, "packages", "example", "proto", "user.proto"),
      [
        'syntax = "proto3";',
        "message UserId { string value = 1 [(required) = true]; }",
        "message User { UserId id = 1 [(required) = true, (validate) = true]; }",
        "message GetUserRequest { UserId user_id = 1 [(required) = true, (validate) = true]; }",
        "",
      ].join("\n"),
    );
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
        "  // Stores the primitive account identifier.",
        '  int32 id = 1 [(min).value = "1"];',
        "",
        "  // Stores the account expiration time.",
        "  google.protobuf.Timestamp expires_at = 11 [(when).in = FUTURE];",
        "}",
        "```",
        "",
      ].join("\n"),
    );
    expectFailure(root, /must declare a documented required UserId value/);

    writeFileSync(
      join(root, "packages", "validation", "README.md"),
      [
        "## Complete Proto Example",
        "",
        "```protobuf",
        'import "google/protobuf/timestamp.proto";',
        '"// Identifies an account user.",',
        '"message UserId {",',
        '"  // Stores the required account user identifier text.",',
        '"  string value = 1 [(required) = true];",',
        '"}",',
        "// Describes an account user.",
        "message User {",
        "  // Stores the required account user identifier.",
        "  UserId id = 1 [(required) = true, (validate) = true];",
        "",
        "  // Stores the account expiration time.",
        "  google.protobuf.Timestamp expires_at = 11 [(when).in = FUTURE];",
        "}",
        "```",
        "",
      ].join("\n"),
    );
    expectFailure(root, /must declare a documented required UserId value/);

    writeFileSync(
      join(root, "packages", "validation", "README.md"),
      [
        "## Complete Proto Example",
        "",
        "```protobuf",
        'import "google/protobuf/timestamp.proto";',
        "// Identifies an account user.",
        "message UserId {",
        "  // Stores the required account user identifier text.",
        "  string value = 1 [(required) = true];",
        "}",
        "",
        "// Describes an account user.",
        "message User {",
        "  // Stores the required account user identifier.",
        "  UserId id = 1 [(required) = true, (validate) = true];",
        "",
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
{
  const root = createFixture();
  try {
    writeReadme(root, withPublicImport("# Root"));
    assert.equal(checkDocumentation({ root }).length, 3);

    const userProto = join(root, "packages", "example", "proto", "user.proto");
    const validUser = readFileSync(userProto, "utf8");
    writeFileSync(
      userProto,
      readFileSync(userProto, "utf8").replace("[(required) = true]; }", "; }"),
    );
    expectFailure(root, /UserId\.value.*required/);

    writeFileSync(userProto, validUser);

    writeFileSync(
      userProto,
      `${validUser.replace(
        "UserId id = 1 [(required) = true, (validate) = true]",
        "string id = 1 [(required) = true, (validate) = true]",
      )}message LaterUser { UserId id = 1 [(required) = true, (validate) = true]; }\n`,
    );
    expectFailure(root, /User\.id.*required and validate/);

    writeFileSync(userProto, validUser);

    writeFileSync(
      userProto,
      validUser.replace(
        "UserId id = 1 [(required) = true, (validate) = true]; }",
        "string id = 1 [(required) = true, (validate) = true]; message Counterfeit { UserId id = 1 [(required) = true, (validate) = true]; } }",
      ),
    );
    expectFailure(root, /User\.id.*required and validate/);

    writeFileSync(userProto, validUser);

    writeFileSync(
      userProto,
      readFileSync(userProto, "utf8").replace(", (validate) = true]; }", "]; }"),
    );
    expectFailure(root, /User\.id.*required and validate/);

    writeFileSync(userProto, validUser);
    writeFileSync(
      userProto,
      readFileSync(userProto, "utf8").replace(
        "UserId user_id = 1 [(required) = true, (validate) = true]",
        "UserId user_id = 1 [(required) = true]",
      ),
    );
    expectFailure(root, /GetUserRequest\.user_id.*required and validate/);

    writeFileSync(userProto, validUser);

    const productProto = join(root, "packages", "example", "proto", "product.proto");
    const validProduct = readFileSync(productProto, "utf8");
    writeFileSync(
      productProto,
      readFileSync(productProto, "utf8").replace(
        /(message ProductId \{ string value = 1 \[)\(required\) = true, /,
        "$1",
      ),
    );
    expectFailure(root, /ProductId\.value.*required/);

    writeFileSync(productProto, validProduct);
    writeFileSync(
      productProto,
      readFileSync(productProto, "utf8").replace("^prod-[0-9]+$", "^product-[0-9]+$"),
    );
    expectFailure(root, /ProductId\.value must preserve the prod-\[0-9\]\+ pattern/);

    writeFileSync(productProto, validProduct);
    writeFileSync(
      productProto,
      readFileSync(productProto, "utf8").replace(
        "ProductId id = 1 [(required) = true, (validate) = true]",
        "ProductId id = 1 [(required) = true]",
      ),
    );
    expectFailure(root, /Product\.id.*required and validate/);

    writeFileSync(productProto, validProduct);
    writeFileSync(
      productProto,
      readFileSync(productProto, "utf8").replace(
        "message CategoryId { string value = 1 [(required) = true]; }",
        "message CategoryId { string value = 1; }",
      ),
    );
    expectFailure(root, /CategoryId\.value.*required/);

    writeFileSync(productProto, validProduct);

    writeFileSync(
      productProto,
      readFileSync(productProto, "utf8").replace(
        "CategoryId id = 1 [(required) = true, (validate) = true]",
        "CategoryId id = 1 [(required) = true]",
      ),
    );
    expectFailure(root, /Category\.id.*required and validate/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = createFixture();
  try {
    const documentedFence = (secondComment) =>
      [
        "```protobuf",
        "// Describes an account user.",
        "message User {",
        '  // Stores the account identifier as "{".',
        '  string id = 1 [default = "{"];',
        secondComment,
        "  string name = 2;",
        "}",
        "```",
      ].join("\n");
    writeReadme(root, withPublicImport(documentedFence("  // Stores the account name.")));
    expectFailure(root, /field id.*exactly one empty line/);

    writeReadme(root, withPublicImport(documentedFence("  // Stores the { account name.")));
    expectFailure(root, /field id.*exactly one empty line/);

    const documentedSingleQuoteFence = documentedFence("  // Stores the account name.").replace(
      'default = "{"',
      "default = '{'",
    );
    writeReadme(root, withPublicImport(documentedSingleQuoteFence));
    expectFailure(root, /field id.*exactly one empty line/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const workspaceManifest = JSON.parse(readFileSync(join(workspaceRoot, "package.json"), "utf8"));

assert.equal(
  workspaceManifest.devDependencies["@bufbuild/protobuf"],
  "2.13.0",
  "root documentation tooling must directly own @bufbuild/protobuf",
);
assert.ok(checkDocumentation({ root: workspaceRoot }).length > 0);
console.log("Documentation checker regression tests passed.");
