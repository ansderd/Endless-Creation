import type { Position, ViewportTransform } from './types';

export const MIN_CANVAS_SCALE = 0.2;
export const MAX_CANVAS_SCALE = 2.5;

export function clampScale(scale: number) {
  return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, scale));
}

export function screenToWorld(point: Position, viewport: ViewportTransform): Position {
  return {
    x: (point.x - viewport.x) / viewport.k,
    y: (point.y - viewport.y) / viewport.k,
  };
}

export function zoomAtPoint(viewport: ViewportTransform, point: Position, nextScale: number): ViewportTransform {
  const k = clampScale(nextScale);
  const world = screenToWorld(point, viewport);
  return {
    x: point.x - world.x * k,
    y: point.y - world.y * k,
    k,
  };
}

export function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
