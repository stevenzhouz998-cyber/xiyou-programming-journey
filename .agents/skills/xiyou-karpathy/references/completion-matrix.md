# Completion Evidence Matrix

Use this matrix to judge the minimum evidence for each system. Every cell in a row is mandatory: if any column lacks evidence, that system has not reached **System loop complete**. Relevant rows are those directly modified by the task, read from or written to as dependencies, or affected through a user-observable path. **Commercial production complete** always requires all nine rows plus the global release checklist; it is not limited to relevant rows.

Configuration counts, visible UI, static animation, happy-path demos, and partial tests are not completion evidence by themselves.

## Strictly Cumulative Completion Levels

Each level requires all evidence from every earlier level:

1. **Design complete:** behavior, risks, and executable acceptance criteria are documented.
2. **Configuration complete:** the full intended content is configured and validated structurally; configuration is not evidence of runtime behavior.
3. **Prototype demonstrable:** a declared demonstration path works, with explicit evidence that it is non-production.
4. **One-level playable:** one level has a complete real-browser loop from player input through state change, persistence, failure, refresh, and recovery.
5. **System loop complete:** every cell of every relevant matrix row is satisfied with executable evidence.
6. **Full-content verified:** all content items pass automated validation, and real-browser sampling covers every distinct interaction or mode plus boundary content such as first, middle, and last items.
7. **Commercial production complete:** all nine matrix rows and every item in the global release checklist pass.

## Global Release Checklist

- Before implementation begins, record supported viewports, browsers, input methods, and quantitative performance budgets. Missing or after-the-fact targets fail this gate; this matrix does not invent fixed values.
- Real-browser evidence covers every distinct interaction mode and boundary content, including first, middle, and last cases, using child-style input without hidden shortcuts.
- Verify child privacy, responsive layout, keyboard access, reduced motion, audio and mute controls, save recovery, asset-to-build matching, versioned public deployment, console health, and 404 behavior.
- Record residual risks and their user impact rather than silently excluding them.

| System | Required real behavior | Persistence and cross-system evidence | Failure and browser evidence |
| --- | --- | --- | --- |
| Course / 30 levels | Every level has a distinct learning interaction and verified canon content. | Unlocks, rewards, and mastery persist and change later choices. | An automated path passes for every level; real-browser play covers every distinct interaction or mode and boundary levels, completed with child-style input that uses no hidden shortcuts. |
| Blockly | Visible connected blocks generate the actual executable action trace. | Refresh restores the same executable trace, not merely the block appearance. | Reordering, deletion, and illegal shapes produce real, understandable feedback in the browser. |
| Python | CodeMirror content executes in a restricted Worker. | Code, output, attempts, and saved works persist. | Tests cover syntax errors, imports, file or browser access, infinite loops, and load failure. |
| AI lab | A local dataset drives classification, prompting, bias exploration, and fact-checking. | Results change mastery and parent reports. | Ambiguous inputs and incorrect evidence receive deterministic feedback. |
| Growth / rewards / equipment | Resources are consumable. Magic items and equipment can be obtained, equipped, and unequipped, and their real effects change later player choices or code-driven battle behavior rather than acting as numbers or decoration. | Balances, inventory, equipped state, and effects remain correct across reload, export-import, replay, and later levels. | No dead ends, negative balances, forced grinding, or decorative rewards. Real-browser checks cover insufficient resources, invalid equipment slots, duplicate purchase or grant, and effect removal after unequipping. |
| Divine beasts | The child can obtain one bonded main beast and five companions. After acquisition, optional repeatable care interactions produce immediate feedback, update a persistent relationship state, and change which assistance is later available. Equipped assistance can be invoked. | Bond, skills, home state, equipment, care outcomes, and later-level use persist. The core growth target is reachable within at most seven consecutive calendar days from acquisition under a controllable test clock. | The seven-day path cannot depend on payment, limited-time anxiety, or forced grinding. Assistance never edits, attacks, solves, or completes for the child and can never replace the child's operation. |
| Battle | Code is the battle command, and the child's code trace drives every action. | Results feed progression and replay state. | Incorrect logic causes incorrect actions, but never removes life or otherwise punishes the child. |
| Parent / saves | PIN, reports, works, export-import, clear, and migration are functional. | Recovery preserves the corrupted source before repair or replacement. | Verify refresh, reopen, malformed imports, and version migration. |
| UI / release | Main paths support target viewports and keyboard operation; the asset manifest and versioned deployment match the build. | Public deployment preserves responsive behavior and save recovery, with child-privacy controls and residual risks documented. | Verify contrast, focus, reduced motion, mute, performance, console health, 404 behavior, child privacy, responsive layouts, save recovery, and the public deployment in real browsers. |
