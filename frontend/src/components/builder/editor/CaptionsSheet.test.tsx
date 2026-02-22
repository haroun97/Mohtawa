import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaptionsSheetContent } from './CaptionsSheet';
import type { EDL, EdlTextOverlay } from '@/lib/api';

const minimalEDL: EDL = {
  timeline: [{ clipUrl: 's3://b/k', inSec: 0, outSec: 10, startSec: 0 }],
  overlays: [
    {
      id: 'o1',
      type: 'text',
      text: 'Hello',
      startSec: 1,
      endSec: 3,
      stylePreset: 'bold_white_shadow',
    } as EdlTextOverlay,
  ],
  audio: { voiceoverUrl: 'https://example.com/vo.mp3' },
  output: { width: 1080, height: 1920 },
};

describe('CaptionsSheetContent', () => {
  it('calls onEdlChange when overlay text is edited', () => {
    const onEdlChange = vi.fn();
    render(<CaptionsSheetContent edl={minimalEDL} onEdlChange={onEdlChange} />);
    const input = screen.getByDisplayValue('Hello');
    fireEvent.change(input, { target: { value: 'Updated' } });
    expect(onEdlChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overlays: expect.arrayContaining([
          expect.objectContaining({ text: 'Updated', startSec: 1, endSec: 3 }),
        ]),
      })
    );
  });

  it('clamps startSec to 0 when user enters negative value', () => {
    const onEdlChange = vi.fn();
    render(<CaptionsSheetContent edl={minimalEDL} onEdlChange={onEdlChange} />);
    const startInputs = screen.getAllByRole('spinbutton');
    const startInput = startInputs.find((el) => (el as HTMLInputElement).value === '1') ?? startInputs[0];
    fireEvent.change(startInput, { target: { value: '-1' } });
    expect(onEdlChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overlays: expect.arrayContaining([
          expect.objectContaining({ startSec: 0 }),
        ]),
      })
    );
  });

  it('calls onEdlChange with one less overlay when Remove is clicked', () => {
    const onEdlChange = vi.fn();
    render(<CaptionsSheetContent edl={minimalEDL} onEdlChange={onEdlChange} />);
    const removeBtn = screen.getByTitle('Remove overlay');
    fireEvent.click(removeBtn);
    expect(onEdlChange).toHaveBeenCalledWith({ overlays: [] });
  });

  it('calls onEdlChange with new overlay when Add overlay is clicked', () => {
    const onEdlChange = vi.fn();
    render(<CaptionsSheetContent edl={minimalEDL} onEdlChange={onEdlChange} />);
    const addBtn = screen.getByRole('button', { name: /Add overlay/i });
    fireEvent.click(addBtn);
    expect(onEdlChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overlays: expect.arrayContaining([
          expect.objectContaining({ text: 'Hello' }),
          expect.objectContaining({ text: 'New caption', type: 'text' }),
        ]),
      })
    );
    expect(onEdlChange.mock.calls[0][0].overlays).toHaveLength(2);
  });
});
