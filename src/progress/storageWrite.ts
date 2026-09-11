import { parseProgress } from './schema';
import type { ProgressV3 } from './types';
import { CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY, CORRUPT_PROGRESS_KEY, errorMessage, serialize, valid, parseCorruptEnvelope, type SaveResult } from './storage';

function currentCorruptionProtectionError(storage: Storage, currentRaw: string): string | null {
  let envelopeRaw: string | null;
  try { envelopeRaw = storage.getItem(CORRUPT_PROGRESS_KEY); }
  catch { return '损坏原文尚未安全保留：无法读取损坏存档信封'; }
  if (envelopeRaw === null) return '损坏原文尚未安全保留：缺少损坏存档信封';

  try {
    const record = parseCorruptEnvelope(envelopeRaw);
    if (record.current !== currentRaw) {
      return '损坏原文尚未安全保留：损坏存档信封不匹配';
    }
    return null;
  } catch {
    return '损坏原文尚未安全保留：损坏存档信封格式无效';
  }
}

export function writeAndVerify(storage: Storage, key: string, value: string, stage: string): string | null {
  let writeError: unknown = null;
  try { storage.setItem(key, value); } catch (error) { writeError = error; /* verify because some stores throw after committing */ }
  try {
    if (storage.getItem(key) === value) return null;
    return writeError
      ? `${stage}失败：${errorMessage(writeError)}；写入内容校验不一致`
      : `${stage}失败：写入内容校验不一致`;
  } catch (error) {
    const writeDetail = writeError ? `${errorMessage(writeError)}；` : '';
    return `${stage}失败：${writeDetail}无法校验写入结果（${errorMessage(error)}）`;
  }
}

export function saveProgressTransaction(progress: ProgressV3, storage: Storage = localStorage): SaveResult {
  try {
    parseProgress(serialize(progress));
  } catch (error) {
    return { status: 'unsaved', progress, error: errorMessage(error) };
  }

  try {
    const currentRaw = storage.getItem(CURRENT_PROGRESS_KEY);
    const current = valid(currentRaw);
    if (currentRaw !== null && !current) {
      const protectionError = currentCorruptionProtectionError(storage, currentRaw);
      if (protectionError) return { status: 'unsaved', progress, error: protectionError };
    }
    if (current) {
      const snapshotError = writeAndVerify(storage, SNAPSHOT_PROGRESS_KEY, currentRaw!, '写入快照');
      if (snapshotError) return { status: 'unsaved', progress, error: snapshotError };
    }
    const currentError = writeAndVerify(storage, CURRENT_PROGRESS_KEY, serialize(progress), '写入当前存档');
    if (currentError) return { status: 'unsaved', progress, error: currentError };
    return { status: 'saved', progress };
  } catch (error) {
    return { status: 'unsaved', progress, error: `读取当前存档失败：${errorMessage(error)}` };
  }
}

export function retrySave(progress: ProgressV3, storage: Storage = localStorage): SaveResult {
  return saveProgressTransaction(progress, storage);
}
