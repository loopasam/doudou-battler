import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

type JsonRecord = Record<string, unknown>;

const basePath = '/doudou-battler';
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, jsonHeaders);
  response.end(JSON.stringify(value));
}

async function readJson(path: string, fallback?: unknown) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function safeFile(value: string) {
  return basename(value) === value && /^[a-zA-Z0-9._-]+$/.test(value);
}

async function bodyAsJson(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 65_536) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as JsonRecord;
}

function queueForBrowser(manifest: JsonRecord) {
  const items = (manifest.items as JsonRecord[] ?? []).map((item) => {
    const id = String(item.id);
    const urlFor = (file: unknown) => `${basePath}/api/curation/assets/${id}/${String(file)}`;
    const withUrl = (candidate: JsonRecord) => ({
      id: candidate.id,
      url: urlFor(candidate.file),
      promptVersion: candidate.promptVersion,
      profile: candidate.profile,
      createdAt: candidate.createdAt,
    });
    return {
      id,
      name: item.name,
      status: item.status,
      referenceUrl: urlFor(item.referenceFile),
      childNotes: item.childNotes ?? '',
      reviewNotes: item.reviewNotes ?? '',
      artCandidates: (item.artCandidates as JsonRecord[] ?? []).map(withUrl),
      winSoundCandidates: (item.winSoundCandidates as JsonRecord[] ?? []).map(withUrl),
      loseSoundCandidates: (item.loseSoundCandidates as JsonRecord[] ?? []).map(withUrl),
      selectedArtId: item.selectedArtId,
      selectedWinSoundId: item.selectedWinSoundId,
      selectedLoseSoundId: item.selectedLoseSoundId,
      updatedAt: item.updatedAt,
    };
  });
  return {
    schemaVersion: 1,
    mode: 'local',
    writable: true,
    style: manifest.style ?? {
      id: 'storybook-fort-v1',
      name: 'Cozy Storybook Contenders',
      promptVersion: 'storybook-fort-v1',
    },
    items,
  };
}

function findItem(manifest: JsonRecord, id: string) {
  const items = manifest.items as JsonRecord[];
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown card: ${id}`);
  return item;
}

function chooseCandidate(item: JsonRecord, listName: string, selectedName: string) {
  const list = item[listName] as JsonRecord[];
  const selectedId = item[selectedName] ?? list[0]?.id;
  const selected = list.find((candidate) => candidate.id === selectedId);
  if (!selected) throw new Error(`Select a ${listName.replace('Candidates', '')} candidate first.`);
  item[selectedName] = selected.id;
  return selected;
}

async function approveItem(
  projectRoot: string,
  workbenchRoot: string,
  item: JsonRecord,
) {
  const id = String(item.id);
  const art = chooseCandidate(item, 'artCandidates', 'selectedArtId');
  const win = chooseCandidate(item, 'winSoundCandidates', 'selectedWinSoundId');
  const lose = chooseCandidate(item, 'loseSoundCandidates', 'selectedLoseSoundId');
  const publicDirectory = resolve(projectRoot, 'public', 'assets', 'cards', id);
  await mkdir(publicDirectory, { recursive: true });
  const artworkFile = `artwork${extname(String(art.file)).toLowerCase()}`;
  await copyFile(resolve(workbenchRoot, 'cards', id, String(art.file)), resolve(publicDirectory, artworkFile));
  await copyFile(resolve(workbenchRoot, 'cards', id, String(win.file)), resolve(publicDirectory, 'win.wav'));
  await copyFile(resolve(workbenchRoot, 'cards', id, String(lose.file)), resolve(publicDirectory, 'lose.wav'));

  const publicManifestPath = resolve(projectRoot, 'public', 'assets', 'cards', 'manifest.json');
  const publicManifest = await readJson(publicManifestPath, { schemaVersion: 1, cards: [] }) as JsonRecord;
  const cards = publicManifest.cards as JsonRecord[];
  const entry = {
    id,
    name: item.name,
    artwork: `assets/cards/${id}/${artworkFile}`,
    winSound: `assets/cards/${id}/win.wav`,
    loseSound: `assets/cards/${id}/lose.wav`,
    stats: item.stats,
  };
  const index = cards.findIndex((card) => card.id === id);
  if (index >= 0) cards[index] = entry;
  else cards.push(entry);
  await writeJson(publicManifestPath, publicManifest);
  item.status = 'approved';
}

async function updateItem(
  projectRoot: string,
  workbenchRoot: string,
  manifest: JsonRecord,
  id: string,
  body: JsonRecord,
) {
  const item = findItem(manifest, id);
  const action = body.action;
  if (action === 'update-meta') {
    if (typeof body.name === 'string' && body.name.trim()) item.name = body.name.trim().slice(0, 80);
    if (typeof body.childNotes === 'string') item.childNotes = body.childNotes.slice(0, 1000);
    if (typeof body.reviewNotes === 'string') item.reviewNotes = body.reviewNotes.slice(0, 2000);
  } else if (action === 'select-art') {
    item.selectedArtId = body.candidateId;
  } else if (action === 'select-sound') {
    const key = body.kind === 'win' ? 'selectedWinSoundId' : 'selectedLoseSoundId';
    item[key] = body.candidateId;
  } else if (action === 'request-redo') {
    if (typeof body.reviewNotes === 'string') item.reviewNotes = body.reviewNotes.slice(0, 2000);
    item.status = 'redo-requested';
  } else if (action === 'approve') {
    await approveItem(projectRoot, workbenchRoot, item);
  } else {
    throw new Error('Unknown curation action.');
  }
  item.updatedAt = new Date().toISOString();
}

export function createCurationPlugin(projectRoot: string): Plugin {
  const workbenchRoot = resolve(projectRoot, 'asset-workbench');
  const manifestPath = resolve(workbenchRoot, 'manifest.json');
  return {
    name: 'local-card-curation',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname.replace(basePath, '');
        if (!pathname.startsWith('/api/curation')) return next();
        try {
          if (request.method === 'GET' && pathname === '/api/curation') {
            const manifest = await readJson(manifestPath, {
              schemaVersion: 1,
              style: {
                id: 'storybook-fort-v1',
                name: 'Cozy Storybook Contenders',
                promptVersion: 'storybook-fort-v1',
              },
              items: [],
            }) as JsonRecord;
            return sendJson(response, 200, queueForBrowser(manifest));
          }

          const assetMatch = pathname.match(/^\/api\/curation\/assets\/([^/]+)\/([^/]+)$/);
          if (request.method === 'GET' && assetMatch) {
            const [, id, file] = assetMatch;
            if (!isSlug(id) || !safeFile(file)) return sendJson(response, 400, { error: 'Invalid asset path.' });
            const contentTypes: Record<string, string> = {
              '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
              '.webp': 'image/webp', '.wav': 'audio/wav',
            };
            const contentType = contentTypes[extname(file).toLowerCase()];
            if (!contentType) return sendJson(response, 415, { error: 'Unsupported asset type.' });
            const content = await readFile(resolve(workbenchRoot, 'cards', id, file));
            response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
            return response.end(content);
          }

          const itemMatch = pathname.match(/^\/api\/curation\/items\/([^/]+)$/);
          if (request.method === 'POST' && itemMatch) {
            const id = itemMatch[1];
            if (!isSlug(id)) return sendJson(response, 400, { error: 'Invalid card id.' });
            const manifest = await readJson(manifestPath) as JsonRecord;
            await updateItem(projectRoot, workbenchRoot, manifest, id, await bodyAsJson(request));
            await writeJson(manifestPath, manifest);
            return sendJson(response, 200, queueForBrowser(manifest));
          }

          return sendJson(response, 404, { error: 'Unknown curation route.' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Curation request failed.';
          return sendJson(response, 400, { error: message });
        }
      });
    },
  };
}
