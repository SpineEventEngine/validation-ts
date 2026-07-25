import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const stalePlaceholder = /(?<!\$)\{(?:value|other|field|regex)\}/;
const localLink = /\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g;
const typeScriptFence = /```(?:ts|typescript)\s*\r?\n([\s\S]*?)```/gi;
const publicPackage = "@spine-event-engine/validation";

/** Returns maintained Markdown files, excluding generated TypeDoc and task-history records. */
export function findMaintainedMarkdown(root) {
  const markdown = [resolve(root, "README.md")];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", ".worktrees", "api", "build-protocol"].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extname(entry.name) === ".md") markdown.push(path);
    }
  };
  visit(resolve(root, "docs"));
  visit(resolve(root, "packages"));
  return markdown;
}

/** Discovers public value and type names from the package entry point via the TypeScript AST. */
export function discoverPublicExports(indexSource) {
  const source = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
  const names = new Set();
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue;
    if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.add(element.name.text);
      continue;
    }
    if (ts.isNamespaceExport(statement.exportClause)) names.add(statement.exportClause.name.text);
  }
  return names;
}

function namedPublicImports(markdown) {
  const source = ts.createSourceFile("snippet.ts", markdown, ts.ScriptTarget.Latest, true);
  const names = [];
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === publicPackage &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const element of node.importClause.namedBindings.elements)
        names.push(element.propertyName?.text ?? element.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

function transpileSnippet(snippet, file) {
  const result = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.NodeNext, target: ts.ScriptTarget.ES2024 },
    reportDiagnostics: true,
  });
  const diagnostic = result.diagnostics?.find(
    (entry) => entry.category === ts.DiagnosticCategory.Error,
  );
  if (diagnostic) {
    throw new Error(
      `Non-compilable TypeScript snippet in ${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
    );
  }
}

/** Runs all project-owned documentation checks and returns checked Markdown paths. */
export function checkDocumentation({ root }) {
  const markdown = findMaintainedMarkdown(root);
  const publicExports = discoverPublicExports(
    readFileSync(resolve(root, "packages/validation/src/index.ts"), "utf8"),
  );
  let publicImportCount = 0;

  for (const file of markdown) {
    const content = readFileSync(file, "utf8");
    if (stalePlaceholder.test(content))
      throw new Error(`Stale unnamespaced placeholder in ${file}`);
    for (const fence of content.matchAll(typeScriptFence)) {
      transpileSnippet(fence[1], file);
      for (const imported of namedPublicImports(fence[1])) {
        publicImportCount++;
        if (!publicExports.has(imported))
          throw new Error(`Non-public import ${imported} in ${file}`);
      }
    }
    for (const match of content.matchAll(localLink)) {
      const target = match[1];
      if (/^[a-z]+:/i.test(target)) continue;
      if (!existsSync(resolve(dirname(file), target)))
        throw new Error(`Broken local link ${target} in ${file}`);
    }
  }

  for (const proto of [
    "packages/example/proto/user.proto",
    "packages/example/proto/product.proto",
  ]) {
    if (/\((?:is_required|required_field)\)/.test(readFileSync(resolve(root, proto), "utf8")))
      throw new Error(`Deprecated active option in ${proto}`);
  }
  if (publicImportCount === 0)
    throw new Error("Documentation must demonstrate a named public package import");
  return markdown;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const root = resolve(dirname(modulePath), "..");
  const markdown = checkDocumentation({ root });
  console.log(`Checked ${markdown.length} maintained Markdown files and documentation examples.`);
}
