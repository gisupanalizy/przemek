const BRAKE_ON_DISTANCE = 42;
const BRAKE_OFF_DISTANCE = 26;

/** One-finger driving: horizontal drag steers, while pulling down brakes. */
export class DriveGesture {
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private travel = 72;

  steer = 0;
  brake = false;

  get active(): boolean {
    return this.pointerId !== null;
  }

  begin(pointerId: number, x: number, y: number, roadWidth: number): boolean {
    if (this.pointerId !== null || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(roadWidth)) return false;
    this.pointerId = pointerId;
    this.originX = x;
    this.originY = y;
    this.travel = Math.max(64, Math.min(96, roadWidth * 0.18));
    this.steer = 0;
    this.brake = false;
    return true;
  }

  move(pointerId: number, x: number, y: number): boolean {
    if (this.pointerId !== pointerId || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.steer = Math.max(-1, Math.min(1, (x - this.originX) / this.travel));
    const downward = y - this.originY;
    if (!this.brake && downward >= BRAKE_ON_DISTANCE) this.brake = true;
    else if (this.brake && downward <= BRAKE_OFF_DISTANCE) this.brake = false;
    return true;
  }

  end(pointerId: number): boolean {
    if (this.pointerId !== pointerId) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.pointerId = null;
    this.steer = 0;
    this.brake = false;
  }
}
