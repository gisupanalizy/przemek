/** Relative drag steering: touching the road never jumps the car to the finger. */
export class SwipeSteering {
  private pointerId: number | null = null;
  private startX = 0;
  private startLane = 0;
  private travel = 100;
  target: number | undefined;

  begin(pointerId: number, x: number, lane: number, trackWidth: number): boolean {
    if (this.pointerId !== null || !Number.isFinite(x) || !Number.isFinite(lane)) return false;
    this.pointerId = pointerId;
    this.startX = x;
    this.startLane = lane;
    this.travel = Math.max(85, Math.min(130, trackWidth * 0.22));
    this.target = undefined;
    return true;
  }

  move(pointerId: number, x: number): boolean {
    if (this.pointerId !== pointerId || !Number.isFinite(x)) return false;
    const delta = x - this.startX;
    if (this.target === undefined && Math.abs(delta) < 6) return false;
    this.target = Math.max(-1.3, Math.min(1.3, this.startLane + delta / this.travel));
    return true;
  }

  end(pointerId: number): boolean {
    if (this.pointerId !== pointerId) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.pointerId = null;
    this.target = undefined;
  }
}
