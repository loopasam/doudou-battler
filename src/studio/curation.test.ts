import { describe, expect, it } from 'vitest';
import {
  getQueueProgress,
  getSelectedArt,
  getStatusLabel,
  isReadyForApproval,
  type CurationItem,
} from './curation';

const item = (overrides: Partial<CurationItem> = {}): CurationItem => ({
  id: 'luna-unicorn',
  name: 'Luna',
  status: 'review',
  referenceUrl: '/reference.jpg',
  childNotes: '',
  reviewNotes: '',
  artCandidates: [{ id: 'art-01', url: '/art.png', promptVersion: 'v1', createdAt: 'now' }],
  winSoundCandidates: [{ id: 'win-01', url: '/win.wav', profile: 'magic', createdAt: 'now' }],
  loseSoundCandidates: [{ id: 'lose-01', url: '/lose.wav', profile: 'magic', createdAt: 'now' }],
  updatedAt: 'now',
  ...overrides,
});

describe('curation queue', () => {
  it('summarizes the review workload', () => {
    expect(getQueueProgress([
      item(),
      item({ id: 'redo', status: 'redo-requested' }),
      item({ id: 'approved', status: 'approved' }),
    ])).toEqual({ total: 3, approved: 1, needsReview: 1, redoRequested: 1 });
  });

  it('uses the first candidate until a curator makes a selection', () => {
    expect(getSelectedArt(item())?.id).toBe('art-01');
    expect(getSelectedArt(item({ artCandidates: [] }))).toBeUndefined();
  });

  it('only approves cards that have art and both reaction sounds', () => {
    expect(isReadyForApproval(item())).toBe(true);
    expect(isReadyForApproval(item({ loseSoundCandidates: [] }))).toBe(false);
  });

  it('prints friendly status labels', () => {
    expect(getStatusLabel('review')).toBe('Ready for review');
    expect(getStatusLabel('redo-requested')).toBe('Redo requested');
  });
});
