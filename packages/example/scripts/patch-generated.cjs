/* global process */

const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const generated = resolve(process.cwd(), "src/generated/spine/options_pb.ts");
const source = readFileSync(generated, "utf8");
const expected = "export const require: GenExtension<MessageOptions, RequireOption>";
const replacement = "export const requireFields: GenExtension<MessageOptions, RequireOption>";

if (!source.includes(replacement)) {
  if (!source.includes(expected))
    throw new Error(`Expected generated declaration was not found in ${generated}`);
  writeFileSync(generated, source.replace(expected, replacement), "utf8");
}
