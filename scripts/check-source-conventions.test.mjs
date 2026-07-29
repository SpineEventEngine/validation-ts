import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkSourceConventions, countSemanticWords } from "./check-source-conventions.mjs";

/** Writes a fixture file, creating its parent directory when needed. */
async function writeFixture(rootDir, relativePath, contents) {
  const filePath = join(rootDir, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

/** Creates a disposable repository fixture and removes it after the assertion. */
async function withFixture(files, assertion) {
  const rootDir = await mkdtemp(join(tmpdir(), "source-conventions-"));
  try {
    await Promise.all(
      Object.entries(files).map(([path, contents]) => writeFixture(rootDir, path, contents)),
    );
    await assertion(rootDir);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
}

/** Returns diagnostic rule identifiers from a checker result. */
function rules(result) {
  return result.findings.map((finding) => finding.rule);
}

test("accepts documented TypeScript declarations and allowed function forms", async () => {
  await withFixture(
    {
      "packages/validation/src/valid.ts": `
      /** Validates a message. @param schema Describes the schema. @param message Describes the message. @returns Returns violations. */
      export function validate<T>(schema: T, message?: T): T { return schema; }
      /** Describes a documented owner. */
      export class ValidOwner {
        /** Creates an owner. */
        constructor() {}
        /** Returns the supplied value unchanged. @param value Value to return unchanged. @returns The supplied value. */
        method<T>(value?: T): T | undefined { return value; }
        /** Describes a callback property. */
        callback = (...values: string[]) => values.join(',');
      }
      /** Describes a named object. */
      export const namedObject = {
        /** Describes a data property. */
        label: "value",
        /** Returns an accessor value. @returns Returns the label. */
        get summary() { return this.label; },
        /** Sets an accessor value. @param value Describes the label. */
        set summary(value: string) { this.label = value; },
        /** Returns the supplied value unchanged. @param value Value to return unchanged. @returns The supplied value. */
        method(value: string) { return value; },
      };
      /** Describes a type alias. */
      export type ValidAlias = string;
      /** Describes an interface. */
      export interface ValidInterface {
        /** Describes a property. */
        value: string;
      }
      /** Describes an enum. */
      export enum ValidEnum {
        /** Describes a member. */
        VALUE = 'value',
      }
      let later: string;
    `,
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.deepEqual(rules(result), [], result.output);
    },
  );
});

test("reports TypeScript documentation, standalone functions, and forbidden product wording", async () => {
  await withFixture(
    {
      "packages/example/src/invalid.ts": `
      export function helper(value: string) { return value; }
      /** Task T-0009 implements an owner. */
      export class MissingDetails {
        value: string;
        method(value: string) { return value; }
      }
      /** Makes a value. @param missing Describes another parameter. @returns Returns a value. */
      export function documented(value: string): string { return value; }
      /** Returns a value. @param value @returns */
      export function emptyTagDescriptions(value: string): string { return value; }
      /** Describes an object. */
      export const undocumentedObject = {
        data: "value",
        get value() { return this.data; },
        set value(next: string) { this.data = next; },
      };
    `,
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.ok(rules(result).includes("tsdoc-forbidden-wording"));
      assert.ok(rules(result).includes("tsdoc-missing-param"));
      assert.ok(rules(result).includes("tsdoc-missing-param-description"));
      assert.ok(rules(result).includes("tsdoc-missing-returns-description"));
      assert.ok(rules(result).filter((rule) => rule === "tsdoc-missing").length >= 6);
      assert.equal(rules(result).filter((rule) => rule === "ts-standalone-function").length, 3);
    },
  );
});

test("rejects generic and implementation-history TSDoc without banning domain terms", async () => {
  await withFixture(
    {
      "packages/validation/src/filler.ts": `
      /** Processes inputs for a field. @param value Supplies the value input. @returns Returns the computed result. */
      export function validate(value: string): string { return value; }
      /** Describes the validation data. */
      export interface ValidationData {}
      /** Provides helper methods for a frozen Proto contract intake. */
      export const helper = { /** Returns a value. @returns Returns a value. */ value() { return "value"; } };
      /** Documents source provenance for a product contract. */
      export type HistoricalNotes = string;
      /** Reports the provenance field supplied by a message. */
      export interface DomainTerms { /** Identifies the provenance field. */ provenance: string; }
    `,
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.equal(rules(result).filter((rule) => rule === "tsdoc-filler-wording").length, 4);
      assert.doesNotMatch(result.output, /Reports the provenance field/);
    },
  );
});

test("reports overlong TypeScript names across source and test roots but not generated output", async () => {
  await withFixture(
    {
      "packages/validation/src/names.ts": `
      /** Describes a class. */ export class ThisNameHasFiveWords {}
      /** Returns a value. @param this_parameter_has_five_words Describes a parameter. @returns Returns a value. */
      export function validate(this_parameter_has_five_words: string) { return this_parameter_has_five_words; }
    `,
      "packages/validation/tests/names.test.ts": `
      import { source as imported_binding_has_five_words } from 'fixture';
      void imported_binding_has_five_words;
    `,
      "packages/validation/src/generated/generated.ts":
        "const generated_name_has_five_words = 1;\n",
      "packages/validation/dist/bundle.ts": "const dist_name_has_five_words = 1;\n",
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.deepEqual(rules(result), ["ts-name-too-long", "ts-name-too-long", "ts-name-too-long"]);
      assert.match(result.output, /ThisNameHasFiveWords/);
      assert.doesNotMatch(result.output, /generated_name_has_five_words|dist_name_has_five_words/);
    },
  );
});

test("counts camel, separator, initialism, and numeric semantic words", () => {
  assert.equal(countSemanticWords("two_words-here"), 3);
  assert.equal(countSemanticWords("parseHTTP2ResponseValue"), 4);
  assert.equal(countSemanticWords("HTTP2ResponseValue"), 3);
});

test("reports undocumented and overlong nested Proto declarations while ignoring comment and string lookalikes", async () => {
  await withFixture(
    {
      "packages/validation/proto/project.proto": `
      syntax = "proto3";
      // message Pretend { string fake = 1; }
      message Outer {
        // Keeps a literal brace { safe.
        string title = 1 [json_name = "{safe}"];
        message Nested { string no_comment = 1; }
        // Documents a choice.
        oneof selection { string selected_value = 2; }
        enum ExampleEnum { EXAMPLE_ENUM_VALUE = 0; }
        map<string, string> values_by_key = 3;
      }
      message ThisMessageNameHasFiveWords {}
    `,
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.equal(rules(result).filter((rule) => rule === "proto-missing-comment").length, 7);
      assert.equal(rules(result).filter((rule) => rule === "proto-name-too-long").length, 1);
      assert.doesNotMatch(result.output, /Pretend|fake/);
    },
  );
});

test("excludes Proto paths frozen by the upstream-source manifest", async () => {
  await withFixture(
    {
      "build-protocol/proto/UPSTREAM_SOURCES.json": JSON.stringify({
        frozenFiles: [{ localPath: "packages/validation/proto/frozen.proto" }],
      }),
      "packages/validation/proto/frozen.proto": "message MissingFrozenComment {}\n",
      "packages/example/proto/project.proto": "message MissingProjectComment {}\n",
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.deepEqual(rules(result), ["proto-missing-comment"]);
      assert.doesNotMatch(result.output, /frozen\.proto/);
    },
  );
});

test("does not treat option assignments as Proto field declarations", async () => {
  await withFixture(
    {
      "packages/validation/proto/options.proto": `
      // Documents an option-bearing message.
      message OptionBearing {
        // Documents the value field.
        string value = 1 [(required) = true, (pattern).error_msg = "{safe}"];
        // Documents the selection.
        oneof selection {
          option (choice).required = true;
          // Documents a selected value.
          string selected_value = 2;
        }
      }
    `,
    },
    async (rootDir) => {
      assert.deepEqual(rules(await checkSourceConventions({ rootDir })), []);
    },
  );
});

test("keeps sibling aggregate field options within their documented field", async () => {
  await withFixture(
    {
      "packages/validation/proto/nested-options.proto": `
      // Documents a field with aggregate validation options.
      message NumericBounds {
        // Documents the bounded value.
        double value = 1 [
          (min) = { value: "0.01", error_msg: "Literal { braces } stay quoted." },
          (max) = { value: "1000000.0", exclusive: true }
        ];
      }
    `,
    },
    async (rootDir) => {
      assert.deepEqual(rules(await checkSourceConventions({ rootDir })), []);
    },
  );
});

test("does not associate a trailing Proto comment with the next declaration", async () => {
  await withFixture(
    {
      "packages/validation/proto/trailing.proto": `
      syntax = "proto3";
      // Documents the message.
      message TrailingComment {
        // Documents the first field.
        string first = 1; // This is not documentation for the next field.
        string second = 2;
      }
    `,
    },
    async (rootDir) => {
      const result = await checkSourceConventions({ rootDir });
      assert.deepEqual(rules(result), ["proto-missing-comment"]);
      assert.match(result.output, /second/);
    },
  );
});

test("emits byte-identical path-sorted diagnostics", async () => {
  await withFixture(
    {
      "packages/example/src/z.ts": "export function zed() {}\n",
      "packages/validation/src/a.ts": "export function alpha() {}\n",
    },
    async (rootDir) => {
      const first = await checkSourceConventions({ rootDir });
      const second = await checkSourceConventions({ rootDir });
      assert.equal(first.output, second.output);
      assert.match(first.output, /packages\/example\/src\/z\.ts/);
      assert.ok(
        first.output.indexOf("packages/example/src/z.ts") <
          first.output.indexOf("packages/validation/src/a.ts"),
      );
    },
  );
});
