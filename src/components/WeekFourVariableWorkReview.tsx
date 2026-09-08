import type { WeekFourVariableWorkV1 } from '../progress/types';

const STABLE_WORK_ID = 'w4-m2-variable-evidence-record' as const;

/**
 * Only a non-answer summary crosses from W4-M2 into W4-M3. There are no
 * callbacks or code fields here, so opening the disclosure cannot edit, copy,
 * run, or complete either mission.
 */
export function WeekFourVariableWorkReview({ work }: { work: WeekFourVariableWorkV1 | undefined }) {
  if (!work || work.workId !== STABLE_WORK_ID) return null;
  const verifiedLabel = work.verifiedAt.replace('T', ' ').replace('.000Z', ' UTC');

  return (
    <details className="week-four-variable-work-review" aria-label="回看上一关变量取证">
      <summary>回看上一关变量取证</summary>
      <section aria-label="W4-M2 只读取证摘要">
        <h3>{work.title}</h3>
        <p>取证已封存</p>
        <p>核验时间：{verifiedLabel}</p>
        <p>这里只显示上一关的非答案摘要，打开或收起都不会改变学习进度。</p>
      </section>
    </details>
  );
}

export default WeekFourVariableWorkReview;
