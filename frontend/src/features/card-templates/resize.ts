/** Smallest element an operator may produce by dragging a handle. */
export const MIN_ELEMENT_SIZE = 30;

export interface ResizedElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a Konva transformer drag into the element's stored geometry.
 *
 * The transformer scales the node; it does not change `width`/`height`. Reading
 * `node.width()` therefore returns 0 for a `Group` (Konva's default) and every
 * resize collapsed to the 30×30 minimum. The element's current size is the only
 * correct base, so it is passed in from React state.
 */
export function computeResize(
  element: { width: number; height: number },
  node: { x: number; y: number; scaleX: number; scaleY: number },
): ResizedElement {
  return {
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.round(Math.max(MIN_ELEMENT_SIZE, element.width * node.scaleX)),
    height: Math.round(Math.max(MIN_ELEMENT_SIZE, element.height * node.scaleY)),
  };
}
