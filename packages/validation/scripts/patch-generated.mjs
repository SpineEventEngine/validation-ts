import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const generatedDeclaration = "export const require: GenExtension<MessageOptions, RequireOption>";
const patchedDeclaration =
  "export const requireFields: GenExtension<MessageOptions, RequireOption>";
const targets = {
  source: resolve(scriptDirectory, "../src/generated"),
  test: resolve(scriptDirectory, "../tests/generated"),
};

function patchDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) patchDirectory(path);
    else if (entry.isFile() && path.endsWith(".ts")) patchFile(path);
  }
}

function patchFile(path) {
  const source = readFileSync(path, "utf8");
  const isOptions = basename(path) === "options_pb.ts" && basename(dirname(path)) === "spine";
  if (isOptions && !source.includes(generatedDeclaration) && !source.includes(patchedDeclaration)) {
    throw new Error(`Expected generated declaration was not found in ${path}`);
  }
  const renamed = source.includes(patchedDeclaration)
    ? source
    : source.replace(generatedDeclaration, patchedDeclaration);
  writeFileSync(
    path,
    renamed.replaceAll(/(from\s+["'])(\.{1,2}\/[^"']*?)(?<!\.js)(["'])/g, "$1$2.js$3"),
    "utf8",
  );
}

for (const target of process.argv.slice(2)) {
  const root = targets[target];
  if (!root) throw new Error(`Unknown generated target: ${target}`);
  const optionsPath = resolve(root, "spine", "options_pb.ts");
  if (!existsSync(optionsPath))
    throw new Error(`Expected generated target was not found: ${optionsPath}`);
  patchDirectory(root);
}
