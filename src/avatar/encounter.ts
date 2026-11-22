export type EncounterPoint = { x: number; z: number };

export const GREET_SECONDS = 2.5;
const FACE_SECONDS = 0.65;
const EXIT_SECONDS = 0.75;
const NEAR = 1.50;
const CLEAR = 2.15;

export const npcEncounterPoints = new Map<string, EncounterPoint>();

export function nearestEncounter(origin: EncounterPoint, people: Iterable<EncounterPoint>) {
  let nearest: EncounterPoint | undefined;
  let distance = Infinity;
  for (const person of people) {
    const d = Math.hypot(person.x - origin.x, person.z - origin.z);
    if (d > 0.05 && d < distance) {
      nearest = person;
      distance = d;
    }
  }
  return { nearest, distance };
}

export function facePoint(from: EncounterPoint, to: EncounterPoint) {
  return Math.atan2(from.x - to.x, from.z - to.z);
}

export function turnToward(current: number, goal: number, step: number) {
  return current + Math.atan2(Math.sin(goal - current), Math.cos(goal - current)) * Math.min(1, step);
}

export class Encounter {
  elapsed = -1;
  target: EncounterPoint | undefined;
  private armed = true;
  private cooldown = 0;

  update(origin: EncounterPoint, people: Iterable<EncounterPoint>, eligible: boolean, dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!eligible) {
      this.elapsed = -1;
      return 'none';
    }
    if (this.elapsed >= 0) {
      this.elapsed += dt;
      if (this.elapsed < FACE_SECONDS) return 'face';
      if (this.elapsed < FACE_SECONDS + GREET_SECONDS) return 'bow';
      if (this.elapsed < FACE_SECONDS + GREET_SECONDS + EXIT_SECONDS) return 'turn';
      this.elapsed = -1;
      this.cooldown = 6;
      return 'leave';
    }
    const { nearest, distance } = nearestEncounter(origin, people);
    if (distance > CLEAR) this.armed = true;
    if (!this.armed || this.cooldown > 0 || !nearest || distance >= NEAR) return 'none';
    this.armed = false;
    this.target = { ...nearest };
    this.elapsed = 0;
    return 'face';
  }
}
