import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const stalePlaceholder =
  /(?:\$\{(?:value|other|field|regex)\}|(?<!\$)\{(?:value|other|field|regex)\})/;
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

function typecheckSnippet(snippet, file, root, index) {
  const temporaryRoot = mkdtempSync(join(root, ".documentation-snippets-"));
  try {
    const snippetPath = join(temporaryRoot, "snippet.ts");
    writeFileSync(snippetPath, snippet);

    // Maintained examples may import this documented generated module. It is the
    // sole virtual relative module; all other relative imports must resolve.
    mkdirSync(join(temporaryRoot, "generated"));
    writeFileSync(
      join(temporaryRoot, "generated", "user_pb.ts"),
      "export declare const UserSchema: any;\n",
    );

    const program = ts.createProgram([snippetPath], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2024,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      ignoreDeprecations: "6.0",
      baseUrl: root,
      paths: { [publicPackage]: [index] },
    });
    const diagnostic = ts
      .getPreEmitDiagnostics(program)
      .find((entry) => entry.category === ts.DiagnosticCategory.Error);
    if (diagnostic) {
      throw new Error(
        `Non-compilable TypeScript snippet in ${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
      );
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function tsDocTypeScriptFences(source) {
  const fences = [];
  for (const comment of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
    const text = comment[1].replace(/^\s*\*\s?/gm, "");
    for (const fence of text.matchAll(typeScriptFence)) fences.push(fence[1]);
  }
  return fences;
}

function checkTypeScriptFences(content, file, root, index, publicExports) {
  let publicImportCount = 0;
  for (const fence of content) {
    for (const imported of namedPublicImports(fence)) {
      publicImportCount++;
      if (!publicExports.has(imported)) throw new Error(`Non-public import ${imported} in ${file}`);
    }
    typecheckSnippet(fence, file, root, index);
  }
  return publicImportCount;
}

/** Runs all project-owned documentation checks and returns checked Markdown paths. */
export function checkDocumentation({ root }) {
  const markdown = findMaintainedMarkdown(root);
  const index = resolve(root, "packages/validation/src/index.ts");
  const publicExports = discoverPublicExports(readFileSync(index, "utf8"));
  let publicImportCount = 0;

  for (const file of markdown) {
    const content = readFileSync(file, "utf8");
    if (stalePlaceholder.test(content))
      throw new Error(`Stale unnamespaced placeholder in ${file}`);
    publicImportCount += checkTypeScriptFences(
      [...content.matchAll(typeScriptFence)].map((fence) => fence[1]),
      file,
      root,
      index,
      publicExports,
    );
    for (const match of content.matchAll(localLink)) {
      const target = match[1];
      if (/^[a-z]+:/i.test(target)) continue;
      if (!existsSync(resolve(dirname(file), target)))
        throw new Error(`Broken local link ${target} in ${file}`);
    }
  }

  const publicTsDoc = resolve(root, "packages/validation/src/validation.ts");
  const publicTsDocSource = readFileSync(publicTsDoc, "utf8");
  if (stalePlaceholder.test(publicTsDocSource))
    throw new Error(`Stale unnamespaced placeholder in ${publicTsDoc}`);
  publicImportCount += checkTypeScriptFences(
    tsDocTypeScriptFences(publicTsDocSource),
    publicTsDoc,
    root,
    index,
    publicExports,
  );

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
