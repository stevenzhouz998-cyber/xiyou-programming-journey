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
