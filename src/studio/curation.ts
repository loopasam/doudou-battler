export type CurationStatus = 'processing' | 'review' | 'redo-requested' | 'approved';
export type SoundKind = 'win' | 'lose';

export interface ArtCandidate {
  id: string;
  url: string;
  promptVersion: string;
  createdAt: string;
}

export interface SoundCandidate {
  id: string;
  url: string;
  profile: string;
  createdAt: string;
}

export interface CurationItem {
  id: string;
  name: string;
  status: CurationStatus;
  referenceUrl: string;
  childNotes: string;
  reviewNotes: string;
  artCandidates: ArtCandidate[];
  winSoundCandidates: SoundCandidate[];
  loseSoundCandidates: SoundCandidate[];
  selectedArtId?: string;
  selectedWinSoundId?: string;
  selectedLoseSoundId?: string;
  updatedAt: string;
}

export interface CurationQueue {
  schemaVersion: 1;
  mode: 'local' | 'showcase';
  writable: boolean;
  style: {
    id: string;
    name: string;
    promptVersion: string;
  };
  items: CurationItem[];
}

export interface QueueProgress {
  total: number;
  approved: number;
  needsReview: number;
  redoRequested: number;
}

export function getQueueProgress(items: CurationItem[]): QueueProgress {
  return items.reduce<QueueProgress>((progress, item) => {
    progress.total += 1;
    if (item.status === 'approved') progress.approved += 1;
    if (item.status === 'review') progress.needsReview += 1;
    if (item.status === 'redo-requested') progress.redoRequested += 1;
    return progress;
  }, { total: 0, approved: 0, needsReview: 0, redoRequested: 0 });
}

export function getSelectedArt(item: CurationItem): ArtCandidate | undefined {
  return item.artCandidates.find(({ id }) => id === item.selectedArtId)
    ?? item.artCandidates[0];
}

export function isReadyForApproval(item: CurationItem): boolean {
  return Boolean(
    getSelectedArt(item)
    && (item.selectedWinSoundId ?? item.winSoundCandidates[0]?.id)
    && (item.selectedLoseSoundId ?? item.loseSoundCandidates[0]?.id),
  );
}

export function getStatusLabel(status: CurationStatus): string {
  if (status === 'redo-requested') return 'Redo requested';
  if (status === 'approved') return 'Approved';
  if (status === 'review') return 'Ready for review';
  return 'Processing';
}
