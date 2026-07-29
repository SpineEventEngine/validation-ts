import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import ts from "typescript";

const TYPE_SCRIPT_ROOTS = ["packages/validation", "packages/example"];
const PRODUCTION_SOURCE_ROOTS = ["packages/validation/src", "packages/example/src"];
const PROTO_ROOTS = [
  "packages/validation/proto",
  "packages/validation/tests/proto",
  "packages/example/proto",
];
const EXCLUDED_DIRECTORY_NAMES = new Set(["coverage", "dist", "generated", "node_modules"]);
const FORBIDDEN_TSDOC =
  /\b(?:t-\d+|task|agent|workflow|chat|transcript|implementation[ -]history|implemented|legacy|historical)\b/i;
const FILLER_TSDOC = [
  /\bdescribes the purpose of\b/i,
  /\bprocesses inputs for\b/i,
  /\bsupplies the [^\n]* input\b/i,
  /\breturns the computed result\b/i,
  /\bdescribes the [^\n]*\b(?:value|data)\b/i,
  /\brepresents the [^\n]*\bdata\b/i,
  /\bprovides helper methods\b/i,
  /\blegacy (?:adapter|behavior|exception)\b/i,
  /\bfrozen (?:proto|contract)\b/i,
  /\bshared-envelope\b/i,
  /\b(?:documents|records|preserves) (?:the )?(?:source|contract) provenance\b/i,
  /\b(?:documents|records|preserves) (?:the )?(?:source|contract) intake\b/i,
];

/** Counts semantic words in an identifier. */
export function countSemanticWords(name) {
  return name
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean).length;
}

/** Finds source files beneath a root while excluding generated and dependency output. */
async function findFiles(rootDir, roots, suffix) {
  const files = [];
  async function visit(relativeDirectory) {
    const directory = join(rootDir, relativeDirectory);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const entryPath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) await visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        files.push(entryPath);
      }
    }
  }
  await Promise.all(roots.map(visit));
  return files.sort();
}

/** Reads JSDoc blocks directly leading a declaration. */
function leadingJsDocs(sourceFile, node) {
  const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? [];
  return ranges
    .filter(({ pos, end }) => sourceFile.text.slice(pos, end).startsWith("/**"))
    .map((range) => ({ ...range, text: sourceFile.text.slice(range.pos, range.end) }));
}

/** Reads the last JSDoc block directly leading a declaration. */
function leadingJsDoc(sourceFile, node) {
  return leadingJsDocs(sourceFile, node).at(-1)?.text;
}

/** Adds a normalized diagnostic. */
function addFinding(findings, path, sourceFile, position, rule, message) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(position);
  findings.push({ line: line + 1, message, path, rule });
}

/** Returns the identifier text when a node has an identifier name. */
function nodeName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
}

/** Determines whether a function declaration is the deliberate validate exception. */
function isAllowedValidate(node) {
  return (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "validate" &&
    Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
  );
}

/** Determines whether a callable has a non-void return based on syntax. */
function hasNonVoidReturn(node) {
  if (node.type)
    return (
      node.type.kind !== ts.SyntaxKind.VoidKeyword && node.type.kind !== ts.SyntaxKind.NeverKeyword
    );
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return true;
  let hasValue = false;
  const visit = (child) => {
    if (hasValue || ts.isFunctionLike(child)) return;
    if (ts.isReturnStatement(child) && child.expression) hasValue = true;
    ts.forEachChild(child, visit);
  };
  if (node.body) ts.forEachChild(node.body, visit);
  return hasValue;
}

/** Checks the TSDoc contract for a declaration that requires documentation. */
function checkDocumentation(findings, path, sourceFile, node, callable = false) {
  const documentationTarget =
    ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent)
      ? node.parent.parent
      : node;
  const comment = leadingJsDoc(sourceFile, documentationTarget);
  const name =
    nodeName(node) ?? (ts.isConstructorDeclaration(node) ? "constructor" : "declaration");
  if (!comment) {
    addFinding(
      findings,
      path,
      sourceFile,
      node.getStart(sourceFile),
      "tsdoc-missing",
      `Missing TSDoc for ${name}.`,
    );
    return;
  }
  if (!callable) return;
  const documentationText = comment.replace(/^\/\*\*|\*\/$/g, "");
  const description = documentationText
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .find((line) => line && !line.startsWith("@"));
  const firstWord = description?.match(/^[A-Za-z]+/)?.[0]?.toLowerCase();
  if (!firstWord || !(["is", "has", "does"].includes(firstWord) || firstWord.endsWith("s"))) {
    addFinding(
      findings,
      path,
      sourceFile,
      node.getStart(sourceFile),
      "tsdoc-callable-summary",
      `TSDoc summary for ${name} must start with a third-person verb.`,
    );
  }
  const parameterTags = new Map(
    [...documentationText.matchAll(/@param\s+(?:\{[^}]*\}\s+)?([\w$]+)([^\r\n@]*)/g)].map(
      (match) => [match[1], match[2].trim()],
    ),
  );
  for (const parameter of node.parameters ?? []) {
    if (ts.isIdentifier(parameter.name) && !parameterTags.has(parameter.name.text)) {
      addFinding(
        findings,
        path,
        sourceFile,
        parameter.getStart(sourceFile),
        "tsdoc-missing-param",
        `Missing @param for ${parameter.name.text}.`,
      );
    } else if (ts.isIdentifier(parameter.name) && !parameterTags.get(parameter.name.text)) {
      addFinding(
        findings,
        path,
        sourceFile,
        parameter.getStart(sourceFile),
        "tsdoc-missing-param-description",
        `Missing @param description for ${parameter.name.text}.`,
      );
    }
  }
  if (hasNonVoidReturn(node)) {
    const returns = documentationText.match(/@returns?\b([^\r\n@]*)/);
    if (!returns) {
      addFinding(
        findings,
        path,
        sourceFile,
        node.getStart(sourceFile),
        "tsdoc-missing-returns",
        `Missing @returns for ${name}.`,
      );
    } else if (!returns[1].trim()) {
      addFinding(
        findings,
        path,
        sourceFile,
        node.getStart(sourceFile),
        "tsdoc-missing-returns-description",
        `Missing @returns description for ${name}.`,
      );
    }
  }
}

/** Checks every TSDoc block, including blocks detached from a declaration. */
function checkTsDocBlocks(findings, path, sourceFile) {
  for (const match of sourceFile.text.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    const comment = match[0];
    const position = match.index;
    if (FORBIDDEN_TSDOC.test(comment))
      addFinding(
        findings,
        path,
        sourceFile,
        position,
        "tsdoc-forbidden-wording",
        "TSDoc contains workflow or history wording.",
      );
    if (FILLER_TSDOC.some((pattern) => pattern.test(comment)))
      addFinding(
        findings,
        path,
        sourceFile,
        position,
        "tsdoc-filler-wording",
        "TSDoc uses generic or implementation-history wording.",
      );
  }
}

/** Checks named TypeScript identifiers against the semantic-word convention. */
function checkName(findings, path, sourceFile, identifier) {
  if (!identifier || !ts.isIdentifier(identifier)) return;
  const count = countSemanticWords(identifier.text);
  if (count > 4) {
    addFinding(
      findings,
      path,
      sourceFile,
      identifier.getStart(sourceFile),
      "ts-name-too-long",
      `${identifier.text} has ${count} semantic words.`,
    );
  }
}

/** Checks TypeScript declarations in one source file. */
function checkTypeScriptFile(findings, path, contents, productionSource) {
  const sourceFile = ts.createSourceFile(path, contents, ts.ScriptTarget.Latest, true);
  if (productionSource) checkTsDocBlocks(findings, path, sourceFile);
  const visit = (node) => {
    const moduleScoped = node.parent === sourceFile;
    const callable = ts.isFunctionLike(node);
    const named = nodeName(node);
    if (named) checkName(findings, path, sourceFile, node.name);

    const isNamedObject =
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer) &&
      node.parent.parent.parent === sourceFile;
    const isNamedObjectMember =
      node.parent &&
      ts.isObjectLiteralExpression(node.parent) &&
      ts.isVariableDeclaration(node.parent.parent) &&
      node.parent.parent.initializer === node.parent &&
      node.parent.parent.parent.parent.parent === sourceFile;
    const documentationDeclaration =
      (moduleScoped &&
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node))) ||
      isNamedObject ||
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isPropertySignature(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isEnumMember(node) ||
      (isNamedObjectMember &&
        !ts.isComputedPropertyName(node.name) &&
        (ts.isPropertyAssignment(node) ||
          ts.isShorthandPropertyAssignment(node) ||
          ts.isGetAccessorDeclaration(node) ||
          ts.isSetAccessorDeclaration(node)));
    if (productionSource && documentationDeclaration) {
      const documentationTarget =
        ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent)
          ? node.parent.parent
          : node;
      const docs = leadingJsDocs(sourceFile, documentationTarget);
      if (docs.length > 1)
        addFinding(
          findings,
          path,
          sourceFile,
          docs[1].pos,
          "tsdoc-duplicate",
          `Consecutive TSDoc blocks document ${named ?? "this declaration"}.`,
        );
      checkDocumentation(
        findings,
        path,
        sourceFile,
        node,
        callable ||
          ts.isConstructorDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isMethodSignature(node) ||
          ts.isGetAccessorDeclaration(node) ||
          ts.isSetAccessorDeclaration(node),
      );
    }

    if (
      productionSource &&
      moduleScoped &&
      ts.isFunctionDeclaration(node) &&
      !isAllowedValidate(node)
    ) {
      addFinding(
        findings,
        path,
        sourceFile,
        node.getStart(sourceFile),
        "ts-standalone-function",
        `Module-scope function ${node.name?.text ?? "<anonymous>"} is not allowed.`,
      );
    }
    if (
      productionSource &&
      ts.isVariableDeclaration(node) &&
      node.parent.parent.parent === sourceFile &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      addFinding(
        findings,
        path,
        sourceFile,
        node.getStart(sourceFile),
        "ts-standalone-function",
        `Module-scope function-valued variable ${nodeName(node) ?? "<anonymous>"} is not allowed.`,
      );
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

/** Tokenizes the Proto grammar subset required for declaration conventions. */
function tokenizeProto(contents) {
  const tokens = [];
  for (let index = 0; index < contents.length;) {
    const remaining = contents.slice(index);
    if (/^\s/.test(remaining)) {
      index += 1;
      continue;
    }
    if (remaining.startsWith("//")) {
      const end = contents.indexOf("\n", index);
      tokens.push({
        position: index,
        text: contents.slice(index, end === -1 ? contents.length : end),
        type: "comment",
      });
      index = end === -1 ? contents.length : end;
      continue;
    }
    if (remaining.startsWith("/*")) {
      const end = contents.indexOf("*/", index + 2);
      const final = end === -1 ? contents.length : end + 2;
      tokens.push({ position: index, text: contents.slice(index, final), type: "comment" });
      index = final;
      continue;
    }
    if (remaining.startsWith('"') || remaining.startsWith("'")) {
      const quote = remaining[0];
      let end = index + 1;
      while (end < contents.length) {
        if (contents[end] === "\\") end += 2;
        else if (contents[end++] === quote) break;
      }
      tokens.push({ position: index, text: contents.slice(index, end), type: "string" });
      index = end;
      continue;
    }
    const identifier = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      tokens.push({ position: index, text: identifier[0], type: "identifier" });
      index += identifier[0].length;
      continue;
    }
    tokens.push({ position: index, text: contents[index], type: "punctuation" });
    index += 1;
  }
  return tokens;
}

/** Checks a Proto declaration and records its comment and name diagnostics. */
function checkProtoDeclaration(findings, path, sourceFile, token, comment) {
  if (!comment)
    addFinding(
      findings,
      path,
      sourceFile,
      token.position,
      "proto-missing-comment",
      `Missing comment for ${token.text}.`,
    );
  const count = countSemanticWords(token.text);
  if (count > 4)
    addFinding(
      findings,
      path,
      sourceFile,
      token.position,
      "proto-name-too-long",
      `${token.text} has ${count} semantic words.`,
    );
}

/** Determines whether a Proto comment begins its own documentation line. */
function isLeadingProtoComment(contents, comment) {
  const lineStart = contents.lastIndexOf("\n", comment.position) + 1;
  return contents.slice(lineStart, comment.position).trim().length === 0;
}

/** Checks project-owned Proto declarations using the small declaration tokenizer. */
function checkProtoFile(findings, path, contents) {
  const sourceFile = ts.createSourceFile(path, contents, ts.ScriptTarget.Latest, true);
  const tokens = tokenizeProto(contents);
  function statementEnd(start) {
    const delimiters = [];
    const closing = new Map([
      [")", "("],
      ["]", "["],
      ["}", "{"],
    ]);
    for (let index = start; index < tokens.length; index += 1) {
      const token = tokens[index].text;
      if (["(", "[", "{"].includes(token)) delimiters.push(token);
      else if (closing.has(token) && closing.get(token) === delimiters.at(-1)) delimiters.pop();
      else if (token === ";" && delimiters.length === 0) return index;
      else if (token === "}" && delimiters.length === 0) return index;
    }
    return tokens.length;
  }
  function parseBody(start, context) {
    let index = start;
    let comment;
    while (index < tokens.length && tokens[index].text !== "}") {
      const token = tokens[index];
      if (token.type === "comment") {
        comment = isLeadingProtoComment(contents, token) ? token : undefined;
        index += 1;
        continue;
      }
      if (
        ["message", "enum", "oneof"].includes(token.text) &&
        tokens[index + 1]?.type === "identifier"
      ) {
        const name = tokens[index + 1];
        checkProtoDeclaration(findings, path, sourceFile, name, comment);
        comment = undefined;
        index += 2;
        while (index < tokens.length && tokens[index].text !== "{" && tokens[index].text !== ";")
          index += 1;
        if (tokens[index]?.text === "{") index = parseBody(index + 1, token.text) + 1;
        else index += 1;
        continue;
      }
      if (token.text === "option") {
        index = statementEnd(index);
        comment = undefined;
        index += 1;
        continue;
      }
      if (
        (context === "message" || context === "oneof") &&
        token.text !== "option" &&
        (token.type === "identifier" || token.text === "map")
      ) {
        const end = statementEnd(index);
        const equals = tokens.slice(index, end).findIndex((candidate) => candidate.text === "=");
        if (equals >= 0) {
          const beforeEquals = tokens
            .slice(index, index + equals)
            .filter((candidate) => candidate.type === "identifier");
          const name = beforeEquals.at(-1);
          if (name) checkProtoDeclaration(findings, path, sourceFile, name, comment);
          comment = undefined;
          index = end + 1;
          continue;
        }
      }
      if (context === "enum" && token.type === "identifier" && tokens[index + 1]?.text === "=") {
        checkProtoDeclaration(findings, path, sourceFile, token, comment);
        comment = undefined;
        while (index < tokens.length && tokens[index].text !== ";") index += 1;
        index += 1;
        continue;
      }
      comment = undefined;
      index += 1;
    }
    return index;
  }
  parseBody(0, "file");
}

/** Reads frozen Proto paths from the immutable upstream-source manifest. */
async function frozenProtoPaths(rootDir) {
  const manifestPath = join(rootDir, "build-protocol/proto/UPSTREAM_SOURCES.json");
  if (!existsSync(manifestPath)) return new Set();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return new Set((manifest.frozenFiles ?? []).map((entry) => entry.localPath));
}

/** Runs the deterministic TypeScript and Proto convention checks. */
export async function checkSourceConventions({ rootDir = process.cwd() } = {}) {
  const findings = [];
  const typeScriptPaths = await findFiles(rootDir, TYPE_SCRIPT_ROOTS, ".ts");
  await Promise.all(
    typeScriptPaths.map(async (path) => {
      const contents = await readFile(join(rootDir, path), "utf8");
      checkTypeScriptFile(
        findings,
        path,
        contents,
        PRODUCTION_SOURCE_ROOTS.some((root) => path.startsWith(`${root}/`)),
      );
    }),
  );
  const frozenPaths = await frozenProtoPaths(rootDir);
  const protoPaths = (await findFiles(rootDir, PROTO_ROOTS, ".proto")).filter(
    (path) => !frozenPaths.has(path),
  );
  await Promise.all(
    protoPaths.map(async (path) =>
      checkProtoFile(findings, path, await readFile(join(rootDir, path), "utf8")),
    ),
  );
  findings.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule) ||
      left.message.localeCompare(right.message),
  );
  const output = findings
    .map((finding) => `${finding.path}:${finding.line} ${finding.rule} ${finding.message}`)
    .join("\n");
  return { findings, output };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const result = await checkSourceConventions();
  if (result.output) process.stderr.write(`${result.output}\n`);
  process.exitCode = result.findings.length === 0 ? 0 : 1;
}
