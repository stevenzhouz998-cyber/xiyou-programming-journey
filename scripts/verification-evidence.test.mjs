import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprint, runVerification, checkEvidence } from './verification-evidence.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'xiyou-evidence-test-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/example.ts'), 'export const answer = 1;');
  writeFileSync(join(root, 'package-lock.json'), '{}');
  return root;
}

test('source, new source, lockfile and environment changes invalidate evidence', () => {
  const root = fixture();
  let previous = fingerprint(root, {});
  for (const [file, value] of [['src/example.ts', 'changed'], ['src/new.ts', 'new'], ['package-lock.json', '{"version":2}']]) {
    writeFileSync(join(root, file), value);
    const current = fingerprint(root, {});
    assert.notEqual(current, previous);
    previous = current;
  }
  assert.notEqual(fingerprint(root, {}), fingerprint(root, { XIYOU_E2E_STORAGE_FAULTS: '1' }));
});

test('generated reports and prose do not invalidate code evidence', () => {
  const root = fixture();
  const before = fingerprint(root);
  mkdirSync(join(root, 'test-results'));
  writeFileSync(join(root, 'test-results/run.json'), 'report');
  writeFileSync(join(root, 'AGENTS.md'), 'changed instructions');
  assert.equal(fingerprint(root), before);
});

test('records a real command, saves its log and rejects later source drift', () => {
  const root = fixture();
  const result = runVerification(root, [process.execPath, '-e', 'console.log("actual output")']);
  assert.equal(result.record.reusable, true);
  assert.equal(checkEvidence(root, result.path).reusable, true);
  assert.match(readFileSync(result.record.log, 'utf8'), /actual output/);
  writeFileSync(join(root, 'src/example.ts'), 'changed');
  assert.equal(checkEvidence(root, result.path).reusable, false);
});

test('failed or missing commands never produce reusable evidence', () => {
  const root = fixture();
  for (const command of [[process.execPath, '-e', 'process.exit(3)'], ['xiyou-command-does-not-exist']]) {
    const result = runVerification(root, command);
    assert.equal(result.record.reusable, false);
    assert.equal(checkEvidence(root, result.path).reusable, false);
  }
});

test('a command changing source during validation cannot certify the new state', () => {
  const root = fixture();
  const result = runVerification(root, [process.execPath, '-e', 'require("node:fs").writeFileSync("src/example.ts", "changed during run")']);
  assert.equal(result.record.exitCode, 0);
  assert.equal(result.record.reusable, false);
  assert.equal(checkEvidence(root, result.path).reusable, false);
});
