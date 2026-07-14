import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_RASTER_BYTES = 512 * 1024;
export const MAX_MISSION_MEDIA_BYTES = Math.floor(1.25 * 1024 * 1024);

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
  const headerIndex = lines.findIndex((line) => splitMarkdownRow(line)[0] === 'Asset ID');
  if (headerIndex < 0) throw new Error('Asset manifest: exact nine-column shipping asset table is missing.');
  const columns = splitMarkdownRow(lines[headerIndex]);
  if (columns.length !== EXPECTED_COLUMNS.length || columns.some((column, index) => column !== EXPECTED_COLUMNS[index])) {
    throw new Error(`Asset manifest: exact nine-column header required: ${EXPECTED_COLUMNS.join(' | ')}.`);
  }
  const divider = splitMarkdownRow(lines[headerIndex + 1] ?? '');
  if (divider.length !== EXPECTED_COLUMNS.length || !isDivider(divider)) throw new Error('Asset manifest: exact nine-column divider is missing.');

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) break;
    const cells = splitMarkdownRow(line);
    if (cells.length !== EXPECTED_COLUMNS.length) throw new Error(`Asset manifest: row ${index + 1} must contain exactly nine columns.`);
    rows.push(Object.fromEntries(FIELD_NAMES.map((field, fieldIndex) => [field, cells[fieldIndex]])));
  }
  return rows;
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

export function verifyAssetManifest({ manifestRows, publicFiles, mode = 'check' }) {
  if (!['check', 'verify'].includes(mode)) throw new Error(`Asset manifest: unknown verification mode ${mode}.`);
  const rowPaths = assertUniquePaths(manifestRows, 'assetId', 'asset id');
  const filePaths = assertUniquePaths(publicFiles, 'path', 'public file');

  for (const path of filePaths) if (!rowPaths.has(path)) throw new Error(`Asset manifest: missing manifest row for ${path}.`);
  for (const path of rowPaths) if (!filePaths.has(path)) throw new Error(`Asset manifest: extra manifest row for ${path}.`);

  const filesByPath = new Map(publicFiles.map((file) => [file.path, file]));
  let totalBytes = 0;
  for (const row of manifestRows) {
    if (!row.assetId.toLowerCase().endsWith('.webp')) throw new Error(`Asset manifest: unsupported shipping format for ${row.assetId}; finished Dragon Palace images must be .webp.`);
    if (!row.sha256) throw new Error(`Asset manifest: missing SHA-256 for ${row.assetId}.`);
    if (!/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error(`Asset manifest: invalid SHA-256 for ${row.assetId}.`);
    for (const [field, label] of REQUIRED_METADATA) if (!row[field]?.trim()) throw new Error(`Asset manifest: missing ${label} for ${row.assetId}.`);
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
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Asset manifest: invalid WebP container.');
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > buffer.length) throw new Error('Asset manifest: truncated WebP chunk.');
    if (type === 'VP8X' && size >= 10) {
      return { width: buffer.readUIntLE(data + 4, 3) + 1, height: buffer.readUIntLE(data + 7, 3) + 1 };
    }
    if (type === 'VP8 ' && size >= 10 && buffer[data + 3] === 0x9d && buffer[data + 4] === 0x01 && buffer[data + 5] === 0x2a) {
      return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === 'VP8L' && size >= 5 && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('Asset manifest: WebP dimensions are missing.');
}

async function listFiles(root, relativeRoot = '') {
  const entries = await readdir(join(root, relativeRoot), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(relativeRoot, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else files.push(path.replaceAll('\\', '/'));
  }
  return files;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(root, 'docs', 'assets', 'asset-manifest.md');
  const assetRoot = join(root, 'public', 'assets', 'dragon-palace');
  const rows = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = [];
  for (const relativePath of await listFiles(assetRoot)) {
    const absolutePath = resolve(assetRoot, relativePath);
    const within = relative(assetRoot, absolutePath);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Asset manifest: unsafe public file ${relativePath}.`);
    const bytes = await readFile(absolutePath);
    publicFiles.push({
      path: posix.join('assets/dragon-palace', relativePath),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: (await stat(absolutePath)).size,
      ...readWebpDimensions(bytes),
    });
  }
  const mode = process.argv.includes('--require-visual-qa') ? 'verify' : 'check';
  const result = verifyAssetManifest({ manifestRows: rows, publicFiles, mode });
  console.log(`Dragon Palace assets: ${result.assetCount} files, ${result.totalBytes} bytes / ${MAX_MISSION_MEDIA_BYTES} bytes (${mode}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
