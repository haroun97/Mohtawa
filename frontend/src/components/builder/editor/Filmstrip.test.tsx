import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Filmstrip } from './Filmstrip';

describe('Filmstrip', () => {
  it('renders with accessible slider role and current value', () => {
    const onSlipChange = vi.fn();
    render(
      <Filmstrip
        sourceDurationSec={60}
        inSec={10}
        segmentDurationSec={5}
        onSlipChange={onSlipChange}
      />
    );
    const strip = screen.getByRole('slider', { name: /slip source in point/i });
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveAttribute('aria-valuenow', '10');
    expect(strip).toHaveAttribute('aria-valuemin', '0');
    expect(strip).toHaveAttribute('aria-valuemax', '55'); // 60 - 5
  });

  it('calls onSlipChange when user drags (mouse)', () => {
    const onSlipChange = vi.fn();
    render(
      <Filmstrip
        sourceDurationSec={100}
        inSec={20}
        segmentDurationSec={10}
        onSlipChange={onSlipChange}
      />
    );
    const strip = screen.getByRole('slider');
    const rect = strip.getBoundingClientRect();
    // Mock getBoundingClientRect so drag delta is predictable
    strip.getBoundingClientRect = () => ({
      ...rect,
      left: 0,
      width: 1000,
      top: 0,
      height: 56,
      right: 1000,
      bottom: 56,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.mouseDown(strip, { clientX: 200, button: 0 });
    fireEvent.mouseMove(window, { clientX: 400 });
    expect(onSlipChange).toHaveBeenCalled();
    const lastCall = onSlipChange.mock.calls[onSlipChange.mock.calls.length - 1];
    expect(typeof lastCall[0]).toBe('number');
    expect(lastCall[0]).toBeGreaterThanOrEqual(0);
    expect(lastCall[0]).toBeLessThanOrEqual(90); // maxIn = 100 - 10
  });

  it('clamps inSec to valid range', () => {
    const onSlipChange = vi.fn();
    render(
      <Filmstrip
        sourceDurationSec={30}
        inSec={100}
        segmentDurationSec={5}
        onSlipChange={onSlipChange}
      />
    );
    const strip = screen.getByRole('slider');
    expect(strip).toHaveAttribute('aria-valuenow', '25'); // clamped to 30 - 5
  });
});
