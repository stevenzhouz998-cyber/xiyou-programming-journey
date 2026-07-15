# Dragon Palace code battle browser verification

- Date: 2026-07-15 (Asia/Shanghai)
- Runner: Playwright against the local production Vite preview, with five configured projects and one worker
- Projects: Chromium 1440×1024, Firefox 1440×1024, WebKit 768×1024, touch Chromium 390×844, and touch Chromium 320×844
- Full result: **80/80 passed in 2.8 minutes; zero skipped tests and zero skipped projects**

## What the real-browser path proves

The primary child path uses the visible, real Blockly workspace. It creates an intentionally wrong `请求兵器 → 进入龙宫 → 试用兵器` program, runs it, verifies the outside-palace rejection and focused problem block, then visibly moves, deletes, and adds blocks to produce `进入龙宫 → 请求兵器 → 试用兵器`. The browser then verifies the completed event transcript, stable source block IDs, persisted trace and counters after refresh, the next mission unlock, PIN-gated parent aggregate, V3 export, and visible file import.

No successful gameplay state is injected with `page.evaluate`. Browser-side evaluation is limited to read-only evidence, a storage-failure fixture switch, and deliberately corrupt local-storage input installed before the first application load. Every success assertion is reached through visible Blockly and application controls.

Additional matrix coverage includes:

- keyboard-only real Blockly correction and completion in desktop Chromium and Firefox;
- reduced-motion plus muted replay parity in mobile Chromium and tablet WebKit;
- an intentional storage write failure that keeps the real edit visible and persists it through the visible retry control;
- corrupt V3 Blockly recovery with a stable recovered block ID and a successful visible rerun in Chromium, Firefox, and WebKit;
- byte-preserving corrupt-envelope download behind the parent PIN in desktop Chromium;
- real mission smoke coverage instead of skips in every project not owning a specialized branch;
- legacy commercial-foundation regression coverage, including focus, responsive layout, parent data tools, Python/AI loading, base path, and visible lazy-module recovery.

## Fixed budget evidence

The committed constants are:

- Dragon Palace cold-load response bodies: `2.5 * 1024 * 1024` bytes;
- Dragon Palace formal media total: `1.25 * 1024 * 1024` bytes;
- a single raster: `512 * 1024` bytes.

The cold-load scenario disables cache reuse, waits for the Dragon Palace canvas and Blockly host, awaits every successful local HTTP(S) response body, and includes HTML, CSS, JavaScript, Phaser, Blockly, the existing header avatar, and all five Dragon Palace WebPs. It does not count WebKit's browser-internal `blob:` image-decoding responses a second time.

| Project | Measured bytes | Limit | Headroom |
| --- | ---: | ---: | ---: |
| desktop-chromium-1440x1024 | 2,579,572 | 2,621,440 | 41,868 |
| desktop-firefox-1440x1024 | 2,579,572 | 2,621,440 | 41,868 |
| tablet-webkit-768x1024 | 2,579,572 | 2,621,440 | 41,868 |
| mobile-chromium-390x844 | 2,579,572 | 2,621,440 | 41,868 |
| narrow-chromium-320x844 | 2,579,572 | 2,621,440 | 41,868 |

The five approved Dragon Palace rasters total **257,674 B / 1,310,720 B**. They retain their generated compositions and original dimensions. Sharp 0.35.3 performed only technical WebP re-encoding with `quality: 30`, `alphaQuality: 75`, `effort: 6`, and `smartSubsample: true`; the manifest records the resulting hashes.

## Screenshot review and asset QA

The successful, persisted `weapon-tested` state was captured after the same visible child path:

| Evidence | Actual image size | Review |
| --- | --- | --- |
| `screenshots/dragon-palace-320.png` | 320×2270 | No horizontal overflow; scene, program list, Blockly workspace, feedback, and controls remain readable in the vertical layout. |
| `screenshots/dragon-palace-390.png` | 390×2179 | Character and weapon silhouettes remain intact; touch controls and transcript are legible. |
| `screenshots/dragon-palace-768.png` | 768×1503 | Scene-to-program hierarchy is clear, with no clipped formal asset or placeholder region. |
| `screenshots/dragon-palace-1440.png` | 1440×1024 | Full scene, Wukong, Dragon King, weapon/effect art, real Blockly workspace, and completed transcript are visible together. |

All four screenshots were inspected at their original resolution before the five Dragon Palace manifest rows were promoted to `visual-qa-passed`. The gray Blockly trash can is a functional interface icon, not a decorative placeholder. No emoji, CSS/div art, hand-authored SVG, or placeholder box stands in for the Dragon Palace characters, scene, weapons, or effects.

The restored `LegacyGameScene` is only the pre-existing w2–w6 compatibility path and is **not** part of Dragon Palace visual QA. It still uses `world-map.jpg` and `young-hero.jpg`; their original prompts and licenses remain missing, so they are not release-approved and continue to block a whole-site commercial claim.

## RED evidence and fixes

The gate failed before it passed:

1. Budget tests first observed missing fixed exports (`undefined` versus 2,621,440), then passed after the constants were implemented and shared with the asset checker.
2. The first Chromium mission run passed gameplay but measured **3,419,279 B**, 797,839 B over budget. Production imports were narrowed to Blockly core plus Chinese messages, Phaser was routed to its official minified ESM distribution, and the unrelated global map background stopped loading on w1-m1. That reduced the measured load to 2,845,820 B, still over budget; technical WebP re-encoding then brought it under the fixed limit without redrawing assets.
3. The first five-project Dragon Palace run was 28/30: WebKit browser-internal `blob:` responses were double-counted, and Firefox was incorrectly required to perform the Chromium-only exact download branch. Filtering to real HTTP(S) network bodies and retaining the required Firefox/WebKit recovery smoke made the focused rerun 4/4 green.
4. The first full regression run stopped on an old fake-button E2E path. The legacy test was upgraded to visible real Blockly and V3 storage assertions.
5. That upgrade exposed two product regressions: non-Dragon-Palace routes passed legacy scene props to the event-driven Dragon Palace scene, and w1-m1 no longer exposed a visible recovery action when a lazy chunk returned 503. Restoring an isolated legacy scene and applying the visible error boundary to Dragon Palace scene/workspace made the focused regressions 2/2, the Chromium legacy suite 10/10, and the final five-project suite 80/80.

## Commands and results

The browser evidence command was:

```text
npm run test:e2e
```

It reported 80 passed, zero failed, and zero skipped. The release handoff additionally runs these exact gates after this document is added:

```text
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npm run test:e2e
git diff --check
rg -n "emoji|placeholder|TO""DO|TB""D|xiyou-workspace-|useState<string\[\]>" src public docs/assets scripts e2e
git status --short --branch
```

## Completion boundary and residual risk

`w1-m1 龙宫试兵：One-level playable`

`其余 29 关、Python、AI、成长奖励、装备、神兽、完整战斗系统与公开部署：not complete`

`整站：not complete`

This evidence does not prove public deployment, 29 additional playable levels, Python/AI learning outcomes, cross-system growth/reward loops, equipment, divine beasts, the complete battle system, or whole-site commercial readiness. The existing global JPEGs and audio files also lack original generation/source prompts and license records. They remain explicitly outside release approval.
