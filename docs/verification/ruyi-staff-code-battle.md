# Ruyi Staff code battle browser verification

- Date: 2026-07-16 (Asia/Shanghai)
- Tested implementation commit: `d58b211bc86e001c82e849bff9335fd672bf6032`; the commit containing this document is evidence-only.
- Runner: Playwright against the local production Vite preview, with five configured projects and one worker
- Projects: Chromium 1440×1024, Firefox 1440×1024, WebKit 768×1024, touch Chromium 390×844, and touch Chromium 320×844
- Full result: **105/105 passed; zero failures, zero skipped tests, and zero skipped projects**

## What the real-browser path proves

`w1-m2 定海神针` now uses one visible, real Blockly workspace as the only source of battle instructions. The primary child path builds and visibly runs the wrong sequence containing the halberd instruction, observes the corresponding wrong battle action and focused problem block, then uses visible Blockly controls to delete, add, and move blocks into the correct sequence. The corrected connection graph compiles into the execution trace, drives the battle state machine to success, and records the stable source block IDs that produced each action.

The browser then verifies that the successful trace, block IDs, session state, and mission progress survive refresh; `w1-m3` unlocks; the parent report includes the completed mission; and V3 export/import preserves the result. No browser test injects `w1-m2` completion with `page.evaluate`, mutates a hidden success source, or replaces the real workspace with the compatibility tool. Browser-side evaluation is limited to read-only evidence and the deliberate storage-failure fixture switch.

Additional matrix coverage includes:

- keyboard-only workspace correction and completion;
- visible reduced-motion and mute runs that preserve the same gameplay result while suppressing the optional presentation/audio behavior;
- intentional storage failure with a visible retry path, without falsely reporting an unsaved result as persisted;
- corrupt V3 recovery, snapshot recovery, stable recovered block IDs, and byte-preserving damaged-source download;
- parent aggregate plus export/import through the visible parent flow;
- the exact Ruyi Staff experience-chunk 503 path, retaining visible local recovery rather than blanking the application;
- fixed cold-load collection that fails closed on request failure, unreadable bodies, redirects, non-2xx responses, or cache reuse;
- 320 px touch targets, scene → program → feedback order, and no page-level horizontal overflow. Blockly's own workspace remains internally scrollable as intended.

The separate `w1-m3` compatibility regression preloads completed `w1-m1` and `w1-m2` solely to reach and inspect that legacy route. It is not used as evidence for completing `w1-m2`.

## Real scenario matrix

The complete matrix contains the existing commercial-foundation and Dragon Palace regressions plus 21 assigned Ruyi Staff scenarios. Project-level filters assign each specialized scenario to the browser that actually performs it; excluded paths are not reported as passes or skips.

| Project | Total tests | Assigned Ruyi Staff scenarios |
| --- | ---: | ---: |
| desktop-chromium-1440x1024 | 32 | 8 |
| tablet-webkit-768x1024 | 20 | 4 |
| mobile-chromium-390x844 | 18 | 3 |
| desktop-firefox-1440x1024 | 20 | 4 |
| narrow-chromium-320x844 | 15 | 2 |
| **Total** | **105** | **21** |

## Fixed budget evidence

The committed cold-load ceiling for both formal Blockly battles remains `2.5 * 1024 * 1024 = 2,621,440` response-body bytes. The test blocks service workers, sends no-store headers, records all HTTP(S) 2xx bodies including the external Blockly sprite, and treats every request or response problem as a failure.

Every final project measured the same cold response-body total:

| Route | Measured bytes | Limit | Headroom |
| --- | ---: | ---: | ---: |
| `w1-m1 龙宫求兵` | 2,595,678 | 2,621,440 | 25,762 |
| `w1-m2 定海神针` | 2,587,431 | 2,621,440 | 34,009 |

The final desktop Chromium homepage measurement was 663,043 B / 665,600 B, leaving only 2,557 B of headroom; transferred bytes were 254,769 B. The same fixed gate passed in all five projects. These are narrow margins, not permission to add eager route code.

The second formal mission is dynamically loaded. Route-only Dragon Palace/Ruyi experience code, compatibility mission tools, mission-only icons, Phaser, Blockly, CodeMirror, React/router, and shared icon code are split so neither formal mission must load the legacy `world-map.jpg`. Legacy missions still retain that backdrop through an explicit compatibility wrapper. The existing world-map asset was not re-encoded or modified: it remains 252,369 B with SHA-256 `391e0bad0f58bb147edeb40c7ba9e616a480851e88df5a4842795b341f795acc`.

Static bundle gates also passed:

| Gate | Final result |
| --- | ---: |
| Entry static JS | 106.2 KiB gzip / 180 KiB |
| Conservative homepage | 418.1 KiB / 650 KiB |
| Phaser | 1,168.4 KiB raw / 1,600 KiB |
| Blockly workspace closure | 1,005.1 KiB raw / 291.3 KiB gzip |
| Ruyi Staff Blockly closure | 930.7 KiB raw / 267.8 KiB gzip |
| Dragon Palace scene closure | 1,468.1 KiB raw / 419.2 KiB gzip |
| Ruyi Staff scene closure | 1,468.5 KiB raw / 419.3 KiB gzip |

## Asset and screenshot QA

The same five approved generated Dragon Palace assets are reused by both formal battle screens. Their manifest records both screen slots, source tool and prompt, exact dimensions and hashes, and `visual-qa-passed`; no new unproven character, beast, scene, equipment, magic-item, effect, collectible, or decorative asset was added. The five files remain **257,674 B / 1,310,720 B** in total.

The persisted `w1-m2` success state was captured after the visible wrong-program-to-correct-program child path:

| Evidence | Actual size | SHA-256 | Review |
| --- | --- | --- | --- |
| `screenshots/ruyi-staff-1440.png` | 1440×1024 | `5b56eaf2a1884cd3614b7fd10a4146b021e6f6b45b3260f165e09517c1f1f6e5` | Scene, real Blockly workspace, controls, weighted choices, and persisted success feedback are visible together. |
| `screenshots/ruyi-staff-768.png` | 768×2049 | `a1757dfca38f74d2a36739aba334374f198ef8e2a1f6a553c51cb32e979eb9eb` | Formal art and scene-to-program hierarchy remain intact without clipping. |
| `screenshots/ruyi-staff-390.png` | 390×2561 | `2e6c0b2685eead947a2aae7cdd929242d0d20f05d3a11b07a768d65ddb9fb790` | Narrow flyout is closed; all three real connected blocks, touch controls, and feedback are readable and unobscured. |
| `screenshots/ruyi-staff-320.png` | 320×2595 | `35497763f4d78e094687254efff4c778b22b377a5469bec5d484ab74a660ff1b` | Narrow flyout is closed, the real three-block stack remains complete, and there is no page overflow. |

All four images were inspected at original resolution. On 390 px, the Blockly host spans x=21–369 and the three target block boxes span x=34–238.48 and y=344.59–496.59 inside its y=333.59–509.59 bounds. On 320 px, the host spans x=21–299 and the same stack spans x=34–238.48 and y=344.92–496.92 inside y=333.92–509.92. Every visible workspace control also passed center-point hit testing after being scrolled into view. Approved raster art provides the shipped characters, scene, weapons, and effects; there is no emoji, CSS/div art, ASCII, placeholder box, hand-authored SVG, or code canvas substituting for formal illustration.

## RED evidence and fixes

The gate failed before it passed:

1. Initial source-contract tests were 17/20 for bundle rules and 26/27 for asset rules. They exposed the missing Ruyi fixed-budget export, missing Ruyi E2E/scene closure gates, and missing `w1-m2` manifest slots; the implementation added the shared constants, gates, and both formal screen slots without changing asset provenance.
2. The first focused desktop run passed only 2/8 because the test targeted an obsolete scene selector. After binding the test to the real integration, it passed 5/8 and measured **2,844,466 B**, 223,026 B over the unchanged 2.5 MiB limit.
3. Removing the legacy world-map request from formal mission pages saved 252,369 B. The compatibility wrapper preserved the backdrop for `w1-m3+`; desktop Ruyi evidence then passed 8/8.
4. The first five-project Ruyi run passed 20/21. WebKit measured **2,947,119 B**, while the other projects measured 2,592,205 B, because WebKit requested the entry graph twice. Initial manual chunk separation removed that duplication path.
5. The first complete run was 98/105. All five homepage checks exceeded their fixed limit at 690,255 B, while WebKit/Firefox legacy lazy-503 health checks treated an expected shared dependency failure as an unrelated application failure. Route-only lazy loading and precise expected-failure-chain handling fixed the product and evidence boundaries.
6. Removing the icon package from the forced vendor chunk reduced the homepage only to 677,385 B, still 11,785 B over. Lazy-loading route-only experiences and mission-only icons brought the real browser homepage under its unchanged ceiling.
7. A proposed second re-encode of `world-map.jpg` was rejected because it would have changed an unapproved legacy asset to satisfy a code-loading budget. It was immediately and completely reverted before the implementation commit. Final budget success comes from route/chunk behavior only, and the asset hash is unchanged.
8. The second complete run passed 103/105. Only WebKit cold gates failed: `w1-m1` measured 2,642,834 B and `w1-m2` 2,633,792 B. Dynamic mission icon chunks still imported the entry graph, so WebKit requested it twice. A shared `phosphor-core` chunk broke that cycle; the focused WebKit cold rerun passed 4/4.
9. The third complete browser run passed **105/105** before the later original-resolution mobile review.
10. The full unit suite subsequently exposed old synchronous/lazy timing assumptions: 541/543, then 542/543. Tests were changed to await the actual accessible route/workspace elements rather than weakening product assertions; the final result was **543/543**.
11. Original-resolution review then rejected the nominal 320/390 result because the simple Blockly flyout remained open and pushed the real connected stack outside the host. New geometry assertions failed with a stack right edge of 475.96 px against host right edges of 370 px and 300 px. Narrow initialization and resize now convert the flyout to auto-close, hide it after Blockly's delayed show, resize the SVG, and use Blockly's own workspace viewport/connected-block operations to place the real stack inside the host. The focused mobile rerun passed 2/2, screenshot generation passed 5/5, and a fourth complete run passed **105/105** with exact block bounds and unobscured-control checks.

## Commands and final results

```text
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npx playwright test --list
npm run test:e2e
npm audit --registry=https://registry.npmjs.org
git diff --check
```

- `npm test`: 36 Vitest files / 543 tests, 20 bundle tests, and 27 asset tests passed;
- `npm run typecheck`: exit 0;
- `npm run verify:assets`: 5 files, 257,674 B / 1,310,720 B, all approved manifest checks passed;
- `npm run verify:bundle`: all fixed entry, homepage, Phaser, Blockly, Ruyi Staff and scene closure gates passed;
- `npx playwright test --list`: exactly 105 tests across the five projects listed above;
- `npm run test:e2e`: 105/105 passed in 5.5 minutes, with zero failures and zero skips;
- official npm registry audit: zero known vulnerabilities;
- `git diff --check`: no errors;
- secret scan: no credential/key patterns found;
- production storage scan: direct local-storage writes remain confined to the audited storage implementation; UI code continues through `ProgressContext` and the storage coordinator.

The product scan found only intentional occurrences: five `no emoji` prompt constraints plus checker sources; `unknown-placeholder-block` only in the corruption fixture; legacy workspace keys only in storage implementation/tests; and typed string-array state only for visible transcript/evidence UI, not a hidden completion source. It found zero `TODO` and zero `TBD` markers.

## Completion boundary and residual risk

`w1-m2 定海神针：One-level playable`

`w1-m1 龙宫求兵：One-level playable regression maintained`

`本地 Parent / saves 基础：System loop complete for the previously verified implemented local foundation only`

`其余 28 关（w1-m3–w6-m5）、完整成长 / 神兽 / 装备 / 伙伴 / 战斗 / 奖励体系、公开部署：not complete`

`整站：not complete`

The cold-load headroom remains small: 25,762 B for `w1-m1`, 34,009 B for `w1-m2`, and only 2,557 B for the measured homepage. The formal Blockly route also depends on an external Blockly sprite. Existing global JPEG/audio provenance is incomplete; the untouched legacy world map remains outside release approval. Public deployment, production 404 behavior, deployed version matching, and public-network performance were not verified. The optional GStack browser wrapper was unavailable because it required setup, so no tool installation was performed; all claimed browser evidence comes from the project's real Chromium, Firefox, and WebKit Playwright runs plus original-resolution screenshot inspection.
