import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, posix, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const MAX_RASTER_BYTES = 512 * 1024;
export const MAX_MISSION_MEDIA_BYTES = Math.floor(1.25 * 1024 * 1024);
export const REQUIRED_TOOL = 'OpenAI built-in image_gen';
export const REQUIRED_PROVENANCE = 'generated in-project with built-in image_gen; provenance verified';
export const REQUIRED_ART_DIRECTION = 'commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.';

const EXPECTED_COLUMNS = [
  'Asset ID',
  'SHA-256',
  'Purpose',
  'Tool or source',
  'Prompt or source reference',
  'Dimensions',
  'License/provenance',
  'Screen slots',
  'QA status',
];

const FIELD_NAMES = [
  'assetId',
  'sha256',
  'purpose',
  'toolOrSource',
  'promptOrSourceReference',
  'dimensions',
  'licenseProvenance',
  'screenSlots',
  'qaStatus',
];

const REQUIRED_METADATA = [
  ['purpose', 'purpose'],
  ['toolOrSource', 'tool or source'],
  ['promptOrSourceReference', 'prompt or source reference'],
  ['dimensions', 'dimensions'],
  ['licenseProvenance', 'license/provenance'],
  ['screenSlots', 'screen slots'],
  ['qaStatus', 'QA status'],
];

const QA_STATUSES = new Set(['planned', 'generated', 'provenance-verified', 'visual-qa-passed', 'rejected']);

function splitMarkdownRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isDivider(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function parseAssetManifest(markdown) {
  const lines = markdown.split(/\r?\n/);
  const assetHeaderIndexes = lines
    .map((line, index) => ({ cells: splitMarkdownRow(line), index }))
    .filter(({ cells }) => cells[0] === 'Asset ID');
  const exactHeaderIndexes = assetHeaderIndexes
    .filter(({ cells }) => cells.length === EXPECTED_COLUMNS.length && cells.every((column, index) => column === EXPECTED_COLUMNS[index]))
    .map(({ index }) => index);
  if (exactHeaderIndexes.length === 0) {
    throw new Error(`Asset manifest: exact nine-column header required: ${EXPECTED_COLUMNS.join(' | ')}.`);
  }
  if (exactHeaderIndexes.length !== 1) throw new Error('Asset manifest: exactly one exact shipping asset table is required; duplicate shipping asset table found.');
  const [headerIndex] = exactHeaderIndexes;
  const divider = splitMarkdownRow(lines[headerIndex + 1] ?? '');
  if (divider.length !== EXPECTED_COLUMNS.length || !isDivider(divider)) throw new Error('Asset manifest: exact nine-column divider is missing.');

  const manifestRows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) break;
    const cells = splitMarkdownRow(line);
    if (cells.length !== EXPECTED_COLUMNS.length) throw new Error(`Asset manifest: row ${index + 1} must contain exactly nine columns.`);
    manifestRows.push(Object.fromEntries(FIELD_NAMES.map((field, fieldIndex) => [field, cells[fieldIndex]])));
  }

  const promptRecords = [];
  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = /^### (Prompt DP-\d{3} .+)$/.exec(lines[index].trim());
    if (!headingMatch) continue;
    const heading = headingMatch[1];
    let fenceIndex = index + 1;
    while (fenceIndex < lines.length && lines[fenceIndex].trim() === '') fenceIndex += 1;
    if (lines[fenceIndex]?.trim() !== '```text') throw new Error(`Asset manifest: ${heading} must be followed immediately by a fenced text prompt record.`);
    const promptLines = [];
    let closingIndex = fenceIndex + 1;
    while (closingIndex < lines.length && lines[closingIndex].trim() !== '```') {
      promptLines.push(lines[closingIndex]);
      closingIndex += 1;
    }
    if (closingIndex >= lines.length) throw new Error(`Asset manifest: ${heading} fenced text prompt record is not closed.`);
    promptRecords.push({ heading, anchor: `#${markdownHeadingAnchor(heading)}`, prompt: promptLines.join('\n').trim() });
    index = closingIndex;
  }
  return { manifestRows, promptRecords };
}

function markdownHeadingAnchor(heading) {
  return heading.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function assertSafeAssetPath(path) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path) || win32.isAbsolute(path) || path.includes('\\')) {
    throw new Error(`Asset manifest: unsafe asset path ${path || '<empty>'}.`);
  }
  const normalized = posix.normalize(path);
  if (normalized !== path || normalized === '..' || normalized.startsWith('../') || path.split('/').includes('..') || !path.startsWith('assets/dragon-palace/')) {
    throw new Error(`Asset manifest: unsafe asset path ${path}.`);
  }
}

function assertUniquePaths(items, field, label) {
  const paths = new Set();
  for (const item of items) {
    const path = item[field];
    assertSafeAssetPath(path);
    if (paths.has(path)) throw new Error(`Asset manifest: duplicate ${label} ${path}.`);
    paths.add(path);
  }
  return paths;
}

function parseDimensions(value, assetId) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Asset manifest: invalid dimensions for ${assetId}.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function verifyPromptRecords(promptRecords, manifestRows) {
  if (!Array.isArray(promptRecords)) throw new Error('Asset manifest: structured prompt records are required by the pure verifier.');
  const headings = new Set();
  const anchors = new Set();
  const recordDpIds = new Set();
  const recordsByAnchor = new Map();

  for (const record of promptRecords) {
    if (!record || typeof record.heading !== 'string') throw new Error('Asset manifest: prompt heading is required.');
    const headingMatch = /^Prompt (DP-\d{3}) (.+)$/.exec(record.heading);
    if (!headingMatch) throw new Error(`Asset manifest: invalid prompt heading ${record.heading}.`);
    const [, dpId] = headingMatch;
    if (headings.has(record.heading)) throw new Error(`Asset manifest: duplicate prompt heading ${record.heading}.`);
    headings.add(record.heading);
    if (anchors.has(record.anchor)) throw new Error(`Asset manifest: duplicate prompt anchor ${record.anchor}.`);
    anchors.add(record.anchor);
    if (recordDpIds.has(dpId)) throw new Error(`Asset manifest: duplicate prompt DP number ${dpId}.`);
    recordDpIds.add(dpId);
    const expectedAnchor = `#${markdownHeadingAnchor(record.heading)}`;
    if (record.anchor !== expectedAnchor) throw new Error(`Asset manifest: prompt anchor ${record.anchor} does not match heading ${record.heading}.`);
    if (typeof record.prompt !== 'string' || record.prompt.trim() === '') throw new Error(`Asset manifest: prompt text for ${record.heading} must be non-empty.`);
    if (!record.prompt.includes(REQUIRED_ART_DIRECTION)) throw new Error(`Asset manifest: ${record.heading} is missing the exact shared art direction.`);
    recordsByAnchor.set(record.anchor, { ...record, dpId });
  }

  const referencedAnchors = new Set();
  const referencedDpIds = new Set();
  for (const row of manifestRows) {
    const linkMatch = /^\[Prompt (DP-\d{3})\]\((#prompt-dp-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\)$/.exec(row.promptOrSourceReference);
    if (!linkMatch) throw new Error(`Asset manifest: ${row.assetId} must use an exact prompt markdown link such as [Prompt DP-001](#prompt-dp-001-background).`);
    const [, linkDpId, anchor] = linkMatch;
    if (referencedAnchors.has(anchor)) throw new Error(`Asset manifest: duplicate prompt reference ${anchor}.`);
    referencedAnchors.add(anchor);
    if (referencedDpIds.has(linkDpId)) throw new Error(`Asset manifest: duplicate prompt DP number ${linkDpId} in shipping rows.`);
    referencedDpIds.add(linkDpId);
    const record = recordsByAnchor.get(anchor);
    if (!record) throw new Error(`Asset manifest: prompt anchor ${anchor} is missing for ${row.assetId}.`);
    if (record.dpId !== linkDpId) throw new Error(`Asset manifest: prompt DP label ${linkDpId} does not match heading ${record.heading}.`);
  }
  for (const anchor of recordsByAnchor.keys()) if (!referencedAnchors.has(anchor)) throw new Error(`Asset manifest: unreferenced prompt record ${anchor}.`);
}

export function verifyAssetManifest({ manifestRows, publicFiles, promptRecords, mode = 'check' }) {
  if (!['check', 'verify'].includes(mode)) throw new Error(`Asset manifest: unknown verification mode ${mode}.`);
  const rowPaths = assertUniquePaths(manifestRows, 'assetId', 'asset id');
  const filePaths = assertUniquePaths(publicFiles, 'path', 'public file');

  for (const path of filePaths) if (!rowPaths.has(path)) throw new Error(`Asset manifest: missing manifest row for ${path}.`);
  for (const path of rowPaths) if (!filePaths.has(path)) throw new Error(`Asset manifest: extra manifest row for ${path}.`);

  verifyPromptRecords(promptRecords, manifestRows);

  const filesByPath = new Map(publicFiles.map((file) => [file.path, file]));
  let totalBytes = 0;
  for (const row of manifestRows) {
    if (!row.assetId.toLowerCase().endsWith('.webp')) throw new Error(`Asset manifest: unsupported shipping format for ${row.assetId}; finished Dragon Palace images must be .webp.`);
    if (!row.sha256) throw new Error(`Asset manifest: missing SHA-256 for ${row.assetId}.`);
    if (!/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error(`Asset manifest: invalid SHA-256 for ${row.assetId}.`);
    for (const [field, label] of REQUIRED_METADATA) if (!row[field]?.trim()) throw new Error(`Asset manifest: missing ${label} for ${row.assetId}.`);
    if (row.toolOrSource !== REQUIRED_TOOL) throw new Error(`Asset manifest: ${row.assetId} tool or source must be exactly ${REQUIRED_TOOL}.`);
    if (row.licenseProvenance !== REQUIRED_PROVENANCE) throw new Error(`Asset manifest: ${row.assetId} license/provenance must be exactly ${REQUIRED_PROVENANCE}.`);
    if (!QA_STATUSES.has(row.qaStatus)) throw new Error(`Asset manifest: invalid QA status ${row.qaStatus} for ${row.assetId}.`);
    if (mode === 'verify' && row.qaStatus !== 'visual-qa-passed') throw new Error(`Asset manifest: ${row.assetId} must be visual-qa-passed for release verification.`);
    if (mode === 'check' && !['provenance-verified', 'visual-qa-passed'].includes(row.qaStatus)) {
      throw new Error(`Asset manifest: ${row.assetId} QA status must be provenance-verified or visual-qa-passed for provenance checks.`);
    }

    const file = filesByPath.get(row.assetId);
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) throw new Error(`Asset manifest: invalid file SHA-256 for ${row.assetId}.`);
    if (file.sha256 !== row.sha256) throw new Error(`Asset manifest: hash mismatch for ${row.assetId}.`);
    if (!Number.isInteger(file.bytes) || file.bytes < 0) throw new Error(`Asset manifest: invalid byte size for ${row.assetId}.`);
    if (file.bytes > MAX_RASTER_BYTES) throw new Error(`Asset manifest: ${row.assetId} exceeds the 512 KiB raster limit.`);
    totalBytes += file.bytes;

    const dimensions = parseDimensions(row.dimensions, row.assetId);
    if (file.width !== dimensions.width || file.height !== dimensions.height) throw new Error(`Asset manifest: dimension mismatch for ${row.assetId}.`);
  }
  if (totalBytes > MAX_MISSION_MEDIA_BYTES) throw new Error('Asset manifest: Dragon Palace mission media exceeds the 1.25 MiB total limit.');
  return { assetCount: manifestRows.length, totalBytes, mode };
}

export function readWebpDimensions(buffer) {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Asset manifest: invalid WebP container.');
  }
  const declaredSize = buffer.readUInt32LE(4);
  if (declaredSize !== buffer.length - 8) throw new Error('Asset manifest: WebP RIFF declared size does not match the complete file; trailing or missing bytes are forbidden.');

  let canvasDimensions;
  let pixelDimensions;
  let offset = 12;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Asset manifest: truncated WebP chunk header.');
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    const dataEnd = data + size;
    const paddedEnd = dataEnd + (size % 2);
    if (dataEnd > buffer.length || paddedEnd > buffer.length) throw new Error('Asset manifest: truncated WebP chunk or padding.');

    if (type === 'VP8X') {
      if (size !== 10) throw new Error('Asset manifest: invalid VP8X chunk length.');
      canvasDimensions = { width: buffer.readUIntLE(data + 4, 3) + 1, height: buffer.readUIntLE(data + 7, 3) + 1 };
    }
    if (type === 'VP8 ') {
      if (size < 10 || buffer[data + 3] !== 0x9d || buffer[data + 4] !== 0x01 || buffer[data + 5] !== 0x2a) {
        throw new Error('Asset manifest: invalid VP8 pixel payload.');
      }
      if (pixelDimensions) throw new Error('Asset manifest: duplicate WebP pixel payload.');
      pixelDimensions = { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === 'VP8L') {
      if (size < 5 || buffer[data] !== 0x2f) throw new Error('Asset manifest: invalid VP8L pixel payload.');
      if (pixelDimensions) throw new Error('Asset manifest: duplicate WebP pixel payload.');
      const bits = buffer.readUInt32LE(data + 1);
      pixelDimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = paddedEnd;
  }
  if (!pixelDimensions || pixelDimensions.width === 0 || pixelDimensions.height === 0) {
    throw new Error('Asset manifest: WebP pixel payload dimensions are missing.');
  }
  if (canvasDimensions && (canvasDimensions.width !== pixelDimensions.width || canvasDimensions.height !== pixelDimensions.height)) {
    throw new Error('Asset manifest: VP8X canvas and pixel payload dimension mismatch.');
  }
  return pixelDimensions;
}

export async function decodeWebpDimensions(buffer) {
  const containerDimensions = readWebpDimensions(buffer);
  try {
    const { data, info } = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 20_000_000,
    }).raw().toBuffer({ resolveWithObject: true });
    const decodedDimensions = { width: info.width, height: info.height };
    const expectedPixelBytes = info.width * info.height * info.channels;
    if (!Number.isInteger(info.width) || !Number.isInteger(info.height) || !Number.isInteger(info.channels)
      || info.width <= 0 || info.height <= 0 || info.channels <= 0 || data.length !== expectedPixelBytes) {
      throw new Error('decoder returned no complete pixel data');
    }
    if (decodedDimensions.width !== containerDimensions.width || decodedDimensions.height !== containerDimensions.height) {
      throw new Error('decoder dimensions do not match the WebP container');
    }
    return decodedDimensions;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Asset manifest: WebP must fully decode its pixel data: ${detail}.`);
  }
}

async function listFiles(root, relativeRoot = '') {
  const entries = await readdir(join(root, relativeRoot), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(relativeRoot, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Asset manifest: symbolic link is forbidden in shipping assets: ${path}.`);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(path.replaceAll('\\', '/'));
    else throw new Error(`Asset manifest: shipping asset entry must be a regular file: ${path}.`);
  }
  return files;
}

export async function collectAssetFiles(assetRoot) {
  const rootInfo = await lstat(assetRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('Asset manifest: asset root must be a real directory, not a symbolic link.');
  const resolvedRoot = await realpath(assetRoot);
  const publicFiles = [];
  for (const relativePath of await listFiles(assetRoot)) {
    const absolutePath = resolve(assetRoot, relativePath);
    const within = relative(assetRoot, absolutePath);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Asset manifest: unsafe public file ${relativePath}.`);
    const entryInfo = await lstat(absolutePath);
    if (entryInfo.isSymbolicLink() || !entryInfo.isFile()) throw new Error(`Asset manifest: shipping asset must be a regular file, not a symbolic link: ${relativePath}.`);
    const resolvedPath = await realpath(absolutePath);
    const resolvedWithin = relative(resolvedRoot, resolvedPath);
    if (resolvedWithin === '..' || resolvedWithin.startsWith(`..${sep}`) || isAbsolute(resolvedWithin)) {
      throw new Error(`Asset manifest: resolved public file escapes the asset root: ${relativePath}.`);
    }

    let handle;
    try {
      handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      const fileInfo = await handle.stat();
      if (!fileInfo.isFile()) throw new Error(`Asset manifest: shipping asset must be a regular file: ${relativePath}.`);
      const bytes = await handle.readFile();
      let decodedDimensions;
      try {
        decodedDimensions = await decodeWebpDimensions(bytes);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Asset manifest: ${relativePath} must fully decode as WebP: ${detail}`, { cause: error });
      }
      publicFiles.push({
        path: posix.join('assets/dragon-palace', relativePath),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
        ...decodedDimensions,
      });
    } finally {
      await handle?.close();
    }
  }
  return publicFiles;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(root, 'docs', 'assets', 'asset-manifest.md');
  const assetRoot = join(root, 'public', 'assets', 'dragon-palace');
  const { manifestRows, promptRecords } = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = await collectAssetFiles(assetRoot);
  const mode = process.argv.includes('--require-visual-qa') ? 'verify' : 'check';
  const result = verifyAssetManifest({ manifestRows, publicFiles, promptRecords, mode });
  console.log(`Dragon Palace assets: ${result.assetCount} files, ${result.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
