import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workbenchRoot = resolve(projectRoot, 'asset-workbench');
const manifestPath = resolve(workbenchRoot, 'manifest.json');
const style = {
  id: 'storybook-fort-v1',
  name: 'Cozy Storybook Contenders',
  promptVersion: 'storybook-fort-v1',
};

const now = () => new Date().toISOString();
const emptyManifest = () => ({ schemaVersion: 1, style, items: [] });

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyManifest();
    throw error;
  }
}

async function saveManifest(manifest) {
  await mkdir(workbenchRoot, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function assertSlug(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? '')) {
    throw new Error('The card id must be a lowercase slug, for example luna-unicorn.');
  }
}

function requireOption(options, name) {
  const value = options[name];
  if (!value || typeof value !== 'string') throw new Error(`Missing --${name}.`);
  return value;
}

function findItem(manifest, id) {
  const item = manifest.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`No asset item named "${id}" exists.`);
  return item;
}

async function intake(options) {
  const id = requireOption(options, 'id');
  const name = requireOption(options, 'name');
  const source = resolve(requireOption(options, 'source'));
  assertSlug(id);
  const extension = extname(source).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    throw new Error('Reference photos must be JPG, PNG, or WebP files.');
  }

  const manifest = await readManifest();
  if (manifest.items.some((item) => item.id === id)) {
    throw new Error(`The card id "${id}" already exists.`);
  }

  const cardDirectory = resolve(workbenchRoot, 'cards', id);
  await mkdir(cardDirectory, { recursive: true });
  const referenceFile = `reference${extension === '.jpeg' ? '.jpg' : extension}`;
  await copyFile(source, resolve(cardDirectory, referenceFile));
  const timestamp = now();
  manifest.items.push({
    id,
    name,
    status: 'processing',
    referenceFile,
    childNotes: typeof options.notes === 'string' ? options.notes : '',
    reviewNotes: '',
    artCandidates: [],
    winSoundCandidates: [],
    loseSoundCandidates: [],
    stats: { strength: 50, speed: 50, agility: 50 },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await saveManifest(manifest);
  console.log(`Added ${name} (${id}) to the private workbench.`);
}

async function candidate(options) {
  const id = requireOption(options, 'id');
  const source = resolve(requireOption(options, 'source'));
  assertSlug(id);
  const extension = extname(source).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    throw new Error('Artwork candidates must be JPG, PNG, or WebP files.');
  }

  const manifest = await readManifest();
  const item = findItem(manifest, id);
  const nextNumber = item.artCandidates.length + 1;
  const candidateId = `art-${String(nextNumber).padStart(2, '0')}`;
  const file = `${candidateId}${extension === '.jpeg' ? '.jpg' : extension}`;
  await copyFile(source, resolve(workbenchRoot, 'cards', id, file));
  item.artCandidates.push({
    id: candidateId,
    file,
    promptVersion: typeof options['prompt-version'] === 'string'
      ? options['prompt-version']
      : manifest.style.promptVersion,
    createdAt: now(),
  });
  item.selectedArtId ??= candidateId;
  item.status = 'review';
  item.updatedAt = now();
  await saveManifest(manifest);
  console.log(`Added ${candidateId} to ${id}.`);
}

function writeAscii(buffer, offset, text) {
  buffer.write(text, offset, 'ascii');
}

function wavBuffer(samples, sampleRate = 44100) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  writeAscii(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  writeAscii(buffer, 8, 'WAVEfmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  writeAscii(buffer, 36, 'data');
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + index * 2);
  });
  return buffer;
}

function normalizePcmWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Custom reaction sounds must be WAV files.');
  }
  let cursor = 12;
  let format;
  let pcm;
  while (cursor + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', cursor, cursor + 4);
    const chunkSize = buffer.readUInt32LE(cursor + 4);
    const chunkStart = cursor + 8;
    if (chunkStart + chunkSize > buffer.length) break;
    if (chunkId === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    }
    if (chunkId === 'data') pcm = buffer.subarray(chunkStart, chunkStart + chunkSize);
    cursor = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!format || !pcm || format.audioFormat !== 1 || format.channels !== 1 || format.bitsPerSample !== 16) {
    throw new Error('Custom reaction sounds must use 16-bit mono PCM WAV format.');
  }
  const targetSampleRate = 44100;
  let normalizedPcm = pcm;
  if (format.sampleRate !== targetSampleRate) {
    const sourceFrames = pcm.length / 2;
    const targetFrames = Math.round(sourceFrames * targetSampleRate / format.sampleRate);
    normalizedPcm = Buffer.alloc(targetFrames * 2);
    for (let frame = 0; frame < targetFrames; frame += 1) {
      const sourcePosition = frame * format.sampleRate / targetSampleRate;
      const leftIndex = Math.min(sourceFrames - 1, Math.floor(sourcePosition));
      const rightIndex = Math.min(sourceFrames - 1, leftIndex + 1);
      const blend = sourcePosition - leftIndex;
      const left = pcm.readInt16LE(leftIndex * 2);
      const right = pcm.readInt16LE(rightIndex * 2);
      normalizedPcm.writeInt16LE(Math.round(left + (right - left) * blend), frame * 2);
    }
  }
  const normalized = Buffer.alloc(44 + normalizedPcm.length);
  writeAscii(normalized, 0, 'RIFF');
  normalized.writeUInt32LE(36 + normalizedPcm.length, 4);
  writeAscii(normalized, 8, 'WAVEfmt ');
  normalized.writeUInt32LE(16, 16);
  normalized.writeUInt16LE(1, 20);
  normalized.writeUInt16LE(1, 22);
  normalized.writeUInt32LE(targetSampleRate, 24);
  normalized.writeUInt32LE(targetSampleRate * 2, 28);
  normalized.writeUInt16LE(2, 32);
  normalized.writeUInt16LE(16, 34);
  writeAscii(normalized, 36, 'data');
  normalized.writeUInt32LE(normalizedPcm.length, 40);
  normalizedPcm.copy(normalized, 44);
  return normalized;
}

function makeReaction(kind) {
  const sampleRate = 44100;
  const notes = kind === 'win' ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66];
  const duration = kind === 'win' ? 1.45 : 1.1;
  const samples = new Array(Math.floor(sampleRate * duration)).fill(0);
  notes.forEach((frequency, noteIndex) => {
    const start = (kind === 'win' ? 0.08 + noteIndex * 0.18 : 0.08 + noteIndex * 0.24) * sampleRate;
    const length = (kind === 'win' ? 0.5 : 0.48) * sampleRate;
    for (let i = 0; i < length && start + i < samples.length; i += 1) {
      const attack = Math.min(1, i / (sampleRate * 0.02));
      const decay = Math.pow(1 - i / length, 2.2);
      const wave = Math.sin(2 * Math.PI * frequency * i / sampleRate)
        + 0.22 * Math.sin(2 * Math.PI * frequency * 2 * i / sampleRate);
      samples[Math.floor(start + i)] += wave * attack * decay * (kind === 'win' ? 0.17 : 0.12);
    }
  });
  return wavBuffer(samples, sampleRate);
}

async function sounds(options) {
  const id = requireOption(options, 'id');
  assertSlug(id);
  const manifest = await readManifest();
  const item = findItem(manifest, id);
  const cardDirectory = resolve(workbenchRoot, 'cards', id);
  await mkdir(cardDirectory, { recursive: true });
  const winSource = typeof options['win-source'] === 'string' ? resolve(options['win-source']) : undefined;
  const loseSource = typeof options['lose-source'] === 'string' ? resolve(options['lose-source']) : undefined;
  if (Boolean(winSource) !== Boolean(loseSource)) {
    throw new Error('Provide both --win-source and --lose-source, or neither.');
  }
  const profile = typeof options.profile === 'string' ? options.profile : 'gentle-magic-v1';

  for (const kind of ['win', 'lose']) {
    const listName = `${kind}SoundCandidates`;
    const candidateId = `${kind}-${String(item[listName].length + 1).padStart(2, '0')}`;
    const file = `${candidateId}.wav`;
    const source = kind === 'win' ? winSource : loseSource;
    if (source) {
      await writeFile(resolve(cardDirectory, file), normalizePcmWav(await readFile(source)));
    }
    else await writeFile(resolve(cardDirectory, file), makeReaction(kind));
    item[listName].push({ id: candidateId, file, profile, createdAt: now() });
    const selectionName = kind === 'win' ? 'selectedWinSoundId' : 'selectedLoseSoundId';
    item[selectionName] ??= candidateId;
  }
  if (item.artCandidates.length) item.status = 'review';
  item.updatedAt = now();
  await saveManifest(manifest);
  console.log(`${winSource ? 'Registered custom' : 'Created gentle'} win and lose sounds for ${id}.`);
}

async function normalizeSounds(options) {
  const id = requireOption(options, 'id');
  assertSlug(id);
  const manifest = await readManifest();
  const item = findItem(manifest, id);
  const candidates = [...item.winSoundCandidates, ...item.loseSoundCandidates];
  for (const candidate of candidates) {
    const path = resolve(workbenchRoot, 'cards', id, candidate.file);
    await writeFile(path, normalizePcmWav(await readFile(path)));
  }
  console.log(`Normalized ${candidates.length} sound files for ${id}.`);
}

async function status() {
  const manifest = await readManifest();
  console.table(manifest.items.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    art: item.artCandidates.length,
    winSounds: item.winSoundCandidates.length,
    loseSounds: item.loseSoundCandidates.length,
  })));
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    source: { type: 'string' },
    id: { type: 'string' },
    name: { type: 'string' },
    notes: { type: 'string' },
    'prompt-version': { type: 'string' },
    'win-source': { type: 'string' },
    'lose-source': { type: 'string' },
    profile: { type: 'string' },
  },
});

const commands = { intake, candidate, sounds, 'normalize-sounds': normalizeSounds, status };
const command = positionals[0];
if (!commands[command]) {
  console.error('Usage: node scripts/asset-pipeline.mjs <intake|candidate|sounds|normalize-sounds|status> [options]');
  process.exitCode = 1;
} else {
  await commands[command](values);
}
