import { describe, it, expect } from 'vitest';
import { isPlayableUrl } from './VideoThumbnailStrip';

describe('VideoThumbnailStrip / isPlayableUrl', () => {
  it('returns true for https URLs', () => {
    expect(isPlayableUrl('https://example.com/video.mp4')).toBe(true);
    expect(isPlayableUrl('https://s3.region.amazonaws.com/bucket/key.mp4')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isPlayableUrl('http://localhost/video.mp4')).toBe(true);
  });

  it('returns true for blob URLs', () => {
    expect(isPlayableUrl('blob:http://localhost/uuid')).toBe(true);
  });

  it('returns false for s3:// URLs', () => {
    expect(isPlayableUrl('s3://bucket/key/clip.mp4')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isPlayableUrl('')).toBe(false);
  });

  it('returns false for non-URL strings', () => {
    expect(isPlayableUrl('not-a-url')).toBe(false);
  });
});
