# Four Seas regalia code battle browser verification

- Date: 2026-07-20 (Asia/Shanghai)
- Tested implementation SHA: `a6ea03efb9253ea8775f5e4b540cbffa9b06118a`
- Evidence screenshot commit SHA: `df5d8dbd5ab8ad5263bd9f9809db75986c7b5824`
- The commit containing this document is evidence-only; it does not change product or test behavior.
- Runner: Playwright against the isolated local production E2E preview, using one worker and the five configured browser/device projects.
- Final browser result: **141/141 passed**, with zero skipped tests and zero skipped projects.

## What the real-browser path proves

The child enters the formal `w1-m3` route through visible course navigation after the `w1-m1` and `w1-m2` prerequisites. The formal page contains no Legacy mission tool. The same visible nested Blockly workspace first builds the deliberately wrong collection order, executes it, and drives the Phaser scene to the blocked state. The browser verifies the exact feedback `北海龙王还没有送来云履，现在不能先收凤翅紫金冠。`, moves focus to that alert, then uses the visible `回到问题积木` action to focus the offending crown block.

The correction is also child-visible: delete the wrongly placed crown, add it again, and move the cloud boots before the armor and crown. The connected block graph compiles into ten source/parent trace pairs. Those exact pairs drive the real Phaser success state, persist through refresh, survive reopening, and remain unchanged on visible replay. Replay does not increment attempts or replace `completedAt`, and the course map visibly unlocks `w1-m4`.

This covers the one-level behavior loop:

- **Input:** one visible nested Blockly graph and its visible add, delete, move, execute, replay, and problem-focus controls; no hidden success write and no injected completion.
- **State transition:** wrong order produces blocked battle state and exact diagnostic; corrected order produces the ten-instruction trace and `regalia-verified` scene state.
- **Persistence:** Progress V3 stores the nested workspace, last trace, events, attempts, completion identity, and unlock state; refresh and replay retain the same evidence.
- **Cross-system effect:** success unlocks `w1-m4`, reaches the Parent report, and is preserved by V3 export/import.
- **Failure and recovery:** draft, run-session, and final-completion writes are separately failed and visibly retried. CAS conflicts, corrupt CURRENT, damaged-source download, external-page mutation, and lazy-module failures all fail closed with a visible recovery path.

The storage evidence distinguishes three transactions instead of treating one successful write as the whole flow:

1. A failed draft write keeps the visible edit while the old saved draft remains authoritative; visible retry persists the edit.
2. A failed run-session write keeps the previous session and exposes recovery; retry publishes the real blocked run.
3. A failed completion write does not publish completion or unlock early; retry commits the exact completion once.

A second real page completes `w1-m3` once; the first page adopts that external state without reviving stale data. Parent evidence enters through the visible credential gate, checks the visible `w1-m3` report detail, exports V3, makes a visible workspace mutation, and imports through the real file input to restore the exact nested session. Approved-current corruption restores stable nested IDs, retains the damaged bytes, and exposes the damaged download through Parent.

## Real-browser matrix

The full suite contains exactly 141 tests across five files and five projects. The formal Four Seas file contributes 29/29. Every project runs the same `@regalia-full` wrong-order → correction → success → refresh → replay → unlock path; narrower tags add only the behavior their titles state.

| Project | Full-suite tests | Four Seas tests |
| --- | ---: | ---: |
| desktop-chromium-1440x1024 | 53 | 14 |
| tablet-webkit-768x1024 | 24 | 4 |
| mobile-chromium-390x844 | 22 | 4 |
| desktop-firefox-1440x1024 | 24 | 4 |
| narrow-chromium-320x844 | 18 | 3 |
| **Total** | **141** | **29** |

The Four Seas tag inventory is exact: `@regalia-full` 5, keyboard 2, parity 3, storage 3, corrupt recovery 3, three-layer lazy recovery 3, external plus Parent 2, cold-load 5, and narrow geometry 3. The keyboard runs complete the nested correction in Chromium and Firefox. The parity runs compare independent ordinary/unmuted and reduced-motion/muted executions. The geometry runs verify zero document/body horizontal overflow, scene → program → feedback order, every visible Blockly block inside its host, every visible enabled control at least 44×44 CSS pixels, and a successful Playwright center trial-click. Screenshots support visual review but do not replace these geometry assertions.

## Progress, browser health, and release boundaries

The five-project suite covers Progress V3 schema, migrations and persistence; serialized CAS/Web Lock behavior; stale-write rejection; storage-event and no-storage-event conflict recovery; corrupt snapshot preservation; visible damaged-source download; Parent report/export/import; base-path navigation; local production-preview not-found behavior; console errors; HTTP failures; and page request failures. Collection is fail closed: unapproved request failures, unreadable response bodies, redirects, non-2xx responses, or an unhealthy console/page fail the run. The only synthetic navigation aborts and active exact lazy-chunk 503 responses admitted are the explicitly tested recovery cases.

E2E fault builds write to `dist-e2e`, never production `dist`. After the final E2E run, production `verify:bundle` rebuilt `dist`, its byte scan found none of the five storage-fault sentinels, and `dist-e2e` was removed. The local base path and local preview 404 behavior passed; **public deployment, public production 404 behavior, deployed-version matching, and public-network performance were not verified**.

The formal course catalogue and runtime keep `w1-m1`, `w1-m2`, and `w1-m3` as separate demand-loaded Experiences; `w1-m4+` remains the legacy lazy path. Ruyi Staff demand-load, visible scene/workspace recovery, and workspace locking during scene playback passed as maintained regression evidence. Those Ruyi results are not represented as Four Seas implementation behavior.

## Fixed performance budgets

The fixed cold ceilings were not raised: `w1-m1` and `w1-m2` remain 2.5 MiB (`2,621,440 B`), and `w1-m3` remains 2.75 MiB (`2,883,584 B`). The table records the largest final measurement observed across the five browser projects; smaller project values are not substituted for the maximum.

| Route | Maximum measured response bodies | Fixed limit | Headroom |
| --- | ---: | ---: | ---: |
| `w1-m1` | 2,611,081 B | 2,621,440 B | 10,359 B |
| `w1-m2` | 2,612,674 B | 2,621,440 B | 8,766 B |
| `w1-m3` | 2,769,840 B | 2,883,584 B | 113,744 B |

Cold collection blocks service workers, sends no-store headers, counts every HTTP(S) response instance including the external Blockly sprite, awaits each successful body, and fails on response/request health problems. Browser delivery differs slightly, so the maxima above are the conservative evidence values. The production static gate measured entry JS at **102.6 KiB gzip / 180 KiB** and the conservative homepage at **417.1 KiB / 650 KiB**. The `w1-m1` and `w1-m2` cold headroom is narrow and remains a material regression risk.

## Asset provenance and original-resolution QA

The formal `w1-m3` scene loads exactly six approved generated rasters. Each has one complete manifest row, a built-in image-generation prompt record, verified provenance, an exact Phaser preload slot, a build-resolvable hash, and `visual-qa-passed`. Weapons and the standalone Ruyi sabre are not loaded by Four Seas.

| Asset and Four Seas slot | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `background.webp` — scene background | 1600×900 | 113,490 | `f6400e2f443ad9403beedbeb1c074abe66fa5dad34faa9db5505891b775ea2f0` |
| `wukong.webp` — pre-equip hero | 640×640 | 21,426 | `af13ee6c8f6fe827add3f515245a3dfac4c6a8489bd07a101e905e3fdddee22e` |
| `wukong-regalia.webp` — equipped hero | 640×640 | 49,734 | `3ede82729e61451c768361702173801b8feca753fab6d1f877c812664447e39c` |
| `dragon-king.webp` — guide/authority actor | 640×640 | 34,806 | `8b9fe59c2fad5bb99b7a87f0dabcedbc9fa69c81c452b5e803dbfba58e3b78c8` |
| `regalia.webp` — crown, armor, matched boots cells | 1024×512 | 120,760 | `d3be678a2122fba8772efbb73cc6313f6dd129cb4b656cfb02ebe9c727af1ae3` |
| `effects.webp` — accepted, blocked, success cells | 1024×512 | 64,940 | `8bb99312a61a085f65a5e4384dc2c2f57a14771b8653cb3e9ea53cc2185a0230` |

The six files total 405,156 B. The asset gate decodes and traces all eight approved Dragon Palace files (434,944 B / 1,310,720 B), while this section claims only the six actually used by `w1-m3`. The generated regalia sheet and equipped-Wukong raster were inspected at original resolution: transparent edges are clean, complete silhouettes are sharp, the crown, armor and paired boots are distinct, equipped Wukong has all three items, and no weapon is present. No emoji, CSS/div art, hand-authored SVG, code-drawn illustration, or substitute box stands in for the scene art.

All five evidence files were generated by the same visible `@regalia-full @visual` path and inspected with original pixels, not edited after capture:

| Evidence | Dimensions | Bytes | SHA-256 | Original-resolution review |
| --- | ---: | ---: | --- | --- |
| [`screenshots/four-seas-regalia-1440.png`](screenshots/four-seas-regalia-1440.png) | 1440×2030 | 664,705 | `32c01a3070c04dde5d3a8588c138ae645d684a2a65e877c1414371baff0daa94` | Complete success state: equipped Wukong, Dragon King, real nested Blockly, ten trace rows, readable transcript and success controls; no clipping, overlap, or horizontal overflow. |
| [`screenshots/four-seas-regalia-768.png`](screenshots/four-seas-regalia-768.png) | 768×3082 | 1,063,716 | `e483757db81be335a9d1c7717b31e477d8f12c6bc6c7bfda18bc788f3b9be882` | Complete tablet success state with clear scene → program → feedback hierarchy and intact formal assets. |
| [`screenshots/four-seas-regalia-390.png`](screenshots/four-seas-regalia-390.png) | 390×4549 | 559,253 | `868c93d865140406c029c767429208934cc35b2f6d8e6095842f88552516edf5` | Complete touch success path; nested groups, controls, trace and transcript remain readable with no horizontal spill. |
| [`screenshots/four-seas-regalia-320.png`](screenshots/four-seas-regalia-320.png) | 320×4730 | 521,164 | `35dc704ba04b16279fbfe44eab2d2b877a1d4df42e7c7a1ec4ea30251f25f78e` | Narrow success path retains block/control geometry, formal scene semantics, hierarchy and feedback without clipping or obstruction. |
| [`screenshots/four-seas-regalia-wrong-order-768.png`](screenshots/four-seas-regalia-wrong-order-768.png) | 768×3101 | 1,041,138 | `d11ba0adbf1e1ccfd75c3277a26da4ece2a915c514be6b94b6456af6d356c8f2` | Genuine failure evidence: wrong south/west/north collection order, blocked Phaser scene, rejected crown effect, exact missing-north-boots feedback, and visible problem-block return control. It is not a success frame relabelled as failure. |

The success frames show the approved equipped-Wukong state rather than three loose gifts, which is the correct final scene semantics. The failure frame shows ordinary Wukong, Dragon King, the rejected crown and blocked effect. None shows a staff, sabre, or other weapon semantic mismatch.

## RED evidence and closure history

The final green result was reached through executable failures. The categories below distinguish product defects, evidence-boundary defects, and obsolete regression assumptions.

1. **Product architecture/performance:** a shared Four Seas catalogue leaked labels and Blockly-related runtime dependencies into the static entry. A zero-import neutral contract separated opcode/guard/limit data from lazy UI labels; the entry now excludes Blockly and Phaser.
2. **Evidence-boundary defects:** early source checks could report green while not proving every independent page health listener, every hidden browser-side write path, or every immutable health collection. Several RED contract iterations closed those gaps with AST/source assertions. This was test hardening, not a newly observed child-facing failure.
3. **Product responsive/accessibility:** the 320px Blockly host initially overflowed; visible controls initially measured 38px. The responsive host and control sizing were fixed, then the real browser geometry checks proved block containment, 44px targets, center hit, hierarchy, and zero horizontal overflow.
4. **Product performance:** cold `w1-m1`, `w1-m2`, and homepage paths exceeded their fixed budgets during intermediate runs. Import-graph and chunk architecture were reduced without raising ceilings. The final values pass, but `w1-m1` and `w1-m2` retain narrow headroom.
5. **Product persistence/accessibility:** storage failure recovery did not always focus the owning alert or problem block, and completion/session ownership could be released too early. The three transaction owners and replay lock now retain one recovery owner, keep unpublished data out of Progress V3, and restore focus through visible controls.
6. **Product cross-system evidence:** Parent initially exposed only aggregate evidence. The final path verifies visible `w1-m3` detail, export, a visible mutation, and file-input import restoring the exact nested session.
7. **Product recovery plus evidence boundary:** outer Experience, inner Scene, and inner Workspace lazy failures were not initially three independently healthy paths. Each layer now preserves the unaffected region and offers explicit visible retry; source checks require independent page health capture.
8. **Obsolete regression assumptions:** older foundation tests expected the previous shell and conflated the course catalogue with formal routes. They were updated to the current formal/legacy split and visible focus behavior; the historical shell is not counted as Four Seas evidence.
9. **Build side-effect boundary:** E2E fault sentinels could have contaminated the production directory without isolation. Fault builds now use `dist-e2e`; a production rebuild and byte scan prove the final `dist` has no test sentinel, and the E2E directory is cleaned.
10. **Evidence collection defect:** cold response accounting once raced outstanding bodies and could miss a late failure. The collector now waits for every body and fails closed before comparing the fixed budget.
11. **Maintained Ruyi product regression:** the verified broad sabre recovery path and workspace lock during scene playback were repaired and rerun. They protect the prior `w1-m2` claim but are not credited as `w1-m3` features.

## Commands and exact final results

```text
XIYOU_UPDATE_EVIDENCE=1 npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --grep @visual
env -u XIYOU_UPDATE_EVIDENCE npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --grep @visual
npx playwright test --list --reporter=list
npm run test:e2e
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npm audit --registry=https://registry.npmjs.org --audit-level=high
git diff --check
```

- Evidence update: **5/5 passed** in 2.2 minutes and created exactly the five listed PNG files.
- Ordinary non-update rerun: **5/5 passed** in 2.2 minutes; all five before/after SHA-256 values were identical (`SCREENSHOT_HASHES_UNCHANGED`).
- Playwright list: exactly **141 tests / 5 files**, partitioned 53 / 24 / 22 / 24 / 18; Four Seas is exactly **29 tests**.
- Final full Playwright run: **141/141 passed**, zero skips; request/response, console and page health checks remained fail closed.
- `npm test`: **44 unit files / 757 unit tests**, **135 bundle/source-contract tests**, and **32 asset tests** passed. These are separate suites and are not added into one misleading total.
- `npm run typecheck`: exit 0.
- `npm run verify:assets`: 8 files, 434,944 B / 1,310,720 B, all required rows `visual-qa-passed`.
- Production `npm run verify:bundle`: 135/135 contract tests; build completed; entry 102.6 KiB gzip / 180 KiB; homepage 417.1 KiB / 650 KiB; production sentinel scan passed.
- `npm audit --registry=https://registry.npmjs.org --audit-level=high`: `found 0 vulnerabilities`.
- `git diff --check`: no errors.
- Post-E2E: production `dist` rebuilt green, `dist-e2e` removed, worktree evidence changes limited to the requested screenshots and this document.

## Completion boundary and residual risks

This evidence package records the following evidence levels for double-review acceptance; it does not claim that the pending specification and quality reviews have already completed:

`w1-m3 四海披挂：One-level playable`

`w1-m1 龙宫求兵：One-level playable regression maintained`

`w1-m2 定海神针：One-level playable regression maintained`

`本地 Parent / saves 基础：System loop complete for the previously verified implemented local foundation only`

`其余 27 关、完整成长/神兽/装备/伙伴/战斗/奖励体系、公开部署：not complete`

`整站：not complete`

`w1-m3` is not claimed as System loop complete, Full-content verified, or Commercial production complete. The remaining risks are: narrow cold-load headroom for `w1-m1` and `w1-m2`; the external Blockly sprite on first load; incomplete provenance for existing site-wide JPEG/audio files; no public deployment, public production-404, deployed-version, or public-network performance evidence; and no playable/content evidence for the other 27 levels or the complete growth, divine-beast, equipment, companion, battle, and reward systems.
