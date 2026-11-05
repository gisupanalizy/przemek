import test from 'node:test';
import assert from 'node:assert/strict';
import { DriveGesture } from '../time-attack-gesture.ts';

test('touching the road starts from neutral and a tap releases cleanly', () => {
  const gesture = new DriveGesture();
  assert.equal(gesture.begin(1, 180, 240, 390), true);
  assert.equal(gesture.active, true);
  assert.equal(gesture.steer, 0);
  assert.equal(gesture.brake, false);
  assert.equal(gesture.end(1), true);
  assert.equal(gesture.active, false);
  assert.equal(gesture.steer, 0);
  assert.equal(gesture.brake, false);
});

test('one diagonal drag combines steering and braking', () => {
  const gesture = new DriveGesture();
  gesture.begin(1, 180, 200, 390);
  assert.equal(gesture.move(1, 225, 245), true);
  assert.ok(gesture.steer > 0.5);
  assert.equal(gesture.brake, true);
  gesture.move(1, 120, 248);
  assert.ok(gesture.steer < -0.7);
  assert.equal(gesture.brake, true);
});

test('brake hysteresis avoids flicker around the activation distance', () => {
  const gesture = new DriveGesture();
  gesture.begin(1, 100, 100, 390);
  gesture.move(1, 100, 141);
  assert.equal(gesture.brake, false);
  gesture.move(1, 100, 142);
  assert.equal(gesture.brake, true);
  gesture.move(1, 100, 130);
  assert.equal(gesture.brake, true);
  gesture.move(1, 100, 126);
  assert.equal(gesture.brake, false);
});

test('another pointer cannot steal or release the driving gesture', () => {
  const gesture = new DriveGesture();
  gesture.begin(1, 100, 100, 390);
  gesture.move(1, 150, 150);
  assert.equal(gesture.begin(2, 200, 200, 390), false);
  assert.equal(gesture.move(2, 0, 0), false);
  assert.equal(gesture.end(2), false);
  assert.equal(gesture.active, true);
  assert.ok(gesture.steer > 0);
  assert.equal(gesture.brake, true);
});

test('reset ignores stale events and the steering range stays bounded', () => {
  const gesture = new DriveGesture();
  for (const width of [320, 844]) {
    gesture.begin(1, 100, 100, width);
    gesture.move(1, 1e6, 100);
    assert.equal(gesture.steer, 1);
    gesture.move(1, -1e6, 100);
    assert.equal(gesture.steer, -1);
    assert.equal(gesture.move(1, Number.NaN, 100), false);
    assert.equal(gesture.steer, -1);
    gesture.reset();
    assert.equal(gesture.move(1, 200, 200), false);
  }
});
