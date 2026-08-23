export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function wrapAngle(angle: number): number {
  return ((angle + Math.PI) % (2.0 * Math.PI)) - Math.PI;
}

export function rad(degValue: number): number {
  return (degValue * Math.PI) / 180;
}

export function deg(radValue: number): number {
  return (radValue * 180) / Math.PI;
}

export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
