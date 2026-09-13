import type { Frame } from '@/lib/projector/template';

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

export type Handle = (typeof HANDLES)[number];

export const MIN_W = 0.02;
export const MIN_H = 0.008;

export const SNAP = 0.006;

export const moveBy = (frame: Frame, dx: number, dy: number): Frame => ({
  ...frame,
  x: frame.x + dx,
  y: frame.y + dy,
});

export const resizeBy = (frame: Frame, handle: Handle, dx: number, dy: number): Frame => {
  let { x, y, w, h } = frame;

  const right = x + w;
  const bottom = y + h;

  if (handle.includes('w')) {
    x = Math.min(x + dx, right - MIN_W);
    w = right - x;
  }

  if (handle.includes('e')) w = Math.max(MIN_W, w + dx);

  if (handle.includes('n')) {
    y = Math.min(y + dy, bottom - MIN_H);
    h = bottom - y;
  }

  if (handle.includes('s')) h = Math.max(MIN_H, h + dy);

  return { x, y, w, h };
};

export const clampToFrame = (frame: Frame): Frame => ({
  ...frame,
  x: Math.min(1 - frame.w / 2, Math.max(-frame.w / 2, frame.x)),
  y: Math.min(1 - frame.h / 2, Math.max(-frame.h / 2, frame.y)),
});

export const EDGES = ['left', 'hcenter', 'right', 'top', 'vmiddle', 'bottom'] as const;

export type Edge = (typeof EDGES)[number];

export const alignTo = (frame: Frame, edge: Edge): Frame => {
  switch (edge) {
    case 'left':
      return { ...frame, x: 0 };
    case 'hcenter':
      return { ...frame, x: (1 - frame.w) / 2 };
    case 'right':
      return { ...frame, x: 1 - frame.w };
    case 'top':
      return { ...frame, y: 0 };
    case 'vmiddle':
      return { ...frame, y: (1 - frame.h) / 2 };
    default:
      return { ...frame, y: 1 - frame.h };
  }
};

export const ANGLE_STEP = 15;

export const normalizeAngle = (degrees: number) => {
  const turned = ((degrees + 180) % 360 + 360) % 360 - 180;

  return turned === -180 ? 180 : turned;
};

export const snapAngle = (degrees: number, step = ANGLE_STEP) =>
  normalizeAngle(Math.round(degrees / step) * step);

export const angleFrom = (cx: number, cy: number, x: number, y: number) =>
  normalizeAngle((Math.atan2(x - cx, cy - y) * 180) / Math.PI);

export const unrotate = (dx: number, dy: number, degrees: number) => {
  const radians = (-degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
};

export interface Guide {
  axis: 'x' | 'y';
  at: number;
}

const edgesOf = (frame: Frame, axis: 'x' | 'y') =>
  axis === 'x' ? [frame.x, frame.x + frame.w / 2, frame.x + frame.w] : [frame.y, frame.y + frame.h / 2, frame.y + frame.h];

const nearest = (frame: Frame, others: Frame[], axis: 'x' | 'y', tolerance: number) => {
  const targets = [0, 0.5, 1, ...others.flatMap(other => edgesOf(other, axis))];
  const edges = edgesOf(frame, axis);

  let delta = 0;
  let best = tolerance;

  for (const edge of edges) {
    for (const target of targets) {
      const distance = Math.abs(target - edge);

      if (distance < best) {
        best = distance;
        delta = target - edge;
      }
    }
  }

  if (!delta) return { delta: 0, guides: [] as Guide[] };

  const guides = targets
    .filter(target => edges.some(edge => Math.abs(edge + delta - target) < 1e-9))
    .map(at => ({ axis, at }));

  return { delta, guides: guides.filter((guide, index) => guides.findIndex(one => one.at === guide.at) === index) };
};

export const snapTo = (frame: Frame, others: Frame[], tolerance = SNAP): { frame: Frame; guides: Guide[] } => {
  const horizontal = nearest(frame, others, 'x', tolerance);
  const vertical = nearest(frame, others, 'y', tolerance);

  return {
    frame: { ...frame, x: frame.x + horizontal.delta, y: frame.y + vertical.delta },
    guides: [...horizontal.guides, ...vertical.guides],
  };
};
