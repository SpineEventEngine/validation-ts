import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const generatedRoot = resolve(process.cwd(), "src/generated");
const expected = "export const require: GenExtension<MessageOptions, RequireOption>";
const replacement = "export const requireFields: GenExtension<MessageOptions, RequireOption>";

function patchDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) patchDirectory(path);
    else if (entry.isFile() && path.endsWith(".ts")) patchFile(path);
  }
}

function patchFile(path) {
  const source = readFileSync(path, "utf8");
  const isOptionsDeclaration =
    basename(path) === "options_pb.ts" && basename(dirname(path)) === "spine";
  if (isOptionsDeclaration && !source.includes(expected) && !source.includes(replacement)) {
    throw new Error(`Expected generated declaration was not found in ${path}`);
  }
  const renamed = source.includes(replacement) ? source : source.replace(expected, replacement);
  const patched = renamed.replaceAll(
    /(from\s+["'])(\.{1,2}\/[^"']*?)(?<!\.js)(["'])/g,
    "$1$2.js$3",
  );
  writeFileSync(path, patched, "utf8");
}

const optionsPath = resolve(generatedRoot, "spine", "options_pb.ts");
if (!existsSync(optionsPath))
  throw new Error(`Expected generated target was not found: ${optionsPath}`);
patchDirectory(generatedRoot);
