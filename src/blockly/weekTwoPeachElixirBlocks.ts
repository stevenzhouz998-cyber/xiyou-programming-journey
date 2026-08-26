import * as Blockly from 'blockly';
import type { PeachElixirBlockType } from './weekTwoPeachElixirContract';

export const PEACH_ELIXIR_BLOCK_LABELS: Readonly<Record<PeachElixirBlockType, string>> = {
  xiyou_guard_peach_garden: '受命看守蟠桃园',
  xiyou_learn_peach_banquet: '从七仙女处得知蟠桃会',
  xiyou_drink_at_banquet: '进入瑶池饮下仙酒',
  xiyou_stumble_into_tusita: '醉后误入兜率宫',
  xiyou_eat_golden_elixir: '吃下金丹',
};

let registered = false;

export function registerPeachElixirBlocks(): void {
  if (registered) return;
  const colours: Record<PeachElixirBlockType, number> = {
    xiyou_guard_peach_garden: 105,
    xiyou_learn_peach_banquet: 330,
    xiyou_drink_at_banquet: 35,
    xiyou_stumble_into_tusita: 245,
    xiyou_eat_golden_elixir: 15,
  };
  for (const type of Object.keys(PEACH_ELIXIR_BLOCK_LABELS) as PeachElixirBlockType[]) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(PEACH_ELIXIR_BLOCK_LABELS[type]);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(colours[type]);
        this.setTooltip('拖动或使用键盘调整这一步在故事中的先后位置。');
      },
    };
  }
  registered = true;
}
