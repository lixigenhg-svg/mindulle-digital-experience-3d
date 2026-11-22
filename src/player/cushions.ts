import { CUSHION_ROWS, CUSHION_COLS, HALL_SCALE } from '../config';

export const cushions = CUSHION_ROWS.flatMap(z =>
  CUSHION_COLS.filter(x => Math.abs(x) >= 1.15).map(x => ({
    x: x * HALL_SCALE,
    z: 8 + (z - 8) * HALL_SCALE,
  })),
).map((point, id) => ({ ...point, id }));

export type Cushion = typeof cushions[number];

const indoor = cushions.filter(pad => pad.z >= 2.2 && pad.z <= 18.5);
export const npcCushions = Array.from({ length: 14 }, (_, i) => indoor[Math.floor(i * indoor.length / 14)]);
const npcIds = new Set(npcCushions.map(pad => pad.id));

type Point = { x: number; z: number };
type Peer = Point & { id: string; anim: string };
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z) < 0.54;

export function readCushionSignal(anim: string) {
  const match = /^p([wikbs]):(\d+)$/.exec(anim);
  return match ? { state: match[1], id: Number(match[2]) } : undefined;
}

export function cushionTaken(pad: Cushion, peers: Iterable<Peer>, selfId?: string, ownsClaim = false) {
  if (npcIds.has(pad.id)) return true;
  for (const peer of peers) {
    const claim = readCushionSignal(peer.anim);
    if (claim?.id === pad.id) {
      const seated = claim.state === 'k' || claim.state === 'b' || claim.state === 's';
      if (!ownsClaim || !selfId || seated || peer.id < selfId) return true;
    } else if (near(pad, peer)) {
      return true;
    }
  }
  return false;
}

export function overlappingClaim(pad: Cushion, peers: Iterable<Peer>, selfId: string) {
  for (const peer of peers) {
    const signal = readCushionSignal(peer.anim);
    if (peer.id < selfId && signal?.id === pad.id && 'kbs'.includes(signal.state)) return true;
  }
  return false;
}

export function nearestFreeCushion(pos: Point, peers: readonly Peer[], excluded: ReadonlySet<number> = new Set()) {
  let best: Cushion | undefined;
  let distance = Infinity;
  for (const pad of cushions) {
    const candidate = Math.hypot(pad.x - pos.x, pad.z - pos.z);
    if (candidate < distance && !excluded.has(pad.id) && !cushionTaken(pad, peers)) {
      best = pad;
      distance = candidate;
    }
  }
  return best;
}
