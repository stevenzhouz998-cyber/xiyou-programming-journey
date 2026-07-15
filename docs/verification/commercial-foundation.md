# Commercial foundation browser verification

## Current verified evidence — 2026-07-15

- Tested implementation commit: `37c470b`; the commit containing this document is evidence-only and does not change product behavior.
- Runner: Playwright 1.55.1 against a local release-like Vite 6.4.3 preview, with no HTTP compression.
- Browser projects: desktop Chromium 1440×1024, tablet WebKit 768×1024, touch Chromium 390×844, desktop Firefox 1440×1024, and narrow touch Chromium 320×844.
- Result: 76/76 Playwright scenarios passed with no skipped project in 4.3 minutes.
- Non-browser gates: 442/442 Vitest tests, 18/18 bundle-script tests, 26/26 asset-manifest tests, TypeScript `--noEmit`, and `git diff --check` passed.

The audited application paths for progress save, import, destructive clear, load repair, and legacy Blockly-workspace cleanup now use the same persisted monotonic revision contract. When `navigator.locks` is available, each transaction runs under the same named Web Lock. When it is missing or its request rejects, writes fail closed as `unsaved`/`unchanged`; the application never reports an unsafe fallback write as saved. A stale tab is rejected before mutation, keeps its draft in memory, and exposes explicit backup and rebase actions. Generic retry cannot overwrite a conflict.

Dynamic storage-chunk and lock-request rejection leave `pending`, expose the error, and preserve sensitive state until its owning flow succeeds. Parent credentials, privacy acknowledgement, import, and clear do not offer a misleading generic retry. Direct CAS conflict renders backup/rebase recovery even when no `storage` event arrives. Two independent Chromium pages with Web Locks disabled both reported unsaved while revision and stored settings remained unchanged.

Legacy Blockly migration no longer deletes `xiyou-workspace-*` from the component after a separate save. The V3 current/snapshot write, legacy-key deletion and read-back, and revision increment are one coordinated transaction. A cleanup failure rolls the V3 write and legacy bytes back, and a concurrent clear using the same expected revision loses with an explicit conflict. Deterministic tests cover both cases. The product-code scan found no direct `localStorage.setItem`, `localStorage.removeItem`, or `localStorage.clear` call outside the storage transaction modules.

Clear writes a fresh initial V3 and deletes then reads back every captured V3 snapshot/corrupt key, V2 current/snapshot/corrupt key, V1 current, all `xiyou-workspace-*` keys, and revision metadata. Any write, delete, or read-back failure either rolls all captured bytes back or reports that storage may have changed; it is not presented as success.

### Commands and current metrics

```text
npm test
npm run typecheck
npm run verify:bundle
npm run test:e2e -- --reporter=list
git diff --check
```

- Homepage entry static JS: 106.3 KiB gzip / 180 KiB budget.
- Conservative homepage total: 416.1 KiB / 650 KiB budget.
- Approved lazy Phaser chunk: 1,168.4 KiB raw / 1,600 KiB ceiling.
- GameScene closure: 1,505.8 KiB raw / 431.4 KiB gzip.
- Blockly workspace closure: 1,041.8 KiB raw / 302.8 KiB gzip.
- Python editor closure: 696.1 KiB raw / 230.4 KiB gzip.
- AI lab closure: 336.9 KiB raw / 109.5 KiB gzip.
- Real cold Dragon Palace response bodies: 2,575,749 B, below the fixed 2.5 MiB budget.

The browser matrix covers privacy acknowledgement, real Blockly failure/correction/battle/persistence, parent PIN/export, V1/V2 migration, malformed import rollback, snapshot and corrupt-source recovery, backup-before-clear, keyboard/focus paths, reduced motion, mute controls, lazy-chunk failure/recovery, 320 px overflow, touch targets, GitHub Pages base paths, console/page/request health, cross-tab conflict/rebase, simultaneous-writer serialization, no-lock fail-closed behavior, CAS conflict without a storage event, and prevention of stale revival after clear.

### Current completion boundary

| Row | Evidence level | Result |
| --- | --- | --- |
| Parent / saves | Real-browser PIN, export, migration, recovery, rollback, revision serialization, conflict/rebase, backup and clear | **System loop complete for the implemented local parent/save foundation**; this does not prove account or cloud sync |
| First Blockly battle | Real visible wrong program, child correction, code-driven battle, persistence, unlock and parent report | **One-level playable system evidence only**; not a 30-level claim |
| UI / release | Five browser/device projects, 320 px, keyboard/focus, touch, reduced motion, lazy failure, base path, console and cold budgets | **Not complete**: public deployed Lighthouse/cold transfer, production 404, deployment-version matching and final release QA remain unverified |
| Python / AI | Real editor/tool loading and bounded failure paths | **Mode UI and failure-path evidence only**; not child progression or completion evidence |

Whole-site claim: **not complete**. There is no claim for 30-level full-content evidence, the complete growth/reward/divine-beast/equipment/companion economy, public deployment verification, or commercial production completion.

## Historical baseline — 2026-07-13 (not current evidence)

This section preserves the older baseline for traceability. Its counts and metrics must not be combined with the 2026-07-15 result above.

- Tested product tree SHA: `4f845efaecd9098fa6616728b73cc1b7bf7dc799`.
- Runner: Playwright 1.55.0.
- Projects: four browser/device projects.
- Result: 159/159 Vitest tests, 14/14 bundle-script tests, and 40/40 Playwright scenarios.
- Homepage entry JS: 100.9 KiB gzip.
- Conservative homepage total: 407.0 KiB / 650 KiB.
- Approved lazy Phaser chunk: 1,447.0 KiB raw / 331.9 KiB gzip.
- Blockly, Python and AI closures: 301.7, 225.0 and 104.1 KiB gzip.
- Historical no-compression homepage browser measurement: 635,491 B / 665,600 B.
- Historical corrupt-envelope SHA-256 repeatability evidence: `3d5a12e3ef82982149de188c277fb8376dcbbac84cb05b58d412c23ab4281518`.

The tracked files under `screenshots/foundation-*.png` belong to this historical screenshot baseline. Ordinary current `npm run test:e2e` runs keep screenshots and transfer artifacts under Playwright output directories and do not refresh those tracked files; only `npm run test:e2e:update-evidence` is allowed to replace them.
