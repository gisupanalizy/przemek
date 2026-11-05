import { useEffect, useRef } from 'react';
import { ATTACK_STEP, createAttack, referenceInput, stepAttack } from './time-attack-engine';
import { renderAttack } from './time-attack-renderer';
import { trackPoint } from './time-attack-track';
import { TRACK_LOCATION, TRACK_NAMES } from './track-labels';

function createDemo() {
  const demo = createAttack();
  // Begin near the first bend so the menu demonstrates more than a straight.
  for (let i = 0; i < 480; i++) stepAttack(demo, referenceInput(demo));
  return demo;
}

/** An isolated demonstration: it never reads or writes the player's record. */
export default function TimeAttackPreview({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !canvas.current) return;
    const element = canvas.current, ctx = element.getContext('2d', { alpha: false });
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let demo = createDemo(), camera = { angle: trackPoint(demo.s).angle };
    let w = 1, h = 1, frame = 0, last = 0, accumulator = 0;
    const draw = (dt = 0) => {
      // Keep the car legible in a wide menu frame without changing game scale.
      const zoom = Math.min(2.2, Math.max(1, w / 520));
      ctx.save(); ctx.translate(w / 2, h * 0.73); ctx.scale(zoom, zoom); ctx.translate(-w / 2, -h * 0.73);
      renderAttack(ctx, w, h, demo, null, camera, dt, reduced.matches); ctx.restore();
    };
    const resize = () => {
      const bounds = element.getBoundingClientRect(); w = Math.max(1, bounds.width); h = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(w * dpr); element.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const tick = (now: number) => {
      accumulator += last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      while (accumulator >= ATTACK_STEP) {
        stepAttack(demo, referenceInput(demo)); accumulator -= ATTACK_STEP;
        if (demo.finished) { demo = createDemo(); camera = { angle: trackPoint(demo.s).angle }; }
      }
      draw(1 / 60); frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      cancelAnimationFrame(frame); last = 0; accumulator = 0;
      if (document.hidden) return;
      draw();
      if (!reduced.matches) frame = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize(); schedule();
    document.addEventListener('visibilitychange', schedule); reduced.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', schedule); reduced.removeEventListener('change', schedule);
    };
  }, [active]);

  return <figure className="ta-preview">
    <div className="ta-preview-road"><canvas ref={canvas} role="img" aria-label={`Podgląd gry: ${TRACK_NAMES.attack}, tor widziany z góry`} /></div>
    <figcaption><div><strong>Podgląd gry</strong><span>Automatyczny przejazd · bez zapisu wyniku</span></div><span>{TRACK_LOCATION}</span></figcaption>
  </figure>;
}
