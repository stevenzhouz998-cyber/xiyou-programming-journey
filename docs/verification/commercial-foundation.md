# Commercial foundation browser verification

- Date: 2026-07-13 (Asia/Shanghai)
- Tested product tree SHA: `742f62355b343efcbbcf6f1e4d5ad60339bdd290`
- Runner: Playwright 1.55.0, local release-like Vite preview, no HTTP compression
- Projects: Chromium 1440×1024, WebKit 768×1024, touch Chromium 390×844, Firefox 1440×1024
- Scenarios: 10 per project / 40 total; no skipped browser projects

Fresh machine setup is reproducible with `npm ci && npm run install:browsers`. Linux CI may use `npx playwright install --with-deps chromium firefox webkit`; `--with-deps` was not run on this macOS host.

## Executed evidence

The suite performs the privacy acknowledgement, child failure and real Blockly command/run success, reload persistence, parent PIN/export, V1 migration, malformed import rollback, snapshot recovery and corrupt-source download, backup-and-clear, keyboard-only dialog/focus/import paths, recovery-notice focus return, system and user reduced-motion overrides, persistent visible mute controls, real CodeMirror/Python and AI tool loading, lazy-chunk failure/recovery, 320 px overflow, coarse-pointer targets, GitHub Pages base paths, unknown hash behavior, console/page/request health, and screenshots.

Commands used for the final gate:

```text
npm test
npm run typecheck
npm run verify:bundle
npm run test:e2e -- --reporter=list
git diff --check
```

The fresh product-tree gate reported 154/154 Vitest tests, 14/14 bundle-script tests, 40/40 Playwright scenarios, zero skipped browser projects, and a clean worktree after the ordinary browser run. Ordinary `npm run test:e2e` screenshots and transfer metrics stay under Playwright's per-test output directories and do not modify tracked evidence. The tracked screenshots below are updated only with `npm run test:e2e:update-evidence`; that explicit run also passed 40/40. Its fixed no-argument `Date` makes dynamic save timestamps repeatable without virtualizing timers or the Performance API. A repeated parent-evidence scenario produced the same SHA-256 `3d5a12e3ef82982149de188c277fb8376dcbbac84cb05b58d412c23ab4281518`.

## Metrics

- Homepage entry JS: 100.9 KiB gzip (budget 180 KiB).
- Approved lazy Phaser chunk: 1,447.0 KiB raw / 331.9 KiB gzip (raw ceiling 1,600 KiB).
- Blockly closure: 301.7 KiB gzip; Python closure: 225.0 KiB gzip; AI closure: 104.1 KiB gzip.
- Mission tool operability checks use a 3,000 ms assertion; temporary tool-chunk failure must expose its alert within 1,000 ms.
- The static cold-start gate conservatively totals entry JS gzip plus raw HTML, CSS and the three homepage JPEG files: **407.0 KiB / 650 KiB**. It fails the build above 650 KiB.
- Browser QA independently collects the actual homepage request set, waits for every response-body promise after network idle, fails if any required local body cannot be read, and then sums the results. The no-compression preview measured **635,491 B / 665,600 B** across HTML, CSS, static JS and three JPEG requests. Resource Timing reported 253,569 B because of cache behavior; fully awaited response bodies are the authoritative fallback.
- Asset optimization: `assets/source/visual/world-map.png` 2,768,227 B → `public/assets/world-map.jpg` 252,369 B (1536×1024, JPEG quality 55); `assets/source/visual/mentor.png` 2,656,744 B → `public/assets/mentor.jpg` 18,809 B (256×256); `assets/source/visual/young-hero.png` 2,703,718 B → `public/assets/young-hero.jpg` 21,394 B (256×256). macOS `sips` performed resize/format technical derivation from originals at baseline commit `629fa42`; no redrawing occurred. Original PNGs and non-shipping AVIF derivatives now live outside `public` under `assets/source/visual/` for provenance rollback. A build gate rejects any `.png` or `.avif` reintroduced under `public`; the fresh `dist` contained none and measured 3,296 KiB total / 3,288 KiB under `dist/assets`. Original generation prompts/licenses are still missing, so these derivatives are not final asset-provenance QA.

## Screenshots

- `screenshots/foundation-home-390.png`
- `screenshots/foundation-home-768.png`
- `screenshots/foundation-home-1440.png`
- `screenshots/foundation-mission-1440.png`
- `screenshots/foundation-parent-1440.png`

These are browser evidence, not shipping assets. They retain the existing warm-paper, ink, jade, cinnabar and cloud-mountain direction; no new illustration asset was introduced.

## Console, base path, and failure behavior

- Expected application requests under `/xiyou-programming-journey/` returned below 400 in the base-path scenario.
- Unknown hash routes intentionally return the home experience; this is distinct from a server-level missing-file 404.
- Every scenario attaches console-error, page-error, failed-request and HTTP >=400 listeners before its first navigation and asserts no unexpected event afterward. Font requests aborted by deliberate route changes are classified explicitly; Python CDN and lazy 503 allowances exist only in their owning tests.
- The explicit 503 chunk test is intentional and excluded from unexpected request failures. Its response is marked `no-store`; the recovery URL carries a retry token. WebKit verification reopens that retry URL in a clean tab because WebKit retains the rejected module in the failed document's module map.

## Completion matrix audit

| Row | Evidence level | Result |
| --- | --- | --- |
| Parent / saves | PIN, export, V1→V2 migration, malformed import preservation, snapshot recovery, corrupt download, backup-before-clear, privacy reset, and refresh paths in real browsers | **System loop complete for the implemented parent/save foundation** |
| UI / release | Four browser/device projects, 320 px overflow, keyboard/focus, touch targets, reduced-motion connection, lazy failure, base path and console checks | **Not complete**: public deployed cold-transfer/Lighthouse, production 404, asset-manifest provenance and deployed version matching remain unverified |
| Blockly | First level actual command palette, visible workspace, wrong-order feedback and success/persistence | **One-level playable evidence only**; not full Blockly-system or 30-level evidence |
| Python / AI | A valid V2 mode fixture is imported through the real parent PIN and keyboard-operated import transaction; it is used only to verify the real tool modes load and attempt real content. Pyodide health allowances are phase-scoped to `python-runtime`, the exact pinned jsDelivr directory, request/HTTP failures, and Firefox's exact normalized known console event on `w4-m2`. | **Mode UI and failure-path verification only**; fixture import is not a child progression or completion claim |

Whole-site claim: **not complete**. No claim is made for 30-level full-content verification, battle, growth economy, divine beasts, equipment, rewards, public deployment, asset provenance, or commercial production completion. The next major gameplay blocker is the genuine code-driven battle/system loop; the next release blocker is deployed cold-network and Lighthouse verification.
