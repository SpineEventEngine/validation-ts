import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const generatedFiles = [
  resolve(scriptDirectory, "../src/generated/spine/options_pb.ts"),
  resolve(scriptDirectory, "../tests/generated/spine/options_pb.ts"),
];
const generatedDeclaration = "export const require: GenExtension<MessageOptions, RequireOption>";
const patchedDeclaration = "export const requireFields: GenExtension<MessageOptions, RequireOption>";

for (const path of generatedFiles) {
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  const renamed = source.includes(patchedDeclaration)
    ? source
    : source.replace(generatedDeclaration, patchedDeclaration);
  if (!source.includes(patchedDeclaration) && renamed === source) {
    throw new Error(`Expected generated declaration was not found in ${path}`);
  }
  const patched = renamed.replaceAll(
    /((?:from|import)\s*["']\.{1,2}\/[^"]*?)(?<!\.js)(["'])/g,
    "$1.js$2",
  );
  writeFileSync(path, patched, "utf8");
}
