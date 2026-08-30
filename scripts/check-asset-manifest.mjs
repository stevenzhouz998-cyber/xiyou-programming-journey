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
export const REQUIRED_ADVANCED_ART_DIRECTION = "polished 3D children's storybook game";
export const REQUIRED_CUILAN_ART_DIRECTION = "children's storybook";

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
const APPROVED_ASSET_DIRECTORIES = ['assets/dragon-palace/', 'assets/week-one-advanced/', 'assets/week-two-heaven/', 'assets/week-two-great-sage/', 'assets/week-two-peach-elixir/', 'assets/week-two-furnace/', 'assets/week-two-heavenly-boss/', 'assets/week-three-manor-help/', 'assets/week-three-cuilan/', 'assets/week-three-yunzhan-dialogue/', 'assets/week-three-bajie-joining/', 'assets/week-three-boss/'];

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
    { sourcePath: 'src/components/RuyiStaffScene.tsx', loaderKey: 'sabre', demandTriggers: ['opcode:choose_sabre', 'state:weights-inspected'] },
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

const REQUIRED_ADVANCED_WEEK_ONE_ASSETS = new Map([
  ['assets/week-one-advanced/underworld-background.webp', { missionId: 'w1-m4', binding: 'background', branch: 'true' }],
  ['assets/week-one-advanced/register-states.webp', { missionId: 'w1-m4', binding: 'states', branch: 'true' }],
  ['assets/week-one-advanced/boss-journey-background.webp', { missionId: 'w1-m5', binding: 'background', branch: 'false' }],
  ['assets/week-one-advanced/boss-checkpoints.webp', { missionId: 'w1-m5', binding: 'states', branch: 'false' }],
]);

const ADVANCED_WEEK_ONE_SOURCE_PATH = 'src/components/AdvancedWeekOneScene.tsx';
const WEEK_TWO_HORSE_SOURCE_PATH = 'src/components/WeekTwoHorseScene.tsx';
const REQUIRED_WEEK_TWO_HORSE_ASSETS = [
  'assets/week-two-heaven/stable-background.webp',
  'assets/week-two-heaven/horse-care-states.webp',
];
const WEEK_TWO_MONKEY_KING_SOURCE_PATH = 'src/components/WeekTwoMonkeyKingScene.tsx';
const REQUIRED_WEEK_TWO_MONKEY_KING_ASSETS = [
  'assets/week-two-great-sage/flower-fruit-background.webp',
  'assets/week-two-great-sage/great-sage-event-states.webp',
];
const WEEK_TWO_PEACH_ELIXIR_SOURCE_PATH = 'src/components/WeekTwoPeachElixirScene.tsx';
const REQUIRED_WEEK_TWO_PEACH_ELIXIR_ASSETS = [
  'assets/week-two-peach-elixir/heavenly-route-background.webp',
  'assets/week-two-peach-elixir/peach-elixir-states.webp',
];
const WEEK_TWO_FURNACE_SOURCE_PATH = 'src/components/WeekTwoFurnaceConditionScene.tsx';
const REQUIRED_WEEK_TWO_FURNACE_ASSETS = [
  'assets/week-two-furnace/furnace-interior-background.webp',
  'assets/week-two-furnace/furnace-condition-states.webp',
];
const WEEK_TWO_HEAVENLY_BOSS_SOURCE_PATH = 'src/components/WeekTwoHeavenlySignalBossScene.tsx';
const REQUIRED_WEEK_TWO_HEAVENLY_BOSS_ASSETS = [
  'assets/week-two-heavenly-boss/signal-dispatch-background.webp',
  'assets/week-two-heavenly-boss/heavenly-boss-states.webp',
];
const WEEK_THREE_MANOR_HELP_SOURCE_PATH = 'src/components/WeekThreeManorHelpScene.tsx';
const REQUIRED_WEEK_THREE_MANOR_HELP_ASSETS = [
  'assets/week-three-manor-help/manor-help-background.webp',
  'assets/week-three-manor-help/manor-message-states.webp',
];
const WEEK_THREE_CUILAN_SOURCE_PATH = 'src/components/WeekThreeCuilanBooleanScene.tsx';
const REQUIRED_WEEK_THREE_CUILAN_ASSETS = [
  'assets/week-three-cuilan/cuilan-disguise-background.webp',
  'assets/week-three-cuilan/cuilan-boolean-states.webp',
];
const WEEK_THREE_YUNZHAN_SOURCE_PATH = 'src/components/WeekThreeYunzhanDialogueScene.tsx';
const REQUIRED_WEEK_THREE_YUNZHAN_ASSETS = ['assets/week-three-yunzhan-dialogue/yunzhan-dialogue-background.webp', 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-states.webp'];
const WEEK_THREE_BAJIE_JOINING_SOURCE_PATH = 'src/components/WeekThreeBajieJoiningScene.tsx';
const REQUIRED_WEEK_THREE_BAJIE_JOINING_ASSETS = ['assets/week-three-bajie-joining/bajie-joining-background.webp', 'assets/week-three-bajie-joining/bajie-joining-states.webp'];
const WEEK_THREE_BOSS_SOURCE_PATH = 'src/components/WeekThreeBossScene.tsx';
const REQUIRED_WEEK_THREE_BOSS_ASSETS = ['assets/week-three-boss/week-three-boss-background.webp', 'assets/week-three-boss/week-three-boss-states.webp'];
const REQUIRED_BAJIE_JOINING_ART_DIRECTION = "polished bright 3D Chinese children's storybook game";
const REQUIRED_BAJIE_JOINING_PROMPT_SAFETY = ['no text', 'no pseudo-text', 'no binding', 'no ear pulling', 'no attack', 'no adult marriage', 'no humiliating pose'];

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
        let demandFunctionName = null;
        while (owner && owner !== sourceFile) {
          if ((ts.isArrowFunction(owner) || ts.isFunctionExpression(owner))
            && ts.isVariableDeclaration(owner.parent) && ts.isIdentifier(owner.parent.name)) {
            demandFunctionName = owner.parent.name.text;
            break;
          }
          owner = owner.parent;
        }
        if (demandFunctionName === null) {
          throw new Error(`Asset manifest: ${sourcePath} demand image call must be owned by one exact named demand loader.`);
        }
        const loaderKey = loaderKeyNode.text;
        if (demandAssets.has(loaderKey)) throw new Error(`Asset manifest: ${sourcePath} has duplicate demand image key ${loaderKey}.`);
        demandAssets.set(loaderKey, { publicPath: assetUrlCall.arguments[0].text, demandFunctionName, demandTriggers: [] });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const demand of demandAssets.values()) {
    const triggers = new Set();
    const inspectCalls = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
        && node.expression.text === demand.demandFunctionName) {
        let owner = node.parent;
        let insideDefinition = false;
        let trigger = null;
        while (owner && owner !== sourceFile) {
          if ((ts.isArrowFunction(owner) || ts.isFunctionExpression(owner))
            && ts.isVariableDeclaration(owner.parent) && ts.isIdentifier(owner.parent.name)
            && owner.parent.name.text === demand.demandFunctionName) insideDefinition = true;
          if (ts.isIfStatement(owner)) {
            const condition = owner.expression.getText(sourceFile).replace(/\s+/g, '');
            const match = /^event\.(opcode|state)==='([^']+)'$/.exec(condition);
            if (match) trigger = `${match[1]}:${match[2]}`;
          }
          owner = owner.parent;
        }
        if (!insideDefinition) {
          if (trigger === null) throw new Error(`Asset manifest: ${sourcePath} demand loader calls must be inside one exact event opcode or state branch.`);
          triggers.add(trigger);
        }
      }
      ts.forEachChild(node, inspectCalls);
    };
    inspectCalls(sourceFile);
    demand.demandTriggers = [...triggers].sort();
  }
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
    const headingMatch = /^### (Prompt [A-Z][A-Z0-9]*-\d{3} .+)$/.exec(lines[index].trim());
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
  if (normalized !== path || normalized === '..' || normalized.startsWith('../') || path.split('/').includes('..')
    || !APPROVED_ASSET_DIRECTORIES.some((directory) => path.startsWith(directory))) {
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
  const recordPromptIds = new Set();
  const recordsByAnchor = new Map();

  for (const record of promptRecords) {
    if (!record || typeof record.heading !== 'string') throw new Error('Asset manifest: prompt heading is required.');
    const headingMatch = /^Prompt ([A-Z][A-Z0-9]*-\d{3}) (.+)$/.exec(record.heading);
    if (!headingMatch) throw new Error(`Asset manifest: invalid prompt heading ${record.heading}.`);
    const [, promptId] = headingMatch;
    if (headings.has(record.heading)) throw new Error(`Asset manifest: duplicate prompt heading ${record.heading}.`);
    headings.add(record.heading);
    if (anchors.has(record.anchor)) throw new Error(`Asset manifest: duplicate prompt anchor ${record.anchor}.`);
    anchors.add(record.anchor);
    if (recordPromptIds.has(promptId)) throw new Error(`Asset manifest: duplicate prompt ${promptId.startsWith('DP-') ? 'DP ' : ''}identifier ${promptId}.`);
    recordPromptIds.add(promptId);
    const expectedAnchor = `#${markdownHeadingAnchor(record.heading)}`;
    if (record.anchor !== expectedAnchor) throw new Error(`Asset manifest: prompt anchor ${record.anchor} does not match heading ${record.heading}.`);
    if (typeof record.prompt !== 'string' || record.prompt.trim() === '') throw new Error(`Asset manifest: prompt text for ${record.heading} must be non-empty.`);
    recordsByAnchor.set(record.anchor, { ...record, promptId });
  }

  const referencedAnchors = new Set();
  const referencedPromptIds = new Set();
  for (const row of manifestRows) {
    const linkMatch = /^\[Prompt ([A-Z][A-Z0-9]*-\d{3})\]\((#prompt-[a-z0-9]+-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\)$/.exec(row.promptOrSourceReference);
    if (!linkMatch) throw new Error(`Asset manifest: ${row.assetId} must use an exact prompt markdown link such as [Prompt DP-001](#prompt-dp-001-background).`);
    const [, linkedPromptId, anchor] = linkMatch;
    if (referencedAnchors.has(anchor)) throw new Error(`Asset manifest: duplicate prompt reference ${anchor}.`);
    referencedAnchors.add(anchor);
    if (referencedPromptIds.has(linkedPromptId)) throw new Error(`Asset manifest: duplicate prompt ${linkedPromptId.startsWith('DP-') ? 'DP ' : ''}identifier ${linkedPromptId} in shipping rows.`);
    referencedPromptIds.add(linkedPromptId);
    const record = recordsByAnchor.get(anchor);
    if (!record) throw new Error(`Asset manifest: prompt anchor ${anchor} is missing for ${row.assetId}.`);
    if (record.promptId !== linkedPromptId) throw new Error(`Asset manifest: prompt ${linkedPromptId.startsWith('DP-') ? 'DP label' : 'identifier'} ${linkedPromptId} does not match heading ${record.heading}.`);
    const requiredArtDirection = row.assetId.startsWith('assets/week-three-bajie-joining/')
      ? REQUIRED_BAJIE_JOINING_ART_DIRECTION
      : row.assetId.startsWith('assets/week-three-yunzhan-dialogue/')
      ? 'polished bright 3D'
      : row.assetId.startsWith('assets/week-three-cuilan/')
      ? REQUIRED_CUILAN_ART_DIRECTION
      : row.assetId.startsWith('assets/week-three-boss/')
      ? "3D Chinese children's storybook"
      : row.assetId.startsWith('assets/week-one-advanced/') || row.assetId.startsWith('assets/week-two-heaven/') || row.assetId.startsWith('assets/week-two-great-sage/') || row.assetId.startsWith('assets/week-two-peach-elixir/') || row.assetId.startsWith('assets/week-two-furnace/') || row.assetId.startsWith('assets/week-two-heavenly-boss/') || row.assetId.startsWith('assets/week-three-manor-help/') || row.assetId.startsWith('assets/week-three-yunzhan-dialogue/')
      ? REQUIRED_ADVANCED_ART_DIRECTION
      : REQUIRED_ART_DIRECTION;
    if (!record.prompt.includes(requiredArtDirection)) {
      throw new Error(`Asset manifest: ${record.heading} is missing the exact shared art direction required for ${row.assetId}.`);
    }
    if (row.assetId.startsWith('assets/week-three-bajie-joining/')) {
      for (const requirement of REQUIRED_BAJIE_JOINING_PROMPT_SAFETY) {
        if (!record.prompt.includes(requirement)) throw new Error(`Asset manifest: ${record.heading} is missing the required W3-M4 provenance/safety-intent phrase ${requirement}.`);
      }
    }
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

function promptRecordsForRows(promptRecords, manifestRows) {
  const anchors = new Set(manifestRows.map((row) => {
    const match = /^\[Prompt [A-Z][A-Z0-9]*-\d{3}\]\((#[^)]+)\)$/.exec(row.promptOrSourceReference);
    return match?.[1];
  }).filter(Boolean));
  return promptRecords.filter((record) => anchors.has(record.anchor));
}

function familyRows(manifestRows, directory) {
  return manifestRows.filter((row) => row.assetId.startsWith(directory));
}

function familyFiles(publicFiles, directory) {
  return publicFiles.filter((file) => file.path.startsWith(directory));
}

function requireExactInventory({ manifestRows, publicFiles, expectedPaths, label }) {
  const actualPaths = manifestRows.map((row) => row.assetId);
  if (actualPaths.length !== expectedPaths.length) {
    throw new Error(`Asset manifest: exactly ${expectedPaths.length} required ${label} assets are required; found ${actualPaths.length}.`);
  }
  for (const assetId of expectedPaths) {
    if (!actualPaths.includes(assetId)) throw new Error(`Asset manifest: required ${label} asset ${assetId} is missing.`);
  }
  for (const assetId of actualPaths) {
    if (!expectedPaths.includes(assetId)) throw new Error(`Asset manifest: unexpected ${label} asset ${assetId}.`);
  }
  for (const assetId of publicFiles.map((file) => file.path)) {
    if (!expectedPaths.includes(assetId)) throw new Error(`Asset manifest: unexpected ${label} public file ${assetId}.`);
  }
}

function findBindingSymbol(checker, name) {
  return checker.getSymbolAtLocation(name) ?? null;
}

function isMissionIdEqualsUnderworld(node, missionIdSymbol, checker) {
  return ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    && ts.isIdentifier(node.left)
    && findBindingSymbol(checker, node.left) === missionIdSymbol
    && ts.isStringLiteral(node.right)
    && node.right.text === 'w1-m4';
}

function expressionLiteralPath(node) {
  return ts.isStringLiteral(node) ? node.text : null;
}

function directJsxSrcBinding(openingElement, checker, assetUrlSymbol) {
  const srcAttributes = openingElement.attributes.properties.filter((property) => (
    ts.isJsxAttribute(property) && property.name.text === 'src'
  ));
  if (srcAttributes.length !== 1) return null;
  const initializer = srcAttributes[0].initializer;
  if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression
    || !ts.isCallExpression(initializer.expression) || initializer.expression.questionDotToken
    || !ts.isIdentifier(initializer.expression.expression)
    || findBindingSymbol(checker, initializer.expression.expression) !== assetUrlSymbol
    || initializer.expression.arguments.length !== 1
    || !ts.isIdentifier(initializer.expression.arguments[0])) return null;
  const identifier = initializer.expression.arguments[0];
  return { identifier, symbol: findBindingSymbol(checker, identifier) };
}

function verifyAdvancedWeekOneSceneSource(sourcePath, source) {
  const { sourceFile, checker } = createBoundSource(sourcePath, source);
  if (sourceFile.parseDiagnostics.length > 0) throw new Error(`Asset manifest: ${sourcePath} cannot be parsed as TypeScript for AdvancedWeekOneScene verification.`);
  const components = sourceFile.statements.filter((statement) => (
    ts.isFunctionDeclaration(statement)
    && statement.name?.text === 'AdvancedWeekOneScene'
    && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  ));
  if (components.length !== 1 || !components[0].body) {
    throw new Error(`Asset manifest: ${sourcePath} must export exactly one live AdvancedWeekOneScene function.`);
  }
  const [component] = components;
  const missionParameters = component.parameters.flatMap((parameter) => bindingIdentifiers(parameter.name))
    .filter((identifier) => identifier.text === 'missionId');
  if (missionParameters.length !== 1) throw new Error(`Asset manifest: ${sourcePath} AdvancedWeekOneScene must bind missionId exactly once.`);
  const missionIdSymbol = findBindingSymbol(checker, missionParameters[0]);
  if (!missionIdSymbol) throw new Error(`Asset manifest: ${sourcePath} missionId must have one TypeScript binding.`);

  const assetUrlImports = sourceFile.statements.filter((statement) => (
    ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text === '../utils/assets'
  ));
  const assetUrlSpecifiers = assetUrlImports.flatMap((statement) => {
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) return [];
    return bindings.elements.filter((specifier) => (
      !specifier.isTypeOnly && !specifier.propertyName && specifier.name.text === 'assetUrl'
    ));
  });
  if (assetUrlImports.length !== 1 || assetUrlSpecifiers.length !== 1) {
    throw new Error(`Asset manifest: ${sourcePath} must import assetUrl exactly once and unaliased from ../utils/assets.`);
  }
  const assetUrlSymbol = findBindingSymbol(checker, assetUrlSpecifiers[0].name);
  if (!assetUrlSymbol) throw new Error(`Asset manifest: ${sourcePath} assetUrl must have one TypeScript binding.`);

  const declarations = new Map();
  for (const statement of component.body.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && ['background', 'states'].includes(declaration.name.text)) {
        if (declarations.has(declaration.name.text)) throw new Error(`Asset manifest: ${sourcePath} has duplicate ${declaration.name.text} image binding.`);
        declarations.set(declaration.name.text, declaration);
      }
    }
  }
  if (declarations.size !== 2) throw new Error(`Asset manifest: ${sourcePath} must declare exactly the background and states image bindings at live component scope.`);

  const expectedBindings = new Map([
    ['background', {
      truePath: '/assets/week-one-advanced/underworld-background.webp',
      falsePath: '/assets/week-one-advanced/boss-journey-background.webp',
    }],
    ['states', {
      truePath: '/assets/week-one-advanced/register-states.webp',
      falsePath: '/assets/week-one-advanced/boss-checkpoints.webp',
    }],
  ]);
  const bindingSymbols = new Map();
  for (const [name, expected] of expectedBindings) {
    const declaration = declarations.get(name);
    if (!declaration || !declaration.initializer || !ts.isConditionalExpression(declaration.initializer)
      || !isMissionIdEqualsUnderworld(declaration.initializer.condition, missionIdSymbol, checker)
      || expressionLiteralPath(declaration.initializer.whenTrue) !== expected.truePath
      || expressionLiteralPath(declaration.initializer.whenFalse) !== expected.falsePath) {
      throw new Error(`Asset manifest: ${sourcePath} ${name} must be a direct missionId === 'w1-m4' branch to its two approved literal image paths.`);
    }
    const symbol = findBindingSymbol(checker, declaration.name);
    if (!symbol) throw new Error(`Asset manifest: ${sourcePath} ${name} must have one TypeScript binding.`);
    bindingSymbols.set(name, symbol);
  }

  const pathLiterals = [];
  const imageOpenings = [];
  const imageLoaderViolations = [];
  const inspect = (node) => {
    if (ts.isStringLiteral(node) && node.text.startsWith('/assets/week-one-advanced/')) pathLiterals.push(node.text);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === 'img') imageOpenings.push(node);
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Image') imageLoaderViolations.push('new Image');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(sourceFile) === 'document' && node.expression.name.text === 'createElement'
      && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'img') imageLoaderViolations.push('document.createElement(img)');
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'src') imageLoaderViolations.push('assigned .src');
    ts.forEachChild(node, inspect);
  };
  inspect(component.body);
  const expectedPaths = [...REQUIRED_ADVANCED_WEEK_ONE_ASSETS.keys()].map((path) => `/${path}`);
  if (pathLiterals.length !== expectedPaths.length || new Set(pathLiterals).size !== expectedPaths.length
    || expectedPaths.some((path) => !pathLiterals.includes(path))) {
    throw new Error(`Asset manifest: ${sourcePath} must contain exactly the four approved advanced Week One literal image paths; hidden, dead, or extra paths are forbidden.`);
  }
  if (imageLoaderViolations.length > 0) throw new Error(`Asset manifest: ${sourcePath} has forbidden dynamic image loading via ${imageLoaderViolations[0]}.`);
  if (imageOpenings.length !== 2) throw new Error(`Asset manifest: ${sourcePath} must render exactly two live img elements; found ${imageOpenings.length}.`);
  const expectedImageSymbols = new Set(bindingSymbols.values());
  const usedSymbols = new Map();
  for (const opening of imageOpenings) {
    const srcBinding = directJsxSrcBinding(opening, checker, assetUrlSymbol);
    if (!srcBinding || !expectedImageSymbols.has(srcBinding.symbol)) {
      throw new Error(`Asset manifest: ${sourcePath} every scene img src must directly use assetUrl with the approved background or states binding.`);
    }
    usedSymbols.set(srcBinding.symbol, (usedSymbols.get(srcBinding.symbol) ?? 0) + 1);
  }
  for (const [name, symbol] of bindingSymbols) {
    if (usedSymbols.get(symbol) !== 1) throw new Error(`Asset manifest: ${sourcePath} ${name} must be used exactly once as a live img src.`);
  }
}

export function verifyRequiredAdvancedWeekOneInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourcePath = ADVANCED_WEEK_ONE_SOURCE_PATH,
  source,
  mode = 'verify',
}) {
  const directory = 'assets/week-one-advanced/';
  const advancedRows = familyRows(manifestRows, directory);
  const advancedFiles = familyFiles(publicFiles, directory);
  requireExactInventory({
    manifestRows: advancedRows,
    publicFiles: advancedFiles,
    expectedPaths: [...REQUIRED_ADVANCED_WEEK_ONE_ASSETS.keys()],
    label: 'advanced Week One',
  });
  for (const row of advancedRows) {
    const expected = REQUIRED_ADVANCED_WEEK_ONE_ASSETS.get(row.assetId);
    if (!expected || !row.screenSlots.includes(expected.missionId) || !row.screenSlots.includes('AdvancedWeekOneScene')) {
      throw new Error(`Asset manifest: ${row.assetId} screen slots must identify ${expected?.missionId ?? 'its mission'} and AdvancedWeekOneScene.`);
    }
  }
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for AdvancedWeekOneScene slot verification.`);
  verifyAdvancedWeekOneSceneSource(sourcePath, source);
  return verifyAssetManifest({
    manifestRows: advancedRows,
    publicFiles: advancedFiles,
    promptRecords: promptRecordsForRows(promptRecords, advancedRows),
    mode,
  });
}

export function verifyRequiredWeekTwoHorseInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourcePath = WEEK_TWO_HORSE_SOURCE_PATH,
  source,
  mode = 'check',
}) {
  const directory = 'assets/week-two-heaven/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_TWO_HORSE_ASSETS, label: 'Week Two horse-care' });
  for (const row of rows) {
    if (!row.screenSlots.includes('w2-m1') || !row.screenSlots.includes('WeekTwoHorseScene')) {
      throw new Error(`Asset manifest: ${row.assetId} screen slots must identify w2-m1 and WeekTwoHorseScene.`);
    }
  }
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekTwoHorseScene slot verification.`);
  const literals = source.match(/\/assets\/week-two-heaven\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_TWO_HORSE_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length
    || expectedLiterals.some((assetId) => !literals.includes(assetId))) {
    throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Two horse-care image paths.`);
  }
  if ((source.match(/<img\b/g) ?? []).length !== 2 || !source.includes("import { assetUrl } from '../utils/assets'")) {
    throw new Error(`Asset manifest: ${sourcePath} must render exactly two live img slots through assetUrl.`);
  }
  return verifyAssetManifest({
    manifestRows: rows,
    publicFiles: files,
    promptRecords: promptRecordsForRows(promptRecords, rows),
    mode,
  });
}

export function verifyRequiredWeekTwoMonkeyKingInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourcePath = WEEK_TWO_MONKEY_KING_SOURCE_PATH,
  source,
  mode = 'check',
}) {
  const directory = 'assets/week-two-great-sage/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_TWO_MONKEY_KING_ASSETS, label: 'Week Two monkey-king events' });
  for (const row of rows) {
    if (!row.screenSlots.includes('w2-m2') || !row.screenSlots.includes('WeekTwoMonkeyKingScene')) {
      throw new Error(`Asset manifest: ${row.assetId} screen slots must identify w2-m2 and WeekTwoMonkeyKingScene.`);
    }
  }
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekTwoMonkeyKingScene slot verification.`);
  const literals = source.match(/\/assets\/week-two-great-sage\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_TWO_MONKEY_KING_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length
    || expectedLiterals.some((assetId) => !literals.includes(assetId))) {
    throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Two monkey-king image paths.`);
  }
  if ((source.match(/<img\b/g) ?? []).length !== 2 || !source.includes("import { assetUrl } from '../utils/assets'")) {
    throw new Error(`Asset manifest: ${sourcePath} must render exactly two live img slots through assetUrl.`);
  }
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekTwoPeachElixirInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourcePath = WEEK_TWO_PEACH_ELIXIR_SOURCE_PATH,
  source,
  mode = 'check',
}) {
  const directory = 'assets/week-two-peach-elixir/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_TWO_PEACH_ELIXIR_ASSETS, label: 'Week Two peach-elixir debugging' });
  for (const row of rows) {
    if (!row.screenSlots.includes('w2-m3') || !row.screenSlots.includes('WeekTwoPeachElixirScene')) {
      throw new Error(`Asset manifest: ${row.assetId} screen slots must identify w2-m3 and WeekTwoPeachElixirScene.`);
    }
  }
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekTwoPeachElixirScene slot verification.`);
  const literals = source.match(/\/assets\/week-two-peach-elixir\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_TWO_PEACH_ELIXIR_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length
    || expectedLiterals.some((assetId) => !literals.includes(assetId))) {
    throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Two peach-elixir image paths.`);
  }
  if ((source.match(/<img\b/g) ?? []).length !== 2 || !source.includes("import { assetUrl } from '../utils/assets'")) {
    throw new Error(`Asset manifest: ${sourcePath} must render exactly two live img slots through assetUrl.`);
  }
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekTwoFurnaceInventory({ manifestRows, publicFiles, promptRecords, sourcePath = WEEK_TWO_FURNACE_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-two-furnace/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_TWO_FURNACE_ASSETS, label: 'Week Two furnace condition' });
  for (const row of rows) if (!row.screenSlots.includes('w2-m4') || !row.screenSlots.includes('WeekTwoFurnaceConditionScene')) throw new Error(`Asset manifest: ${row.assetId} screen slots must identify w2-m4 and WeekTwoFurnaceConditionScene.`);
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekTwoFurnaceConditionScene slot verification.`);
  const literals = source.match(/\/assets\/week-two-furnace\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_TWO_FURNACE_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length || expectedLiterals.some((assetId) => !literals.includes(assetId))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Two furnace image paths.`);
  if ((source.match(/<img\b/g) ?? []).length !== 2 || !source.includes("import { assetUrl } from '../utils/assets'")) throw new Error(`Asset manifest: ${sourcePath} must render exactly two live img slots through assetUrl.`);
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekTwoHeavenlyBossInventory({ manifestRows, publicFiles, promptRecords = [], sourcePath = WEEK_TWO_HEAVENLY_BOSS_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-two-heavenly-boss/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_TWO_HEAVENLY_BOSS_ASSETS, label: 'Week Two heavenly signal Boss' });
  for (const row of rows) if (!row.screenSlots.includes('w2-m5') || !row.screenSlots.includes('WeekTwoHeavenlySignalBossScene')) throw new Error(`Asset manifest: ${row.assetId} screen slots must identify w2-m5 and WeekTwoHeavenlySignalBossScene.`);
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for Week Two heavenly Boss slot verification.`);
  const literals = source.match(/\/assets\/week-two-heavenly-boss\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_TWO_HEAVENLY_BOSS_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length || expectedLiterals.some((assetId) => !literals.includes(assetId))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Two heavenly Boss image paths.`);
  if (promptRecords.length === 0) return { assetCount: rows.length, totalBytes: 0 };
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

const ALPHA_EDGE_OPAQUE_ALPHA = 250;
const ALPHA_EDGE_COLOR_DISTANCE = 96;
const MAX_WEEK_THREE_ALPHA_EDGE_MISMATCH_RATIO = 0.04;
const LOW_ALPHA_RESIDUE_THRESHOLD = 16;
const LOW_ALPHA_FOREGROUND_RADIUS = 4;
const MAX_LOW_ALPHA_ORPHAN_PIXELS = 48;
const MIN_LOW_ALPHA_LINE_RESIDUE_LENGTH = 24;

export function measureAlphaEdgeMismatch(rgba, width, height) {
  if (!(rgba instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height)
    || width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error('Asset manifest: alpha-edge metric requires complete RGBA pixels.');
  }
  let inspectedPixels = 0;
  let mismatchedPixels = 0;
  const at = (x, y) => (y * width + x) * 4;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = at(x, y);
    const alpha = rgba[offset + 3];
    if (alpha === 0 || alpha >= ALPHA_EDGE_OPAQUE_ALPHA) continue;
    let nearest = null;
    for (let radius = 1; radius <= 2 && nearest === null; radius += 1) {
      for (let neighborY = Math.max(0, y - radius); neighborY <= Math.min(height - 1, y + radius) && nearest === null; neighborY += 1) {
        for (let neighborX = Math.max(0, x - radius); neighborX <= Math.min(width - 1, x + radius); neighborX += 1) {
          const neighbor = at(neighborX, neighborY);
          if (rgba[neighbor + 3] >= ALPHA_EDGE_OPAQUE_ALPHA) { nearest = neighbor; break; }
        }
      }
    }
    if (nearest === null) continue;
    inspectedPixels += 1;
    const distance = Math.hypot(rgba[offset] - rgba[nearest], rgba[offset + 1] - rgba[nearest + 1], rgba[offset + 2] - rgba[nearest + 2]);
    if (distance > ALPHA_EDGE_COLOR_DISTANCE) mismatchedPixels += 1;
  }
  return { inspectedPixels, mismatchedPixels, mismatchRatio: inspectedPixels === 0 ? 0 : mismatchedPixels / inspectedPixels };
}

export function measureLowAlphaResidue(rgba, width, height) {
  if (!(rgba instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height)
    || width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error('Asset manifest: low-alpha residue metric requires complete RGBA pixels.');
  }
  const orphanMap = new Uint8Array(width * height);
  const at = (x, y) => (y * width + x) * 4;
  const hasOpaqueForegroundNearby = (x, y) => {
    for (let neighborY = Math.max(0, y - LOW_ALPHA_FOREGROUND_RADIUS); neighborY <= Math.min(height - 1, y + LOW_ALPHA_FOREGROUND_RADIUS); neighborY += 1) {
      for (let neighborX = Math.max(0, x - LOW_ALPHA_FOREGROUND_RADIUS); neighborX <= Math.min(width - 1, x + LOW_ALPHA_FOREGROUND_RADIUS); neighborX += 1) {
        if (rgba[at(neighborX, neighborY) + 3] >= ALPHA_EDGE_OPAQUE_ALPHA) return true;
      }
    }
    return false;
  };
  let inspectedPixels = 0;
  let orphanPixels = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = rgba[at(x, y) + 3];
    if (alpha === 0 || alpha > LOW_ALPHA_RESIDUE_THRESHOLD) continue;
    inspectedPixels += 1;
    if (!hasOpaqueForegroundNearby(x, y)) {
      orphanMap[y * width + x] = 1;
      orphanPixels += 1;
    }
  }
  let longLineRuns = 0;
  const countRuns = (length, point) => {
    let run = 0;
    for (let index = 0; index < length; index += 1) {
      if (point(index)) run += 1;
      else if (run >= MIN_LOW_ALPHA_LINE_RESIDUE_LENGTH) { longLineRuns += 1; run = 0; }
      else run = 0;
    }
    if (run >= MIN_LOW_ALPHA_LINE_RESIDUE_LENGTH) longLineRuns += 1;
  };
  for (let y = 0; y < height; y += 1) countRuns(width, (x) => orphanMap[y * width + x] === 1);
  for (let x = 0; x < width; x += 1) countRuns(height, (y) => orphanMap[y * width + x] === 1);
  return { inspectedPixels, orphanPixels, longLineRuns };
}

function countAlphaZeroRgbPixels(rgba) {
  let count = 0;
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (rgba[offset + 3] === 0 && (rgba[offset] !== 0 || rgba[offset + 1] !== 0 || rgba[offset + 2] !== 0)) count += 1;
  }
  return count;
}

function verifyWeekThreeManorHelpSceneSource(sourcePath, source) {
  const { sourceFile } = createBoundSource(sourcePath, source);
  if (sourceFile.parseDiagnostics.length > 0) throw new Error(`Asset manifest: ${sourcePath} cannot be parsed as TypeScript for WeekThreeManorHelpScene slot verification.`);
  const constants = new Map();
  let hasAssetUrlImport = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === '../utils/assets') {
      const bindings = statement.importClause?.namedBindings;
      hasAssetUrlImport = Boolean(bindings && ts.isNamedImports(bindings) && bindings.elements.some((item) => !item.isTypeOnly && !item.propertyName && item.name.text === 'assetUrl'));
    }
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && (declaration.name.text === 'BACKGROUND' || declaration.name.text === 'STATES')) constants.set(declaration.name.text, declaration.initializer);
    }
  }
  if (!hasAssetUrlImport || constants.get('BACKGROUND')?.getText(sourceFile) !== "'/assets/week-three-manor-help/manor-help-background.webp'" || constants.get('STATES')?.getText(sourceFile) !== "'/assets/week-three-manor-help/manor-message-states.webp'") {
    throw new Error(`Asset manifest: ${sourcePath} must bind the two approved image constants and assetUrl.`);
  }
  let sourceUsesAssetUrl = false;
  const imageBindings = [];
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'source' && node.initializer) {
      const inspectSource = (candidate) => {
        if (ts.isCallExpression(candidate) && ts.isIdentifier(candidate.expression) && candidate.expression.text === 'assetUrl') sourceUsesAssetUrl = true;
        ts.forEachChild(candidate, inspectSource);
      };
      inspectSource(node.initializer);
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === 'img') {
      const src = node.attributes.properties.filter((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === 'src');
      const expression = src.length === 1 && src[0].initializer && ts.isJsxExpression(src[0].initializer) ? src[0].initializer.expression : null;
      if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression) || expression.expression.text !== 'source' || expression.arguments.length !== 1 || !ts.isIdentifier(expression.arguments[0])) imageBindings.push(null);
      else imageBindings.push(expression.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!sourceUsesAssetUrl || imageBindings.length !== 2 || imageBindings.sort().join(',') !== 'BACKGROUND,STATES') {
    throw new Error(`Asset manifest: ${sourcePath} must render exactly two img src bindings through source(BACKGROUND) and source(STATES), with source calling assetUrl.`);
  }
}

export function verifyRequiredWeekThreeManorHelpInventory({ manifestRows, publicFiles, promptRecords, sourcePath = WEEK_THREE_MANOR_HELP_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-three-manor-help/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_THREE_MANOR_HELP_ASSETS, label: 'Week Three manor help' });
  for (const row of rows) if (row.screenSlots !== 'w3-m1 WeekThreeManorHelpScene') throw new Error(`Asset manifest: ${row.assetId} screen slots must be exactly w3-m1 WeekThreeManorHelpScene.`);
  const stateFile = files.find((file) => file.path === 'assets/week-three-manor-help/manor-message-states.webp');
  if (stateFile?.hasAlpha !== true) throw new Error('Asset manifest: Week Three manor message states must preserve a true alpha channel.');
  if (!stateFile.alphaEdgeMismatch || stateFile.alphaEdgeMismatch.inspectedPixels === 0 || stateFile.alphaEdgeMismatch.mismatchRatio > MAX_WEEK_THREE_ALPHA_EDGE_MISMATCH_RATIO) throw new Error('Asset manifest: Week Three manor message states fail the alpha-edge contamination gate.');
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekThreeManorHelpScene slot verification.`);
  const literals = source.match(/\/assets\/week-three-manor-help\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_THREE_MANOR_HELP_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length || expectedLiterals.some((assetId) => !literals.includes(assetId))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Three manor-help image paths.`);
  verifyWeekThreeManorHelpSceneSource(sourcePath, source);
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekThreeCuilanBooleanInventory({ manifestRows, publicFiles, promptRecords = [], sourcePath = WEEK_THREE_CUILAN_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-three-cuilan/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_THREE_CUILAN_ASSETS, label: 'Week Three Cuilan boolean' });
  for (const row of rows) if (row.screenSlots !== 'w3-m2 WeekThreeCuilanBooleanScene') throw new Error(`Asset manifest: ${row.assetId} screen slots must be exactly w3-m2 WeekThreeCuilanBooleanScene.`);
  const stateFile = files.find((file) => file.path === 'assets/week-three-cuilan/cuilan-boolean-states.webp');
  if (stateFile?.hasAlpha !== true) throw new Error('Asset manifest: Week Three Cuilan states must preserve a true alpha channel.');
  if (!stateFile.alphaEdgeMismatch || stateFile.alphaEdgeMismatch.inspectedPixels === 0 || stateFile.alphaEdgeMismatch.mismatchRatio > MAX_WEEK_THREE_ALPHA_EDGE_MISMATCH_RATIO) throw new Error('Asset manifest: Week Three Cuilan states fail the alpha-edge contamination gate.');
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekThreeCuilanBooleanScene slot verification.`);
  const literals = source.match(/\/assets\/week-three-cuilan\/[a-z0-9-]+\.webp/g) ?? [];
  const expectedLiterals = REQUIRED_WEEK_THREE_CUILAN_ASSETS.map((assetId) => `/${assetId}`);
  if (literals.length !== expectedLiterals.length || new Set(literals).size !== expectedLiterals.length || expectedLiterals.some((assetId) => !literals.includes(assetId))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Three Cuilan image paths.`);
  if (!source.includes("import { assetUrl } from '../utils/assets'") || (source.match(/<img\b/g) ?? []).length !== 2 || !source.includes('data-state-cell')) throw new Error(`Asset manifest: ${sourcePath} must render the two approved assetUrl slots through its visible five-cell scene.`);
  if (promptRecords.length === 0) return { assetCount: rows.length, totalBytes: files.reduce((sum, file) => sum + (file.bytes ?? 0), 0), mode };
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekThreeYunzhanDialogueInventory({ manifestRows, publicFiles, promptRecords = [], sourcePath = WEEK_THREE_YUNZHAN_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-three-yunzhan-dialogue/'; const rows = familyRows(manifestRows, directory); const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_THREE_YUNZHAN_ASSETS, label: 'Week Three Yunzhan dialogue' });
  for (const row of rows) if (row.screenSlots !== 'w3-m3 WeekThreeYunzhanDialogueScene') throw new Error('Asset manifest: Yunzhan screen slot invalid.');
  const state = files.find((file) => file.path.endsWith('yunzhan-dialogue-states.webp')); if (state?.hasAlpha !== true || !state.alphaEdgeMismatch || state.alphaEdgeMismatch.inspectedPixels === 0 || state.alphaEdgeMismatch.mismatchRatio > MAX_WEEK_THREE_ALPHA_EDGE_MISMATCH_RATIO) throw new Error('Asset manifest: Yunzhan alpha-edge gate failed.');
  if (typeof source !== 'string' || !source.includes("import { assetUrl } from '../utils/assets'") || (source.match(/<img\b/g) ?? []).length !== 2 || !source.includes('data-state-cell') || REQUIRED_WEEK_THREE_YUNZHAN_ASSETS.some((path) => !source.includes(path))) throw new Error(`Asset manifest: ${sourcePath} must render exact Yunzhan assetUrl slots.`);
  if (promptRecords.length === 0) return { assetCount: rows.length, totalBytes: files.reduce((sum, file) => sum + (file.bytes ?? 0), 0), mode };
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

function verifyWeekThreeBajieJoiningSceneSource(sourcePath, source) {
  const { sourceFile, checker } = createBoundSource(sourcePath, source);
  if (sourceFile.parseDiagnostics.length > 0) throw new Error(`Asset manifest: ${sourcePath} cannot be parsed as TypeScript for WeekThreeBajieJoiningScene slot verification.`);
  const constants = new Map();
  let assetUrlSymbol = null;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === '../utils/assets') {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        const imported = bindings.elements.find((item) => !item.isTypeOnly && !item.propertyName && item.name.text === 'assetUrl');
        assetUrlSymbol = imported ? checker.getSymbolAtLocation(imported.name) ?? null : null;
      }
    }
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && (declaration.name.text === 'BACKGROUND' || declaration.name.text === 'STATES')) constants.set(declaration.name.text, declaration.initializer);
    }
  }
  if (!assetUrlSymbol
    || constants.get('BACKGROUND')?.getText(sourceFile) !== "'assets/week-three-bajie-joining/bajie-joining-background.webp'"
    || constants.get('STATES')?.getText(sourceFile) !== "'assets/week-three-bajie-joining/bajie-joining-states.webp'") {
    throw new Error(`Asset manifest: ${sourcePath} must bind the two approved Bajie-joining image constants and imported assetUrl.`);
  }
  const exportedScenes = [];
  for (const statement of sourceFile.statements) {
    const exported = Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
    if (exported && ts.isFunctionDeclaration(statement) && statement.name?.text === 'WeekThreeBajieJoiningScene') exportedScenes.push(statement);
    if (exported && ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'WeekThreeBajieJoiningScene' && declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) exportedScenes.push(declaration.initializer);
    }
  }
  if (exportedScenes.length !== 1) throw new Error(`Asset manifest: ${sourcePath} must export exactly one exported WeekThreeBajieJoiningScene lexical function.`);
  const [exportedScene] = exportedScenes;
  const sourceDeclarations = [];
  const jsxReturns = [];
  const visitComponent = (node, isRoot = false) => {
    if (!isRoot && ts.isFunctionLike(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'source' && node.initializer) sourceDeclarations.push(node);
    if (ts.isReturnStatement(node) && node.expression && (ts.isJsxElement(node.expression) || ts.isJsxSelfClosingElement(node.expression) || ts.isJsxFragment(node.expression))) jsxReturns.push(node.expression);
    ts.forEachChild(node, (child) => visitComponent(child));
  };
  if (ts.isBlock(exportedScene.body)) visitComponent(exportedScene.body, true);
  else if (ts.isJsxElement(exportedScene.body) || ts.isJsxSelfClosingElement(exportedScene.body) || ts.isJsxFragment(exportedScene.body)) jsxReturns.push(exportedScene.body);
  if (jsxReturns.length !== 1) throw new Error(`Asset manifest: ${sourcePath} exported WeekThreeBajieJoiningScene must have exactly one JSX return tree.`);
  if (sourceDeclarations.length !== 1) throw new Error(`Asset manifest: ${sourcePath} must declare exactly one live source binding for the two scene images.`);
  const [sourceDeclaration] = sourceDeclarations;
  const sourceSymbol = checker.getSymbolAtLocation(sourceDeclaration.name);
  const sourceInitializer = sourceDeclaration.initializer;
  if (!sourceSymbol || !(ts.isArrowFunction(sourceInitializer) || ts.isFunctionExpression(sourceInitializer)) || sourceInitializer.parameters.length !== 1 || !ts.isIdentifier(sourceInitializer.parameters[0].name) || ts.isBlock(sourceInitializer.body)) {
    throw new Error(`Asset manifest: ${sourcePath} source must have one direct URL-return expression derived from imported assetUrl(path).`);
  }
  const pathParameterSymbol = checker.getSymbolAtLocation(sourceInitializer.parameters[0].name);
  const isImportedAssetUrlCall = (node) => ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && checker.getSymbolAtLocation(node.expression) === assetUrlSymbol
    && node.arguments.length === 1
    && ts.isIdentifier(node.arguments[0])
    && checker.getSymbolAtLocation(node.arguments[0]) === pathParameterSymbol;
  const isDerivedAssetUrl = (node) => {
    if (isImportedAssetUrlCall(node)) return true;
    if (ts.isParenthesizedExpression(node)) return isDerivedAssetUrl(node.expression);
    if (ts.isTemplateExpression(node)) return node.templateSpans.length > 0 && isImportedAssetUrlCall(node.templateSpans[0].expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return isDerivedAssetUrl(node.left);
    return false;
  };
  if (!isDerivedAssetUrl(sourceInitializer.body)) throw new Error(`Asset manifest: ${sourcePath} source must directly derive its returned URL from the imported assetUrl(path) binding.`);
  const imageBindings = [];
  const visitReturnedJsx = (node, isRoot = false) => {
    if (!isRoot && ts.isFunctionLike(node)) return;
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === 'img') imageBindings.push(node);
    ts.forEachChild(node, (child) => visitReturnedJsx(child));
  };
  visitReturnedJsx(jsxReturns[0], true);
  const conditionalImage = imageBindings.find((image) => {
    for (let ancestor = image.parent; ancestor; ancestor = ancestor.parent) {
      if (ts.isConditionalExpression(ancestor)) return true;
      if (ts.isBinaryExpression(ancestor) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(ancestor.operatorToken.kind)) return true;
      if (ancestor === jsxReturns[0]) return false;
    }
    return true;
  });
  if (conditionalImage) throw new Error(`Asset manifest: ${sourcePath} scene img slots must be unconditional descendants of the exported WeekThreeBajieJoiningScene return tree.`);
  const boundArguments = [];
  for (const image of imageBindings) {
    const src = image.attributes.properties.filter((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === 'src');
    const expression = src.length === 1 && src[0].initializer && ts.isJsxExpression(src[0].initializer) ? src[0].initializer.expression : null;
    if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression) || checker.getSymbolAtLocation(expression.expression) !== sourceSymbol || expression.arguments.length !== 1 || !ts.isIdentifier(expression.arguments[0])) boundArguments.push(null);
    else boundArguments.push(expression.arguments[0].text);
  }
  if (imageBindings.length !== 2 || boundArguments.length !== 2 || boundArguments.sort().join(',') !== 'BACKGROUND,STATES') {
    throw new Error(`Asset manifest: ${sourcePath} must render exactly two img src bindings through the same verified source(BACKGROUND) and source(STATES) binding.`);
  }
}

export function verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows, publicFiles, promptRecords = [], sourcePath = WEEK_THREE_BAJIE_JOINING_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-three-bajie-joining/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_THREE_BAJIE_JOINING_ASSETS, label: 'Week Three Bajie joining' });
  for (const row of rows) if (row.screenSlots !== 'w3-m4 WeekThreeBajieJoiningScene') throw new Error(`Asset manifest: ${row.assetId} screen slots must be exactly w3-m4 WeekThreeBajieJoiningScene.`);
  const stateFile = files.find((file) => file.path === 'assets/week-three-bajie-joining/bajie-joining-states.webp');
  if (stateFile?.hasAlpha !== true) throw new Error('Asset manifest: Week Three Bajie-joining states must preserve a true alpha channel.');
  if (!stateFile.alphaEdgeMismatch || stateFile.alphaEdgeMismatch.inspectedPixels === 0 || stateFile.alphaEdgeMismatch.mismatchRatio > MAX_WEEK_THREE_ALPHA_EDGE_MISMATCH_RATIO) throw new Error('Asset manifest: Week Three Bajie-joining states fail the alpha-edge contamination gate.');
  if (!Number.isInteger(stateFile?.width) || !Number.isInteger(stateFile?.height) || stateFile.width !== stateFile.height * 3) throw new Error('Asset manifest: Week Three Bajie-joining state sheet must use three equal square cells; the provenance fixture records the original 2172x724 source sheet.');
  if (!stateFile.lowAlphaResidue || !Number.isInteger(stateFile.lowAlphaResidue.inspectedPixels) || !Number.isInteger(stateFile.lowAlphaResidue.orphanPixels) || !Number.isInteger(stateFile.lowAlphaResidue.longLineRuns) || stateFile.lowAlphaResidue.orphanPixels > MAX_LOW_ALPHA_ORPHAN_PIXELS || stateFile.lowAlphaResidue.longLineRuns > 0) throw new Error('Asset manifest: Week Three Bajie-joining states fail the low-alpha residue gate.');
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekThreeBajieJoiningScene slot verification.`);
  const literals = source.match(/assets\/week-three-bajie-joining\/[a-z0-9-]+\.webp/g) ?? [];
  if (literals.length !== REQUIRED_WEEK_THREE_BAJIE_JOINING_ASSETS.length || new Set(literals).size !== REQUIRED_WEEK_THREE_BAJIE_JOINING_ASSETS.length || REQUIRED_WEEK_THREE_BAJIE_JOINING_ASSETS.some((assetId) => !literals.includes(assetId))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Three Bajie-joining image paths.`);
  verifyWeekThreeBajieJoiningSceneSource(sourcePath, source);
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredWeekThreeBossInventory({ manifestRows, publicFiles, promptRecords = [], sourcePath = WEEK_THREE_BOSS_SOURCE_PATH, source, mode = 'check' }) {
  const directory = 'assets/week-three-boss/';
  const rows = familyRows(manifestRows, directory);
  const files = familyFiles(publicFiles, directory);
  requireExactInventory({ manifestRows: rows, publicFiles: files, expectedPaths: REQUIRED_WEEK_THREE_BOSS_ASSETS, label: 'Week Three boss' });
  for (const row of rows) if (row.screenSlots !== 'w3-m5 WeekThreeBossScene') throw new Error(`Asset manifest: ${row.assetId} screen slots must be exactly w3-m5 WeekThreeBossScene.`);
  if (typeof source !== 'string') throw new Error(`Asset manifest: ${sourcePath} source text is required for WeekThreeBossScene slot verification.`);
  const literals = source.match(/assets\/week-three-boss\/[a-z0-9-]+\.webp/g) ?? [];
  if (literals.length !== 2 || new Set(literals).size !== 2 || REQUIRED_WEEK_THREE_BOSS_ASSETS.some((path) => !literals.includes(path))) throw new Error(`Asset manifest: ${sourcePath} must contain exactly the two approved Week Three boss image paths.`);
  if (!source.includes("import { assetUrl } from '../utils/assets'") || (source.match(/<img\b/g) ?? []).length !== 2 || !/const source\s*=\s*\(path(?:\s*:[^)]+)?\)\s*=>[\s\S]{0,180}assetUrl\(path\)/.test(source) || !/src=\{source\((?:BACKGROUND|background)\)\}/.test(source) || !/src=\{source\((?:STATES|states)\)\}/.test(source) || !source.includes('data-frame')) throw new Error(`Asset manifest: ${sourcePath} must render both approved assets through live assetUrl scene slots.`);
  return verifyAssetManifest({ manifestRows: rows, publicFiles: files, promptRecords: promptRecordsForRows(promptRecords, rows), mode });
}

export function verifyRequiredDragonPalaceInventory({
  manifestRows,
  publicFiles,
  promptRecords,
  sourceFiles,
  mode = 'verify',
}) {
  const directory = 'assets/dragon-palace/';
  const dragonRows = familyRows(manifestRows, directory);
  const dragonFiles = familyFiles(publicFiles, directory);
  const expectedPaths = [...REQUIRED_DRAGON_PALACE_SLOTS.keys()];
  requireExactInventory({ manifestRows: dragonRows, publicFiles: dragonFiles, expectedPaths, label: 'Dragon Palace' });
  if (!(sourceFiles instanceof Map)) throw new Error('Asset manifest: formal scene source files are required for slot verification.');
  const expectedAssetsBySource = new Map();
  for (const [assetId, slots] of REQUIRED_DRAGON_PALACE_SLOTS) {
    for (const { sourcePath, loaderKey, demandTriggers = null } of slots) {
      if (!expectedAssetsBySource.has(sourcePath)) expectedAssetsBySource.set(sourcePath, new Map());
      const expectedAssets = expectedAssetsBySource.get(sourcePath);
      if (expectedAssets.has(loaderKey)) {
        throw new Error(`Asset manifest: required Dragon Palace slots contain duplicate loader key ${loaderKey} for ${sourcePath}.`);
      }
      expectedAssets.set(loaderKey, { publicPath: `/${assetId}`, demandTriggers });
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
    const expectedPreload = new Map([...expectedAssets].filter(([, slot]) => slot.demandTriggers === null));
    const expectedDemand = new Map([...expectedAssets].filter(([, slot]) => slot.demandTriggers !== null));
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
      if (actual?.publicPath !== slot.publicPath
        || JSON.stringify(actual?.demandTriggers) !== JSON.stringify([...slot.demandTriggers].sort())) {
        throw new Error(`Asset manifest: ${slot.publicPath.slice(1)} is missing its exact ${slot.demandTriggers.join(' + ')} demand-load slots ${sourcePath} with loader key ${loaderKey}.`);
      }
    }
  }
  return verifyAssetManifest({
    manifestRows: dragonRows,
    publicFiles: dragonFiles,
    promptRecords: promptRecordsForRows(promptRecords, dragonRows),
    mode,
  });
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

export async function collectAssetFiles(assetRoot, assetDirectory = 'assets/dragon-palace') {
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
      const metadata = await sharp(bytes, { failOn: 'error', limitInputPixels: 20_000_000 }).metadata();
      let alphaEdgeMismatch;
      let alphaZeroRgbPixels;
      let lowAlphaResidue;
      let webpLossless;
      if ((assetDirectory === 'assets/week-three-manor-help' && relativePath === 'manor-message-states.webp') || (assetDirectory === 'assets/week-three-cuilan' && relativePath === 'cuilan-boolean-states.webp') || (assetDirectory === 'assets/week-three-yunzhan-dialogue' && relativePath === 'yunzhan-dialogue-states.webp') || (assetDirectory === 'assets/week-three-bajie-joining' && relativePath === 'bajie-joining-states.webp')) {
        const { data, info } = await sharp(bytes, { failOn: 'error', limitInputPixels: 20_000_000 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        alphaEdgeMismatch = measureAlphaEdgeMismatch(data, info.width, info.height);
        if (assetDirectory === 'assets/week-three-bajie-joining' && relativePath === 'bajie-joining-states.webp') {
          alphaZeroRgbPixels = countAlphaZeroRgbPixels(data);
          lowAlphaResidue = measureLowAlphaResidue(data, info.width, info.height);
          webpLossless = bytes.includes(Buffer.from('VP8L'));
        }
      }
      publicFiles.push({
        path: posix.join(assetDirectory, relativePath),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
        hasAlpha: metadata.hasAlpha === true,
        ...(alphaEdgeMismatch ? { alphaEdgeMismatch } : {}),
        ...(alphaZeroRgbPixels !== undefined ? { alphaZeroRgbPixels } : {}),
        ...(lowAlphaResidue ? { lowAlphaResidue } : {}),
        ...(webpLossless !== undefined ? { webpLossless } : {}),
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
  const dragonPalaceRoot = join(root, 'public', 'assets', 'dragon-palace');
  const advancedWeekOneRoot = join(root, 'public', 'assets', 'week-one-advanced');
  const weekTwoHorseRoot = join(root, 'public', 'assets', 'week-two-heaven');
  const weekTwoMonkeyKingRoot = join(root, 'public', 'assets', 'week-two-great-sage');
  const weekTwoPeachElixirRoot = join(root, 'public', 'assets', 'week-two-peach-elixir');
  const weekTwoFurnaceRoot = join(root, 'public', 'assets', 'week-two-furnace');
  const weekTwoHeavenlyBossRoot = join(root, 'public', 'assets', 'week-two-heavenly-boss');
  const weekThreeManorHelpRoot = join(root, 'public', 'assets', 'week-three-manor-help');
  const weekThreeCuilanRoot = join(root, 'public', 'assets', 'week-three-cuilan');
  const weekThreeYunzhanRoot = join(root, 'public', 'assets', 'week-three-yunzhan-dialogue');
  const weekThreeBajieJoiningRoot = join(root, 'public', 'assets', 'week-three-bajie-joining');
  const weekThreeBossRoot = join(root, 'public', 'assets', 'week-three-boss');
  const { manifestRows, promptRecords } = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = [
    ...await collectAssetFiles(dragonPalaceRoot),
    ...await collectAssetFiles(advancedWeekOneRoot, 'assets/week-one-advanced'),
    ...await collectAssetFiles(weekTwoHorseRoot, 'assets/week-two-heaven'),
    ...await collectAssetFiles(weekTwoMonkeyKingRoot, 'assets/week-two-great-sage'),
    ...await collectAssetFiles(weekTwoPeachElixirRoot, 'assets/week-two-peach-elixir'),
    ...await collectAssetFiles(weekTwoFurnaceRoot, 'assets/week-two-furnace'),
    ...await collectAssetFiles(weekTwoHeavenlyBossRoot, 'assets/week-two-heavenly-boss'),
    ...await collectAssetFiles(weekThreeManorHelpRoot, 'assets/week-three-manor-help'),
    ...await collectAssetFiles(weekThreeCuilanRoot, 'assets/week-three-cuilan'),
    ...await collectAssetFiles(weekThreeYunzhanRoot, 'assets/week-three-yunzhan-dialogue'),
    ...await collectAssetFiles(weekThreeBajieJoiningRoot, 'assets/week-three-bajie-joining'),
    ...await collectAssetFiles(weekThreeBossRoot, 'assets/week-three-boss'),
  ];
  const sourceFiles = new Map(await Promise.all([
    'src/components/GameScene.tsx',
    'src/components/RuyiStaffScene.tsx',
    'src/components/FourSeasRegaliaScene.tsx',
  ].map(async (sourcePath) => [sourcePath, await readFile(join(root, sourcePath), 'utf8')])));
  const mode = process.argv.includes('--require-visual-qa') ? 'verify' : 'check';
  const dragonResult = verifyRequiredDragonPalaceInventory({ manifestRows, publicFiles, promptRecords, sourceFiles, mode });
  const advancedResult = verifyRequiredAdvancedWeekOneInventory({
    manifestRows,
    publicFiles,
    promptRecords,
    source: await readFile(join(root, ADVANCED_WEEK_ONE_SOURCE_PATH), 'utf8'),
    mode,
  });
  const weekTwoHorseResult = verifyRequiredWeekTwoHorseInventory({
    manifestRows,
    publicFiles,
    promptRecords,
    source: await readFile(join(root, WEEK_TWO_HORSE_SOURCE_PATH), 'utf8'),
    mode,
  });
  const weekTwoMonkeyKingResult = verifyRequiredWeekTwoMonkeyKingInventory({
    manifestRows,
    publicFiles,
    promptRecords,
    source: await readFile(join(root, WEEK_TWO_MONKEY_KING_SOURCE_PATH), 'utf8'),
    mode,
  });
  const weekTwoPeachElixirResult = verifyRequiredWeekTwoPeachElixirInventory({
    manifestRows,
    publicFiles,
    promptRecords,
    source: await readFile(join(root, WEEK_TWO_PEACH_ELIXIR_SOURCE_PATH), 'utf8'),
    mode,
  });
  const weekTwoFurnaceResult = verifyRequiredWeekTwoFurnaceInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_TWO_FURNACE_SOURCE_PATH), 'utf8'), mode });
  const weekTwoHeavenlyBossResult = verifyRequiredWeekTwoHeavenlyBossInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_TWO_HEAVENLY_BOSS_SOURCE_PATH), 'utf8'), mode });
  const weekThreeManorHelpResult = verifyRequiredWeekThreeManorHelpInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_THREE_MANOR_HELP_SOURCE_PATH), 'utf8'), mode });
  const weekThreeCuilanResult = verifyRequiredWeekThreeCuilanBooleanInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_THREE_CUILAN_SOURCE_PATH), 'utf8'), mode });
  const weekThreeYunzhanResult = verifyRequiredWeekThreeYunzhanDialogueInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_THREE_YUNZHAN_SOURCE_PATH), 'utf8'), mode });
  const weekThreeBajieJoiningResult = verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_THREE_BAJIE_JOINING_SOURCE_PATH), 'utf8'), mode });
  const weekThreeBossResult = verifyRequiredWeekThreeBossInventory({ manifestRows, publicFiles, promptRecords, source: await readFile(join(root, WEEK_THREE_BOSS_SOURCE_PATH), 'utf8'), mode });
  console.log(`Dragon Palace assets: ${dragonResult.assetCount} files, ${dragonResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Advanced Week One assets: ${advancedResult.assetCount} files, ${advancedResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Two horse-care assets: ${weekTwoHorseResult.assetCount} files, ${weekTwoHorseResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Two monkey-king assets: ${weekTwoMonkeyKingResult.assetCount} files, ${weekTwoMonkeyKingResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Two peach-elixir assets: ${weekTwoPeachElixirResult.assetCount} files, ${weekTwoPeachElixirResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Two furnace assets: ${weekTwoFurnaceResult.assetCount} files, ${weekTwoFurnaceResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Two heavenly Boss assets: ${weekTwoHeavenlyBossResult.assetCount} files, ${weekTwoHeavenlyBossResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Three manor-help assets: ${weekThreeManorHelpResult.assetCount} files, ${weekThreeManorHelpResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Three Cuilan assets: ${weekThreeCuilanResult.assetCount} files, ${weekThreeCuilanResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Three Yunzhan assets: ${weekThreeYunzhanResult.assetCount} files, ${weekThreeYunzhanResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Three Bajie-joining assets: ${weekThreeBajieJoiningResult.assetCount} files, ${weekThreeBajieJoiningResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
  console.log(`Week Three boss assets: ${weekThreeBossResult.assetCount} files, ${weekThreeBossResult.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
