# AGENTS.md

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
