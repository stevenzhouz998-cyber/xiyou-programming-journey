import { describe, expect, it } from 'vitest'
import { runFourSeasRegalia } from './fourSeasRegalia'
import type { FourSeasInstruction, FourSeasOpcode } from './types'

const instruction = (
  sourceBlockId: string,
  opcode: FourSeasOpcode,
  parentBlockId: string | null,
): FourSeasInstruction => ({
  instructionId: `instruction:${sourceBlockId}`,
  sourceBlockId,
  parentBlockId,
  opcode,
})

const correctTrace = (): FourSeasInstruction[] => [
  instruction('request', 'request_regalia', null),
  instruction('collect', 'collect_gifts', null),
  instruction('boots-gift', 'receive_cloud_boots', 'collect'),
  instruction('armor-gift', 'receive_golden_armor', 'collect'),
  instruction('crown-gift', 'receive_purple_crown', 'collect'),
  instruction('equip', 'equip_regalia', null),
  instruction('crown-wear', 'wear_crown', 'equip'),
  instruction('armor-wear', 'wear_armor', 'equip'),
  instruction('boots-wear', 'wear_boots', 'equip'),
  instruction('verify', 'verify_regalia', null),
]

const zeroPenalty = { livesLost: 0, resourcesLost: 0, starsLost: 0 }

describe('four seas regalia battle domain', () => {
  it('completes only the exact nested gift and equipment sequence', () => {
    const result = runFourSeasRegalia(correctTrace())

    expect(result).toMatchObject({
      completed: true,
      finalState: 'regalia-verified',
      diagnostic: null,
      penalty: zeroPenalty,
    })
    expect(result.events.filter((event) => event.type === 'state-changed').map((event) => event.state)).toEqual([
      'regalia-requested',
      'collecting-gifts',
      'cloud-boots-received',
      'golden-armor-received',
      'all-gifts-received',
      'equipping-regalia',
      'crown-equipped',
      'armor-equipped',
      'regalia-equipped',
      'regalia-verified',
    ])
    expect(result.events.filter((event) => event.type === 'run-started')).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'run-finished')).toHaveLength(1)
  })

  it.each([
    {
      name: '金冠早于云履',
      trace: [
        instruction('request', 'request_regalia', null),
        instruction('collect', 'collect_gifts', null),
        instruction('crown-too-soon', 'receive_purple_crown', 'collect'),
      ],
      state: 'collecting-gifts',
      rejected: 'crown-too-soon',
      concept: 'sequence-precondition',
    },
    {
      name: '穿甲早于戴冠',
      trace: [
        ...correctTrace().slice(0, 6),
        instruction('armor-too-soon', 'wear_armor', 'equip'),
      ],
      state: 'equipping-regalia',
      rejected: 'armor-too-soon',
      concept: 'sequence-precondition',
    },
    {
      name: 'receive 放入 equip',
      trace: [
        instruction('request', 'request_regalia', null),
        instruction('collect', 'collect_gifts', null),
        instruction('gift-in-equip', 'receive_cloud_boots', 'equip'),
      ],
      state: 'collecting-gifts',
      rejected: 'gift-in-equip',
      concept: 'container-scope',
    },
    {
      name: 'wear 放入 collect',
      trace: [
        ...correctTrace().slice(0, 6),
        instruction('wear-in-collect', 'wear_crown', 'collect'),
      ],
      state: 'equipping-regalia',
      rejected: 'wear-in-collect',
      concept: 'container-scope',
    },
    {
      name: '缺少礼物子任务后进入穿戴',
      trace: [
        instruction('request', 'request_regalia', null),
        instruction('collect', 'collect_gifts', null),
        instruction('boots', 'receive_cloud_boots', 'collect'),
        instruction('equip-too-soon', 'equip_regalia', null),
      ],
      state: 'cloud-boots-received',
      rejected: 'equip-too-soon',
      concept: 'sequence-precondition',
    },
    {
      name: '重复动作',
      trace: [
        instruction('request', 'request_regalia', null),
        instruction('collect', 'collect_gifts', null),
        instruction('boots', 'receive_cloud_boots', 'collect'),
        instruction('boots-again', 'receive_cloud_boots', 'collect'),
      ],
      state: 'cloud-boots-received',
      rejected: 'boots-again',
      concept: 'sequence-precondition',
    },
    {
      name: '提前验证',
      trace: [instruction('verify-too-soon', 'verify_regalia', null)],
      state: 'awaiting-request',
      rejected: 'verify-too-soon',
      concept: 'sequence-precondition',
    },
    {
      name: '子任务引用错误的容器 ID',
      trace: [
        instruction('request', 'request_regalia', null),
        instruction('collect', 'collect_gifts', null),
        instruction('wrong-container', 'receive_cloud_boots', 'some-other-collect'),
      ],
      state: 'collecting-gifts',
      rejected: 'wrong-container',
      concept: 'container-scope',
    },
    {
      name: '子任务没有当前可见容器',
      trace: [instruction('orphan-child', 'receive_cloud_boots', null)],
      state: 'awaiting-request',
      rejected: 'orphan-child',
      concept: 'container-scope',
    },
  ] as const)('拒绝$name，并精确指向真实问题积木', ({ trace, state, rejected, concept }) => {
    const result = runFourSeasRegalia(trace)

    expect(result).toMatchObject({ completed: false, finalState: state, penalty: zeroPenalty })
    expect(result.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      concept,
      instructionId: `instruction:${rejected}`,
      sourceBlockId: rejected,
    })
    expect(result.events.filter((event) => event.type === 'instruction-rejected')).toEqual([
      expect.objectContaining({
        instructionId: `instruction:${rejected}`,
        sourceBlockId: rejected,
      }),
    ])
    expect(result.events.filter((event) => event.type === 'run-started')).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'run-finished')).toHaveLength(1)
  })

  it('reports an incomplete child chain from the last real accepted block with zero penalty', () => {
    const result = runFourSeasRegalia(correctTrace().slice(0, 4))

    expect(result).toMatchObject({
      completed: false,
      finalState: 'golden-armor-received',
      diagnostic: {
        type: 'program-ended-incomplete',
        concept: 'completeness',
        instructionId: null,
        sourceBlockId: 'armor-gift',
        opcode: null,
      },
      penalty: zeroPenalty,
    })
  })

  it('does not mutate input and is byte-for-byte deterministic across runs', () => {
    const trace = correctTrace()
    const snapshot = structuredClone(trace)

    const first = runFourSeasRegalia(trace)
    const second = runFourSeasRegalia(trace)

    expect(trace).toEqual(snapshot)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })
})
