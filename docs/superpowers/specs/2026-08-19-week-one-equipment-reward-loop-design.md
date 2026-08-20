# First-Week Equipment And Reward Loop Design

## Status and intended evidence level

This design follows the approved order:

1. Keep w1-m4 as a formal independent Blockly mission.
2. Keep w1-m5 as a formal independent Boss mission.
3. Add a real persistent reward and equipment loop across the first week.
4. Remove engineering provenance from the default child UI.
5. Re-verify all five missions in one browser matrix.

The equipment/reward system targets **System loop complete** for its relevant completion-matrix row. The first week must remain `not complete` at System loop and Full-content levels until every acceptance criterion below passes. The other 25 missions, complete growth, divine beasts, companions, and public deployment remain out of scope.

## Existing foundation to preserve

- w1-m4 and w1-m5 already have separate formal routes, visible Blockly graphs, deterministic traces, zero-penalty reducers, Progress V3 sessions, failure recovery, refresh/replay, CAS, Parent import-export, and five-project evidence in the current isolated worktree.
- `expectedSequence` and `LegacyMissionBuilder` remain forbidden for w1-m1 through w1-m5.
- Hints remain read-only. No equipment effect may connect, reorder, delete, run, or complete blocks.
- Existing fixed homepage, route-cold, raster, media, and entry budgets remain unchanged.

## Alternatives considered

### A. Learning-tool equipment — selected

Equipment changes optional reference and execution-inspection actions. It supports learning without changing program correctness or solving the task. It is testable across equip, unequip, failure, refresh, replay, and import-export.

### B. Combat-stat equipment

Attack, defense, speed, or life modifiers would currently be decorative because the first-week reducers intentionally have no damage or punitive resources. This approach is rejected until a genuine code-driven battle decision consumes those stats.

### C. Currency and upgrade equipment

Coins and upgrades would require prices, sinks, insufficient-resource behavior, balance design, and grinding safeguards. Adding currency now would create a counter without a real use. This approach is rejected for this scope.

## Reward catalogue and acquisition

The first loop reuses approved existing art and canon items; no placeholder or newly code-drawn art is allowed.

| Item | Slot | Granted after durable completion | Duplicate behavior |
| --- | --- | --- | --- |
| Ruyi Staff | weapon | w1-m2 | no-op; original grant timestamp retained |
| Phoenix-wing crown | head | w1-m3 | no-op; original grant timestamp retained |
| Golden chain armor | body | w1-m3 | no-op; original grant timestamp retained |
| Cloud-walking boots | feet | w1-m3 | no-op; original grant timestamp retained |

Rewards are published atomically with the mission completion transaction. A failed or conflicting completion write publishes neither completion nor reward. Replay never grants a second copy. Import and migration preserve the earliest valid grant record.

w1-m4 and w1-m5 do not create decorative currency. Their completion remains progression evidence and unlocks, while the previously earned equipment creates the later cross-level effects.

## Persistent data model

Progress V3 advances to `schemaRevision: 2` rather than creating an unrelated store. Revision 1 migrates deterministically with an empty inventory, then backfills only rewards whose prerequisite completion records already exist.

```ts
interface RewardEquipmentStateV1 {
  version: 1
  inventory: Record<EquipmentItemId, {
    grantedBy: 'w1-m2' | 'w1-m3'
    grantedAt: string
  }>
  equipped: {
    weapon: 'ruyi-staff' | null
    head: 'phoenix-crown' | null
    body: 'golden-chain-armor' | null
    feet: 'cloud-walking-boots' | null
  }
}
```

Schema validation rejects unknown items, wrong slots, equipped-but-unowned items, extra fields, invalid dates, and duplicate/forged grant provenance. Equip and unequip use the existing coordinated save/CAS transaction path. Clear, backup, corrupt recovery, and V1/V2/V3-revision-1 migrations include the equipment state.

## Equipment interaction and real effects

The growth map gains one keyboard- and touch-accessible equipment drawer. Each owned item shows its slot, current state, effect, and one `装备` or `卸下` action. The drawer uses approved existing Ruyi/regalia raster cells through cropping and positioning; it does not fabricate new illustrations.

Effects are available only while equipped and disappear immediately after unequipping:

### Ruyi Staff — weight reference

In the w1-m5 Dragon Palace comparison checkpoint, the child may manually open a facts-only weight reference. It lists the already taught candidate weights without selecting a block, identifying the correct answer, editing the graph, or running code.

### Phoenix-wing crown — decomposition view

In w1-m4 and w1-m5, the child may switch the current visible graph to a read-only grouped view of the containers they already created. The view shows the child's own current groups and child counts; it does not list missing required blocks or their correct order.

### Golden chain armor — accepted-prefix playback

After an incorrect run, the child may choose `回看已走通步骤`. Playback replays only the accepted events already present in that run result and stops before the rejected instruction. It never changes the workspace or converts failure into success.

### Cloud-walking boots — repeated problem navigation

The normal accessibility focus behavior remains available to every child. When boots are equipped, feedback additionally retains a visible `再次定位问题积木` action after focus has moved, allowing repeated navigation to the existing diagnostic source block. Unequipping removes only this extra repeated action, never baseline keyboard access.

## Child-facing provenance cleanup

The default w1-m3 child view replaces the open raw `sourceBlockId` and `parent=` list with child-readable execution labels such as `收下云履` and `穿上金甲`. Raw block, instruction, and parent IDs remain in Progress V3 and automated evidence but are not rendered in the ordinary production child UI.

No production query parameter or hidden child control exposes the raw identifiers. Developer diagnostics remain test-only. Parent reports show learning concepts, runs, adjustments, owned equipment, equipped slots, and active effects—not raw internal IDs.

## Failure and recovery behavior

- Equipping an unowned item or placing an item in the wrong slot fails closed and leaves the saved loadout unchanged.
- Duplicate grants never create multiple copies or alter the original grant time.
- Storage failure leaves the requested equip/unequip state visibly pending and exposes retry.
- CAS conflict offers backup and external-version reload; stale tabs cannot revive a removed item or old loadout.
- Malformed imports are rejected without modifying current progress.
- Corrupt recovery preserves the damaged source before restoring inventory and equipped state from a legal snapshot.
- There are no negative balances, payments, grinding, deadlines, life loss, or resource loss.

## Parent and cross-system evidence

The Parent report includes:

- rewards granted by w1-m2 and w1-m3;
- current weapon/head/body/feet loadout;
- which optional learning effects were invoked in w1-m4 and w1-m5;
- existing mission runs, adjustments, stars, and hint use.

Export, visible mutation, and file-input import must restore the exact inventory, equipped slots, item grant timestamps, mission sessions, and completion records.

## Unified five-mission browser matrix

The final suite keeps the five approved projects:

- desktop Chromium 1440x1024;
- tablet WebKit 768x1024;
- mobile Chromium 390x844 touch;
- desktop Firefox 1440x1024;
- narrow Chromium 320x844 touch.

Every project runs a visible w1-m1 -> w1-m5 path with no hidden completion or advanced-session injection. The matrix must additionally cover:

- one-time reward grants after w1-m2/w1-m3;
- equip, effect use, unequip, and effect removal in later missions;
- wrong program -> correction -> success for all five missions;
- refresh and reopen with stable workspaces and loadout;
- keyboard operation on Chromium and Firefox;
- touch and 44px controls at 390/320;
- reduced motion and mute parity;
- draft/run/completion/equipment save failures;
- CAS conflict, corrupt recovery, Parent export-import;
- route, chunk, image, and 404 failure handling;
- fail-closed console/request/response/page health;
- unchanged fixed performance budgets.

Source contracts continue to forbid E2E writes of w1-m1 through w1-m5 completion, sessions, inventory, or equipped state. Tests may inject only the exact earlier prerequisite state for a focused later-level scenario; the unified full-week path itself begins from initial progress.

## Completion criteria

The equipment/reward loop reaches `System loop complete` only when all of the following are fresh and green:

1. Visible mission completion grants real owned items exactly once.
2. The child can equip and unequip every owned item in a valid slot.
3. Each equipped item changes the approved later optional action, and unequipping removes that effect.
4. Inventory, grants, slots, effect use, sessions, and completions survive refresh, reopen, export-import, replay, migration, and corrupt recovery.
5. Invalid slots, unowned items, duplicate grants, storage failure, CAS conflict, and malformed imports fail safely.
6. The ordinary child UI contains no raw block IDs, instruction IDs, or parent IDs.
7. All five missions pass the unified five-project browser matrix without hidden shortcuts.
8. Unit, typecheck, asset, source-contract, bundle, production build, official audit, final-dist sentinel scan, and cleanup gates pass without raising budgets.

Until then, report the equipment/reward loop and the first-week system as `not complete`.

## Scope and integration boundary

This design applies to the current isolated worktree. It does not authorize commit, push, deploy, or overwriting the original repository worktree. Integration remains a separate explicit user decision.
