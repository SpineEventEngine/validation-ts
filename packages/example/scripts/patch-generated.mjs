import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const generated = resolve(process.cwd(), "src/generated/spine/options_pb.ts");
const source = readFileSync(generated, "utf8");
const expected = "export const require: GenExtension<MessageOptions, RequireOption>";
const replacement = "export const requireFields: GenExtension<MessageOptions, RequireOption>";
const renamed = source.includes(replacement) ? source : source.replace(expected, replacement);
if (!source.includes(replacement) && renamed === source) {
  throw new Error(`Expected generated declaration was not found in ${generated}`);
}
writeFileSync(
  generated,
  renamed.replaceAll(/((?:from|import)\s*["']\.{1,2}\/[^"]*?)(?<!\.js)(["'])/g, "$1.js$2"),
  "utf8",
);
