# W1-M3 Security Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use model-squad with Terra as the only product-file writer. Do not spawn additional agents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the already verified `w1-m3 四海披挂` branch into the current local website and remove the four current high-severity npm audit findings without changing gameplay rules, budgets, assets, or deployment state.

**Architecture:** Fast-forward the current branch to the clean, linearly descended `codex/w1-m3-playable` commit so the verified 47-commit feature history remains intact. Then apply a lockfile-focused patch upgrade for React Router, PostCSS, and NanoID, followed by static, asset, performance, security, and five-project browser verification. Keep all changes local; commit only after explicit user approval, and do not push or deploy.

**Tech Stack:** React 19, React Router 7, Vite 6, TypeScript, Vitest, Blockly, Phaser, Playwright, npm lockfile v3.

---

### Task 1: Preserve the pre-integration recovery point

**Files:**
- Inspect: repository refs and worktree status
- Modify: local Git refs only

- [x] Confirm the current worktree is clean at `f19ff2968888c82f88a451db844e5552f7bc3798` and `codex/w1-m3-playable` is clean at `4ddeaba851019023f7eddf1da5a897308aec3f26`.
- [x] Confirm `f19ff29` is an ancestor of `4ddeaba` and preserve `f19ff29` as local branch `codex/pre-w1-m3-security-20260819`.
- [x] Record the existing `stash@{0}` object hash and do not apply, drop, rewrite, or clear it.

### Task 2: Integrate the verified third level without rewriting history

**Files:**
- Integrate: the existing 47 commits from `codex/w1-m3-playable`

- [x] Run `git merge --ff-only codex/w1-m3-playable` from `codex/xiyou-programming`.
- [x] Verify HEAD equals `4ddeaba851019023f7eddf1da5a897308aec3f26` and the working tree remains clean.
- [x] Run `npm test`, `npm run typecheck`, `npm run verify:assets`, and `npm run verify:bundle` as the integrated baseline.

### Task 3: Reproduce and minimally repair the dependency findings

**Files:**
- Inspect: `package.json`
- Modify: `package-lock.json`

- [x] RED: run `npm audit --registry=https://registry.npmjs.org --audit-level=high` and confirm the existing four high findings for `react-router`, `react-router-dom`, `postcss`, and `nanoid`.
- [x] Preserve the compatible direct range `react-router-dom: ^7.18.1`; update its locked resolution from `7.18.1` to `7.18.2`.
- [x] Keep `react-router` transitive at `7.18.2`; do not migrate imports or upgrade to v8.
- [x] Resolve Vite's transitive PostCSS and NanoID to safe compatible patch versions (`postcss 8.5.26`, `nanoid 3.3.18`) in the lockfile without promoting them to direct dependencies or adding overrides.
- [x] Rebuild the lockfile with lifecycle scripts disabled, then install exactly from the lockfile.
- [x] GREEN: run `npm ls react-router-dom react-router postcss nanoid vite --all` and the official-registry audit; require zero high or critical findings and no invalid dependency tree.

### Task 3A: Stabilize the integrated unit-test scheduler if the baseline exposes resource starvation

**Files:**
- Modify: `vite.config.mjs`
- Modify only observed asynchronous boundaries: `src/App.test.tsx`

- [x] Preserve the two observed RED cases: the lazy Dragon Palace workspace exceeded Testing Library's default 1-second query wait, and the second persisted run exceeded the default 1-second `waitFor` only under full-suite load.
- [x] Keep the observed 5-second waits local to those two assertions; do not bulk-increase global assertion timeouts.
- [x] Cap Vitest at two workers with `test.maxWorkers: 2`; the diagnostic command `npx vitest run --maxWorkers=2` must pass all 761 tests before this setting is written.
- [x] Run the normal `npm test` command twice after writing the setting; both runs must pass before dependency repair continues.

### Task 4: Verify the complete three-level product state

**Files:**
- Verify: all source, test, asset, configuration, and generated production-build paths

- [x] Run `npm test` and require the integrated unit, bundle/source-contract, and asset suites to pass.
- [x] Run `npm run typecheck`.
- [x] Run `npm run verify:assets` and preserve all eight approved Dragon Palace asset records and hashes.
- [x] Run `npm run verify:bundle`; do not raise the entry, homepage, Phaser, scene, or cold-load budgets.
- [x] Run `npx playwright test --list --reporter=list` and require 141 tests across five configured projects.
- [x] Run `npm run test:e2e` and require 141/141 with no failures or skips.
- [x] Re-run `npm run verify:bundle` after E2E so `dist` is a normal production build, then confirm `dist-e2e` is absent and no storage-fault sentinel is present.
- [x] Run `git diff --check`, inspect the final diff, and confirm no product source, asset, budget, or product-rule files changed after `4ddeaba`; allowed changes are this plan, two observed test waits, the two-worker Vitest cap, and dependency metadata.

### Task 5: Report the strict completion boundary

**Files:**
- Report only; do not commit, push, or deploy

- [x] Report `w1-m1`, `w1-m2`, and `w1-m3` separately as `One-level playable` only if all fresh evidence passes.
- [x] Report the remaining 27 levels, complete growth/reward/equipment/divine-beast/companion/battle systems, public deployment, and whole site as `not complete`.
- [x] Include the dependency versions, audit result, static counts, browser count, budget evidence, preserved recovery branch, unchanged stash, and local-only state.
