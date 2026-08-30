import type { WeekFourMappingAction } from '../blockly/weekFourMappingContract';
import type { WeekFourMappingWorkV1 } from '../progress/types';

const STABLE_WORK_ID = 'w4-m1-first-python-mapping' as const;
const actionLabel: Record<WeekFourMappingAction, string> = {
  'continue-verification': '继续核验',
  'polite-pass': '礼貌放行',
};
const cardLabel = {
  'canon-mysterious-visitor': '原著引子',
  'practice-mountain-traveller': '逻辑练习',
} as const;

/**
 * A review-only consumer for the saved W4-M1 work. It intentionally has no
 * callbacks: opening this disclosure cannot copy, run, edit, autofill, or
 * complete the legacy W4-M2 mission around it.
 */
export function WeekFourMappingWorkReview({
  work,
}: {
  work: WeekFourMappingWorkV1 | undefined;
}) {
  if (!work || work.workId !== STABLE_WORK_ID) return null;

  return (
    <details className="week-four-mapping-work-review" aria-label="回看 W4-M1 对照作品">
      <summary>回看 W4-M1 对照作品</summary>
      <section aria-label="W4-M1 只读对照作品">
        <p>这是上一关已保存的复习材料；只读展示，不会改变本关的 Python 抄写本。</p>
        <h3>Blockly 只读作品</h3>
        <p>Blockly：如果真实身份是白骨精，就继续核验；否则礼貌放行。</p>
        <h3>Python 只读作品</h3>
        <pre aria-label="W4-M1 Python 只读作品">{work.pythonCode}</pre>
        <h3>两张公开卡结果</h3>
        <ul>
          {work.run.cardResults.map((result) => (
            <li key={result.cardId}>
              {cardLabel[result.cardId]}：{actionLabel[result.branchAction]}
            </li>
          ))}
        </ul>
      </section>
    </details>
  );
}

export default WeekFourMappingWorkReview;
