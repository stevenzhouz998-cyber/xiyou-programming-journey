import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as bundleBudget from './check-bundle-budget.mjs';
import { assertFourSeasE2ESourceContract } from './check-four-seas-e2e-contract.mjs';

const { analyzeManifest, assertNoSourceVisualAssets } = bundleBudget;

const base = {
  'src/main.tsx': { file: 'assets/main.js', isEntry: true, imports: ['vendor.js'] },
  'vendor.js': { file: 'assets/vendor.js', imports: [] },
};

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

const validHealthCore = `
  let healthEvents = []
  function attachHealth(page) {
    page.on('console', (message) => {
      if (message.type() === 'error') healthEvents.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() })
    })
    page.on('pageerror', (error) => healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }))
    page.on('requestfailed', (request) => healthEvents.push({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }))
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
    expect(healthEvents.filter((event) => !expectedNavigationAbort(event)), 'unexpected Four Seas browser health events').toEqual([])
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

test('exports the fixed Dragon Palace cold-load and raster budgets', () => {
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_LOAD_MAX_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.RUYI_STAFF_COLD_LOAD_MAX_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.FOUR_SEAS_COLD_LOAD_MAX_BYTES, 2.75 * 1024 * 1024);
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.RUYI_STAFF_COLD_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.DRAGON_PALACE_MEDIA_BYTES, 1.25 * 1024 * 1024);
  assert.equal(bundleBudget.SINGLE_RASTER_BYTES, 512 * 1024);
});

test('keeps the Four Seas E2E AST contract isolated from bundle analysis', () => {
  const source = readFileSync(new URL('./check-bundle-budget.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /check-four-seas-e2e-contract|typescript|ts\.createSourceFile/);
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

test('keeps the actual navigation-abort filter pure and narrow for synthetic health events', () => {
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
  assert.deepEqual(events, snapshots, 'the filter must not mutate synthetic health events');
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

test('allows one top-level unexpected healthEvents filter before the empty assertion', () => {
  assert.doesNotThrow(() => assertFourSeasE2ESourceContract(`
    ${validHealthCore}
    test.afterEach(() => {
      const unexpected = healthEvents.filter((event) => !expectedNavigationAbort(event))
      expect(unexpected, 'unexpected Four Seas browser health events').toEqual([])
    })
  `));
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

test('attaches unified browser-health capture to every independently created Ruyi page', () => {
  const staffE2eSource = readFileSync(new URL('../e2e/ruyi-staff-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(staffE2eSource, /attachStaffHealth\(page\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(mapPage\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(externalPage\)/);
  assert.match(staffE2eSource, /attachStaffHealth\(mutedPage\)/);
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
