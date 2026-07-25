import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const markdown = [resolve(root, "README.md")];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".worktrees", "api"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (extname(entry.name) === ".md") markdown.push(path);
  }
}
visit(resolve(root, "docs"));
visit(resolve(root, "packages"));

const stale = /(?<!\$)\{(?:value|other|field|regex)\}/;
const link = /\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g;
const snippet = /```(?:ts|typescript)\n([\s\S]*?)```/g;
const exports = new Set(
  [
    ...readFileSync(resolve(root, "packages/validation/src/index.ts"), "utf8").matchAll(
      /export\s*\{([\s\S]*?)\}/g,
    ),
  ]
    .flatMap((match) => match[1].split(","))
    .map((name) =>
      name
        .trim()
        .split(/\s+as\s+/)
        .at(-1),
    )
    .filter(Boolean),
);
for (const file of markdown) {
  const text = readFileSync(file, "utf8");
  if (stale.test(text)) throw new Error(`Stale unnamespaced placeholder in ${file}`);
  for (const block of text.matchAll(snippet)) {
    const transpiled = ts.transpileModule(block[1], {
      compilerOptions: { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.NodeNext },
      reportDiagnostics: true,
    });
    if (transpiled.diagnostics?.length)
      throw new Error(
        `Non-compilable TypeScript snippet in ${file}: ${transpiled.diagnostics[0].messageText}`,
      );
  }
  for (const imported of text.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*["']@spine-event-engine\/validation["']/g,
  )) {
    for (const name of imported[1].split(",").map((item) => item.trim().split(/\s+as\s+/)[0]))
      if (name && !exports.has(name)) throw new Error(`Non-public import ${name} in ${file}`);
  }
  for (const match of text.matchAll(link)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), target)))
      throw new Error(`Broken local link ${target} in ${file}`);
  }
}

for (const proto of ["packages/example/proto/user.proto", "packages/example/proto/product.proto"]) {
  const text = readFileSync(resolve(root, proto), "utf8");
  if (/\((?:is_required|required_field)\)/.test(text))
    throw new Error(`Deprecated active option in ${proto}`);
}

const publicImports = markdown.flatMap((file) =>
  [...readFileSync(file, "utf8").matchAll(/from\s+["'](@spine-event-engine\/validation)["']/g)].map(
    () => file,
  ),
);
if (publicImports.length === 0)
  throw new Error("Documentation must demonstrate the public package import");
console.log(
  `Checked ${markdown.length} Markdown files, local links, public imports, and stale syntax.`,
);
