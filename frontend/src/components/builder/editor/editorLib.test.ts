import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { splitTimelineAtPlayhead } from './editorLib';
import type { EdlTimelineClip } from '@/lib/api';

describe('splitTimelineAtPlayhead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when clipIndex is out of range', () => {
    const timeline: EdlTimelineClip[] = [
      { clipUrl: 's3://b/k', inSec: 0, outSec: 5, startSec: 0 },
    ];
    expect(splitTimelineAtPlayhead(timeline, -1, 2)).toBeNull();
    expect(splitTimelineAtPlayhead(timeline, 1, 2)).toBeNull();
  });

  it('returns null when playhead is at or outside segment bounds', () => {
    const timeline: EdlTimelineClip[] = [
      { clipUrl: 's3://b/k', inSec: 0, outSec: 5, startSec: 0 },
    ];
    expect(splitTimelineAtPlayhead(timeline, 0, 0)).toBeNull();
    expect(splitTimelineAtPlayhead(timeline, 0, 5)).toBeNull();
    expect(splitTimelineAtPlayhead(timeline, 0, 5.1)).toBeNull();
  });

  it('splits one clip into two with correct inSec/outSec and startSec', () => {
    const timeline: EdlTimelineClip[] = [
      { id: 'c1', clipUrl: 's3://b/k', inSec: 0, outSec: 10, startSec: 0 },
    ];
    const result = splitTimelineAtPlayhead(timeline, 0, 3);
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(2);
    const [first, second] = result!;
    expect(first.id).toBe('c1');
    expect(first.startSec).toBe(0);
    expect(first.inSec).toBe(0);
    expect(first.outSec).toBe(3);
    expect(second.id).toMatch(/^clip-\d+-split$/);
    expect(second.startSec).toBe(3);
    expect(second.inSec).toBe(3);
    expect(second.outSec).toBe(10);
  });

  it('recomputes startSec for subsequent clips when splitting in the middle of timeline', () => {
    const timeline: EdlTimelineClip[] = [
      { id: 'a', clipUrl: 's3://b/1', inSec: 0, outSec: 5, startSec: 0 },
      { id: 'b', clipUrl: 's3://b/2', inSec: 0, outSec: 5, startSec: 5 },
    ];
    const result = splitTimelineAtPlayhead(timeline, 0, 2);
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(3);
    expect(result![0].startSec).toBe(0);
    expect(result![1].startSec).toBe(2);
    expect(result![2].startSec).toBe(5); // 2 (first) + 3 (second) = 5
  });
});
