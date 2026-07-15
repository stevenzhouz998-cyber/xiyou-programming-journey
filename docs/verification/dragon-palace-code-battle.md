# Dragon Palace code battle browser verification

- Date: 2026-07-15 (Asia/Shanghai)
- Runner: Playwright against the local production Vite preview, with five configured projects and one worker
- Projects: Chromium 1440×1024, Firefox 1440×1024, WebKit 768×1024, touch Chromium 390×844, and touch Chromium 320×844
- Full result: **69/69 passed; zero skipped tests and zero skipped projects**

## What the real-browser path proves

The primary child path uses the visible, real Blockly workspace. It creates an intentionally wrong `请求兵器 → 进入龙宫 → 试用兵器` program, runs it, verifies the outside-palace rejection and focused problem block, then visibly moves, deletes, and adds blocks to produce `进入龙宫 → 请求兵器 → 试用兵器`. The browser then verifies the completed event transcript, stable source block IDs, persisted trace and counters after refresh, the next mission unlock, PIN-gated parent aggregate, V3 export, and visible file import.

No successful gameplay state is injected with `page.evaluate`. Browser-side evaluation is limited to read-only evidence, a storage-failure fixture switch, and deliberately corrupt local-storage input installed before the first application load. Every success assertion is reached through visible Blockly and application controls.

Additional matrix coverage includes:

- keyboard-only real Blockly correction and completion in desktop Chromium and Firefox;
- two visible success runs for reduced-motion plus mute parity in mobile Chromium and tablet WebKit: the unmuted run records `HTMLMediaElement.play()` and `success.m4a` requests, then the child visibly clears progress, enables reduced motion and mute before the second execution, which produces the same event sequence/transcript/final state with no new media play or request;
- an intentional storage write failure that keeps the real edit visible and persists it through the visible retry control;
- corrupt V3 Blockly recovery with a stable recovered block ID and a successful visible rerun in Chromium, Firefox, and WebKit;
- byte-preserving corrupt-envelope download behind the parent PIN in desktop Chromium;
- project-level tag filters assign only the specialized scenarios each browser truly executes; grep-excluded tests are not reported as passes or skips;
- legacy commercial-foundation regression coverage, including focus, responsive layout, parent data tools, Python/AI loading, base path, and visible lazy-module recovery.
- the first non-specialized Blockly mission (`w1-m2`) visibly adds an incorrect sequence, runs it, moves and deletes commands, rebuilds the correct sequence, completes, and returns to a map showing 2/30 progress without injecting completion state;
- all five projects execute the same visible parent-credential lifecycle: reject the former public default, reject mismatched confirmation, prove a pre-confirmation reload leaves setup or the old change/recovery credentials intact, retry an intentional storage failure without losing the displayed recovery code, rotate PIN and recovery credentials, reject the old credentials, and finish with keyboard login plus focus checks. Only the explicit recovery acknowledgement transaction stores SHA-256 digests; raw PIN and recovery values are cleared from the component. This remains a local browser UI gate rather than account-level security.

## Real scenario matrix

All five projects run the ten `@legacy` commercial-foundation tests plus assigned Dragon Palace scenarios. The desktop Chromium `@visual` scenario visibly resizes its page to 768×1024 before exercising the three runtime states; it does not add a project or skip a path. Specialized tests have no project-name `return`, no `test.skip`, and no smoke branch hidden behind a stronger title.

| Project | Assigned Dragon Palace tags | Legacy | Dragon Palace | Total |
| --- | --- | ---: | ---: | ---: |
| desktop-chromium-1440x1024 | `@full @storage @keyboard @visual @corrupt-full @cold` | 10 | 6 | 16 |
| tablet-webkit-768x1024 | `@full @parity @corrupt-smoke @cold` | 10 | 4 | 14 |
| mobile-chromium-390x844 | `@full @parity @cold` | 10 | 3 | 13 |
| desktop-firefox-1440x1024 | `@full @keyboard @corrupt-smoke @cold` | 10 | 4 | 14 |
| narrow-chromium-320x844 | `@narrow @cold` | 10 | 2 | 12 |
| **Total** |  | **50** | **19** | **69** |

`@full` is the complete visible wrong-program, correction, success, refresh, unlock, PIN, export, and import path. `@narrow` is a real visible wrong-program-to-success path plus horizontal-overflow verification. `@visual` creates three real Blockly programs and captures the accepted-effect, blocked-effect, and full three-weapon Phaser states. The other tags execute the behavior named in each tag.

## Fixed budget evidence

The committed constants are:

- Dragon Palace cold-load response bodies: `2.5 * 1024 * 1024` bytes;
- Dragon Palace formal media total: `1.25 * 1024 * 1024` bytes;
- a single raster: `512 * 1024` bytes.

The cold-load scenario blocks service workers, sends `Cache-Control: no-store` plus `Pragma: no-cache`, waits for the Dragon Palace canvas and Blockly host, records every HTTP(S) response regardless of origin, and awaits every 2xx body. Any request failure, redirect, 304, 4xx/5xx response, or unreadable 2xx body fails the test. It includes HTML, CSS, JavaScript, Phaser, Blockly, the existing header avatar, all five Dragon Palace WebPs, and the 1,775-byte Blockly sprite response from `https://static.blockly.com`; only non-network `blob:` decoding is ignored.

| Project | Measured bytes | Limit | Headroom |
| --- | ---: | ---: | ---: |
| desktop-chromium-1440x1024 | 2,587,024 | 2,621,440 | 34,416 |
| desktop-firefox-1440x1024 | 2,587,024 | 2,621,440 | 34,416 |
| tablet-webkit-768x1024 | 2,587,024 | 2,621,440 | 34,416 |
| mobile-chromium-390x844 | 2,587,024 | 2,621,440 | 34,416 |
| narrow-chromium-320x844 | 2,587,024 | 2,621,440 | 34,416 |

The remaining **34,416 B is only about 1.3% headroom** and the first-load path depends on the external `static.blockly.com` sprite. A small upstream size or delivery change can make this gate fail or make a child's first load heavier. This risk is not resolved: follow-up work should continue reducing the local bundle or localize an approved UI sprite only after its source and license are verified.

The five approved Dragon Palace rasters total **257,674 B / 1,310,720 B**. They retain their generated compositions and original dimensions. Sharp 0.35.3 performed only technical WebP re-encoding with `quality: 30`, `alphaQuality: 75`, `effort: 6`, and `smartSubsample: true`; the manifest records the resulting hashes.

## Screenshot review and asset QA

The successful, persisted `weapon-tested` state was captured after the same visible child path:

| Evidence | Actual image size | Review |
| --- | --- | --- |
| `screenshots/dragon-palace-320.png` | 320×2217 | Unobscured persisted completion after visibly returning to the map and reopening the mission; no horizontal overflow and scene → controls → program → feedback ordering remains readable. |
| `screenshots/dragon-palace-390.png` | 390×2155 | Character and weapon silhouettes remain intact; touch controls and transcript are legible. |
| `screenshots/dragon-palace-768.png` | 768×1844 | Scene-to-program hierarchy is clear, with no clipped formal asset or placeholder region. |
| `screenshots/dragon-palace-1440.png` | 1440×1024 | Full scene, Wukong, Dragon King, weapon/effect art, real Blockly workspace, and completed transcript are visible together. |
| `screenshots/dragon-palace-runtime-enter-accepted-768.png` | 768×1024 | Single-viewport crop from the real one-block `进入龙宫` program; accepted effect cell, scene transcript, Blockly block, and controls are visible before the entered-palace transition. |
| `screenshots/dragon-palace-runtime-request-blocked-768.png` | 768×1024 | Single-viewport crop from the real request-first program; blocked effect, outside-palace transcript, Blockly block, and failure feedback are visible after playback settles. |
| `screenshots/dragon-palace-runtime-weapons-all-768.png` | 768×1024 | Single-viewport crop from the real `进入龙宫 → 请求兵器` program; full three-weapon sheet, first two grid boundaries, Blockly blocks, and incomplete-run feedback are visible after a visible replay settles. |
| `screenshots/foundation-parent-1440.png` | 1440×1358 | Full parent report after the visible credential lifecycle. The three password inputs are empty, no PIN or recovery code is rendered, and the access-settings form has clear field grouping and actions. |

All eight screenshots were inspected at their original resolution. The gray Blockly trash can is a functional interface icon, not a decorative placeholder. No emoji, CSS/div art, hand-authored SVG, or placeholder box stands in for the Dragon Palace characters, scene, weapons, or effects.

The restored `LegacyGameScene` is only the pre-existing w2–w6 compatibility path and is **not** part of Dragon Palace visual QA. It still uses `world-map.jpg` and `young-hero.jpg`; their original prompts and licenses remain missing, so they are not release-approved and continue to block a whole-site commercial claim.

## RED evidence and fixes

The gate failed before it passed:

1. Budget tests first observed missing fixed exports (`undefined` versus 2,621,440), then passed after the constants were implemented and shared with the asset checker.
2. The first Chromium mission run passed gameplay but measured **3,419,279 B**, 797,839 B over budget. Production imports were narrowed to Blockly core plus Chinese messages, Phaser was routed to its official minified ESM distribution, and the unrelated global map background stopped loading on w1-m1. That reduced the measured load to 2,845,820 B, still over budget; technical WebP re-encoding then brought it under the fixed limit without redrawing assets.
3. The first five-project Dragon Palace run was 28/30: WebKit browser-internal `blob:` responses were double-counted, and Firefox was incorrectly required to perform the Chromium-only exact download branch. Filtering to HTTP(S) network bodies and retaining the required Firefox/WebKit recovery smoke made the focused rerun 4/4 green.
4. The first full regression run stopped on an old fake-button E2E path. The legacy test was upgraded to visible real Blockly and V3 storage assertions.
5. That upgrade exposed two product regressions: non-Dragon-Palace routes passed legacy scene props to the event-driven Dragon Palace scene, and w1-m1 no longer exposed a visible recovery action when a lazy chunk returned 503. Restoring an isolated legacy scene and applying the visible error boundary to Dragon Palace scene/workspace made the focused regressions 2/2 and the Chromium legacy suite 10/10.
6. Specification review then rejected the 80-test result because conditional project branches allowed weaker smoke actions to pass under storage, keyboard, parity, and corruption titles. A contract check against commit `d8f63fa` failed on the first forbidden project-return signature; the same check passed after project-level tag filtering removed all four conditional branches. The resulting honest matrix lists 68 tests rather than inflating the count.
7. The same review found that cold-load collection filtered out non-local origins. After removing that bypass, the test captured Blockly's real external 1,775-byte sprite response and the measured total rose from 2,579,572 B to 2,581,347 B while staying within the unchanged limit.
8. The `@full` PIN path now waits for the filled value and clicks the visible `进入周报` button. The independent `@legacy` keyboard PIN regression remains intact.
9. Release-quality review then caught the Phaser canvas stretched from its intrinsic 19:8 ratio to 19:5. The new browser assertion failed with a 0.697 ratio error before CSS adopted 19:8, intrinsic-height scaling, and the ≤900px stacked layout; focused unit tests and the 320px browser path then passed.
10. The cold gate previously duplicated its 2.5 MiB constant and could ignore non-2xx responses or request failures. Source-contract tests failed before `budget-limits.mjs`, service-worker blocking, no-store headers, and fail-closed response collection were added; the browser gate remains under the unchanged limit with only 39,961 B headroom.
11. The former mute check muted only after success and replayed persisted events. It was replaced with two visible, fresh progress runs: observable play/request evidence exists only for the unmuted run, while the pre-execution muted run produces identical gameplay evidence and no new audio activity.
12. Runtime screenshots initially exposed black WebGL compositor tiles during full-page stitching. The existing desktop Chromium project now uses its visible page at 768×1024, waits for rejected/incomplete playback to settle (including a visible replay for the three-weapon frame), and records a single 768×1024 viewport. All three replacement frames were inspected clean; defective images were not accepted and no extra browser project was retained.
13. Restoring the non-specialized Blockly compatibility tool first imported Blockly's full package and pushed the cold route to **2,699,134 B**, over the unchanged limit. Narrowing that compatibility import to Blockly core plus Chinese messages reduced its shared editor chunk to 703,617 B and the measured route to **2,585,568 B** without weakening the gate.
14. The former public default parent PIN is migrated to an unset state and is never accepted. The first follow-up implementation added first-use setup, hashed verification, legacy custom-PIN migration, PIN rotation, and recovery reset.
15. Specification review then rejected that implementation because it wrote the new hash before the family acknowledged saving the one-time recovery code, reused the login PIN in the change form, and lacked a complete browser lifecycle. Six focused unit tests failed first on early writes, visible secret fields, and abandoned-change semantics. The fixed two-phase flow keeps the new record and raw recovery code only in component pending state, commits on explicit acknowledgement, retains the pending code on storage failure, focuses the failure, and clears all secret state after success or mode changes. The visible five-project lifecycle passed 5/5, the full matrix remained exactly 69, and the inspected parent screenshot contains empty password fields and no secret text.
16. The final specification pass found the recovery-heading focus assertion could race React's effect timing and that repeating the retired public digits in an error would disclose them again. The assertion now waits for focus to settle, the interface and documentation use only a generic retired-default description, three consecutive 411-test unit runs passed, and the unchanged five-project credential lifecycle passed 5/5.

## Commands and results

The browser evidence command was:

```text
npm run test:e2e
```

The final repair freshly executed these exact gates after the evidence and matrix fixes:

```text
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npx playwright test --list
npm run test:e2e
npm audit --registry=https://registry.npmjs.org
git diff --check
rg -n "emoji|placeholder|TO""DO|TB""D|xiyou-workspace-|useState<string\[\]>" src public docs/assets scripts e2e
git status --short --branch
```

The fresh results were:

- `npm test`: 27 Vitest files / 411 tests, 18 bundle-script tests, and 26 asset tests passed;
- `npm run typecheck`: exit 0;
- `npm run verify:assets`: 5 files, 257,674 B / 1,310,720 B, all `visual-qa-passed`;
- `npm run verify:bundle`: entry static JS 107.8 KiB gzip, conservative homepage 417.6 KiB, Phaser 1,168.4 KiB raw, and GameScene closure 1,513.9 KiB raw, all inside their gates;
- `npx playwright test --list`: exactly 69 tests across five projects: desktop Chromium 16, tablet WebKit 14, mobile Chromium 13, desktop Firefox 14, and narrow Chromium 12;
- specialized matrix: 19/19 passed across the same five projects;
- `npm run test:e2e`: 69/69 passed across the five configured projects with zero skips;
- official npm registry audit: zero known vulnerabilities after pinning Vite 6.4.3 and Playwright 1.55.1;
- `git diff --check`: no errors;
- `git status --short --branch`: clean after commit.

The exact `rg` scan returned nine intentional lines:

- seven `emoji` matches: five Dragon Palace prompt records plus the checker constant and its checker-test fixture. Each is the explicit `no emoji` art prohibition, not an emoji asset;
- one `placeholder` match: `unknown-placeholder-block` in the deliberately corrupt V3 recovery fixture, which must be rejected and preserved byte-for-byte rather than shipped;
- one `useState<string[]>` match: the existing `AiLab` state backing its visible selected-evidence list and buttons. It is a typed visible UI state, not a hidden completion sequence or shipping placeholder;
- zero `TODO`, zero `TBD`, and zero `xiyou-workspace-` matches.

The scan findings do not turn the existing AI mode into a completed system; Python and AI remain outside this one-level completion claim.

## Completion boundary and residual risk

`w1-m1 龙宫试兵：One-level playable`

`w1-m2 compatibility path：browser-verified interaction shell; not level-content complete`

`其余 29 关（包括仍缺少完整关卡证据的 w1-m2）、Python、AI、成长奖励、装备、神兽、完整战斗系统与公开部署：not complete`

`整站：not complete`

This evidence does not prove public deployment, 29 additional playable levels, Python/AI learning outcomes, cross-system growth/reward loops, equipment, divine beasts, the complete battle system, or whole-site commercial readiness. The existing global JPEGs and audio files also lack original generation/source prompts and license records. They remain explicitly outside release approval.
