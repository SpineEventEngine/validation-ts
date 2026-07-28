import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const generatedRoots = [
  resolve(scriptDirectory, "../src/generated"),
  resolve(scriptDirectory, "../tests/generated"),
];
const generatedDeclaration = "export const require: GenExtension<MessageOptions, RequireOption>";
const patchedDeclaration =
  "export const requireFields: GenExtension<MessageOptions, RequireOption>";

function patchDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) patchDirectory(path);
    else if (entry.isFile() && path.endsWith(".ts")) patchFile(path);
  }
}

function patchFile(path) {
  const source = readFileSync(path, "utf8");
  const renamed = source.replace(generatedDeclaration, patchedDeclaration);
  const patched = renamed.replaceAll(
    /(from\s+["'])(\.{1,2}\/[^"']*?)(?<!\.js)(["'])/g,
    "$1$2.js$3",
  );
  writeFileSync(path, patched, "utf8");
}

for (const root of generatedRoots) {
  if (existsSync(root)) patchDirectory(root);
}
