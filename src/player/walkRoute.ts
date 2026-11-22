type Point = { x: number; z: number };
type Obstacle = Point & { hx: number; hz: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const contains = (box: Obstacle, p: Point) =>
  Math.abs(p.x - box.x) <= box.hx && Math.abs(p.z - box.z) <= box.hz;

function crosses(a: Point, b: Point, box: Obstacle) {
  let entry = 0;
  let exit = 1;
  for (const [start, end, center, half] of [
    [a.x, b.x, box.x, box.hx],
    [a.z, b.z, box.z, box.hz],
  ]) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-8) {
      if (Math.abs(start - center) > half) return false;
      continue;
    }
    const t0 = (center - half - start) / delta;
    const t1 = (center + half - start) / delta;
    entry = Math.max(entry, Math.min(t0, t1));
    exit = Math.min(exit, Math.max(t0, t1));
    if (entry > exit) return false;
  }
  return true;
}

/** Find a clear route using the visible corners of the collision boxes. */
export function planWalk(start: Point, goal: Point, obstacles: Obstacle[], radius: number, bounds: Bounds): Point[] {
  const clearance = 0.015;
  const boxes = obstacles.map(box => ({
    ...box, hx: box.hx + radius + clearance, hz: box.hz + radius + clearance,
  }));
  // A click on an obstacle can be clamped onto its collision edge. Leave
  // enough room to finish the route without touching that edge.
  goal = { ...goal };
  for (let pass = 0; pass < 3; pass++) {
    for (const box of boxes) {
      if (!contains(box, goal)) continue;
      const dx = goal.x - box.x;
      const dz = goal.z - box.z;
      if (box.hx - Math.abs(dx) < box.hz - Math.abs(dz)) {
        goal.x = box.x + (Math.sign(dx) || 1) * (box.hx + 0.025);
      } else {
        goal.z = box.z + (Math.sign(dz) || 1) * (box.hz + 0.025);
      }
    }
  }
  if (goal.x < bounds.minX || goal.x > bounds.maxX || goal.z < bounds.minZ || goal.z > bounds.maxZ
    || boxes.some(box => contains(box, goal))) return [];
  const clear = (a: Point, b: Point) => boxes.every(box =>
    (a === start && contains(box, start) && !contains(box, b)) || !crosses(a, b, box),
  );
  if (clear(start, goal)) return [goal];

  const points = [start, goal];
  for (const box of boxes) {
    for (const x of [box.x - box.hx - 0.025, box.x + box.hx + 0.025]) {
      for (const z of [box.z - box.hz - 0.025, box.z + box.hz + 0.025]) {
        const corner = { x, z };
        if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
          && !boxes.some(other => contains(other, corner))) points.push(corner);
      }
    }
  }

  const cost = points.map(() => Infinity);
  const parent = points.map(() => -1);
  const visited = new Set<number>();
  const remaining = points.map(point => distance(point, goal));
  cost[0] = 0;
  while (true) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const estimate = cost[i] + remaining[i];
      if (!visited.has(i) && estimate < best) {
        best = estimate;
        current = i;
      }
    }
    if (current < 0) return [];
    if (current === 1) {
      const route = [];
      for (let i = 1; i > 0; i = parent[i]) route.push(points[i]);
      return route.reverse();
    }
    visited.add(current);
    for (let i = 1; i < points.length; i++) {
      if (visited.has(i)) continue;
      const total = cost[current] + distance(points[current], points[i]);
      if (total < cost[i] && clear(points[current], points[i])) {
        cost[i] = total;
        parent[i] = current;
      }
    }
  }
}
