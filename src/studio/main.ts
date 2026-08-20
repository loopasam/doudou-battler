import './style.css';
import {
  getQueueProgress,
  getSelectedArt,
  getStatusLabel,
  isReadyForApproval,
  type CurationItem,
  type CurationQueue,
  type SoundCandidate,
  type SoundKind,
} from './curation';

const required = <T extends Element>(selector: string, root: ParentNode = document): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing studio element: ${selector}`);
  return element;
};

const queueList = required<HTMLElement>('[data-queue-list]');
const workspace = required<HTMLElement>('[data-workspace]');
const emptyState = required<HTMLElement>('[data-empty]');
const template = required<HTMLTemplateElement>('[data-workspace-template]');
const connection = required<HTMLElement>('[data-connection]');
const appStatus = required<HTMLElement>('[data-app-status]');
let queue: CurationQueue;
let selectedId = '';

async function loadQueue(): Promise<CurationQueue> {
  try {
    const response = await fetch('../api/curation');
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Local curation API is unavailable.');
    }
    return await response.json() as CurationQueue;
  } catch {
    const response = await fetch('../assets/cards/curation-showcase.json');
    if (!response.ok) throw new Error('The studio could not load its showcase.');
    return await response.json() as CurationQueue;
  }
}

function setText(selector: string, value: string | number) {
  required<HTMLElement>(selector).textContent = String(value);
}

function updateProgress() {
  const progress = getQueueProgress(queue.items);
  setText('[data-progress-total]', progress.total);
  setText('[data-progress-review]', progress.needsReview);
  setText('[data-progress-redo]', progress.redoRequested);
  setText('[data-progress-approved]', progress.approved);
  setText('[data-queue-count]', `${progress.total} ${progress.total === 1 ? 'card' : 'cards'}`);
}

function buttonWithImage(item: CurationItem) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'queue-card';
  button.dataset.selected = String(item.id === selectedId);
  button.addEventListener('click', () => {
    selectedId = item.id;
    render();
  });

  const art = getSelectedArt(item);
  const image = document.createElement('img');
  image.src = art?.url ?? item.referenceUrl;
  image.alt = '';
  const copy = document.createElement('span');
  copy.className = 'queue-card-copy';
  const name = document.createElement('strong');
  name.textContent = item.name;
  const status = document.createElement('small');
  status.textContent = getStatusLabel(item.status);
  copy.append(name, status);
  const arrow = document.createElement('span');
  arrow.className = 'queue-arrow';
  arrow.textContent = '›';
  button.append(image, copy, arrow);
  return button;
}

async function postAction(itemId: string, payload: Record<string, unknown>, success: string) {
  appStatus.textContent = 'Saving…';
  const response = await fetch(`../api/curation/items/${itemId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as CurationQueue | { error: string };
  if (!response.ok) {
    const message = 'error' in result ? result.error : 'The curation action failed.';
    throw new Error(message);
  }
  queue = result as CurationQueue;
  appStatus.textContent = success;
  render();
}

function renderArtCandidates(container: HTMLElement, item: CurationItem, preview: HTMLImageElement, caption: HTMLElement) {
  container.replaceChildren();
  item.artCandidates.forEach((candidate, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'candidate-thumb';
    button.dataset.selected = String((item.selectedArtId ?? item.artCandidates[0]?.id) === candidate.id);
    button.disabled = !queue.writable;
    button.setAttribute('aria-label', `Select artwork candidate ${index + 1}`);
    const image = document.createElement('img');
    image.src = candidate.url;
    image.alt = '';
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    button.append(image, number);
    button.addEventListener('click', () => {
      preview.src = candidate.url;
      caption.textContent = `Candidate ${String(index + 1).padStart(2, '0')}`;
      void postAction(item.id, { action: 'select-art', candidateId: candidate.id }, 'Artwork selection saved.')
        .catch(showError);
    });
    container.append(button);
  });
}

function renderSoundCandidates(container: HTMLElement, item: CurationItem, kind: SoundKind) {
  container.replaceChildren();
  const label = document.createElement('span');
  label.className = `sound-kind ${kind}`;
  label.textContent = kind === 'win' ? 'WIN' : 'LOSE';
  container.append(label);
  const candidates = kind === 'win' ? item.winSoundCandidates : item.loseSoundCandidates;
  if (!candidates.length) {
    const missing = document.createElement('span');
    missing.className = 'sound-missing';
    missing.textContent = queue.writable ? 'Sound is still processing' : 'No preview in showcase';
    container.append(missing);
    return;
  }
  candidates.forEach((candidate: SoundCandidate, index) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'sound-choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${kind}-sound`;
    radio.checked = (kind === 'win'
      ? item.selectedWinSoundId ?? candidates[0]?.id
      : item.selectedLoseSoundId ?? candidates[0]?.id) === candidate.id;
    radio.disabled = !queue.writable;
    radio.addEventListener('change', () => {
      void postAction(item.id, {
        action: 'select-sound',
        kind,
        candidateId: candidate.id,
      }, `${kind === 'win' ? 'Win' : 'Lose'} sound saved.`).catch(showError);
    });
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = candidate.url;
    audio.setAttribute('aria-label', `${kind} sound candidate ${index + 1}`);
    wrapper.append(radio, audio);
    container.append(wrapper);
  });
}

function renderWorkspace(item: CurationItem) {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const nameHeading = required<HTMLElement>('[data-item-name]', fragment);
  const status = required<HTMLElement>('[data-item-status]', fragment);
  const referenceImage = required<HTMLImageElement>('[data-reference-image]', fragment);
  const candidateImage = required<HTMLImageElement>('[data-candidate-image]', fragment);
  const candidateCaption = required<HTMLElement>('[data-candidate-caption]', fragment);
  const form = required<HTMLFormElement>('[data-details-form]', fragment);
  const selectedArt = getSelectedArt(item);

  nameHeading.textContent = item.name;
  status.textContent = getStatusLabel(item.status);
  status.dataset.status = item.status;
  referenceImage.src = item.referenceUrl;
  referenceImage.alt = `${item.name} toy reference`;
  candidateImage.src = selectedArt?.url ?? item.referenceUrl;
  candidateImage.alt = `${item.name} generated storybook artwork`;
  const selectedIndex = Math.max(0, item.artCandidates.findIndex(({ id }) => id === selectedArt?.id));
  candidateCaption.textContent = selectedArt ? `Candidate ${String(selectedIndex + 1).padStart(2, '0')}` : 'Awaiting artwork';

  renderArtCandidates(required('[data-art-candidates]', fragment), item, candidateImage, candidateCaption);
  renderSoundCandidates(required('[data-win-sounds]', fragment), item, 'win');
  renderSoundCandidates(required('[data-lose-sounds]', fragment), item, 'lose');

  const nameInput = required<HTMLInputElement>('input[name="name"]', form);
  const childNotes = required<HTMLTextAreaElement>('textarea[name="childNotes"]', form);
  const reviewNotes = required<HTMLTextAreaElement>('textarea[name="reviewNotes"]', form);
  nameInput.value = item.name;
  childNotes.value = item.childNotes;
  reviewNotes.value = item.reviewNotes;
  Array.from(form.elements).forEach((control) => {
    (control as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement).disabled = !queue.writable;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void postAction(item.id, {
      action: 'update-meta',
      name: nameInput.value,
      childNotes: childNotes.value,
      reviewNotes: reviewNotes.value,
    }, 'Character details saved.').catch(showError);
  });

  const redo = required<HTMLButtonElement>('[data-redo]', fragment);
  const approve = required<HTMLButtonElement>('[data-approve]', fragment);
  redo.disabled = !queue.writable;
  approve.disabled = !queue.writable || !isReadyForApproval(item);
  redo.addEventListener('click', () => {
    void postAction(item.id, {
      action: 'request-redo',
      reviewNotes: reviewNotes.value,
    }, 'Redo requested. I’ll use these notes for the next candidate.').catch(showError);
  });
  approve.addEventListener('click', () => {
    void postAction(item.id, { action: 'approve' }, 'Card approved and promoted to the public asset pack.')
      .catch(showError);
  });

  const decisionCopy = required<HTMLElement>('[data-decision-copy]', fragment);
  if (!queue.writable) {
    decisionCopy.textContent = 'Read-only public showcase. The real review queue is available only on this device.';
  } else if (item.status === 'approved') {
    decisionCopy.textContent = 'This card is approved. You can still change its selections and approve again.';
  }
  workspace.replaceChildren(fragment);
}

function showError(error: unknown) {
  appStatus.textContent = error instanceof Error ? error.message : 'Something went wrong.';
}

function render() {
  connection.textContent = queue.writable ? '● Local & private' : 'Public showcase';
  connection.dataset.mode = queue.mode;
  updateProgress();
  queueList.replaceChildren(...queue.items.map(buttonWithImage));
  if (!queue.items.length) {
    workspace.hidden = true;
    emptyState.hidden = false;
    return;
  }
  selectedId = queue.items.some(({ id }) => id === selectedId) ? selectedId : queue.items[0].id;
  queueList.replaceChildren(...queue.items.map(buttonWithImage));
  workspace.hidden = false;
  emptyState.hidden = true;
  const selected = queue.items.find(({ id }) => id === selectedId);
  if (selected) renderWorkspace(selected);
}

loadQueue()
  .then((loaded) => {
    queue = loaded;
    render();
  })
  .catch(showError);
