export function toWorld(point, viewport) { return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom }; }
export function toScreen(point, viewport) { return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y }; }
export function zoomAt(viewport, point, factor) {
  const world = toWorld(point, viewport);
  const zoom = Math.max(.1, Math.min(8, viewport.zoom * factor));
  return { x: point.x - world.x * zoom, y: point.y - world.y * zoom, zoom };
}
