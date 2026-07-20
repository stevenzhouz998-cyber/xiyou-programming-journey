import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, posix, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ts from 'typescript';
import { DRAGON_PALACE_MEDIA_BYTES, SINGLE_RASTER_BYTES } from './budget-limits.mjs';

export const MAX_RASTER_BYTES = SINGLE_RASTER_BYTES;
export const MAX_MISSION_MEDIA_BYTES = DRAGON_PALACE_MEDIA_BYTES;
export const REQUIRED_TOOL = 'OpenAI built-in image_gen';
export const REQUIRED_PROVENANCE = 'generated in-project with built-in image_gen; provenance verified';
export const REQUIRED_ART_DIRECTION = 'commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.';

const EXPECTED_COLUMNS = [
  'Asset ID',
  'SHA-256',
  'Purpose',
  'Tool or source',
  'Prompt or source reference',
  'Dimensions',
  'License/provenance',
  'Screen slots',
  'QA status',
];

const FIELD_NAMES = [
  'assetId',
  'sha256',
  'purpose',
  'toolOrSource',
  'promptOrSourceReference',
  'dimensions',
  'licenseProvenance',
  'screenSlots',
  'qaStatus',
];

const REQUIRED_METADATA = [
  ['purpose', 'purpose'],
  ['toolOrSource', 'tool or source'],
  ['promptOrSourceReference', 'prompt or source reference'],
  ['dimensions', 'dimensions'],
  ['licenseProvenance', 'license/provenance'],
  ['screenSlots', 'screen slots'],
  ['qaStatus', 'QA status'],
];

const QA_STATUSES = new Set(['planned', 'generated', 'provenance-verified', 'visual-qa-passed', 'rejected']);

const REQUIRED_DRAGON_PALACE_SLOTS = new Map([
  ['assets/dragon-palace/background.webp', [
    { sourcePath: 'src/components/GameScene.tsx', loaderKey: 'background' },
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'background' },
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'background' },
  ]],
  ['assets/dragon-palace/wukong.webp', [
    { sourcePath: 'src/components/GameScene.tsx', loaderKey: 'wukong' },
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'wukong' },
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'wukong' },
  ]],
  ['assets/dragon-palace/dragon-king.webp', [
    { sourcePath: 'src/components/GameScene.tsx', loaderKey: 'dragonKing' },
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'dragonKing' },
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'dragonKing' },
  ]],
  ['assets/dragon-palace/weapons.webp', [
    { sourcePath: 'src/components/GameScene.tsx', loaderKey: 'weapons' },
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'weapons' },
  ]],
  ['assets/dragon-palace/sabre.webp', [
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'sabre', demandOpcode: 'choose_sabre' },
  ]],
  ['assets/dragon-palace/effects.webp', [
    { sourcePath: 'src/components/GameScene.tsx', loaderKey: 'effects' },
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'effects' },
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'effects' },
  ]],
  ['assets/dragon-palace/regalia.webp', [
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'regalia' },
  ]],
  ['assets/dragon-palace/wukong-regalia.webp', [
    { sourcePath: 'src/components/FourSeasRegaliaScene.tsx', loaderKey: 'wukongRegalia' },
  ]],
]);

function isPhaserSceneClass(node, sourceFile) {
  return ts.isClassDeclaration(node) && node.heritageClauses?.some(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
      && clause.types.some((type) => type.expression.getText(sourceFile) === 'Phaser.Scene'),
  );
}

function isPhaserGameConstructor(node, sourceFile) {
  return ts.isNewExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.getText(sourceFile) === 'Phaser.Game';
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function bindingIdentifiers(name, identifiers = []) {
  if (!name) return identifiers;
  if (ts.isIdentifier(name)) {
    identifiers.push(name);
    return identifiers;
  }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingIdentifiers(element.name, identifiers);
    }
  }
  return identifiers;
}

function exactSceneImports(sourcePath, sourceFile) {
  const bindings = new Map([['Phaser', []], ['assetUrl', []]]);
  const phaserModuleImports = [];
  const assetModuleImports = [];
  const phaserImports = [];
  const assetUrlImports = [];
  let forbiddenModuleReference = false;

  const recordBinding = (identifier) => {
    if (identifier && bindings.has(identifier.text)) bindings.get(identifier.text).push(identifier);
  };
  const recordBindingName = (name) => {
    for (const identifier of bindingIdentifiers(name)) recordBinding(identifier);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const modulePath = node.moduleSpecifier.text;
      if (modulePath === 'phaser') phaserModuleImports.push(node);
      if (modulePath === '../utils/assets') assetModuleImports.push(node);
      const clause = node.importClause;
      if (clause?.name) recordBinding(clause.name);
      const namedBindings = clause?.namedBindings;
      if (namedBindings && ts.isNamespaceImport(namedBindings)) recordBinding(namedBindings.name);
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const specifier of namedBindings.elements) recordBinding(specifier.name);
      }
      if (modulePath === 'phaser' && clause && !clause.isTypeOnly && !clause.name
        && namedBindings && ts.isNamespaceImport(namedBindings) && namedBindings.name.text === 'Phaser') {
        phaserImports.push(namedBindings.name);
      }
      if (modulePath === '../utils/assets' && clause && !clause.isTypeOnly && !clause.name
        && namedBindings && ts.isNamedImports(namedBindings) && namedBindings.elements.length === 1) {
        const [specifier] = namedBindings.elements;
        if (!specifier.isTypeOnly && !specifier.propertyName && specifier.name.text === 'assetUrl') {
          assetUrlImports.push(specifier.name);
        }
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      recordBinding(node.name);
      const referencedModule = ts.isExternalModuleReference(node.moduleReference)
        && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)
        ? node.moduleReference.expression.text
        : null;
      if (['Phaser', 'assetUrl'].includes(node.name.text)
        || ['phaser', '../utils/assets'].includes(referencedModule)) {
        forbiddenModuleReference = true;
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
      && ['phaser', '../utils/assets'].includes(node.moduleSpecifier.text)) {
      forbiddenModuleReference = true;
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require'
      && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])
      && ['phaser', '../utils/assets'].includes(node.arguments[0].text)) {
      forbiddenModuleReference = true;
    }

    if (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) {
      recordBindingName(node.name);
    } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)
      || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node)) && node.name) {
      recordBinding(node.name);
    } else if (ts.isCatchClause(node) && node.variableDeclaration) {
      recordBindingName(node.variableDeclaration.name);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const phaserBindings = bindings.get('Phaser');
  const assetUrlBindings = bindings.get('assetUrl');
  if (forbiddenModuleReference || phaserModuleImports.length !== 1
    || phaserImports.length !== 1 || phaserBindings.length !== 1
    || phaserBindings[0] !== phaserImports[0]) {
    throw new Error(`Asset manifest: ${sourcePath} must bind Phaser exactly once with import * as Phaser from 'phaser'.`);
  }
  if (assetModuleImports.length !== 1 || assetUrlImports.length !== 1 || assetUrlBindings.length !== 1
    || assetUrlBindings[0] !== assetUrlImports[0]) {
    throw new Error(`Asset manifest: ${sourcePath} must bind assetUrl exactly once as an unaliased named import from ../utils/assets.`);
  }
}

function staticElementName(node) {
  if (!ts.isElementAccessExpression(node) || !node.argumentExpression) return null;
  return ts.isStringLiteralLike(node.argumentExpression) ? node.argumentExpression.text : null;
}

function isThisLoadAccess(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.expression.kind === ts.SyntaxKind.ThisKeyword && node.name.text === 'load';
  }
  if (ts.isElementAccessExpression(node)) {
    return node.expression.kind === ts.SyntaxKind.ThisKeyword && staticElementName(node) === 'load';
  }
  return false;
}

function isImageAccessFromThisLoad(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'image' && isThisLoadAccess(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    return staticElementName(node) === 'image' && isThisLoadAccess(node.expression);
  }
  return false;
}

function isPotentialDynamicImageAccess(node) {
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
  const memberName = ts.isPropertyAccessExpression(node) ? node.name.text : staticElementName(node);
  if (memberName !== 'image') return false;
  const receiver = node.expression;
  return ts.isElementAccessExpression(receiver)
    && receiver.expression.kind === ts.SyntaxKind.ThisKeyword
    && staticElementName(receiver) === null;
}

function isExactDirectImageAccess(node) {
  return ts.isPropertyAccessExpression(node)
    && !node.questionDotToken
    && node.name.text === 'image'
    && ts.isPropertyAccessExpression(node.expression)
    && !node.expression.questionDotToken
    && node.expression.name.text === 'load'
    && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword;
}

function createBoundSource(sourcePath, source) {
  const compilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    noResolve: true,
    skipLibCheck: true,
  };
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    compilerOptions.target,
    true,
    ts.ScriptKind.TSX,
  );
  const host = {
    getSourceFile: (fileName) => fileName === sourcePath ? sourceFile : undefined,
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => { throw new Error('Asset manifest: in-memory TypeScript verification cannot write files.'); },
    getCurrentDirectory: () => '.',
    getDirectories: () => [],
    fileExists: (fileName) => fileName === sourcePath,
    readFile: (fileName) => fileName === sourcePath ? source : undefined,
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  const program = ts.createProgram({ rootNames: [sourcePath], options: compilerOptions, host });
  const boundSourceFile = program.getSourceFile(sourcePath);
  if (!boundSourceFile) {
    throw new Error(`Asset manifest: ${sourcePath} could not be bound for TypeScript scene verification.`);
  }
  return { sourceFile: boundSourceFile, checker: program.getTypeChecker(), program };
}

function configuredPhaserPreloadAssets(sourcePath, source) {
  const { sourceFile, checker, program } = createBoundSource(sourcePath, source);
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(`Asset manifest: ${sourcePath} cannot be parsed as TypeScript for preload verification.`);
  }
  exactSceneImports(sourcePath, sourceFile);
  const gameConstructors = [];

  const visit = (node) => {
    if (isPhaserGameConstructor(node, sourceFile)) gameConstructors.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (gameConstructors.length !== 1) {
    throw new Error(`Asset manifest: ${sourcePath} must contain exactly one new Phaser.Game configuration; found ${gameConstructors.length}.`);
  }
  const [gameConstructor] = gameConstructors;
  if (gameConstructor.arguments?.length !== 1 || !ts.isObjectLiteralExpression(gameConstructor.arguments[0])) {
    throw new Error(`Asset manifest: ${sourcePath} Phaser.Game must receive one direct object-literal configuration.`);
  }
  const config = gameConstructor.arguments[0];
  const sceneProperties = config.properties.filter(
    (property) => ts.isPropertyAssignment(property) && propertyNameText(property.name) === 'scene',
  );
  if (sceneProperties.length !== 1 || !ts.isIdentifier(sceneProperties[0].initializer)) {
    throw new Error(`Asset manifest: ${sourcePath} Phaser.Game config must select one Scene class by direct identifier.`);
  }
  const sceneInitializer = sceneProperties[0].initializer;
  const sceneIdentifier = sceneInitializer.text;
  const sceneSymbol = checker.getSymbolAtLocation(sceneInitializer);
  const sceneDeclarations = sceneSymbol?.declarations ?? [];
  const redeclarationDiagnostics = program.getSemanticDiagnostics(sourceFile).filter((diagnostic) => (
    diagnostic.code === 2300 || diagnostic.code === 2451
  ) && ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').includes(`'${sceneIdentifier}'`));
  if (redeclarationDiagnostics.length > 0 || sceneDeclarations.length !== 1
    || !ts.isClassDeclaration(sceneDeclarations[0])
    || !sceneDeclarations[0].name || sceneDeclarations[0].name.text !== sceneIdentifier
    || checker.getSymbolAtLocation(sceneDeclarations[0].name) !== sceneSymbol
    || !isPhaserSceneClass(sceneDeclarations[0], sourceFile)) {
    throw new Error(`Asset manifest: ${sourcePath} must bind the configured scene identifier ${sceneIdentifier} to exactly one Phaser.Scene class.`);
  }
  const [selectedClass] = sceneDeclarations;
  const preloadMethods = selectedClass.members.filter(
    (member) => ts.isMethodDeclaration(member)
      && ts.isIdentifier(member.name)
      && member.name.text === 'preload',
  );
  if (preloadMethods.length !== 1 || !preloadMethods[0].body) {
    throw new Error(`Asset manifest: ${sourcePath} configured Phaser.Scene must declare exactly one preload method.`);
  }

  const preloadBody = preloadMethods[0].body;
  const keyToPath = new Map();
  const pathToKey = new Map();
  const allowedImageAccesses = new Set();
  for (const preloadStatement of preloadBody.statements) {
    if (!ts.isExpressionStatement(preloadStatement)) continue;
    const loaderCall = preloadStatement.expression;
    if (!ts.isCallExpression(loaderCall)) continue;
    const imageAccess = loaderCall.expression;
    if (!isImageAccessFromThisLoad(imageAccess) && !isPotentialDynamicImageAccess(imageAccess)) continue;
    if (!isExactDirectImageAccess(imageAccess) || loaderCall.questionDotToken
      || loaderCall.arguments.length !== 2 || loaderCall.arguments.some(ts.isSpreadElement)) {
      throw new Error(`Asset manifest: ${sourcePath} preload image calls require exactly two direct arguments.`);
    }
    const [loaderKeyNode, assetUrlCall] = loaderCall.arguments;
    if (!ts.isStringLiteral(loaderKeyNode) || !ts.isCallExpression(assetUrlCall)
      || !ts.isIdentifier(assetUrlCall.expression) || assetUrlCall.expression.text !== 'assetUrl'
      || assetUrlCall.arguments.length !== 1 || !ts.isStringLiteral(assetUrlCall.arguments[0])) {
      throw new Error(`Asset manifest: ${sourcePath} preload image calls require literal key and direct assetUrl(literal path).`);
    }
    allowedImageAccesses.add(imageAccess);
    const loaderKey = loaderKeyNode.text;
    const assetPath = assetUrlCall.arguments[0].text;
    if (keyToPath.has(loaderKey)) {
      throw new Error(`Asset manifest: ${sourcePath} preload has duplicate or conflicting loader key ${loaderKey}.`);
    }
    if (pathToKey.has(assetPath)) {
      throw new Error(`Asset manifest: ${sourcePath} preload has duplicate or conflicting asset path ${assetPath}.`);
    }
    keyToPath.set(loaderKey, assetPath);
    pathToKey.set(assetPath, loaderKey);
  }

  const verifyPreloadNode = (node) => {
    if ((isImageAccessFromThisLoad(node) || isPotentialDynamicImageAccess(node))
      && !allowedImageAccesses.has(node)) {
      throw new Error(`Asset manifest: ${sourcePath} every preload image access must be one direct top-level this.load.image(literal key, assetUrl(literal path)) call.`);
    }
    if (isThisLoadAccess(node)) {
      const parent = node.parent;
      if (ts.isElementAccessExpression(parent) && parent.expression === node && staticElementName(parent) === null) {
        throw new Error(`Asset manifest: ${sourcePath} preload cannot use a dynamic this.load member.`);
      }
      const usedAsStaticMember = (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent))
        && parent.expression === node;
      if (!usedAsStaticMember) {
        throw new Error(`Asset manifest: ${sourcePath} preload cannot alias or pass this.load as a value.`);
      }
    }
    ts.forEachChild(node, verifyPreloadNode);
  };
  verifyPreloadNode(preloadBody);
  return keyToPath;
}

function configuredPhaserDemandAssets(sourcePath, source) {
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(`Asset manifest: ${sourcePath} cannot be parsed as TypeScript for demand-load verification.`);
  }
  const demandAssets = new Map();
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const imageAccess = node.expression;
      const loadAccess = ts.isPropertyAccessExpression(imageAccess) && imageAccess.name.text === 'image'
        ? imageAccess.expression
        : null;
      if (loadAccess && ts.isPropertyAccessExpression(loadAccess) && loadAccess.name.text === 'load'
        && ts.isIdentifier(loadAccess.expression) && loadAccess.expression.text === 'scene') {
        if (node.questionDotToken || node.arguments.length !== 2 || node.arguments.some(ts.isSpreadElement)) {
          throw new Error(`Asset manifest: ${sourcePath} demand image calls require exactly two direct arguments.`);
        }
        const [loaderKeyNode, assetUrlCall] = node.arguments;
        if (!ts.isStringLiteral(loaderKeyNode) || !ts.isCallExpression(assetUrlCall)
          || !ts.isIdentifier(assetUrlCall.expression) || assetUrlCall.expression.text !== 'assetUrl'
          || assetUrlCall.arguments.length !== 1 || !ts.isStringLiteral(assetUrlCall.arguments[0])) {
          throw new Error(`Asset manifest: ${sourcePath} demand image calls require literal key and direct assetUrl(literal path).`);
        }
        let owner = node.parent;
        let demandOpcode = null;
        while (owner && owner !== sourceFile) {
          if (ts.isIfStatement(owner)) {
            const condition = owner.expression.getText(sourceFile).replace(/\s+/g, '');
            const match = /^event\.opcode==='([^']+)'$/.exec(condition);
            if (match) { demandOpcode = match[1]; break; }
          }
          owner = owner.parent;
        }
        if (demandOpcode === null) {
          throw new Error(`Asset manifest: ${sourcePath} demand image call must be inside one exact event.opcode branch.`);
        }
        const loaderKey = loaderKeyNode.text;
        if (demandAssets.has(loaderKey)) throw new Error(`Asset manifest: ${sourcePath} has duplicate demand image key ${loaderKey}.`);
        demandAssets.set(loaderKey, { publicPath: assetUrlCall.arguments[0].text, demandOpcode });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return demandAssets;
}

function splitMarkdownRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isDivider(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function parseAssetManifest(markdown) {
  const lines = markdown.split(/\r?\n/);
  const assetHeaderIndexes = lines
    .map((line, index) => ({ cells: splitMarkdownRow(line), index }))
    .filter(({ cells }) => cells[0] === 'Asset ID');
  const exactHeaderIndexes = assetHeaderIndexes
    .filter(({ cells }) => cells.length === EXPECTED_COLUMNS.length && cells.every((column, index) => column === EXPECTED_COLUMNS[index]))
    .map(({ index }) => index);
  if (exactHeaderIndexes.length === 0) {
    throw new Error(`Asset manifest: exact nine-column header required: ${EXPECTED_COLUMNS.join(' | ')}.`);
  }
  if (exactHeaderIndexes.length !== 1) throw new Error('Asset manifest: exactly one exact shipping asset table is required; duplicate shipping asset table found.');
  const [headerIndex] = exactHeaderIndexes;
  const divider = splitMarkdownRow(lines[headerIndex + 1] ?? '');
  if (divider.length !== EXPECTED_COLUMNS.length || !isDivider(divider)) throw new Error('Asset manifest: exact nine-column divider is missing.');

  const manifestRows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) break;
    const cells = splitMarkdownRow(line);
    if (cells.length !== EXPECTED_COLUMNS.length) throw new Error(`Asset manifest: row ${index + 1} must contain exactly nine columns.`);
    manifestRows.push(Object.fromEntries(FIELD_NAMES.map((field, fieldIndex) => [field, cells[fieldIndex]])));
  }

  const promptRecords = [];
  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = /^### (Prompt DP-\d{3} .+)$/.exec(lines[index].trim());
    if (!headingMatch) continue;
    const heading = headingMatch[1];
    let fenceIndex = index + 1;
    while (fenceIndex < lines.length && lines[fenceIndex].trim() === '') fenceIndex += 1;
    if (lines[fenceIndex]?.trim() !== '```text') throw new Error(`Asset manifest: ${heading} must be followed immediately by a fenced text prompt record.`);
    const promptLines = [];
    let closingIndex = fenceIndex + 1;
    while (closingIndex < lines.length && lines[closingIndex].trim() !== '```') {
      promptLines.push(lines[closingIndex]);
      closingIndex += 1;
    }
    if (closingIndex >= lines.length) throw new Error(`Asset manifest: ${heading} fenced text prompt record is not closed.`);
    promptRecords.push({ heading, anchor: `#${markdownHeadingAnchor(heading)}`, prompt: promptLines.join('\n').trim() });
    index = closingIndex;
  }
  return { manifestRows, promptRecords };
}

function markdownHeadingAnchor(heading) {
  return heading.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function assertSafeAssetPath(path) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path) || win32.isAbsolute(path) || path.includes('\\')) {
    throw new Error(`Asset manifest: unsafe asset path ${path || '<empty>'}.`);
  }
  const normalized = posix.normalize(path);
  if (normalized !== path || normalized === '..' || normalized.startsWith('../') || path.split('/').includes('..') || !path.startsWith('assets/dragon-palace/')) {
    throw new Error(`Asset manifest: unsafe asset path ${path}.`);
  }
}

function assertUniquePaths(items, field, label) {
  const paths = new Set();
  for (const item of items) {
    const path = item[field];
    assertSafeAssetPath(path);
    if (paths.has(path)) throw new Error(`Asset manifest: duplicate ${label} ${path}.`);
    paths.add(path);
  }
  return paths;
}

function parseDimensions(value, assetId) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Asset manifest: invalid dimensions for ${assetId}.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function verifyPromptRecords(promptRecords, manifestRows) {
  if (!Array.isArray(promptRecords)) throw new Error('Asset manifest: structured prompt records are required by the pure verifier.');
  const headings = new Set();
  const anchors = new Set();
  const recordDpIds = new Set();
  const recordsByAnchor = new Map();

  for (const record of promptRecords) {
    if (!record || typeof record.heading !== 'string') throw new Error('Asset manifest: prompt heading is required.');
    const headingMatch = /^Prompt (DP-\d{3}) (.+)$/.exec(record.heading);
    if (!headingMatch) throw new Error(`Asset manifest: invalid prompt heading ${record.heading}.`);
    const [, dpId] = headingMatch;
    if (headings.has(record.heading)) throw new Error(`Asset manifest: duplicate prompt heading ${record.heading}.`);
    headings.add(record.heading);
    if (anchors.has(record.anchor)) throw new Error(`Asset manifest: duplicate prompt anchor ${record.anchor}.`);
    anchors.add(record.anchor);
    if (recordDpIds.has(dpId)) throw new Error(`Asset manifest: duplicate prompt DP number ${dpId}.`);
    recordDpIds.add(dpId);
    const expectedAnchor = `#${markdownHeadingAnchor(record.heading)}`;
    if (record.anchor !== expectedAnchor) throw new Error(`Asset manifest: prompt anchor ${record.anchor} does not match heading ${record.heading}.`);
    if (typeof record.prompt !== 'string' || record.prompt.trim() === '') throw new Error(`Asset manifest: prompt text for ${record.heading} must be non-empty.`);
    if (!record.prompt.includes(REQUIRED_ART_DIRECTION)) throw new Error(`Asset manifest: ${record.heading} is missing the exact shared art direction.`);
    recordsByAnchor.set(record.anchor, { ...record, dpId });
  }

  const referencedAnchors = new Set();
  const referencedDpIds = new Set();
  for (const row of manifestRows) {
    const linkMatch = /^\[Prompt (DP-\d{3})\]\((#prompt-dp-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\)$/.exec(row.promptOrSourceReference);
    if (!linkMatch) throw new Error(`Asset manifest: ${row.assetId} must use an exact prompt markdown link such as [Prompt DP-001](#prompt-dp-001-background).`);
    const [, linkDpId, anchor] = linkMatch;
    if (referencedAnchors.has(anchor)) throw new Error(`Asset manifest: duplicate prompt reference ${anchor}.`);
    referencedAnchors.add(anchor);
    if (referencedDpIds.has(linkDpId)) throw new Error(`Asset manifest: duplicate prompt DP number ${linkDpId} in shipping rows.`);
    referencedDpIds.add(linkDpId);
    const record = recordsByAnchor.get(anchor);
    if (!record) throw new Error(`Asset manifest: prompt anchor ${anchor} is missing for ${row.assetId}.`);
    if (record.dpId !== linkDpId) throw new Error(`Asset manifest: prompt DP label ${linkDpId} does not match heading ${record.heading}.`);
  }
  for (const anchor of recordsByAnchor.keys()) if (!referencedAnchors.has(anchor)) throw new Error(`Asset manifest: unreferenced prompt record ${anchor}.`);
}

export function verifyAssetManifest({ manifestRows, publicFiles, promptRecords, mode = 'check' }) {
  if (!['check', 'verify'].includes(mode)) throw new Error(`Asset manifest: unknown verification mode ${mode}.`);
  const rowPaths = assertUniquePaths(manifestRows, 'assetId', 'asset id');
  const filePaths = assertUniquePaths(publicFiles, 'path', 'public file');

  for (const path of filePaths) if (!rowPaths.has(path)) throw new Error(`Asset manifest: missing manifest row for ${path}.`);
  for (const path of rowPaths) if (!filePaths.has(path)) throw new Error(`Asset manifest: extra manifest row for ${path}.`);

  verifyPromptRecords(promptRecords, manifestRows);

  const filesByPath = new Map(publicFiles.map((file) => [file.path, file]));
  let totalBytes = 0;
  for (const row of manifestRows) {
    if (!row.assetId.toLowerCase().endsWith('.webp')) throw new Error(`Asset manifest: unsupported shipping format for ${row.assetId}; finished Dragon Palace images must be .webp.`);
    if (!row.sha256) throw new Error(`Asset manifest: missing SHA-256 for ${row.assetId}.`);
    if (!/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error(`Asset manifest: invalid SHA-256 for ${row.assetId}.`);
    for (const [field, label] of REQUIRED_METADATA) if (!row[field]?.trim()) throw new Error(`Asset manifest: missing ${label} for ${row.assetId}.`);
    if (row.toolOrSource !== REQUIRED_TOOL) throw new Error(`Asset manifest: ${row.assetId} tool or source must be exactly ${REQUIRED_TOOL}.`);
    if (row.licenseProvenance !== REQUIRED_PROVENANCE) throw new Error(`Asset manifest: ${row.assetId} license/provenance must be exactly ${REQUIRED_PROVENANCE}.`);
    if (!QA_STATUSES.has(row.qaStatus)) throw new Error(`Asset manifest: invalid QA status ${row.qaStatus} for ${row.assetId}.`);
    if (mode === 'verify' && row.qaStatus !== 'visual-qa-passed') throw new Error(`Asset manifest: ${row.assetId} must be visual-qa-passed for release verification.`);
    if (mode === 'check' && !['provenance-verified', 'visual-qa-passed'].includes(row.qaStatus)) {
      throw new Error(`Asset manifest: ${row.assetId} QA status must be provenance-verified or visual-qa-passed for provenance checks.`);
    }

    const file = filesByPath.get(row.assetId);
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) throw new Error(`Asset manifest: invalid file SHA-256 for ${row.assetId}.`);
    if (file.sha256 !== row.sha256) throw new Error(`Asset manifest: hash mismatch for ${row.assetId}.`);
    if (!Number.isInteger(file.bytes) || file.bytes < 0) throw new Error(`Asset manifest: invalid byte size for ${row.assetId}.`);
    if (file.bytes > MAX_RASTER_BYTES) throw new Error(`Asset manifest: ${row.assetId} exceeds the 512 KiB raster limit.`);
    totalBytes += file.bytes;

    const dimensions = parseDimensions(row.dimensions, row.assetId);
    if (file.width !== dimensions.width || file.height !== dimensions.height) throw new Error(`Asset manifest: dimension mismatch for ${row.assetId}.`);
  }
  if (totalBytes > MAX_MISSION_MEDIA_BYTES) throw new Error('Asset manifest: Dragon Palace mission media exceeds the 1.25 MiB total limit.');
  return { assetCount: manifestRows.length, totalBytes, mode };
}

export function verifyRequiredDragonPalaceInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourceFiles,
  mode = 'verify',
}) {
  const expectedPaths = [...REQUIRED_DRAGON_PALACE_SLOTS.keys()];
  const actualPaths = manifestRows.map((row) => row.assetId);
  if (actualPaths.length !== expectedPaths.length) {
    throw new Error(`Asset manifest: exactly eight required Dragon Palace assets are required; found ${actualPaths.length}.`);
  }
  for (const assetId of expectedPaths) {
    if (!actualPaths.includes(assetId)) throw new Error(`Asset manifest: required Dragon Palace asset ${assetId} is missing.`);
  }
  for (const assetId of actualPaths) {
    if (!REQUIRED_DRAGON_PALACE_SLOTS.has(assetId)) throw new Error(`Asset manifest: unexpected Dragon Palace asset ${assetId}.`);
  }
  if (!(sourceFiles instanceof Map)) throw new Error('Asset manifest: formal scene source files are required for slot verification.');
  const expectedAssetsBySource = new Map();
  for (const [assetId, slots] of REQUIRED_DRAGON_PALACE_SLOTS) {
    for (const { sourcePath, loaderKey, demandOpcode = null } of slots) {
      if (!expectedAssetsBySource.has(sourcePath)) expectedAssetsBySource.set(sourcePath, new Map());
      const expectedAssets = expectedAssetsBySource.get(sourcePath);
      if (expectedAssets.has(loaderKey)) {
        throw new Error(`Asset manifest: required Dragon Palace slots contain duplicate loader key ${loaderKey} for ${sourcePath}.`);
      }
      expectedAssets.set(loaderKey, { publicPath: `/${assetId}`, demandOpcode });
    }
  }
  const parsedSources = new Map();
  for (const [sourcePath, source] of sourceFiles) {
    if (typeof source !== 'string') throw new Error(`Asset manifest: formal scene source ${sourcePath} must be text.`);
    parsedSources.set(sourcePath, {
      preload: configuredPhaserPreloadAssets(sourcePath, source),
      demand: configuredPhaserDemandAssets(sourcePath, source),
    });
  }
  for (const [sourcePath, expectedAssets] of expectedAssetsBySource) {
    const parsed = parsedSources.get(sourcePath);
    if (!parsed || !(parsed.preload instanceof Map) || !(parsed.demand instanceof Map)) {
      throw new Error(`Asset manifest: required formal scene source ${sourcePath} is missing.`);
    }
    const expectedPreload = new Map([...expectedAssets].filter(([, slot]) => slot.demandOpcode === null));
    const expectedDemand = new Map([...expectedAssets].filter(([, slot]) => slot.demandOpcode !== null));
    if (parsed.preload.size !== expectedPreload.size) {
      throw new Error(`Asset manifest: ${sourcePath} preload must contain exactly ${expectedPreload.size} approved Dragon Palace image loads; found ${parsed.preload.size}.`);
    }
    for (const [loaderKey, slot] of expectedPreload) {
      if (parsed.preload.get(loaderKey) !== slot.publicPath) {
        throw new Error(`Asset manifest: ${slot.publicPath.slice(1)} is missing its exact Phaser preload slot ${sourcePath} with loader key ${loaderKey}.`);
      }
    }
    for (const [loaderKey, publicPath] of parsed.preload) {
      if (expectedPreload.get(loaderKey)?.publicPath !== publicPath) {
        throw new Error(`Asset manifest: ${sourcePath} contains unapproved Phaser image load ${loaderKey} -> ${publicPath}.`);
      }
    }
    if (parsed.demand.size !== expectedDemand.size) {
      throw new Error(`Asset manifest: ${sourcePath} must contain exactly ${expectedDemand.size} approved demand image loads; found ${parsed.demand.size}.`);
    }
    for (const [loaderKey, slot] of expectedDemand) {
      const actual = parsed.demand.get(loaderKey);
      if (actual?.publicPath !== slot.publicPath || actual?.demandOpcode !== slot.demandOpcode) {
        throw new Error(`Asset manifest: ${slot.publicPath.slice(1)} is missing its exact ${slot.demandOpcode} demand-load slot ${sourcePath} with loader key ${loaderKey}.`);
      }
    }
  }
  return verifyAssetManifest({ manifestRows, publicFiles, promptRecords, mode });
}

export function readWebpDimensions(buffer) {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Asset manifest: invalid WebP container.');
  }
  const declaredSize = buffer.readUInt32LE(4);
  if (declaredSize !== buffer.length - 8) throw new Error('Asset manifest: WebP RIFF declared size does not match the complete file; trailing or missing bytes are forbidden.');

  let canvasDimensions;
  let pixelDimensions;
  let offset = 12;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Asset manifest: truncated WebP chunk header.');
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    const dataEnd = data + size;
    const paddedEnd = dataEnd + (size % 2);
    if (dataEnd > buffer.length || paddedEnd > buffer.length) throw new Error('Asset manifest: truncated WebP chunk or padding.');

    if (type === 'VP8X') {
      if (size !== 10) throw new Error('Asset manifest: invalid VP8X chunk length.');
      canvasDimensions = { width: buffer.readUIntLE(data + 4, 3) + 1, height: buffer.readUIntLE(data + 7, 3) + 1 };
    }
    if (type === 'VP8 ') {
      if (size < 10 || buffer[data + 3] !== 0x9d || buffer[data + 4] !== 0x01 || buffer[data + 5] !== 0x2a) {
        throw new Error('Asset manifest: invalid VP8 pixel payload.');
      }
      if (pixelDimensions) throw new Error('Asset manifest: duplicate WebP pixel payload.');
      pixelDimensions = { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === 'VP8L') {
      if (size < 5 || buffer[data] !== 0x2f) throw new Error('Asset manifest: invalid VP8L pixel payload.');
      if (pixelDimensions) throw new Error('Asset manifest: duplicate WebP pixel payload.');
      const bits = buffer.readUInt32LE(data + 1);
      pixelDimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = paddedEnd;
  }
  if (!pixelDimensions || pixelDimensions.width === 0 || pixelDimensions.height === 0) {
    throw new Error('Asset manifest: WebP pixel payload dimensions are missing.');
  }
  if (canvasDimensions && (canvasDimensions.width !== pixelDimensions.width || canvasDimensions.height !== pixelDimensions.height)) {
    throw new Error('Asset manifest: VP8X canvas and pixel payload dimension mismatch.');
  }
  return pixelDimensions;
}

export async function decodeWebpDimensions(buffer) {
  const containerDimensions = readWebpDimensions(buffer);
  try {
    const { data, info } = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 20_000_000,
    }).raw().toBuffer({ resolveWithObject: true });
    const decodedDimensions = { width: info.width, height: info.height };
    const expectedPixelBytes = info.width * info.height * info.channels;
    if (!Number.isInteger(info.width) || !Number.isInteger(info.height) || !Number.isInteger(info.channels)
      || info.width <= 0 || info.height <= 0 || info.channels <= 0 || data.length !== expectedPixelBytes) {
      throw new Error('decoder returned no complete pixel data');
    }
    if (decodedDimensions.width !== containerDimensions.width || decodedDimensions.height !== containerDimensions.height) {
      throw new Error('decoder dimensions do not match the WebP container');
    }
    return decodedDimensions;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Asset manifest: WebP must fully decode its pixel data: ${detail}.`);
  }
}

async function listFiles(root, relativeRoot = '') {
  const entries = await readdir(join(root, relativeRoot), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(relativeRoot, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Asset manifest: symbolic link is forbidden in shipping assets: ${path}.`);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(path.replaceAll('\\', '/'));
    else throw new Error(`Asset manifest: shipping asset entry must be a regular file: ${path}.`);
  }
  return files;
}

export async function collectAssetFiles(assetRoot) {
  const rootInfo = await lstat(assetRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('Asset manifest: asset root must be a real directory, not a symbolic link.');
  const resolvedRoot = await realpath(assetRoot);
  const publicFiles = [];
  for (const relativePath of await listFiles(assetRoot)) {
    const absolutePath = resolve(assetRoot, relativePath);
    const within = relative(assetRoot, absolutePath);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Asset manifest: unsafe public file ${relativePath}.`);
    const entryInfo = await lstat(absolutePath);
    if (entryInfo.isSymbolicLink() || !entryInfo.isFile()) throw new Error(`Asset manifest: shipping asset must be a regular file, not a symbolic link: ${relativePath}.`);
    const resolvedPath = await realpath(absolutePath);
    const resolvedWithin = relative(resolvedRoot, resolvedPath);
    if (resolvedWithin === '..' || resolvedWithin.startsWith(`..${sep}`) || isAbsolute(resolvedWithin)) {
      throw new Error(`Asset manifest: resolved public file escapes the asset root: ${relativePath}.`);
    }

    let handle;
    try {
      handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      const fileInfo = await handle.stat();
      if (!fileInfo.isFile()) throw new Error(`Asset manifest: shipping asset must be a regular file: ${relativePath}.`);
      const bytes = await handle.readFile();
      let decodedDimensions;
      try {
        decodedDimensions = await decodeWebpDimensions(bytes);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Asset manifest: ${relativePath} must fully decode as WebP: ${detail}`, { cause: error });
      }
      publicFiles.push({
        path: posix.join('assets/dragon-palace', relativePath),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
        ...decodedDimensions,
      });
    } finally {
      await handle?.close();
    }
  }
  return publicFiles;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(root, 'docs', 'assets', 'asset-manifest.md');
  const assetRoot = join(root, 'public', 'assets', 'dragon-palace');
  const { manifestRows, promptRecords } = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = await collectAssetFiles(assetRoot);
  const sourceFiles = new Map(await Promise.all([
    'src/components/GameScene.tsx',
    'src/components/RuyiStaffScene.tsx',
    'src/components/FourSeasRegaliaScene.tsx',
  ].map(async (sourcePath) => [sourcePath, await readFile(join(root, sourcePath), 'utf8')])));
  const mode = process.argv.includes('--require-visual-qa') ? 'verify' : 'check';
  const result = verifyRequiredDragonPalaceInventory({ manifestRows, publicFiles, promptRecords, sourceFiles, mode });
  console.log(`Dragon Palace assets: ${result.assetCount} files, ${result.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
