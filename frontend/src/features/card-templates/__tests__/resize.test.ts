import { describe, it, expect } from 'vitest';
import { computeResize, MIN_ELEMENT_SIZE } from '../resize';

describe('computeResize', () => {
  it('grows the element from its stored size when the transformer scales up', () => {
    // Regression: reading node.width() (0 for a Konva Group) collapsed this to
    // 30×30 no matter how far the handle was dragged.
    const result = computeResize(
      { width: 260, height: 30 },
      { x: 10, y: 20, scaleX: 1.5, scaleY: 2 },
    );

    expect(result).toEqual({ x: 10, y: 20, width: 390, height: 60 });
  });

  it('shrinks without going below the minimum', () => {
    const result = computeResize(
      { width: 260, height: 30 },
      { x: 0, y: 0, scaleX: 0.02, scaleY: 0.02 },
    );

    expect(result.width).toBe(MIN_ELEMENT_SIZE);
    expect(result.height).toBe(MIN_ELEMENT_SIZE);
  });

  it('rounds sub-pixel scales to whole pixels', () => {
    const result = computeResize(
      { width: 100, height: 100 },
      { x: 0, y: 0, scaleX: 1.234, scaleY: 0.777 },
    );

    expect(result.width).toBe(123);
    expect(result.height).toBe(78);
  });

  it('keeps the moved position', () => {
    const result = computeResize(
      { width: 80, height: 80 },
      { x: 123.4, y: 45.6, scaleX: 1, scaleY: 1 },
    );

    expect(result.x).toBe(123);
    expect(result.y).toBe(46);
  });
});
