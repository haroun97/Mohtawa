import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlipModeOverlay } from './SlipModeOverlay';
import type { EdlTimelineClip } from '@/lib/api';

const clip: EdlTimelineClip = {
  id: 'c1',
  clipUrl: 'https://example.com/video.mp4',
  inSec: 5,
  outSec: 15,
  startSec: 0,
};

describe('SlipModeOverlay', () => {
  const setClipSlipInAbsolute = vi.fn();
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preview time readout and filmstrip', () => {
    render(
      <SlipModeOverlay
        clip={clip}
        clipIndex={0}
        resolvedClipUrl={null}
        setClipSlipInAbsolute={setClipSlipInAbsolute}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText(/5\.0s – 15\.0s/)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /slip source in point/i })).toBeInTheDocument();
  });

  it('has Cancel and Confirm in footer', () => {
    render(
      <SlipModeOverlay
        clip={clip}
        clipIndex={0}
        resolvedClipUrl={null}
        setClipSlipInAbsolute={setClipSlipInAbsolute}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('is dialog and modal', () => {
    render(
      <SlipModeOverlay
        clip={clip}
        clipIndex={0}
        resolvedClipUrl={null}
        setClipSlipInAbsolute={setClipSlipInAbsolute}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    const dialog = screen.getByRole('dialog', { name: /slip mode/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
