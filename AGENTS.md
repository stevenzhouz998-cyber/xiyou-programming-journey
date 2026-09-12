# AGENTS.md

## Approved W6-M2 Direction

- On 2026-09-12 the user approved dual-dimension fan classification with evidence selection and an insufficient-information practice card, delegated subsequent local decisions, and explicitly requested model-squad implementation to One-level playable. Preserve the approved bright storybook visuals and zero-penalty failures. Consume the valid W6-M1 saved work as read-only source records; separate fan authenticity from whether that attempt achieved extinguishing the fire and passage. The second attempt obtained the true fan but lost it afterwards. This is a local data-labeling experiment, not trained AI. See `docs/superpowers/specs/2026-09-12-week-six-evidence-classification-design.md`. Commit, push, merge and deployment are not authorized by this request.

## User Context

The user is a non-programmer using Codex for vibe coding. They cannot reliably review code, architecture, terminal output, or implementation details, but they can review complete product behavior, visible UI, wording, and whether the result matches the intended product rules.

The user also wants to learn from each project. Explain useful product, engineering, and workflow lessons in plain language, but do not slow the work down with unnecessary technical lectures.

## Working Principles

- Prioritize process quality and efficiency: understand the real project state, make focused changes, verify them, and hand back a usable result.
- Do not depend on the user to catch technical mistakes. Codex owns implementation judgment, safety, and verification.
- Ask the user to decide only when the choice affects product behavior, visual direction, cost, privacy, data safety, deployment, or long-term maintenance.
- When product rules are ambiguous, restate them plainly before broad changes. The user's latest product correction is authoritative.
- Keep changes small, reversible, and consistent with the existing project unless there is a clear reason to do otherwise.

## Default Workflow

1. Inspect the real current state first: git status, structure, entrypoints, and relevant code paths.
2. Briefly explain the product-level plan before significant edits.
3. Implement the focused change using existing project patterns.
4. Run relevant verification: tests, type checks, lint, build, or visual/manual checks.
5. Report in plain language: what changed, how it was checked, what the user should inspect, and whether anything was committed or pushed.

## Communication

- Use clear, direct Chinese by default.
- Keep updates concise and practical.
- Explain technical ideas only when they help the user learn or make a product decision.
- Translate code-level work into product-level meaning.
- Do not ask the user to review diffs or implementation details unless they explicitly request it.

## Safety

- Never make destructive changes or push code without explicit approval.
- Never revert user changes unless explicitly asked.
- If verification cannot be completed, say exactly what was not checked and why.
- If a change may affect user data, payments, authentication, deployment, or production behavior, call it out before proceeding.

## Project Skill Gate

- For every product, course, gameplay, growth, divine-beast, equipment, reward, battle, progress, parent, UI, asset, testing, or release task, read and follow `.agents/skills/xiyou-karpathy/SKILL.md` before acting.
- Never treat UI shells, configuration counts, static animation, happy-path demos, or partial tests as completed systems.
- Report completion using the evidence levels defined by `xiyou-karpathy`; do not use “全部完成” without full-system evidence.

## Commercial Delivery Standard

- The target is a genuine commercial-grade website, not a disposable prototype, thin MVP, staged demo, or phase-completion artifact.
- A feature is complete only when its player input, state transition, persistence, cross-system effect, failure behavior, accessibility, and real-browser path are implemented and verified.
- Rewards, growth, divine beasts, equipment, companions, and battle must change later player choices or gameplay. Decorative counters do not qualify as systems.
- Thirty-level completion requires level-by-level content, mode, progression, failure, persistence, and playable-path evidence. One tested level cannot stand in for the rest.
- Commercial completion also requires performance budgets, responsive layout, keyboard access, reduced motion, audio controls, child privacy, save recovery, asset provenance, deployment verification, and documented residual risk.

## Visual Asset Standard

- All shipped visual assets must be generated or edited with the environment's built-in image-generation or image-editing tools, or come from an approved existing project source with verified provenance.
- Do not use Flutter, SwiftUI, code-generated canvases, CSS art, div art, emoji, ASCII, placeholder boxes, hand-authored SVGs, or approximate code drawings as substitutes for finished illustrations, characters, divine beasts, scenes, equipment, magic items, effects, collectibles, or decorative assets.
- Use the closest reliable icon library for interface icons. Icons are UI symbols, not substitutes for illustration assets.
- CSS and Phaser may position, animate, crop, tint, or transition approved assets, but must not fabricate the final art itself.
- Every shipped asset must have a recorded purpose, source/tool, generation prompt or source reference, dimensions, license/provenance status, and the screen slots where it is used.
- Brainstorm sketches may use placeholders only when clearly labeled as non-shipping exploration. Replace every placeholder before visual QA and release.

--- project-doc ---

# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Approved First-Week System Direction

- Keep the formal w1-m4 then formal Boss w1-m5 sequence. Do not route either mission through legacy tools.
- After those mission loops, build real persistent rewards and equipment before claiming the first week is a system loop: Ruyi Staff, crown, armor, and boots must be obtained once, equipped and unequipped in real slots, survive recovery/export-import, and change later optional player actions.
- Approved equipment effects are learning-tool effects only: weight reference, task-decomposition view, accepted-prefix playback, and repeated problem-block navigation. They must never edit Blockly, run code, reveal an ordered answer, or complete a mission.
- Do not add currency until it has a real consumable sink; decorative balances are forbidden.
- Remove raw block IDs, instruction IDs, and parent IDs from the default child experience. Engineering provenance may remain in persisted evidence and automated tests, not the ordinary child UI.
- The first week remains `not complete` at `System loop complete` and `Full-content verified` until this reward/equipment loop and the unified five-mission browser matrix pass.

## Approved W2-M4 Gameplay Direction

- Build `w2-m4 八卦炉脱身` as a real Blockly `repeat until` condition-debugging mission, not a legacy sequence reskin.
- The default visible program uses the intentionally wrong condition `眼睛被烟熏红`. The child must replace it with the single story-sensor condition `听见炉头声响并看见光明`; `烟雾完全散去` is the never-true distractor.
- The visible story program is: enter the furnace, shelter in the Xun position, repeat seven-day waits and furnace-door observations until the selected condition becomes true, then leap out and kick over the furnace.
- The correct condition completes seven iterations and forty-nine story days. An early-true condition must fail visibly at the real condition block; a never-true condition must stop at a deterministic safety bound with zero loss of lives, resources, or stars.
- Do not introduce child-built Boolean composition in this mission; multi-condition construction remains later-course scope. Preserve the existing bright 3D children's storybook visual direction.
- The maximum completion claim for this task is `One-level playable`. W2-M5, the week-two system loop, full-content verification, and public deployment remain `not complete`.

## Approved W2-M5 Boss Gameplay Direction

- Build `w2-m5 天宫总试炼` as one real Blockly heavenly-signal dispatcher, not a legacy sequence reskin or four separate miniature missions.
- The visible workspace has five event hats for stable duty, returning to Flower-Fruit Mountain, the formal heavenly title, the Peach Banquet message, and furnace refining. A fixed canonical signal queue dispatches those events, but every handler action, loop count, action order, and repeat-until condition comes only from the child's connected graph.
- The default graph contains four real bugs: horse care repeats twice instead of three times; the flag and formal title actions are routed to the wrong event hats; the golden elixir runs before stumbling into Tusita Palace; and the furnace exits on red eyes instead of the furnace-opening signal.
- Runtime feedback reveals only the first blocking bug and focuses its real Blockly source. Assistance may explain the concept but must not edit, reorder, run, or finish the graph.
- A correct graph produces three horse-care iterations, correct event routing, the five-step Peach/Tusita order, and seven furnace rounds totaling forty-nine days. All failures cost zero lives, resources, and stars.
- The Buddha palm wager and Five Elements Mountain are a fixed, clearly labelled canon epilogue after the child-authored trace reaches furnace escape. They are not child-authored punishment commands, are not part of the canonical instruction trace, and cannot turn an incomplete graph into success.
- The maximum completion claim for this task is `One-level playable`. Completing this Boss may unlock W3-M1 and feed the parent report, but does not by itself prove the week-two system loop, full-content verification, or public deployment.

## Approved W3-M5 Boss Gameplay Direction

- Build `w3-m5 第三周总试炼（高老庄总试炼）` as one real Blockly story state machine, not a legacy sequence reskin or four independently completable mini-missions.
- One visible connected workspace and one full-run entry process the public evidence flow from manor request through disguise, Yunzhan dialogue, and Bajie joining. Correct canon actions advance one shared public story state; practice cards never advance it.
- The default valid graph has four sequentially blocking bugs: an overbroad manor-request condition, a second disguise gate that confuses appearance with identity, swapped Yunzhan branch actions, and `OR` instead of `AND` at the joining gate. Runtime reveals only the first real blocker; the child must rerun the whole graph after each repair.
- The fixed input queue and canon replay are scenario data, not an answer source. Every condition, field, branch connection, action, state transition, canonical trace, failure, and success must come from the saved visible graph through compiler and deterministic runner. No stage skip, per-stage completion, hidden cached prefix, `expectedSequence`, React state, coordinates, animation, or test injection may determine success; any separately approved accepted-prefix playback remains presentation-only and must revalidate the current visible graph.
- Assistance may show only saved failure facts and must not edit, run, reorder, reveal the correct condition/connection/operator, skip a stage, or finish the mission. All failures cost zero lives, resources, and stars.
- Preserve W3-M1 through W3-M4 story and formal-proof boundaries. W3-M5 replays chapters 18–19 without making story order, combat, punishment, naming, or ordination child-authored commands.
- Formalization advances Progress to revision 7. Old W3-M5 completion remains `legacy-replay-only` and never fabricates a workspace, trace, run, session, or formal proof; a complete formal replay may upgrade it to `formal-v3` while preserving history.
- Formal W3-M5 completion must persistently unlock W4-M1 and add a non-answer parent summary. It adds no decorative currency or reward.
- The maximum single-level claim is W3-M5 `One-level playable`. Third-week `System loop complete` requires a fresh W3-M1 through W3-M5 unified browser matrix and every relevant completion-matrix cell; without public-deployment evidence required by the current UI/release row, it remains `not complete`.

## Engineering Efficiency

- Start with `docs/engineering/current-work.md`; confirm its checkout and current Git state before implementation. It is a dated pointer, not authorization or proof of completion.
- Default to one implementation owner per complete feature chain. Delegate only independently useful work under current authorization; do not create an implementer plus two reviewers for every small task. Review concrete high-risk boundaries and the integrated result, and verify important findings directly.
- Approved plans and gameplay decisions remain valid until relevant facts change. Old plan templates that recommend compulsory subskill chains or per-task double review do not override these project rules. Do not reopen design or copy entire plans merely to resume work.
- Use the validation tiers and evidence rules in `docs/engineering/verification.md`. Reuse a successful check only when its relevant inputs, environment, scope and assumptions remain valid. Expand or repeat checks for new changes, failures or a concrete unresolved risk, never solely because another agent or turn finished.
- Batch related browser specs for the same source state into one Playwright invocation, preserving required projects and fault coverage. Retain the current worker count until a measured isolation/resource check supports changing it. Do not hide known failures or equate a targeted pass with full-site health.
- Keep raw logs in local artifacts; read summaries and relevant failure excerpts. At natural design/implementation/acceptance boundaries, hand off decisions, exact checkout, changed files, valid evidence and remaining failures instead of replaying the entire history. Do not split a task merely to satisfy a token threshold.
- Stop review when the required evidence is sufficient and concrete findings are resolved. Report actual validation duration and scope; token comparisons must separate cached input and avoid summing inherited cumulative totals. Never promise savings without a comparable measurement.
- These rules preserve player behavior, persistence/recovery, restricted execution, accessibility, browser coverage and all commercial delivery standards above.

## W4-M4 Delegated Gameplay Decision

- On 2026-09-09 the user authorized the agent to choose the best W4-M4 gameplay and complete local implementation/validation without presenting choices again. Preserve the selected list-and-loop observation-book direction in `docs/superpowers/specs/2026-09-09-week-four-python-list-loop-design.md` unless relevant facts change.
- The visible appearances list and loop recording argument jointly determine actual Python iteration evidence. Default list order and fixed-literal recording are independent learning mistakes. Keep prior W4 proofs, zero-penalty failure, historical provenance and read-only formal replay. Canon banishment is a fixed story epilogue, never a child command or failure penalty.
- On 2026-09-11 the user additionally authorized committing and pushing this W4-M4 change to the current branch. Merging and deploying remain outside this authorization.

## Approved W4-M5 Direction

- User approved the agent-selected white-tiger-ridge verification station on 2026-09-11. One visible Python program processes two fully public card orders, including an explicitly non-canon same-appearance/different-identity practice card. Preserve the fourth-week storybook visuals and zero-penalty learning failures. See `docs/superpowers/specs/2026-09-11-week-four-verification-station-design.md`.

- On 2026-09-11 the user additionally authorized a handoff and committing/pushing W4-M5 to the current branch. This does not authorize merging or deployment.

## Approved W5-M1 Direction

- On 2026-09-11 the user approved the recommended per-monk rescue loop and delegated subsequent local gameplay and implementation decisions. Preserve the existing bright storybook visual style. Teach the scope of a for-loop body: each practice monk needs release then registration; the default final registration is outside the loop. Practice identities and procedures are explicitly non-canon abstractions. See `docs/superpowers/specs/2026-09-11-week-five-monks-loop-design.md`. On 2026-09-11 the user additionally authorized a handoff and committing/pushing W5-M1 to the current branch. Merging and deployment remain outside this authorization.

## Approved W5-M2 Direction

- On 2026-09-11 the user approved the recommended W5-M2 no-argument function lesson and delegated subsequent local gameplay and implementation decisions. The visible default program correctly defines `record_sanqing()` with the two ordered teaching-record actions `record_arrival()` and `record_names()`, but deliberately omits the call. A definition prepares reusable steps; only a real call may execute them. Missing, repeated, incomplete, reversed, and out-of-body actions are zero-penalty learning failures. Parameters remain W5-M3 scope. The actions are explicitly labelled as a teaching recap abstraction and never ask the child to author desecration or combat. Preserve W5-M1 and earlier formal proofs. See `docs/superpowers/specs/2026-09-11-week-five-function-call-design.md`. Local implementation and validation are authorized. On 2026-09-11 the user additionally authorized a handoff and committing/pushing W5-M2 to the current branch. Merging and deployment remain outside this authorization.

## Approved W5-M3 Direction

- On 2026-09-11 the user approved the recommended W5-M3 parameter lesson and delegated all subsequent local details, implementation and validation, explicitly requesting model-squad. One visible `weather(order)` function receives four direct calls with 风、云、雷、雨. Its default body incorrectly records the fixed literal 风; the child observes each actual argument and record, then changes the body to use `order`. Editable call arguments, missing/repeated/reordered calls and fixed body literals produce zero-penalty failures. This mission introduces parameter binding without another loop puzzle. The four teaching records cover a selected story segment; clearing rain remains a fixed canon epilogue. Preserve the existing bright storybook style and all earlier formal proofs. See `docs/superpowers/specs/2026-09-11-week-five-function-parameter-design.md`. Commit, push, merge and deploy are not authorized for this change.

## Approved W5-M4 Direction

- On 2026-09-11 the user approved W5-M4 as a problem-decomposition lesson and delegated subsequent local details, implementation and validation. One visible Python program defines three small no-argument functions for meditation, guessing the hidden object and the final three story records, then a `record_five_trials()` coordinator calls them in story order. The default program has one record in the wrong small function and omits one coordinator call; its five visible action strings therefore cannot prove success without real function ownership and nested-call evidence. Children repair both issues without learning `return`. Every action is explicitly a teaching record of the story, never an authored injury instruction; failures cost zero lives, resources and stars. Preserve W5-M3 and all earlier formal proofs. See `docs/superpowers/specs/2026-09-11-week-five-problem-decomposition-design.md`. Commit, push, merge and deploy are not authorized for this change.

## Approved W5-M5 Direction

- On 2026-09-11 the user approved W5-M5 as one visible Python story orchestration lesson and delegated all local details, implementation and validation. `record_chechi_story()` must run the monks rescue, Sanqing record, parameterized weather sequence and later-trial decomposition in story order; function definitions may appear in any order, while real calls, ownership, loop iterations and parameter binding must prove the run. The default program has four sequential blockers: registration outside the monks loop, omitted Sanqing call, fixed weather literal and swapped first two later-trial calls. Each rerun executes the whole saved program and reveals only the first blocker. No new syntax is introduced, failures cost zero lives/resources/stars, and all actions are teaching records. Preserve W5-M1 through W5-M4 proofs, works, equipment and history. See `docs/superpowers/specs/2026-09-11-week-five-story-orchestration-design.md`. On 2026-09-12 the user authorized handoff, commit and push for this work on the current branch. Merge and deployment remain unauthorized.

## Approved W6-M1 Direction

- On 2026-09-12 the user approved the structured-records lesson, delegated subsequent local decisions and implementation, explicitly requested model-squad, and required One-level playable. One visible Python list contains three dictionaries with named fields for borrowing attempt and outcome; a real loop calls `record_attempt` with values read from the current record. The default valid program mistakenly reads the attempt field twice, making the actual result table repeat attempt labels in its outcome column. One field-reading repair produces the real fact table. Preserve bright storybook visuals, zero-penalty failures, non-solving assistance, restricted same-origin Worker execution, formal proof, recovery and earlier works/equipment/history. See `docs/superpowers/specs/2026-09-12-week-six-structured-records-design.md`.
- The user also approved necessary canon corrections in existing W6 configurations: the first attempt obtains a false fan; the second obtains the true fan before the disguised Bull Demon King takes it back; the third ultimately borrows the true fan and extinguishes the fire. This does not authorize formal M2–M5 implementation, rewriting historical saves, commit, push, merge or deployment.
