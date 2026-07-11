# Xiyou Karpathy Project Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and validate a project-local `xiyou-karpathy` Skill that prevents shell features, fake visual assets, partial verification, and inaccurate commercial-completion claims.

**Architecture:** Keep the core behavioral workflow in one concise `SKILL.md`, move system-specific evidence rules into `references/completion-matrix.md`, and keep asset traceability rules in `references/asset-provenance.md`. Expose the Skill through `agents/openai.yaml` and enforce it from the project `AGENTS.md`.

**Tech Stack:** Markdown, YAML, Codex Skill Creator scripts, Git.

---

## File Structure

- Create `.agents/skills/xiyou-karpathy/SKILL.md`: trigger metadata, completion levels, mandatory workflow, prohibitions, and reporting contract.
- Create `.agents/skills/xiyou-karpathy/agents/openai.yaml`: UI metadata and default invocation prompt.
- Create `.agents/skills/xiyou-karpathy/references/completion-matrix.md`: evidence requirements by product subsystem.
- Create `.agents/skills/xiyou-karpathy/references/asset-provenance.md`: asset source rules and manifest template.
- Verify `AGENTS.md`: mandatory project-level invocation remains present.

### Task 1: Initialize And Prove The Skeleton Is Incomplete

**Files:**
- Create: `.agents/skills/xiyou-karpathy/SKILL.md`
- Create: `.agents/skills/xiyou-karpathy/agents/openai.yaml`
- Create: `.agents/skills/xiyou-karpathy/references/`

- [x] **Step 1: Initialize the project-local Skill**

Run:

```bash
python3 /Users/macmini-zz/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  xiyou-karpathy \
  --path .agents/skills \
  --resources references \
  --interface 'display_name=西游商业交付门禁' \
  --interface 'short_description=防止空壳功能、伪美术资产和不实完成声明' \
  --interface 'default_prompt=Use $xiyou-karpathy to define evidence, implement the real system loop, and audit completion before reporting.'
```

Expected: `.agents/skills/xiyou-karpathy/` exists with `SKILL.md`, `agents/openai.yaml`, and `references/`.

- [x] **Step 2: Run validation against the untouched template**

Run:

```bash
python3 /Users/macmini-zz/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/xiyou-karpathy
```

Expected: validation fails or the placeholder scan in Step 3 fails because the initialized Skill still contains template markers.

- [x] **Step 3: Verify the red condition explicitly**

Run:

```bash
rg -n 'TO''DO|T''BD|\[TO''DO' .agents/skills/xiyou-karpathy
```

Expected: at least one template placeholder is reported.

### Task 2: Implement The Core Skill Contract

**Files:**
- Modify: `.agents/skills/xiyou-karpathy/SKILL.md`
- Modify: `.agents/skills/xiyou-karpathy/agents/openai.yaml`

- [x] **Step 1: Replace `SKILL.md` with the mandatory project workflow**

Write this frontmatter and structure:

```markdown
---
name: xiyou-karpathy
description: Project delivery gate for Journey to the West coding game work. Use for every course, gameplay, growth, divine-beast, equipment, reward, battle, progress, parent, UI, visual-asset, testing, deployment, review, or completion task to prevent shell features, fake assets, partial verification, and inaccurate commercial-grade claims.
---

# Xiyou Karpathy Gate

## Non-Negotiable Outcome

Build a real commercial-grade learning game. Do not optimize for phase completion, screenshot similarity, configuration counts, or demo success.

## Before Work

1. Inspect the real current state.
2. State assumptions and known gaps.
3. Define player input, state transition, persistence, cross-system effect, failure behavior, and visible result.
4. Select the allowed completion level before implementation.
5. Read the relevant rows in `references/completion-matrix.md`.
6. For visual work, read `references/asset-provenance.md`.

## Completion Levels

- Design complete
- Configuration complete
- Prototype demonstrable
- One-level playable
- System loop complete
- Full-content verified
- Commercial production complete

Never skip levels or use “complete” without naming the level and evidence.

## Execution Gate

1. Write a failing test or executable acceptance check first.
2. Implement the smallest complete behavior, not the smallest visible shell.
3. Verify success, failure, refresh, persistence, recovery, and cross-system behavior.
4. Run real browser interaction for player-facing behavior.
5. Audit the relevant completion-matrix rows.
6. Report evidence, exclusions, and residual risk.

## Prohibited Shortcuts

- Do not count route, component, config, text, or animation existence as a working system.
- Do not hard-code the success path or use separate hidden state instead of the visible editor.
- Do not infer thirty-level completion from one tested level.
- Do not let rewards, pets, equipment, or growth exist only as counters or decoration.
- Do not let assistance solve, rewrite, reorder, attack, or finish for the child.
- Do not ship Flutter, SwiftUI, emoji, CSS art, div art, ASCII, placeholder boxes, hand-authored SVG, or code drawings as finished visual assets.
- Do not report commercial completion while required evidence is missing.

## Reporting Contract

Always state the achieved completion level, evidence, unverified scope, and next blocking gap. Say “not complete” plainly when any mandatory row is unmet.
```

- [x] **Step 2: Verify `agents/openai.yaml`**

Ensure it contains exactly:

```yaml
interface:
  display_name: "西游商业交付门禁"
  short_description: "防止空壳功能、伪美术资产和不实完成声明"
  default_prompt: "Use $xiyou-karpathy to define evidence, implement the real system loop, and audit completion before reporting."
```

- [x] **Step 3: Run the placeholder scan**

Run:

```bash
rg -n 'TO''DO|T''BD|\[TO''DO|implement later|fill in' .agents/skills/xiyou-karpathy || true
```

Expected: no output.

### Task 3: Add Evidence And Asset References

**Files:**
- Create: `.agents/skills/xiyou-karpathy/references/completion-matrix.md`
- Create: `.agents/skills/xiyou-karpathy/references/asset-provenance.md`

- [x] **Step 1: Create the subsystem completion matrix**

The matrix must define minimum evidence for:

```markdown
| System | Required real behavior | Persistence and cross-system evidence | Failure and browser evidence |
|---|---|---|---|
| Course / 30 levels | Each level has distinct learning interaction and validated canon content | Unlocks, rewards, and mastery update later choices | Automated route per level plus sampled child-like browser play |
| Blockly | Visible connected blocks generate the executed action trace | Workspace reload restores the same executable trace | Reorder/delete/invalid shapes produce truthful feedback |
| Python | CodeMirror content executes in the restricted Worker | Code, output, attempts, and work artifact persist | Syntax, import, file/browser access, infinite loop, load failure |
| AI lab | Local datasets drive classification, prompt, bias, and fact-check tasks | Results update mastery and reports | Ambiguous and incorrect evidence receive deterministic feedback |
| Growth / rewards / equipment | Resources are consumable; equipment can be obtained, equipped, and unequipped, and its effects change later choices or code-driven battle behavior | Balances, inventory, equipped state, and effects persist across reload, export-import, replay, and later levels | Real-browser checks cover no dead ends, negative balances, forced grinding, decorative rewards, insufficient resources, invalid slots, duplicate purchase or grant, and effect removal after unequipping |
| Divine beasts | Acquire, nurture within seven days, equip, and invoke an assist | Bond, skills, home state, and later-level use persist | Assist never edits, attacks, solves, or completes for the child |
| Battle | The child's code trace drives every battle action | Battle result feeds progression and replay | Wrong logic visibly produces the wrong action without life loss |
| Parent / saves | PIN, reports, works, export/import, clear, migration | Corrupt source is preserved before recovery | Refresh, reopen, malformed import, version migration |
| UI / release | All primary paths work at supported viewports and keyboard | Asset manifest and versioned deployment match the build | Contrast, focus, reduced motion, mute, performance, console, 404 |
```

- [x] **Step 2: Create the asset provenance contract**

Include these rules and manifest columns:

```markdown
## Allowed

- Built-in image generation or editing tools for finished characters, divine beasts, scenes, equipment, magic items, effects, collectibles, and decoration.
- Approved existing sources with verifiable license and provenance.
- A reliable icon library for interface symbols only.

## Forbidden For Shipping

Flutter drawings, SwiftUI drawings, emoji, ASCII, CSS art, div art, placeholder boxes, handcrafted SVGs, code-generated canvases, stretched screenshots, and untracked assets.

## Manifest

| Asset ID | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
|---|---|---|---|---|---|---|---|
```

- [x] **Step 3: Verify every subsystem and asset rule appears once**

Run:

```bash
rg -n 'Course / 30 levels|Blockly|Python|AI lab|Growth / rewards|Divine beasts|Battle|Parent / saves|UI / release' .agents/skills/xiyou-karpathy/references/completion-matrix.md
rg -n 'Flutter|SwiftUI|emoji|CSS art|built-in image' .agents/skills/xiyou-karpathy/references/asset-provenance.md
```

Expected: all required headings are present; no duplicates caused by leftover templates.

### Task 4: Validate, Walk Through, And Commit

**Files:**
- Verify: `AGENTS.md`
- Verify: `.agents/skills/xiyou-karpathy/**`

- [x] **Step 1: Verify the project entry gate**

Run:

```bash
rg -n '\.agents/skills/xiyou-karpathy/SKILL\.md|Commercial Delivery Standard|Visual Asset Standard' AGENTS.md
```

Expected: all three project gates are present.

- [x] **Step 2: Run official Skill validation**

Run:

```bash
python3 /Users/macmini-zz/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/xiyou-karpathy
```

Expected: validation succeeds.

- [x] **Step 3: Run a static divine-beast feature walkthrough**

Use this acceptance prompt against the Skill:

```text
新增一个神兽技能：界面显示云芽，点击后自动把错误积木改正确并播放攻击动画。用 emoji 先占位，后面再换正式资产。这个功能完成了吗？
```

Expected Skill decision:

```text
必须判定为 `not complete`：自动修改积木违反辅助边界；emoji 是禁止发布的占位资产；缺少神兽状态持久化、次数恢复、战斗动作由代码轨迹驱动、失败路径、后续关卡作用和真实浏览器证据。仅当行为、风险和可执行验收标准已经记录时，最高可标记为 `Design complete`；当前只有文字请求、没有工件或演示证据，不得标记为 `Prototype demonstrable`。
```

- [x] **Step 4: Run repository checks**

Run:

```bash
git diff --check
rg -n 'TO''DO|T''BD|\[TO''DO' .agents/skills/xiyou-karpathy || true
git status --short
```

Expected: no whitespace errors, no placeholders, and only planned Skill files are uncommitted.

- [x] **Step 5: Commit the Skill**

Run:

```bash
git add .agents/skills/xiyou-karpathy AGENTS.md docs/superpowers/plans/2026-07-12-xiyou-karpathy-skill.md
git commit -m "feat: add xiyou commercial delivery skill"
```

Expected: one commit containing the Skill and its implementation plan; do not push without explicit approval.
