import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const stalePlaceholder =
  /(?:\$\{(?:value|other|field|regex)\}|(?<!\$)\{(?:value|other|field|regex)\})/;
const markdownLink = /\[[^\]]*\]\(([^)\s]+)\)/g;
const typeScriptFence = /```(?:ts|typescript)\s*\r?\n([\s\S]*?)```/gi;
const shellFence = /```(?:bash|sh|shell)\s*\r?\n([\s\S]*?)```/gi;
const publicPackage = "@spine-event-engine/validation";
const previewInstall = /(?:pnpm|npm)\s+(?:add|install)\s+[^\n]*@spine-event-engine\/validation@/;
const exactPreview = /@spine-event-engine\/validation@\d+\.\d+\.\d+-snapshot\.\d+/;
const historicalWorkflowLanguage =
  /(?:\bimplementation[- ]history\b|\bchat(?:\s+transcript)?\b|\btask(?:\s+(?:record|log|branch|history))?\b|(?<!-)\bfrozen\b|\bprovenance\b|\bintake record\b|\bshared-envelope\b|\blegacy (?:adapter|behavior)\b|\bimplementation seams\b|\bapproved (?:direction|comparison)\b)/i;
const repositorySetupGuides = [
  "README.md",
  "packages/example/README.md",
  "packages/validation/docs/development.md",
  "packages/validation/docs/contributing.md",
];

/** Returns maintained Markdown files, excluding generated TypeDoc and protocol records. */
export function findMaintainedMarkdown(root) {
  const markdown = [resolve(root, "README.md")];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (["node_modules", ".worktrees", "api", "build-protocol"].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extname(entry.name) === ".md") markdown.push(path);
    }
  };
  for (const directory of [resolve(root, "docs"), resolve(root, "packages")]) {
    if (existsSync(directory)) visit(directory);
  }
  return markdown.sort((left, right) => left.localeCompare(right));
}

function executableLines(fence) {
  return fence.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
}

function checkPreviewInstallSequences(content, file) {
  for (const match of content.matchAll(shellFence)) {
    const fence = match[1];
    if (!previewInstall.test(fence)) continue;
    if (hasShellOperator(fence))
      throw new Error(`Quick-install sequence in ${file} must not use shell chaining or operators`);
    const commands = executableLines(fence);
    if (commands.length !== 1)
      throw new Error(
        `Quick-install sequence in ${file} must contain exactly one executable command`,
      );
    if (exactPreview.test(fence)) {
      const beforeFence = content.slice(0, match.index);
      const headings = [...beforeFence.matchAll(/^#{1,6}\s+(.+)$/gm)];
      const precedingHeading = headings.at(-1)?.[1] ?? "";
      if (!/alternative/i.test(precedingHeading))
        throw new Error(
          `Exact preview install in ${file} must be in a separately labelled alternative section`,
        );
    }
  }
}

/** Checks direct-Corepack setup and clean example-test ordering in repository guides. */
function checkRepositorySetup(root, file, content) {
  const relativePath = relative(root, file);
  if (!repositorySetupGuides.includes(relativePath)) return;
  if (!repositorySetupGuides.every((guide) => existsSync(resolve(root, guide)))) return;
  if (/\bcorepack enable pnpm\b/.test(content))
    throw new Error(`Repository guide ${file} must not use corepack enable pnpm`);
  if (!/corepack pnpm install --frozen-lockfile/.test(content))
    throw new Error(`Repository guide ${file} must include direct corepack pnpm setup`);

  for (const match of content.matchAll(shellFence)) {
    const commands = executableLines(match[1]);
    for (const command of commands) {
      if (/^pnpm\s/.test(command))
        throw new Error(`Repository command in ${file} must begin with corepack pnpm`);
    }
    const exampleTest = commands.indexOf("corepack pnpm test:example");
    if (exampleTest !== -1 && !commands.slice(0, exampleTest).includes("corepack pnpm build"))
      throw new Error(
        `Repository guide ${file} must run corepack pnpm build before corepack pnpm test:example`,
      );
  }
}

/** Detects shell control operators outside quoted package arguments. */
function hasShellOperator(command) {
  let quote;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (character === "\\") {
      if (!quote && (command[index + 1] === "\n" || command.slice(index + 1, index + 3) === "\r\n"))
        return true;
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === ";" || character === "|") return true;
    if (character === "&") return true;
  }
  return false;
}

function checkPackageDocumentationLinks(root) {
  const docs = resolve(root, "packages/validation/docs");
  if (!existsSync(docs)) return;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extname(entry.name) === ".md") {
        const content = readFileSync(path, "utf8");
        if (!/\]\(\.\.\/README\.md(?:#[^)]+)?\)/.test(content))
          throw new Error(`Package documentation ${path} must link back to the package README`);
      }
    }
  };
  visit(docs);
}

function headingAnchors(content) {
  const counts = new Map();
  const anchors = new Set();
  for (const match of content.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1]
      .trim()
      .toLowerCase()
      .replace(/[\]`*_~()]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-");
    if (!slug) continue;
    const duplicate = counts.get(slug) ?? 0;
    counts.set(slug, duplicate + 1);
    anchors.add(duplicate === 0 ? slug : `${slug}-${duplicate}`);
  }
  return anchors;
}

/** Throws when a resolved local path leaves the real repository root. */
function assertWithinRepository(repositoryRoot, targetPath, destination, file) {
  const resolvedRoot = resolve(repositoryRoot);
  const realRepositoryRoot = realpathSync(repositoryRoot);
  const resolvedTarget = resolve(targetPath);
  const contained = (root, path) => {
    const pathRelative = relative(root, path);
    return pathRelative === "" || (!pathRelative.startsWith("..") && !isAbsolute(pathRelative));
  };
  if (!contained(resolvedRoot, resolvedTarget))
    throw new Error(`Local link ${destination} in ${file} escapes the repository root`);
  if (existsSync(resolvedTarget) && !contained(realRepositoryRoot, realpathSync(resolvedTarget)))
    throw new Error(`Local link ${destination} in ${file} escapes the repository root`);
}

function checkLocalMarkdownLinks(content, file, root) {
  for (const match of content.matchAll(markdownLink)) {
    const destination = match[1];
    if (/^[a-z]+:/i.test(destination) || destination.startsWith("api/reference/")) continue;
    const hashIndex = destination.indexOf("#");
    const target = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
    const anchor =
      hashIndex === -1 ? undefined : decodeURIComponent(destination.slice(hashIndex + 1));
    if (target && isAbsolute(target))
      throw new Error(`Local link ${destination} in ${file} escapes the repository root`);
    const targetPath = target ? resolve(dirname(file), target) : file;
    assertWithinRepository(root, targetPath, destination, file);
    if (!existsSync(targetPath)) throw new Error(`Broken local link ${target} in ${file}`);
    if (
      anchor &&
      extname(targetPath) === ".md" &&
      !headingAnchors(readFileSync(targetPath, "utf8")).has(anchor)
    )
      throw new Error(`Broken local anchor ${anchor} in ${file}`);
  }
}

function checkCompleteProtoExample(root) {
  const packageReadme = resolve(root, "packages/validation/README.md");
  const content = readFileSync(packageReadme, "utf8");
  const example = content.match(
    /^## Complete Proto Example\s*\n\n```protobuf\s*\n([\s\S]*?)```/m,
  )?.[1];
  if (!example) return;
  if (!/import "google\/protobuf\/timestamp\.proto";/.test(example))
    throw new Error("Complete Proto Example must import google/protobuf/timestamp.proto");
  if (
    !/google\.protobuf\.Timestamp\s+expires_at\s*=\s*11\s+\[\(when\)\.in\s*=\s*FUTURE\];/.test(
      example,
    )
  )
    throw new Error("Complete Proto Example must demonstrate (when) with expires_at");
  if (/^\s*message\s+(\w+)\s*\{\s*\n\s*message\s+\1\s*\{/m.test(example))
    throw new Error("Complete Proto Example must not immediately duplicate a message declaration");
}

function checkSourceTsDoc(root, index, publicExports) {
  const sourceRoots = [
    resolve(root, "packages/validation/src"),
    resolve(root, "packages/example/src"),
  ];
  let publicImportCount = 0;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (entry.name === "generated") continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extname(entry.name) === ".ts") {
        const source = readFileSync(path, "utf8");
        for (const comment of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
          if (historicalWorkflowLanguage.test(comment[1]))
            throw new Error(`Prohibited historical workflow language in ${path}`);
        }
        publicImportCount += checkTypeScriptFences(
          tsDocTypeScriptFences(source),
          path,
          root,
          index,
          publicExports,
        );
      }
    }
  };
  for (const sourceRoot of sourceRoots) {
    if (existsSync(sourceRoot)) visit(sourceRoot);
  }
  return publicImportCount;
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
    if (historicalWorkflowLanguage.test(content))
      throw new Error(`Prohibited historical workflow language in ${file}`);
    if (stalePlaceholder.test(content))
      throw new Error(`Stale unnamespaced placeholder in ${file}`);
    checkPreviewInstallSequences(content, file);
    checkRepositorySetup(root, file, content);
    publicImportCount += checkTypeScriptFences(
      [...content.matchAll(typeScriptFence)].map((fence) => fence[1]),
      file,
      root,
      index,
      publicExports,
    );
    checkLocalMarkdownLinks(content, file, root);
  }

  checkPackageDocumentationLinks(root);
  checkCompleteProtoExample(root);

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
  publicImportCount += checkSourceTsDoc(root, index, publicExports);

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
