import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { arch, platform, release } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Conservative whole-project inputs. No dependency-graph guesses or automatic test skipping.
export function fingerprint(root, env = process.env) {
  const hash = createHash('sha256');
  const add = (name, value) => hash.update(JSON.stringify([name, value]));
  const walk = (relative) => {
    const path = join(root, relative);
    if (!existsSync(path)) { add(relative, null); return; }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() && !stat.isFile()) {
      // Follow file links, but never silently omit source directories linked elsewhere.
      const target = realpathSync(path);
      if (lstatSync(target).isDirectory()) throw new Error(`Unsupported source directory symlink: ${relative}`);
    }
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) walk(`${relative}/${name}`);
    } else add(relative, createHash('sha256').update(readFileSync(path)).digest('hex'));
  };
  add('format', 1);
  add('root', realpathSync(root));
  add('runtime', [process.version, platform(), arch(), release()]);
  add('head', spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim() ?? '');
  add('environment', Object.entries(env).filter(([key]) => /^(CI|NODE_ENV|NODE_OPTIONS|TZ|LANG|PLAYWRIGHT_.*|XIYOU_.*)$/.test(key)).sort(([a], [b]) => a.localeCompare(b)));
  for (const dir of ['src', 'e2e', 'scripts', 'public', 'docs/assets', '.github']) walk(dir);
  for (const name of readdirSync(root).sort()) {
    if (/\.(?:[cm]?js|ts|json|html|lock|toml)$/.test(name) || /^\.env(?:\.|$)|^\.npmrc$/.test(name)) walk(name);
  }
  walk('node_modules/.package-lock.json');
  return hash.digest('hex');
}

export function runVerification(root, command) {
  if (!command.length) throw new Error('A validation command is required after --.');
  const before = fingerprint(root);
  const directory = join(root, 'artifacts/verification', `${Date.now()}-${randomUUID().slice(0, 8)}`);
  mkdirSync(directory, { recursive: true });
  const log = join(directory, 'output.log');
  const path = join(directory, 'evidence.json');
  const fd = openSync(log, 'wx');
  const started = Date.now();
  let result;
  try { result = spawnSync(command[0], command.slice(1), { cwd: root, stdio: ['ignore', fd, fd], env: process.env }); }
  finally { closeSync(fd); }
  const after = fingerprint(root);
  const record = {
    version: 1, root: realpathSync(root), command, log,
    startedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started,
    exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
    before, after, reusable: result.status === 0 && before === after,
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  return { path, record };
}

export function checkEvidence(root, path) {
  const record = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const reusable = record.version === 1 && record.root === realpathSync(root)
    && record.reusable === true && record.exitCode === 0 && record.before === record.after
    && record.after === fingerprint(root) && typeof record.log === 'string' && existsSync(record.log);
  return { reusable, command: record.command, log: record.log,
    reason: reusable ? 'Same recorded inputs; assess whether this command covers the present claim.' : 'Missing, failed or changed evidence; do not reuse.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const [mode, ...args] = process.argv.slice(2);
  try {
    if (mode === 'run' && args[0] === '--') {
      const { path, record } = runVerification(root, args.slice(1));
      console.log(JSON.stringify({ evidence: path, log: record.log, exitCode: record.exitCode, elapsedMs: record.elapsedMs, reusable: record.reusable }, null, 2));
      process.exitCode = record.reusable ? 0 : 1;
    } else if (mode === 'check' && args.length === 1) {
      const result = checkEvidence(root, args[0]);
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.reusable ? 0 : 1;
    } else {
      console.log('node scripts/verification-evidence.mjs run -- <validation command> [args...]\nnode scripts/verification-evidence.mjs check <evidence.json>');
      process.exitCode = mode ? 1 : 0;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
