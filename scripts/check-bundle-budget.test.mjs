import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as bundleBudget from './check-bundle-budget.mjs';
import { assertFourSeasE2ESourceContract } from './check-four-seas-e2e-contract.mjs';

const { analyzeManifest, assertNoProductionTestSentinels, assertNoSourceVisualAssets, assertNoWeekThreeBajieJoiningEntryStaticImports } = bundleBudget;

const base = {
  'src/main.tsx': { file: 'assets/main.js', isEntry: true, imports: ['vendor.js'] },
  'vendor.js': { file: 'assets/vendor.js', imports: [] },
};

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

const validHealthCore = `
  let healthEvents = []
  let expectedChunkFailureUrl = null
  function expectedLazyChunkFailure(event) {
    if (expectedChunkFailureUrl === null) return false
    if (event.kind === 'response') return event.url === expectedChunkFailureUrl && event.status === 503
    if (event.kind === 'requestfailed') return event.url === expectedChunkFailureUrl && /ABORTED|cancelled/i.test(event.detail)
    if (event.kind !== 'console') return false
    if (event.url === expectedChunkFailureUrl && event.detail === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') return true
    const failure = ` + "`Failed to fetch dynamically imported module: ${expectedChunkFailureUrl}`" + `
    return event.detail === failure || event.detail === ` + "`TypeError: ${failure}`" + `
  }
  function attachHealth(page) {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const event: HealthEvent = { kind: 'console', url: message.location().url || page.url(), detail: message.text() }
        if (!expectedLazyChunkFailure(event)) healthEvents.push(event)
      }
    })
    page.on('pageerror', (error) => healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }))
    page.on('requestfailed', (request) => {
      const event = { kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }
      if (!expectedNavigationAbort(event) && !expectedLazyChunkFailure(event)) healthEvents.push(event)
    })
    page.on('response', (response) => {
      const status = response.status()
      if (status < 400) return
      const event: HealthEvent = { kind: 'response', url: response.url(), detail: ` + "`HTTP ${status}`" + `, status }
      if (!expectedLazyChunkFailure(event)) healthEvents.push(event)
    })
  }
  function expectedNavigationAbort(event) {
    return event.kind === 'requestfailed' && (
      (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
      || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
      || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
    )
  }
`;

const validHealthHarness = `
  ${validHealthCore}
  test.afterEach(() => {
    expect(healthEvents, 'unexpected Four Seas browser health events').toEqual([])
  })
`;

function sourceModuleSpecifiers(path) {
  const source = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  return file.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) return [];
    return ts.isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : [];
  });
}

function runtimeModuleSpecifiers(path) {
  const source = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  return file.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const typeOnly = clause?.isTypeOnly
        || (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
          && !clause.name
          && clause.namedBindings.elements.every((element) => element.isTypeOnly));
      if (typeOnly) return [];
    } else if (ts.isExportDeclaration(statement)) {
      const typeOnly = statement.isTypeOnly
        || (statement.exportClause && ts.isNamedExports(statement.exportClause)
          && statement.exportClause.elements.every((element) => element.isTypeOnly));
      if (typeOnly) return [];
    } else {
      return [];
    }
    return ts.isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : [];
  });
}

function resolveTypeScriptModule(importer, specifier) {
  const unresolved = resolve(dirname(importer), specifier);
  const candidates = extname(unresolved)
    ? [unresolved]
    : [`${unresolved}.ts`, `${unresolved}.tsx`, resolve(unresolved, 'index.ts'), resolve(unresolved, 'index.tsx')];
  const resolved = candidates.find((candidate) => ts.sys.fileExists(candidate));
  assert.ok(resolved, `cannot resolve ${specifier} from ${importer}`);
  return resolved;
}

function collectRuntimeSourceClosure(entry) {
  const closure = new Set();
  const visit = (path) => {
    if (closure.has(path)) return;
    closure.add(path);
    for (const specifier of runtimeModuleSpecifiers(path).filter((candidate) => candidate.startsWith('.'))) {
      visit(resolveTypeScriptModule(path, specifier));
    }
  };
  visit(entry);
  return closure;
}

async function loadTypeScriptModule(path) {
  const source = readFileSync(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

function loadNamedFunctionFromTypeScriptSource(source, name) {
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = file.statements.find((statement) => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === name
  ));
  assert.ok(declaration, `missing ${name} declaration`);
  const output = ts.transpileModule(declaration.getText(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(`${output}\nreturn ${name}`)();
}

function loadHealthRuntimeFromTypeScriptSource(source) {
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const healthStatements = file.statements.filter((statement) => (
    (ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some((declaration) => (
        ts.isIdentifier(declaration.name) && declaration.name.text === 'healthEvents'
      )))
    || (ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some((declaration) => (
        ts.isIdentifier(declaration.name) && declaration.name.text === 'expectedChunkFailureUrl'
      )))
    || (ts.isFunctionDeclaration(statement)
      && ['attachHealth', 'expectedNavigationAbort', 'expectedLazyChunkFailure'].includes(statement.name?.text))
  ));
  const output = ts.transpileModule(healthStatements.map((statement) => statement.getText(file)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(`${output}\nreturn { attachHealth, readHealthEvents: () => healthEvents, setExpectedChunkFailureUrl: (url) => { expectedChunkFailureUrl = url } }`)();
}

function loadStaffHealthRuntimeFromTypeScriptSource(source) {
  const file = ts.createSourceFile('staff-health.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const healthStatements = file.statements.filter((statement) => (
    (ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some((declaration) => (
        ts.isIdentifier(declaration.name) && declaration.name.text === 'staffHealthEvents'
      )))
    || (ts.isFunctionDeclaration(statement)
      && ['attachStaffHealth', 'isExactInjectedChunkFailure'].includes(statement.name?.text))
  ));
  const output = ts.transpileModule(healthStatements.map((statement) => statement.getText(file)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(`${output}\nreturn { attachStaffHealth, isExactInjectedChunkFailure, readHealthEvents: () => staffHealthEvents }`)();
}

test('exports the fixed Dragon Palace cold-load and raster budgets', () => {
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_LOAD_MAX_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.RUYI_STAFF_COLD_LOAD_MAX_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.FOUR_SEAS_COLD_LOAD_MAX_BYTES, 2.75 * 1024 * 1024);
  assert.equal(bundleBudget.UNDERWORLD_REGISTER_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.THIRD_CHAPTER_BOSS_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_TWO_HORSE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.PYTHON_RUNTIME_TRANSFER_MAX_BYTES, 15 * 1024 * 1024);
  assert.equal(bundleBudget.ENTRY_GZIP_LIMIT, 180 * 1024);
  assert.equal(bundleBudget.HOME_TOTAL_LIMIT, 650 * 1024);
  assert.equal(bundleBudget.PHASER_RAW_LIMIT, 1600 * 1024);
  assert.equal(bundleBudget.GAME_SCENE_RAW_LIMIT, 1900 * 1024);
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.RUYI_STAFF_COLD_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.DRAGON_PALACE_MEDIA_BYTES, 1.25 * 1024 * 1024);
  assert.equal(bundleBudget.SINGLE_RASTER_BYTES, 512 * 1024);
});

test('reserves an isolated 3 MiB W4-M2 Python variable evidence cold-load closure', () => {
  const root = 'src/components/WeekFourVariableEvidenceExperience.tsx';
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], 3 * 1024 * 1024);
});

test('enforces the W4-M2 3 MiB lazy Experience closure and keeps editor and scene chunks out of the entry', () => {
  const root = 'src/components/WeekFourVariableEvidenceExperience.tsx';
  const editor = 'src/components/WeekFourVariableEvidencePythonEditor.tsx';
  const scene = 'src/components/WeekFourVariableEvidenceScene.tsx';
  assert.equal(bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES);
  const manifest = {
    ...base,
    [root]: { file: 'assets/week-four-variable-experience.js', isDynamicEntry: true, imports: [], dynamicImports: [editor, scene] },
    [editor]: { file: 'assets/week-four-variable-editor.js', isDynamicEntry: true, imports: [] },
    [scene]: { file: 'assets/week-four-variable-scene.js', isDynamicEntry: true, imports: [] },
  };
  const sizes = {
    'assets/main.js': 1, 'assets/vendor.js': 1,
    'assets/week-four-variable-experience.js': bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES - 2,
    'assets/week-four-variable-editor.js': 1, 'assets/week-four-variable-scene.js': 1,
  };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES);
  assert.throws(() => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-four-variable-scene.js': 2 }), /WeekFourVariableEvidenceExperience closure exceeds its 3 MiB cold-load budget/);
  const staticEntrySizes = { ...sizes, 'assets/week-four-variable-experience.js': 1 };
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', root] } }, staticEntrySizes, sizes), /WeekFourVariableEvidenceExperience must stay outside the application entry static closure/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', editor] } }, sizes, sizes), /WeekFourVariableEvidencePythonEditor must stay outside the application entry static closure/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', scene] } }, sizes, sizes), /WeekFourVariableEvidenceScene must stay outside the application entry static closure/);
});

test('enforces the exact W3-M1 cold-load budget on its dedicated lazy route closure', () => {
  const root = 'src/components/WeekThreeManorHelpExperience.tsx';
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES);
  const manifest = {
    ...base,
    [root]: { file: 'assets/week-three-manor-help.js', isDynamicEntry: true, imports: [] },
  };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/week-three-manor-help.js': bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES);
  assert.throws(
    () => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-three-manor-help.js': bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES + 1 }),
    /WeekThreeManorHelpExperience closure exceeds its 3 MiB cold-load budget/,
  );
  assert.throws(
    () => analyzeManifest({ ...manifest, [root]: { ...manifest[root], isDynamicEntry: false } }, sizes, sizes),
    /WeekThreeManorHelpExperience must remain a lazy route entry/,
  );
  assert.throws(
    () => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', root] } }, { ...sizes, 'assets/week-three-manor-help.js': 1 }, sizes),
    /WeekThreeManorHelpExperience must stay outside the application entry static closure/,
  );
});

test('enforces the exact W3-M2 cold-load budget on its dedicated three-layer lazy route closure', () => {
  const root = 'src/components/WeekThreeCuilanBooleanExperience.tsx';
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES);
  const manifest = { ...base, [root]: { file: 'assets/week-three-cuilan.js', isDynamicEntry: true, imports: [] } };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/week-three-cuilan.js': bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES);
  assert.throws(() => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-three-cuilan.js': bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES + 1 }), /WeekThreeCuilanBooleanExperience closure exceeds its 3 MiB cold-load budget/);
  assert.throws(() => analyzeManifest({ ...manifest, [root]: { ...manifest[root], isDynamicEntry: false } }, sizes, sizes), /WeekThreeCuilanBooleanExperience must remain a lazy route entry/);
});

test('enforces the exact W3-M3 cold-load budget on its dedicated three-layer lazy route closure', () => {
  const root = 'src/components/WeekThreeYunzhanDialogueExperience.tsx';
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_THREE_YUNZHAN_DIALOGUE_COLD_LOAD_MAX_BYTES);
  const manifest = { ...base, [root]: { file: 'assets/week-three-yunzhan.js', isDynamicEntry: true, imports: [] } };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/week-three-yunzhan.js': bundleBudget.WEEK_THREE_YUNZHAN_DIALOGUE_COLD_LOAD_MAX_BYTES };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_THREE_YUNZHAN_DIALOGUE_COLD_LOAD_MAX_BYTES);
});

test('enforces the exact W3-M4 3 MiB cold-load closure and keeps its Blockly and scene chunks out of the entry', () => {
  const root = 'src/components/WeekThreeBajieJoiningExperience.tsx';
  const workspace = 'src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx';
  const scene = 'src/components/WeekThreeBajieJoiningScene.tsx';
  assert.equal(bundleBudget.WEEK_THREE_BAJIE_JOINING_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_THREE_BAJIE_JOINING_COLD_LOAD_MAX_BYTES);
  const manifest = {
    ...base,
    [root]: { file: 'assets/week-three-bajie-joining.js', isDynamicEntry: true, imports: [], dynamicImports: [workspace, scene] },
    [workspace]: { file: 'assets/week-three-bajie-workspace.js', isDynamicEntry: true, imports: [] },
    [scene]: { file: 'assets/week-three-bajie-scene.js', isDynamicEntry: true, imports: [] },
  };
  const sizes = {
    'assets/main.js': 1, 'assets/vendor.js': 1,
    'assets/week-three-bajie-joining.js': bundleBudget.WEEK_THREE_BAJIE_JOINING_COLD_LOAD_MAX_BYTES - 2,
    'assets/week-three-bajie-workspace.js': 1, 'assets/week-three-bajie-scene.js': 1,
  };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_THREE_BAJIE_JOINING_COLD_LOAD_MAX_BYTES);
  assert.throws(() => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-three-bajie-scene.js': 2 }), /WeekThreeBajieJoiningExperience closure exceeds its 3 MiB cold-load budget/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', workspace] } }, sizes, sizes), /WeekThreeBajieJoiningBlocklyWorkspace must stay outside the application entry static closure/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', scene] } }, sizes, sizes), /WeekThreeBajieJoiningScene must stay outside the application entry static closure/);
});

test('enforces the exact W3-M5 3 MiB cold-load closure and keeps its Blockly and scene chunks out of the entry', () => {
  const root = 'src/components/WeekThreeBossExperience.tsx';
  const workspace = 'src/components/WeekThreeBossBlocklyWorkspace.tsx';
  const scene = 'src/components/WeekThreeBossScene.tsx';
  assert.equal(bundleBudget.WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES);
  const manifest = {
    ...base,
    [root]: { file: 'assets/week-three-boss.js', isDynamicEntry: true, imports: [], dynamicImports: [workspace, scene] },
    [workspace]: { file: 'assets/week-three-boss-workspace.js', isDynamicEntry: true, imports: [] },
    [scene]: { file: 'assets/week-three-boss-scene.js', isDynamicEntry: true, imports: [] },
  };
  const sizes = {
    'assets/main.js': 1, 'assets/vendor.js': 1,
    'assets/week-three-boss.js': bundleBudget.WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES - 2,
    'assets/week-three-boss-workspace.js': 1, 'assets/week-three-boss-scene.js': 1,
  };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES);
  assert.throws(() => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-three-boss-scene.js': 2 }), /WeekThreeBossExperience closure exceeds its 3 MiB cold-load budget/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', workspace] } }, sizes, sizes), /WeekThreeBossBlocklyWorkspace must stay outside the application entry static closure/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', scene] } }, sizes, sizes), /WeekThreeBossScene must stay outside the application entry static closure/);
});

test('enforces the W4-M1 3 MiB lazy Experience closure and keeps Blockly and scene chunks out of the entry', () => {
  const root = 'src/components/WeekFourMappingExperience.tsx';
  const workspace = 'src/components/WeekFourMappingBlocklyWorkspace.tsx';
  const scene = 'src/components/WeekFourMappingScene.tsx';
  assert.equal(bundleBudget.WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS[root], bundleBudget.WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES);
  const manifest = {
    ...base,
    [root]: { file: 'assets/week-four-mapping.js', isDynamicEntry: true, imports: [], dynamicImports: [workspace, scene] },
    [workspace]: { file: 'assets/week-four-mapping-workspace.js', isDynamicEntry: true, imports: [] },
    [scene]: { file: 'assets/week-four-mapping-scene.js', isDynamicEntry: true, imports: [] },
  };
  const sizes = {
    'assets/main.js': 1, 'assets/vendor.js': 1,
    'assets/week-four-mapping.js': bundleBudget.WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES - 2,
    'assets/week-four-mapping-workspace.js': 1, 'assets/week-four-mapping-scene.js': 1,
  };
  assert.equal(analyzeManifest(manifest, sizes, sizes).closures[root].rawBytes, bundleBudget.WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES);
  assert.throws(() => analyzeManifest(manifest, sizes, { ...sizes, 'assets/week-four-mapping-scene.js': 2 }), /WeekFourMappingExperience closure exceeds its 3 MiB cold-load budget/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', workspace] } }, sizes, sizes), /WeekFourMappingBlocklyWorkspace must stay outside the application entry static closure/);
  assert.throws(() => analyzeManifest({ ...manifest, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['vendor.js', scene] } }, sizes, sizes), /WeekFourMappingScene must stay outside the application entry static closure/);
});

test('keeps the W3-M4 route, scene, and Blockly workspace dynamically split from homepage static imports', () => {
  const routeSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  const experienceSource = readFileSync(new URL('../src/components/WeekThreeBajieJoiningExperience.tsx', import.meta.url), 'utf8');
  assert.match(routeSource, /import\(\s*['"]\.\/WeekThreeBajieJoiningExperience['"]\s*\)/);
  assert.match(routeSource, /mission\.id\s*===\s*['"]w3-m4['"][\s\S]{0,900}<WeekThreeBajieJoiningRouteBoundary\b/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeBajieJoiningBlocklyWorkspace['"]\)/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeBajieJoiningScene['"]\)/);
});

test('ignores local exports without a module specifier while preserving static relative export scanning', () => {
  const sources = new Map([
    ['src/main.tsx', "import App from './App'; export { App };"],
    ['src/App.tsx', "const localName = 1; export { localName }; export { helper } from './helper';"],
    ['src/helper.ts', 'export const helper = 2;'],
  ]);
  assert.doesNotThrow(() => assertNoWeekThreeBajieJoiningEntryStaticImports(sources));
});

test('keeps the W3-M5 route, scene, and Blockly workspace dynamically split from homepage static imports', () => {
  const routeSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  const experienceSource = readFileSync(new URL('../src/components/WeekThreeBossExperience.tsx', import.meta.url), 'utf8');
  assert.match(routeSource, /import\(\s*['"]\.\/WeekThreeBossExperience['"]\s*\)/);
  assert.match(routeSource, /mission\.id\s*===\s*['"]w3-m5['"][\s\S]{0,900}<WeekThreeBossRouteBoundary\b/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeBossBlocklyWorkspace['"]\)/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeBossScene['"]\)/);
});

test('rejects W3-M4 static entry reachability even when Vite erases the source-module manifest keys', () => {
  const sources = new Map([
    ['src/main.tsx', "import App from './App';"],
    ['src/App.tsx', "import { WeekThreeBajieJoiningScene } from './components/WeekThreeBajieJoiningScene'; export default WeekThreeBajieJoiningScene;"],
    ['src/components/WeekThreeBajieJoiningScene.tsx', 'export const WeekThreeBajieJoiningScene = () => null;'],
  ]);
  assert.throws(() => assertNoWeekThreeBajieJoiningEntryStaticImports(sources), /WeekThreeBajieJoiningScene.*static import closure/i);
  assert.doesNotThrow(() => assertNoWeekThreeBajieJoiningEntryStaticImports(new Map([
    ['src/main.tsx', "import App from './App';"],
    ['src/App.tsx', "const load = () => import('./components/WeekThreeBajieJoiningScene'); export default load;"],
  ])));
});

test('rejects missing manifest source keys when entry source statically reaches the W3-M4 workspace', () => {
  const sources = new Map([
    ['src/main.tsx', "import App from './App';"],
    ['src/App.tsx', "export { WeekThreeBajieJoiningBlocklyWorkspace } from './components/WeekThreeBajieJoiningBlocklyWorkspace';"],
    ['src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx', 'export const WeekThreeBajieJoiningBlocklyWorkspace = () => null;'],
  ]);
  const manifest = { ...base };
  assert.throws(() => {
    assertNoWeekThreeBajieJoiningEntryStaticImports(sources);
    analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1 }, { 'assets/main.js': 1, 'assets/vendor.js': 1 });
  }, /WeekThreeBajieJoiningBlocklyWorkspace.*static import closure/i);
});

test('keeps the W3-M2 route, scene, and Blockly workspace dynamically split from homepage static imports', () => {
  const routeSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  const experienceSource = readFileSync(new URL('../src/components/WeekThreeCuilanBooleanExperience.tsx', import.meta.url), 'utf8');
  assert.match(routeSource, /import\(\s*['"]\.\/WeekThreeCuilanBooleanExperience['"]\s*\)/);
  assert.match(routeSource, /mission\.id\s*===\s*['"]w3-m2['"][\s\S]{0,900}<WeekThreeCuilanBooleanRouteBoundary\b/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeCuilanBooleanBlocklyWorkspace['"]\)/);
  assert.match(experienceSource, /import\(['"]\.\/WeekThreeCuilanBooleanScene['"]\)/);
});

test('requires the W3-M1 dedicated lazy route closure', () => {
  const routeSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  assert.match(routeSource, /import\(\s*['"]\.\/WeekThreeManorHelpExperience['"]\s*\)/);
  assert.match(routeSource, /mission\.id\s*===\s*['"]w3-m1['"][\s\S]{0,900}<WeekThreeManorHelpRouteBoundary\b/);
});

test('keeps the Four Seas E2E AST contract isolated while allowing the W3-M4 entry-import AST gate', () => {
  const source = readFileSync(new URL('./check-bundle-budget.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /check-four-seas-e2e-contract/);
  assert.match(source, /assertNoWeekThreeBajieJoiningEntryStaticImports/);
});

test('keeps the progress-core manual chunk stable in the E2E fault build', () => {
  const viteSource = readFileSync(new URL('../vite.config.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(viteSource, /!e2eStorageFaults\s*&&\s*\(source\.includes\('\/src\/battle\/\/'\)/);
  assert.match(viteSource, /if \(source\.includes\('\/src\/battle\/'\)[\s\S]{0,180}return 'progress-core';/);
});

test('locks the supported browser build to the modern ESNext target after ES2022 misses the fixed budget', () => {
  const viteSource = readFileSync(new URL('../vite.config.mjs', import.meta.url), 'utf8');
  assert.match(viteSource, /build:\s*\{[\s\S]{0,120}target:\s*'esnext'/);
});

test('keeps Advanced Week One on the established Blockly core entry instead of widening old mission bundles', () => {
  const viteSource = readFileSync(new URL('../vite.config.mjs', import.meta.url), 'utf8');
  assert.match(viteSource, /source === 'blockly'[\s\S]{0,260}AdvancedWeekOne[\s\S]{0,260}'blockly\/core'/);
});

test('derives advanced parser and runtime behavior from one zero-UI neutral contract', () => {
  const schemaPath = resolve(sourceRoot, 'progress/advancedSessionSchema.ts');
  const contractPath = resolve(sourceRoot, 'blockly/advancedWeekOneContract.ts');
  const schemaImports = sourceModuleSpecifiers(schemaPath);
  assert.ok(schemaImports.some((specifier) => specifier.endsWith('advancedWeekOneContract')));
  assert.ok(!schemaImports.some((specifier) => specifier.endsWith('advancedWeekOneDraft') || specifier.endsWith('advancedWeekOne')));
  const contractSource = readFileSync(contractPath, 'utf8');
  assert.deepEqual(runtimeModuleSpecifiers(contractPath), []);
  assert.match(contractSource, /export function compileAdvancedWeekOneDraft/);
  assert.match(contractSource, /export function runAdvancedWeekOne/);
});

test('derives compatible cold-load aliases from canonical budget constants', () => {
  const budgetSource = readFileSync(new URL('./budget-limits.mjs', import.meta.url), 'utf8');
  assert.match(budgetSource, /DRAGON_PALACE_COLD_BYTES\s*=\s*DRAGON_PALACE_COLD_LOAD_MAX_BYTES/);
  assert.match(budgetSource, /RUYI_STAFF_COLD_BYTES\s*=\s*RUYI_STAFF_COLD_LOAD_MAX_BYTES/);
  assert.match(budgetSource, /FOUR_SEAS_COLD_BYTES\s*=\s*FOUR_SEAS_COLD_LOAD_MAX_BYTES/);
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_BYTES, bundleBudget.DRAGON_PALACE_COLD_LOAD_MAX_BYTES);
  assert.equal(bundleBudget.RUYI_STAFF_COLD_BYTES, bundleBudget.RUYI_STAFF_COLD_LOAD_MAX_BYTES);
  assert.equal(bundleBudget.FOUR_SEAS_COLD_BYTES, bundleBudget.FOUR_SEAS_COLD_LOAD_MAX_BYTES);

  const dragonSource = readFileSync(new URL('../e2e/dragon-palace-code-battle.spec.ts', import.meta.url), 'utf8');
  const staffSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(dragonSource, /import\s*\{\s*DRAGON_PALACE_COLD_LOAD_MAX_BYTES\s*\}/);
  assert.match(staffSource, /import\s*\{\s*RUYI_STAFF_COLD_LOAD_MAX_BYTES\s*\}/);
});

test('keeps all three formal experiences route-lazy and Four Seas scene/workspace independently bounded', () => {
  const routeSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  assert.match(routeSource, /lazy\(\(\)\s*=>\s*import\(['"]\.\/DragonPalaceExperience['"]\)/);
  assert.match(routeSource, /lazy\(\(\)\s*=>\s*import\(['"]\.\/RuyiStaffExperience['"]\)/);
  assert.match(routeSource, /loadFourSeasRegaliaExperience\s*=\s*\(\)\s*=>\s*import\(['"]\.\/FourSeasRegaliaExperience['"]\)/);
  assert.match(routeSource, /lazy\(loader\)/);

  const manifest = {
    ...base,
    'src/components/FourSeasRegaliaScene.tsx': { file: 'assets/four-seas-scene.js', isDynamicEntry: true, imports: ['phaser-runtime.js'] },
    'src/components/FourSeasRegaliaBlocklyWorkspace.tsx': { file: 'assets/four-seas-workspace.js', isDynamicEntry: true, imports: ['blockly-runtime.js'] },
    'phaser-runtime.js': { file: 'assets/phaser.js', name: 'phaser', imports: [] },
    'blockly-runtime.js': { file: 'assets/blockly.js', src: 'node_modules/blockly/core.js', imports: [] },
  };
  const gzip = Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]));
  const raw = { ...gzip, 'assets/phaser.js': 1000, 'assets/blockly.js': 2000 };
  const result = analyzeManifest(manifest, gzip, raw);
  assert.equal(result.closures['src/components/FourSeasRegaliaScene.tsx'].rawBytes, 1001);
  assert.equal(result.closures['src/components/FourSeasRegaliaBlocklyWorkspace.tsx'].rawBytes, 2001);
});

test('keeps mission, parent, Ruyi, and Four Seas CSS out of the homepage entry closure', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const globalCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const parentGateSource = readFileSync(new URL('../src/components/ParentAccessGate.tsx', import.meta.url), 'utf8');
  const parentToolsSource = readFileSync(new URL('../src/components/ParentDataTools.tsx', import.meta.url), 'utf8');
  const missionToolsSource = readFileSync(new URL('../src/components/MissionTools.tsx', import.meta.url), 'utf8');
  const missionPageSource = readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8');
  const ruyiSource = readFileSync(new URL('../src/components/RuyiStaffExperience.tsx', import.meta.url), 'utf8');
  const fourSeasSource = readFileSync(new URL('../src/components/FourSeasRegaliaExperience.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /lazy\(\(\)\s*=>\s*import\(['"]\.\/components\/ParentAccessGate['"]\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*import\(['"]\.\/components\/ParentDataTools['"]\)/);
  assert.match(parentGateSource, /import ['"]\.\/ParentAccessGate\.css['"]/);
  assert.match(parentToolsSource, /import ['"]\.\/ParentDataTools\.css['"]/);
  assert.match(missionToolsSource, /import ['"]\.\/MissionTools\.css['"]/);
  assert.match(missionPageSource, /import ['"]\.\/MissionPageContent\.css['"]/);
  assert.match(ruyiSource, /import ['"]\.\/RuyiStaffExperience\.css['"]/);
  assert.match(fourSeasSource, /import ['"]\.\/FourSeasRegaliaExperience\.css['"]/);
  assert.doesNotMatch(globalCss, /\.mission-page\s*\{|\.parent-page\s*\{|\.ruyi-staff-experience\s*\{|\.four-seas-regalia-experience\s*\{|\.python-workspace\s*\{/);
});

test('keeps Four Seas persistence on a neutral contract outside the lazy UI catalogue', () => {
  const schemaPath = resolve(sourceRoot, 'progress/schema.ts');
  const draftPath = resolve(sourceRoot, 'blockly/fourSeasRegaliaDraft.ts');
  const contractPath = resolve(sourceRoot, 'blockly/fourSeasRegaliaContract.ts');
  const cataloguePath = resolve(sourceRoot, 'blockly/fourSeasRegaliaCatalogue.ts');

  for (const consumerPath of [schemaPath, draftPath]) {
    const directImports = sourceModuleSpecifiers(consumerPath);
    assert.ok(directImports.some((specifier) => specifier.endsWith('fourSeasRegaliaContract')));
    assert.ok(!directImports.some((specifier) => specifier.endsWith('fourSeasRegaliaCatalogue')));
  }

  const schemaClosure = collectRuntimeSourceClosure(schemaPath);
  assert.ok(schemaClosure.has(contractPath), 'schema static closure must include the neutral contract');
  assert.ok(!schemaClosure.has(cataloguePath), 'schema static closure must exclude the lazy UI catalogue');

  const contractSource = readFileSync(contractPath, 'utf8');
  assert.deepEqual(runtimeModuleSpecifiers(contractPath), []);
  assert.doesNotMatch(contractSource, /[\u3400-\u9fff]/u);
  assert.doesNotMatch(contractSource, /(?:from\s+|import\s*\()[`'"](?:blockly|phaser|react)(?:[\/'"])/);
  assert.doesNotMatch(contractSource, /FOUR_SEAS_BLOCK_LABELS/);

  const catalogueSource = readFileSync(cataloguePath, 'utf8');
  assert.match(catalogueSource, /FOUR_SEAS_BLOCK_LABELS/);
  assert.doesNotMatch(catalogueSource, /(?:const|let|var)\s+FOUR_SEAS_BLOCK_OPCODE\b/);
});

test('derives every Four Seas opcode domain from one zero-import neutral definition', async () => {
  const contractPath = resolve(sourceRoot, 'blockly/fourSeasRegaliaContract.ts');
  const schemaPath = resolve(sourceRoot, 'progress/schema.ts');
  const battleTypesPath = resolve(sourceRoot, 'battle/types.ts');
  const contract = await loadTypeScriptModule(contractPath);

  assert.ok(contract.FOUR_SEAS_BLOCK_DEFINITIONS, 'canonical block definitions must be exported');
  const definitions = Object.entries(contract.FOUR_SEAS_BLOCK_DEFINITIONS);
  const opcodes = definitions.map(([, definition]) => definition.opcode);
  assert.equal(new Set(opcodes).size, definitions.length, 'every block must have a unique opcode');
  assert.deepEqual(
    contract.FOUR_SEAS_BLOCK_OPCODE,
    Object.fromEntries(definitions.map(([blockType, definition]) => [blockType, definition.opcode])),
  );
  assert.deepEqual(
    contract.FOUR_SEAS_TOP_BLOCK_TYPES,
    definitions.filter(([, definition]) => definition.parentScope === 'top').map(([blockType]) => blockType),
  );
  assert.deepEqual(
    contract.FOUR_SEAS_CHILD_BLOCK_TYPES,
    definitions.filter(([, definition]) => definition.parentScope !== 'top').map(([blockType]) => blockType),
  );
  assert.deepEqual(
    contract.FOUR_SEAS_OPCODE_PLACEMENT,
    Object.fromEntries(definitions.map(([, definition]) => [
      definition.opcode,
      definition.parentScope === 'top' ? 'top' : 'child',
    ])),
  );
  assert.deepEqual(
    contract.FOUR_SEAS_OPCODE_PARENT_SCOPE,
    Object.fromEntries(definitions.map(([, definition]) => [definition.opcode, definition.parentScope])),
  );
  for (const [blockType, definition] of definitions) {
    assert.equal(contract.isFourSeasBlockType(blockType), true);
    assert.equal(contract.isFourSeasOpcode(definition.opcode), true);
  }
  assert.equal(contract.isFourSeasOpcode('future-unregistered-opcode'), false);

  assert.deepEqual(sourceModuleSpecifiers(contractPath), [], 'neutral contract must have zero imports');
  const schemaSource = readFileSync(schemaPath, 'utf8');
  assert.doesNotMatch(schemaSource, /const\s+fourSeasOpcodes\b/);
  assert.doesNotMatch(schemaSource, /const\s+fourSeasOpcodePlacement\b/);
  const battleTypesSource = readFileSync(battleTypesPath, 'utf8');
  assert.match(battleTypesSource, /(?:import|export)\s+type\s*\{\s*FourSeasOpcode\s*\}[^;]*fourSeasRegaliaContract/);
  assert.doesNotMatch(battleTypesSource, /export\s+type\s+FourSeasOpcode\s*=/);
});

test('forbids Blockly as well as Phaser in the entry static closure', () => {
  const manifest = {
    ...base,
    'src/main.tsx': { ...base['src/main.tsx'], imports: ['node_modules/blockly/core.js'] },
    'node_modules/blockly/core.js': { file: 'assets/blockly.js', src: 'node_modules/blockly/core.js', imports: [] },
  };
  assert.throws(
    () => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/blockly.js': 1 }, { 'assets/main.js': 1, 'assets/blockly.js': 1 }),
    /Blockly.*static/i,
  );
});

test('rejects hidden w1-m3 writes and missing health listeners on every independent E2E page', () => {
  const good = `
    ${validHealthHarness}
    async function newHealthyPage(context) {
      const page = await context.newPage()
      attachHealth(page)
      return page
    }
    const externalPage = await newHealthyPage(page.context())
    const mission = await externalPage.evaluate(() => JSON.parse(localStorage.getItem('xiyou-programming-progress-v3')).missions['w1-m3'])
  `;
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(good));
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const externalPage = await page.context().newPage()
    await externalPage.goto('./')
  `), /health/i);
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => {
      progress.sessions['w1-m3'] = forgedSession
      localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify(progress))
    })
  `), /inject|w1-m3/i);
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => { progress.missions['w1-m3'] = { status: 'completed' } })
  `), /inject|w1-m3/i);

  const actualSource = readFileSync(new URL('../e2e/four-seas-regalia-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(actualSource));
});

test('keeps the actual navigation-abort predicate pure and narrow for synthetic health events', () => {
  const source = readFileSync(new URL('../e2e/four-seas-regalia-code-battle.spec.ts', import.meta.url), 'utf8');
  const expectedNavigationAbort = loadNamedFunctionFromTypeScriptSource(source, 'expectedNavigationAbort');
  const events = [
    Object.freeze({ kind: 'console', url: 'https://fonts.gstatic.com/font.woff2', detail: 'net::ERR_ABORTED' }),
    Object.freeze({ kind: 'pageerror', url: 'https://static.blockly.com/media/sprites.svg', detail: 'cancelled' }),
    Object.freeze({ kind: 'requestfailed', url: 'https://example.test/api', detail: 'net::ERR_ABORTED' }),
    Object.freeze({ kind: 'requestfailed', url: 'https://fonts.gstatic.com/font.woff2', detail: 'net::ERR_ABORTED' }),
    Object.freeze({ kind: 'requestfailed', url: 'https://example.test/assets/audio/click.mp3', detail: 'cancelled' }),
    Object.freeze({ kind: 'requestfailed', url: 'https://static.blockly.com/media/sprites.svg', detail: 'net::ERR_ABORTED' }),
  ];
  const snapshots = events.map((event) => ({ ...event }));
  assert.deepEqual(events.map(expectedNavigationAbort), [false, false, false, true, true, true]);
  assert.deepEqual(events, snapshots, 'the predicate must not mutate synthetic health events');
});

test('rejects an actual-style afterEach that filters healthEvents before assertion', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      expect(healthEvents.filter((event) => !expectedNavigationAbort(event)), 'unexpected Four Seas browser health events').toEqual([])
    })
  `), /afterEach|healthEvents|direct|filter|raw/i);
});

test('accepts only the raw healthEvents array after request failures are gated at collection', () => {
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      expect(healthEvents, 'unexpected Four Seas browser health events').toEqual([])
    })
  `));
});

test('actual requestfailed collection keeps unknown failures and skips only approved aborts', () => {
  const source = readFileSync(new URL('../e2e/four-seas-regalia-code-battle.spec.ts', import.meta.url), 'utf8');
  const { attachHealth, readHealthEvents } = loadHealthRuntimeFromTypeScriptSource(source);
  const listeners = new Map();
  attachHealth({
    on: (name, listener) => listeners.set(name, listener),
    url: () => 'https://example.test/',
  });
  const unknownFailure = Object.freeze({
    url: () => 'https://example.test/api',
    failure: () => ({ errorText: 'net::ERR_CONNECTION_REFUSED' }),
  });
  const approvedAbort = Object.freeze({
    url: () => 'https://fonts.gstatic.com/font.woff2',
    failure: () => ({ errorText: 'net::ERR_ABORTED' }),
  });
  listeners.get('requestfailed')(unknownFailure);
  listeners.get('requestfailed')(approvedAbort);
  assert.deepEqual(readHealthEvents(), [{
    kind: 'requestfailed',
    url: 'https://example.test/api',
    detail: 'net::ERR_CONNECTION_REFUSED',
  }]);
});

test('actual lazy-failure collection gates only the active exact chunk signatures', () => {
  const source = readFileSync(new URL('../e2e/four-seas-regalia-code-battle.spec.ts', import.meta.url), 'utf8');
  const { attachHealth, readHealthEvents, setExpectedChunkFailureUrl } = loadHealthRuntimeFromTypeScriptSource(source);
  const listeners = new Map();
  attachHealth({
    on: (name, listener) => listeners.set(name, listener),
    url: () => 'http://127.0.0.1:4173/',
  });
  const target = 'http://127.0.0.1:4173/assets/FourSeasRegaliaExperience.js';
  setExpectedChunkFailureUrl(target);
  const request = (url, detail) => Object.freeze({ url: () => url, failure: () => ({ errorText: detail }) });
  const consoleMessage = (url, detail) => Object.freeze({
    type: () => 'error',
    location: () => ({ url }),
    text: () => detail,
  });
  listeners.get('requestfailed')(request(target, 'net::ERR_ABORTED'));
  listeners.get('console')(consoleMessage(target, 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'));
  listeners.get('console')(consoleMessage('http://127.0.0.1:4173/assets/vendor.js', `TypeError: Failed to fetch dynamically imported module: ${target}`));
  listeners.get('requestfailed')(request('http://127.0.0.1:4173/api', 'net::ERR_ABORTED'));
  listeners.get('console')(consoleMessage('http://127.0.0.1:4173/assets/Other.js', 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'));
  listeners.get('console')(consoleMessage(target, 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)'));
  assert.deepEqual(readHealthEvents(), [
    { kind: 'requestfailed', url: 'http://127.0.0.1:4173/api', detail: 'net::ERR_ABORTED' },
    { kind: 'console', url: 'http://127.0.0.1:4173/assets/Other.js', detail: 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)' },
    { kind: 'console', url: target, detail: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
  ]);
});

test('allows the exact prerequisite init helper without w1-m3 state', () => {
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    function fourSeasPrerequisiteFixture() {
      return { missions: { 'w1-m1': {}, 'w1-m2': {} }, sessions: {} }
    }
    async function installFourSeasPrerequisites(page) {
      await page.addInitScript(({ key, value }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value))
      }, { key: CURRENT_KEY, value: fourSeasPrerequisiteFixture() })
    }
    test.beforeEach(async ({ page }) => {
      healthEvents = []
      attachHealth(page)
      await installFourSeasPrerequisites(page)
    })
  `));
});

test('allows the exact standalone storage failure helper', () => {
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(`
    async function setFourSeasStorageFailureMode(page, mode) {
      await page.evaluate((value) => {
        localStorage.setItem('xiyou-test-storage-mode', value)
      }, mode)
    }
  `));
});

test('rejects CURRENT_KEY-indirect persistence writes inside evaluate', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const CURRENT_KEY = 'xiyou-programming-progress-v3'
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ missions: { 'w1-m3': { status: 'completed' } } }))
    }, CURRENT_KEY)
  `), /storage|inject|write/i);
});

test('rejects Object.assign progress injection inside evaluate', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => {
      Object.assign(progress.missions, { 'w1-m3': { status: 'completed' } })
    })
  `), /progress|inject|write/i);
});

test('does not accept a commented health attachment for an independent page', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const externalPage = await page.context().newPage()
    // attachHealth(externalPage)
    await externalPage.goto('./')
  `), /health/i);
});

test('rejects a localStorage object alias inside evaluate', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => {
      const storage = localStorage
      storage.setItem('xiyou-programming-progress-v3', '{}')
    })
  `), /evaluate|write|call/i);
});

test('rejects globalThis computed localStorage writes inside evaluate', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => {
      globalThis['localStorage'].setItem('xiyou-programming-progress-v3', '{}')
    })
  `), /evaluate|write|call/i);
});

test('rejects a progress missions alias assignment inside evaluate', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.evaluate(() => {
      const missions = progress.missions
      missions['w1-m3'] = { status: 'completed' }
    })
  `), /evaluate|write|assignment/i);
});

test('rejects addInitScript completion injection', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page.addInitScript(() => {
      localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify({
        missions: { 'w1-m3': { status: 'completed' } },
      }))
    })
  `), /addInitScript|allowlist|fixture/i);
});

test('rejects conditional health attachment in the page factory', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    function attachHealth(page) {}
    async function newHealthyPage(context) {
      const page = await context.newPage()
      if (false) attachHealth(page)
      return page
    }
  `), /factory|health/i);
});

test('rejects health attachment after page navigation', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    function attachHealth(page) {}
    async function newHealthyPage(context) {
      const page = await context.newPage()
      await page.goto('./')
      attachHealth(page)
      return page
    }
  `), /factory|health|navigation/i);
});

test('rejects a shadowed attachHealth parameter in another scope', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    function attachHealth(page) {}
    async function newHealthyPage(context) {
      const page = await context.newPage()
      ;((attachHealth) => attachHealth(page))(() => {})
      return page
    }
  `), /factory|health|shadow/i);
});

test('rejects an aliased evaluate method that writes progress', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const run = page.evaluate
    await run(() => {
      localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify({
        missions: { 'w1-m3': { status: 'completed' } },
      }))
    })
  `), /alias|evaluate|browser-context/i);
});

test('rejects a destructured evaluate alias invoked with call', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const { evaluate: run } = page
    await run.call(page, () => localStorage.setItem('xiyou-programming-progress-v3', '{}'))
  `), /alias|evaluate|browser-context|dynamic/i);
});

test('rejects evaluate aliases invoked through apply or bind', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const { evaluate: run } = page
    await run.apply(page, [() => localStorage.setItem('xiyou-programming-progress-v3', '{}')])
  `), /alias|evaluate|browser-context|dynamic/i);
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const run = page.evaluate.bind(page)
    await run(() => localStorage.setItem('xiyou-programming-progress-v3', '{}'))
  `), /alias|evaluate|browser-context|dynamic/i);
});

test('rejects an identifier-computed Page method call', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const method = 'evaluate'
    await page[method](() => localStorage.setItem('xiyou-programming-progress-v3', '{}'))
  `), /dynamic|element|browser-context|evaluate/i);
});

test('rejects a concatenated Page method call', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await page['eval' + 'uate'](() => localStorage.setItem('xiyou-programming-progress-v3', '{}'))
  `), /dynamic|element|browser-context|evaluate/i);
});

test('rejects Reflect.get browser method access', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    await Reflect.get(page, 'evaluate').call(page, () => {
      localStorage.setItem('xiyou-programming-progress-v3', '{}')
    })
  `), /Reflect|get|dynamic|browser-context/i);
});

test('rejects a computed newPage call from page.context', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    const method = 'newPage'
    const externalPage = await page.context()[method]()
  `), /dynamic|element|newPage|browser-context/i);
});

test('rejects a forged prerequisite else branch', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    function fourSeasPrerequisiteFixture() {
      return { missions: { 'w1-m1': {}, 'w1-m2': {} }, sessions: {} }
    }
    async function installFourSeasPrerequisites(page) {
      await page.addInitScript(({ key, value }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value))
        else localStorage.setItem(key, JSON.stringify({ missions: { 'w1-m3': forgedW1M3 } }))
      }, { key: CURRENT_KEY, value: fourSeasPrerequisiteFixture() })
    }
    test.beforeEach(async ({ page }) => {
      attachHealth(page)
      await installFourSeasPrerequisites(page)
    })
  `), /prerequisite|else|init|fixture/i);
});

test('rejects an empty attachHealth helper even when it is called', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    let healthEvents = []
    function attachHealth(page) {}
    test.beforeEach(async ({ page }) => {
      attachHealth(page)
    })
    test.afterEach(() => {
      expect(healthEvents.filter((event) => event.unexpected)).toEqual([])
    })
  `), /attachHealth|console|pageerror|requestfailed|health/i);
});

test('rejects an afterEach that negates the shared healthEvents empty assertion', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.beforeEach(async ({ page }) => {
      attachHealth(page)
    })
    test.afterEach(() => {
      expect(healthEvents).not.toEqual([])
    })
  `), /afterEach|healthEvents|empty|unexpected/i);
});

test('rejects a health assertion hidden behind an empty-length condition', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      if (healthEvents.length === 0) {
        expect(healthEvents.filter((event) => !expectedNavigationAbort(event))).toEqual([])
      }
    })
  `), /afterEach|healthEvents|unconditional|structure/i);
});

test('rejects a health filter that discards every event', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      expect(healthEvents.filter(() => false)).toEqual([])
    })
  `), /afterEach|filter|healthEvents|unexpected/i);
});

test('rejects resetting healthEvents before the empty assertion', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      healthEvents = []
      expect(healthEvents.filter((event) => !expectedNavigationAbort(event))).toEqual([])
    })
  `), /afterEach|reset|healthEvents|structure/i);
});

test('rejects listener callbacks whose healthEvents pushes are unreachable', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    let healthEvents = []
    function attachHealth(page) {
      page.on('console', (message) => {
        if (false) healthEvents.push({ kind: 'console', url: page.url(), detail: message.text() })
      })
      page.on('pageerror', (error) => {
        if (false) healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message })
      })
      page.on('requestfailed', (request) => {
        if (false) healthEvents.push({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' })
      })
    }
    function expectedNavigationAbort(event) {
      return event.kind === 'requestfailed' && (
        (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
        || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
        || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
      )
    }
    test.afterEach(() => {
      expect(healthEvents.filter((event) => !expectedNavigationAbort(event))).toEqual([])
    })
  `), /attachHealth|listener|console|pageerror|requestfailed|push/i);
});

test('rejects every intermediate healthEvents filter, map, or copy before the empty assertion', () => {
  const transformations = [
    'healthEvents.filter((event) => !expectedNavigationAbort(event))',
    'healthEvents.map((event) => event)',
    '[...healthEvents]',
  ];
  for (const transformation of transformations) {
    assert.throws(() => assertFourSeasE2ESourceContract(`
      ${validHealthCore}
      test.afterEach(() => {
        const unexpected = ${transformation}
        expect(unexpected, 'unexpected Four Seas browser health events').toEqual([])
      })
    `), /afterEach|healthEvents|direct|filter|structure/i);
  }
});

test('rejects resetting healthEvents in a test body after navigation', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    test('forged health', async ({ page }) => {
      await page.goto('./')
      healthEvents = []
    })
  `), /healthEvents|reset|navigation|mutation/i);
});

test('rejects resetting healthEvents in beforeEach after navigation', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    test.beforeEach(async ({ page }) => {
      attachHealth(page)
      await page.goto('./')
      healthEvents = []
    })
  `), /healthEvents|reset|navigation|beforeEach|mutation/i);
});

test('rejects direct, reflective, escaping, and aliased healthEvents mutations', () => {
  const mutations = [
    'healthEvents.length = 0',
    'healthEvents[0] = forgedEvent',
    'healthEvents.length += 1',
    'delete healthEvents[0]',
    'healthEvents.length++',
    'healthEvents.splice(0)',
    'healthEvents.pop()',
    'healthEvents.shift()',
    'healthEvents.unshift(forgedEvent)',
    'healthEvents.push(forgedEvent)',
    'healthEvents.clear()',
    'Object.assign(healthEvents, { length: 0 })',
    "Reflect.set(healthEvents, 'length', 0)",
    'const alias = healthEvents; alias.splice(0)',
    'consume(healthEvents)',
    'return healthEvents',
  ];
  for (const mutation of mutations) {
    assert.throws(() => assertFourSeasE2ESourceContract(`
      ${validHealthHarness}
      function mutateHealth() { ${mutation} }
    `), /healthEvents|mutation|alias|escape|write/i, mutation);
  }
});

test('rejects replacing expectedNavigationAbort in a test body', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    test('forged filter', () => {
      expectedNavigationAbort = () => true
    })
  `), /expectedNavigationAbort|mutation|alias|write/i);
});

test('rejects replacing the exact lazy failure predicate in a test body', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(`
    ${validHealthHarness}
    test('forged lazy filter', () => {
      expectedLazyChunkFailure = () => true
    })
  `), /expectedLazyChunkFailure|mutation|alias|write/i);
});

test('rejects a non-let healthEvents collection declaration', () => {
  assert.throws(() => assertFourSeasE2ESourceContract(
    validHealthHarness.replace('let healthEvents = []', 'const healthEvents = []'),
  ), /healthEvents|top-level|let|collection/i);
});

const dynamicExecutionCases = [
  ['direct eval', "eval('healthEvents = []')"],
  ['globalThis.eval', "globalThis.eval('healthEvents = []')"],
  ['window.eval', "window.eval('healthEvents = []')"],
  ['computed globalThis eval', "globalThis['eval']('healthEvents = []')"],
  ['computed globalThis eval alias', "const run = globalThis['eval']; run('healthEvents = []')"],
  ['indirect comma eval', "(0, eval)('healthEvents = []')"],
  ['eval.call', "eval.call(globalThis, 'healthEvents = []')"],
  ['eval.apply', "eval.apply(globalThis, ['healthEvents = []'])"],
  ['new Function', "new Function('healthEvents = []')()"],
  ['Function call', "Function('healthEvents = []')()"],
  ['string setTimeout', "setTimeout('healthEvents = []', 0)"],
  ['string setInterval', "setInterval('healthEvents = []', 0)"],
  ['eval alias', "const run = eval; run('healthEvents = []')"],
  ['global eval property alias', "const run = globalThis.eval; run('healthEvents = []')"],
  ['eval destructure alias', "const { eval: run } = globalThis; run('healthEvents = []')"],
  ['computed eval destructure alias', "const { ['eval']: run } = globalThis; run('healthEvents = []')"],
  ['dynamic-key eval destructure alias', "const key = 'eval'; const { [key]: run } = globalThis; run('healthEvents = []')"],
  ['Function alias', "const build = Function; build('healthEvents = []')()"],
  ['timer alias', "const later = setTimeout; later('healthEvents = []', 0)"],
];

for (const [name, dynamicCode] of dynamicExecutionCases) {
  test(`rejects dynamic E2E code execution through ${name}`, () => {
    assert.throws(() => assertFourSeasE2ESourceContract(`
      ${validHealthHarness}
      test('dynamic bypass', async ({ page }) => {
        await page.goto('./')
        ${dynamicCode}
      })
    `), /dynamic|eval|Function|timer|execution/i);
  });
}

const monkeypatchCases = [
  ...['Array', 'Object', 'Function'].flatMap((builtIn) => [
    [`Object.defineProperty ${builtIn}.prototype`, `Object.defineProperty(${builtIn}.prototype, 'filter', { value: () => [] })`],
    [`Object.defineProperties ${builtIn}.prototype`, `Object.defineProperties(${builtIn}.prototype, { filter: { value: () => [] } })`],
    [`Object.setPrototypeOf ${builtIn}.prototype`, `Object.setPrototypeOf(${builtIn}.prototype, forgedPrototype)`],
  ]),
  ['Reflect.defineProperty', "Reflect.defineProperty(Array.prototype, 'filter', { value: () => [] })"],
  ['Reflect.setPrototypeOf', 'Reflect.setPrototypeOf(Object.prototype, forgedPrototype)'],
  ['Reflect.deleteProperty', "Reflect.deleteProperty(Function.prototype, 'call')"],
  ['direct prototype assignment', 'Array.prototype.filter = () => []'],
  ['computed prototype assignment', "Object.prototype['toString'] = () => ''"],
  ['nested computed prototype assignment', "Function['prototype']['call'] = forgedCall"],
  ['prototype delete', 'delete Array.prototype.filter'],
  ['prototype update', 'Object.prototype.length++'],
  ['prototype assign', 'Object.assign(Array.prototype, { filter: () => [] })'],
  ['prototype mutation call', 'Array.prototype.push(forgedEvent)'],
  ['Object.assign alias', 'const assign = Object.assign; assign(Array.prototype, { filter: () => [] })'],
  ['Object.assign destructure', 'const { assign } = Object; assign(Array.prototype, { filter: () => [] })'],
  ['Object mutator alias', "const define = Object.defineProperty; define(Array.prototype, 'filter', { value: () => [] })"],
  ['Reflect mutator destructure', "const { defineProperty: define } = Reflect; define(Array.prototype, 'filter', { value: () => [] })"],
  ['computed Object mutator alias', "const define = Object['defineProperty']; define(Array.prototype, 'filter', { value: () => [] })"],
  ['computed Object mutator destructure', "const { ['defineProperty']: define } = Object; define(Array.prototype, 'filter', { value: () => [] })"],
  ['built-in alias prototype mutation', 'const builtIn = Array; builtIn.prototype.filter = () => []'],
  ...['expect', 'test', 'JSON', 'Object', 'Array', 'Reflect', 'localStorage'].map((globalName) => (
    [`${globalName} reassignment`, `${globalName} = forgedGlobal`]
  )),
];

for (const [name, monkeypatchCode] of monkeypatchCases) {
  test(`rejects E2E built-in monkeypatch through ${name}`, () => {
    assert.throws(() => assertFourSeasE2ESourceContract(`
      ${validHealthHarness}
      test('monkeypatch bypass', () => {
        ${monkeypatchCode}
      })
    `), /prototype|monkeypatch|built-in|mutation|define|Function/i);
  });
}

const reflectSetCases = [
  ['direct call on a prototype', "Reflect.set(Array.prototype, 'filter', () => [])"],
  ['computed call on an ordinary target', "Reflect['set']({}, 'forged', true)"],
  ['alias on an ordinary target', "const set = Reflect.set; set({}, 'forged', true)"],
  ['destructure on an ordinary target', "const { set } = Reflect; set({}, 'forged', true)"],
  ['call indirection on an ordinary target', "Reflect.set.call(null, {}, 'forged', true)"],
  ['apply indirection on an ordinary target', "Reflect.set.apply(null, [{}, 'forged', true])"],
  ['bind indirection on an ordinary target', "const set = Reflect.set.bind(null); set({}, 'forged', true)"],
];

for (const [name, reflectSetCode] of reflectSetCases) {
  test(`rejects E2E Reflect.set through ${name}`, () => {
    assert.throws(() => assertFourSeasE2ESourceContract(`
      ${validHealthHarness}
      test('Reflect.set bypass', () => {
        ${reflectSetCode}
      })
    `), /Reflect\.set|mutation|write|monkeypatch/i);
  });
}

test('allows locator geometry evaluate and Node-side map', () => {
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(`
    const rect = await page.locator('.cell').evaluate((element) => element.getBoundingClientRect())
    const dimensions = [rect.width, rect.height].map((value) => Math.round(value))
  `));
});

test('keeps both formal Phaser scene roots bounded and browser cold gates shared', () => {
  const budgetSource = readFileSync(new URL('./budget-limits.mjs', import.meta.url), 'utf8');
  const bundleSource = readFileSync(new URL('./check-bundle-budget.mjs', import.meta.url), 'utf8');
  const staffE2eSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(budgetSource, /RUYI_STAFF_COLD_BYTES\s*=\s*RUYI_STAFF_COLD_LOAD_MAX_BYTES/);
  assert.match(bundleSource, /src\/components\/RuyiStaffScene\.tsx/);
  assert.match(staffE2eSource, /from '\.\.\/scripts\/budget-limits\.mjs'/);
  assert.match(staffE2eSource, /'cache-control':\s*'no-store'/);
  assert.match(staffE2eSource, /page\.on\('requestfailed'/);
  assert.match(staffE2eSource, /const status = response\.status\(\)/);
  assert.doesNotMatch(staffE2eSource, /url\.origin\s*!==/);
});

test('counts every Four Seas cold HTTP response instance without URL deduplication', () => {
  const source = readFileSync(new URL('../e2e/four-seas-regalia-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /new Map<string, number>\(\)|unique\.values\(\)/);
  assert.match(source, /responses\.reduce\(\(sum, response\) => sum \+ response\.bytes, 0\)/);
});

test('captures every HTTP error response and exempts only the exact active lazy chunk 503', () => {
  const runtime = loadHealthRuntimeFromTypeScriptSource(validHealthCore);
  const listeners = new Map();
  const page = { on: (name, listener) => listeners.set(name, listener), url: () => 'http://app.test/' };
  runtime.attachHealth(page);
  const response = listeners.get('response');
  assert.equal(typeof response, 'function');
  const makeResponse = (url, status) => ({ url: () => url, status: () => status });
  const target = 'http://app.test/assets/lazy.js';
  runtime.setExpectedChunkFailureUrl(target);
  response(makeResponse(target, 503));
  assert.deepEqual(runtime.readHealthEvents(), []);
  response(makeResponse(target, 500));
  response(makeResponse('http://app.test/assets/unknown.js', 503));
  assert.deepEqual(runtime.readHealthEvents().map(({ kind, url, status }) => ({ kind, url, status })), [
    { kind: 'response', url: target, status: 500 },
    { kind: 'response', url: 'http://app.test/assets/unknown.js', status: 503 },
  ]);
});

test('attaches unified browser-health capture to every independently created Ruyi page', () => {
  const staffE2eSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(staffE2eSource, /attachStaffHealth\(page\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(mapPage\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(externalPage\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(mutedPage\)/);
});

test('Ruyi health captures every HTTP error and exempts only the exact active 503 target', () => {
  const staffE2eSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  const runtime = loadStaffHealthRuntimeFromTypeScriptSource(staffE2eSource);
  const listeners = new Map();
  runtime.attachStaffHealth({ on: (name, listener) => listeners.set(name, listener), url: () => 'http://app.test/' });
  const response = listeners.get('response');
  assert.equal(typeof response, 'function');
  const makeResponse = (url, status) => ({ url: () => url, status: () => status });
  const target = 'http://app.test/assets/dragon-palace/sabre.webp';
  response(makeResponse(target, 503));
  response(makeResponse(target, 500));
  response(makeResponse(target, 404));
  response(makeResponse('http://app.test/assets/unknown.js', 503));
  const unexpected = runtime.readHealthEvents().filter((event) => !runtime.isExactInjectedChunkFailure(event, target));
  assert.deepEqual(unexpected.map(({ kind, url, status }) => ({ kind, url, status })), [
    { kind: 'response', url: target, status: 500 },
    { kind: 'response', url: target, status: 404 },
    { kind: 'response', url: 'http://app.test/assets/unknown.js', status: 503 },
  ]);
});

test('keeps E2E fault builds isolated from the production deployment directory', () => {
  const viteSource = readFileSync(new URL('../vite.config.mjs', import.meta.url), 'utf8');
  const playwrightSource = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const packageSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  const ignoreSource = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  const deploySource = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  assert.match(viteSource, /outDir:\s*e2eStorageFaults\s*\?\s*['"]dist-e2e['"]\s*:\s*['"]dist['"]/);
  assert.match(packageSource, /"build:e2e":\s*"XIYOU_E2E_STORAGE_FAULTS=1 vite build"/);
  assert.match(playwrightSource, /npm run build:e2e/);
  assert.match(playwrightSource, /vite preview --outDir dist-e2e|npm run preview -- --outDir dist-e2e/);
  assert.match(ignoreSource, /^dist-e2e\/$/m);
  assert.match(deploySource, /path:\s*dist\b/);
  assert.doesNotMatch(deploySource, /dist-e2e/);
  assert.match(packageSource, /"verify:bundle":\s*"npm run test:bundle-script && npm run build && node scripts\/check-bundle-budget\.mjs"/);
});

test('forbids evaluate-injected completion in the external Ruyi browser scenario', () => {
  const staffE2eSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  const externalScenario = staffE2eSource.match(/test\('@staff-storage external one-star[\s\S]*?\n\}\)\n\ntest\('@staff-parity/)?.[0];
  assert.ok(externalScenario, 'external one-star scenario must remain present');
  assert.doesNotMatch(externalScenario, /progress\.missions\[['"]w1-m2['"]\]\s*=/);
  assert.doesNotMatch(externalScenario, /\.evaluate\([\s\S]*?localStorage\.setItem\(/);
  assert.match(externalScenario, /page\.context\(\)\.newPage\(\)/);
  assert.match(externalScenario, /completeCorrectProgram\(externalPage\)/);
});

test('keeps Dragon Palace budgets in one shared module', () => {
  const budgetSource = readFileSync(new URL('./budget-limits.mjs', import.meta.url), 'utf8');
  const bundleSource = readFileSync(new URL('./check-bundle-budget.mjs', import.meta.url), 'utf8');
  const e2eSource = readFileSync(new URL('../e2e/dragon-palace-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(budgetSource, /DRAGON_PALACE_COLD_BYTES\s*=\s*DRAGON_PALACE_COLD_LOAD_MAX_BYTES/);
  assert.match(bundleSource, /from '\.\/budget-limits\.mjs'/);
  assert.match(e2eSource, /from '\.\.\/scripts\/budget-limits\.mjs'/);
  assert.doesNotMatch(e2eSource, /const COLD_BYTES_LIMIT/);
});

test('requires the browser cold gate to fail closed for every HTTP response', () => {
  const configSource = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const e2eSource = readFileSync(new URL('../e2e/dragon-palace-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(configSource, /serviceWorkers:\s*'block'/);
  assert.match(e2eSource, /'cache-control':\s*'no-store'/);
  assert.match(e2eSource, /page\.on\('requestfailed'/);
  assert.match(e2eSource, /const status = response\.status\(\)/);
  assert.doesNotMatch(e2eSource, /url\.origin\s*!==/);
});

test('keeps the browser matrix at the five approved projects', () => {
  const configSource = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  assert.equal([...configSource.matchAll(/\bname:\s*'/g)].length, 5);
  assert.doesNotMatch(configSource, /visual-chromium/);
  assert.match(configSource, /desktop-chromium-1440x1024'[\s\S]*?grep:\s*\/.*@visual/);
});

test('assigns the Four Seas browser evidence tags honestly across the five projects', () => {
  const configSource = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const project = (name) => configSource.match(new RegExp(`name: '${name}'[\\s\\S]*?grep: \\/([^\\n]+)\\/`))?.[1] ?? '';
  const desktop = project('desktop-chromium-1440x1024');
  const tablet = project('tablet-webkit-768x1024');
  const mobile = project('mobile-chromium-390x844');
  const firefox = project('desktop-firefox-1440x1024');
  const narrow = project('narrow-chromium-320x844');
  for (const tag of ['@regalia-full', '@regalia-storage', '@regalia-keyboard', '@regalia-parity', '@regalia-external', '@regalia-corrupt', '@regalia-cold', '@regalia-parent', '@regalia-lazy', '@visual']) assert.match(desktop, new RegExp(tag));
  for (const tag of ['@regalia-full', '@regalia-parity', '@regalia-corrupt', '@regalia-cold']) assert.match(tablet, new RegExp(tag));
  for (const tag of ['@regalia-full', '@regalia-parity', '@regalia-cold', '@regalia-narrow']) assert.match(mobile, new RegExp(tag));
  for (const tag of ['@regalia-full', '@regalia-keyboard', '@regalia-corrupt', '@regalia-cold']) assert.match(firefox, new RegExp(tag));
  for (const tag of ['@regalia-full', '@regalia-narrow', '@regalia-cold']) assert.match(narrow, new RegExp(tag));
});

test('fails an entry static closure over 180 KiB gzip', () => {
  assert.throws(() => analyzeManifest(base, { 'assets/main.js': 100 * 1024, 'assets/vendor.js': 81 * 1024 }), /180 KiB/);
});

test('fails when Phaser appears in the static closure', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['node_modules/phaser/index.js'] }, 'node_modules/phaser/index.js': { file: 'assets/runtime.js', imports: [] } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/runtime.js': 1 }), /Phaser.*static/i);
});

test('allows Phaser as a bounded dynamic chunk', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', isDynamicEntry: true, imports: ['phaser-runtime.js'] }, 'phaser-runtime.js': { file: 'assets/phaser.js', name: 'phaser', imports: [] } };
  assert.equal(analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/phaser.js': 100 }, { 'assets/scene.js': 1, 'assets/phaser.js': 1000 }).entryGzipBytes, 2);
});

test('allows a separately bounded RuyiStaffScene Phaser closure', () => {
  const manifest = { ...base, 'src/components/RuyiStaffScene.tsx': { file: 'assets/staff-scene.js', isDynamicEntry: true, imports: ['phaser-runtime.js'] }, 'phaser-runtime.js': { file: 'assets/phaser.js', name: 'phaser', imports: [] } };
  const result = analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/staff-scene.js': 1, 'assets/phaser.js': 100 }, { 'assets/staff-scene.js': 1, 'assets/phaser.js': 1000 });
  assert.equal(result.closures['src/components/RuyiStaffScene.tsx'].rawBytes, 1001);
});

test('deduplicates shared static imports', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['a.js', 'b.js'] }, 'a.js': { file: 'assets/a.js', imports: ['shared.js'] }, 'b.js': { file: 'assets/b.js', imports: ['shared.js'] }, 'shared.js': { file: 'assets/shared.js', imports: [] } };
  const result = analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/a.js': 2, 'assets/b.js': 4, 'assets/shared.js': 8 });
  assert.equal(result.entryGzipBytes, 15);
});

test('deduplicates aliases that emit the same file', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['a.js', 'alias.js'] }, 'a.js': { file: 'assets/shared.js', imports: [] }, 'alias.js': { file: 'assets/shared.js', imports: [] } };
  assert.equal(analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/shared.js': 8 }).entryGzipBytes, 9);
});

test('rejects a non-entry chunk that statically imports the application entry', () => {
  const manifest = {
    ...base,
    'src/main.tsx': { ...base['src/main.tsx'], dynamicImports: ['lazy.js'] },
    'lazy.js': { file: 'assets/lazy.js', isDynamicEntry: true, imports: ['src/main.tsx'] },
  };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/lazy.js': 1 };
  assert.throws(() => analyzeManifest(manifest, sizes, sizes), /non-entry.*application entry|application entry.*non-entry/i);
});

test('rejects static and mixed static-dynamic manifest dependency cycles', () => {
  const staticCycle = {
    ...base,
    'src/main.tsx': { ...base['src/main.tsx'], imports: ['a.js'] },
    'a.js': { file: 'assets/a.js', imports: ['b.js'] },
    'b.js': { file: 'assets/b.js', imports: ['a.js'] },
  };
  const staticSizes = Object.fromEntries(Object.values(staticCycle).map((chunk) => [chunk.file, 1]));
  assert.throws(() => analyzeManifest(staticCycle, staticSizes, staticSizes), /cycle/i);

  const mixedCycle = {
    ...base,
    'src/main.tsx': { ...base['src/main.tsx'], imports: ['app-core.js'] },
    'app-core.js': { file: 'assets/app-core.js', dynamicImports: ['coordinator.js'] },
    'coordinator.js': { file: 'assets/coordinator.js', isDynamicEntry: true, imports: ['app-core.js'] },
  };
  const mixedSizes = Object.fromEntries(Object.values(mixedCycle).map((chunk) => [chunk.file, 1]));
  assert.throws(() => analyzeManifest(mixedCycle, mixedSizes, mixedSizes), /cycle/i);
});

test('detects Phaser provenance even when output is renamed', () => {
  const manifest = { ...base, 'vendor.js': { file: 'assets/vendor.js', src: 'node_modules/phaser/src/phaser.js', imports: [] } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1 }), /Phaser.*static/i);
});

test('rejects unsafe manifest file paths', () => {
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '../escape.js', imports: [] } }, { '../escape.js': 1 }), /unsafe/i);
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '/tmp/escape.js', imports: [] } }, { '/tmp/escape.js': 1 }), /unsafe/i);
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '..\\escape.js', imports: [] } }, { '..\\escape.js': 1 }), /unsafe/i);
});

test('fails an oversized dynamic Phaser source with a renamed output', () => {
  const manifest = { ...base, 'node_modules/phaser/src/phaser.js': { file: 'assets/runtime.js', src: 'node_modules/phaser/src/phaser.js', isDynamicEntry: true } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/runtime.js': 1 }, { 'assets/runtime.js': 1600 * 1024 + 1 }), /1600 KiB/);
});

test('rejects Phaser from non-scene mode closures', () => {
  const manifest = {
    ...base,
    'src/components/BlocklyWorkspace.tsx': { file: 'assets/blockly.js', imports: ['node_modules/phaser/index.js'] },
    'src/components/PythonEditor.tsx': { file: 'assets/python.js', imports: [] },
    'src/components/AiLab.tsx': { file: 'assets/ai.js', imports: [] },
    'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['node_modules/phaser/index.js'] },
    'node_modules/phaser/index.js': { file: 'assets/runtime.js', src: 'node_modules/phaser/index.js', imports: [] },
  };
  assert.throws(() => analyzeManifest(manifest, Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1])), Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]))), /BlocklyWorkspace.*Phaser/);
});

test('rejects nested dependency cycles before runtime closure analysis', () => {
  const manifest = {
    ...base,
    'src/components/BlocklyWorkspace.tsx': { file: 'assets/blockly.js', dynamicImports: ['helper.js'] },
    'helper.js': { file: 'assets/helper.js', dynamicImports: ['node_modules/phaser/runtime.js'] },
    'node_modules/phaser/runtime.js': { file: 'assets/renamed.js', src: 'node_modules/phaser/runtime.js', imports: ['helper.js'] },
  };
  const sizes = Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]));
  assert.throws(() => analyzeManifest(manifest, sizes, sizes), /cycle/i);
});

test('counts nested GameScene dynamic Phaser and enforces its raw limit', () => {
  const manifest = {
    ...base,
    'src/components/GameScene.tsx': { file: 'assets/scene.js', dynamicImports: ['helper.js'] },
    'helper.js': { file: 'assets/helper.js', dynamicImports: ['node_modules/phaser/runtime.js'] },
    'node_modules/phaser/runtime.js': { file: 'assets/renamed.js', src: 'node_modules/phaser/runtime.js', imports: [] },
  };
  const gzip = Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]));
  const raw = { ...gzip, 'assets/renamed.js': 1600 * 1024 + 1 };
  assert.throws(() => analyzeManifest(manifest, gzip, raw), /1600 KiB/);
});

test('identifies real Vite Phaser manifest entries by name', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['_phaser.js'] }, '_phaser.js': { file: 'assets/vendor-x.js', name: 'phaser', imports: [] } };
  const gzip = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/vendor-x.js': 1 };
  assert.throws(() => analyzeManifest(manifest, gzip, { ...gzip, 'assets/vendor-x.js': 99_999_999 }), /1600 KiB/);
});

test('fails when GameScene dependency cannot be identified as Phaser', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['_vendor.js'] }, '_vendor.js': { file: 'assets/vendor-x.js', imports: [] } };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/vendor-x.js': 700_000 };
  assert.throws(() => analyzeManifest(manifest, sizes, sizes), /无法识别Phaser预算对象/);
});

test('rejects non-shipping visual source formats from the public directory', () => {
  assert.throws(() => assertNoSourceVisualAssets(['assets/world-map.jpg', 'assets/world-map.png']), /world-map\.png/);
  assert.throws(() => assertNoSourceVisualAssets(['assets/mentor.avif']), /mentor\.avif/);
  assert.doesNotThrow(() => assertNoSourceVisualAssets(['assets/world-map.jpg', 'assets/audio/welcome.m4a']));
});

test('rejects every E2E storage fault sentinel from production bundle bytes', () => {
  assert.equal(typeof assertNoProductionTestSentinels, 'function');
  const clean = new Map([
    ['assets/app.js', Buffer.from('normal production bundle')],
    ['assets/worker.js', Buffer.from('safe worker')],
  ]);
  assert.doesNotThrow(() => assertNoProductionTestSentinels(clean));
  for (const sentinel of [
    'xiyou-test-storage-mode',
    'corrupt-regalia-current',
    'fail-regalia-draft',
    'fail-regalia-session',
    'fail-regalia-completion',
    '四海披挂测试存储故障',
    'corrupt-bajie-current',
    'fail-bajie-draft',
    'fail-bajie-run',
    'fail-bajie-observation',
    'fail-bajie-completion',
  ]) {
    assert.throws(
      () => assertNoProductionTestSentinels(new Map([['assets/app.js', Buffer.from(`prefix ${sentinel} suffix`)]])),
      /test sentinel|storage fault/i,
    );
  }
});
