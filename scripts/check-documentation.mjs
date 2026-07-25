import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";

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
for (const file of markdown) {
  const text = readFileSync(file, "utf8");
  if (stale.test(text)) throw new Error(`Stale unnamespaced placeholder in ${file}`);
  for (const match of text.matchAll(link)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), target)))
      throw new Error(`Broken local link ${target} in ${file}`);
  }
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
