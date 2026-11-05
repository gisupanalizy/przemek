import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowLeftRight, ArrowRight, ChevronLeft, Flag, Gauge, Maximize2, Pause, Play, RotateCcw, Smartphone, Trophy, Zap } from 'lucide-react';
import { createRace, emptyControls, FIXED_STEP, position, RACE_SECONDS, score, stepRace, triggerBoost, type Controls, type Race } from './race-engine';
import { renderRace } from './race-renderer';
import { OFFROAD_LIMIT, trackAt } from './race-track';
import { SwipeSteering } from './race-gesture';
import './race-game.css';

type Phase = 'ready' | 'orient' | 'countdown' | 'racing' | 'paused' | 'finished';
type RecordScore = { score: number; position: number };
type ButtonControl = 'left' | 'right' | 'brake' | 'boost';
const RECORD_KEY = 'f1-w-punkt:sprint-record:v2';
const DRIVER = `${import.meta.env.BASE_URL}game/driver.png`;

function readRecord(): RecordScore | null {
  try {
    const data = JSON.parse(localStorage.getItem(RECORD_KEY) || 'null');
    return data && Number.isFinite(data.score) && data.score >= 0 && Number.isInteger(data.position)
      && data.position >= 1 && data.position <= 8 ? data : null;
  } catch { return null; }
}

export default function RaceGame({ active, onImmersiveChange }: { active: boolean; onImmersiveChange: (value: boolean) => void }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const race = useRef(createRace());
  const phaseRef = useRef<Phase>('ready');
  const controls = useRef<Controls>(emptyControls());
  const pointerControls = useRef(new Map<number, ButtonControl>());
  const keyControls = useRef(new Set<string>());
  const swipe = useRef(new SwipeSteering());
  const [hasSwiped, setHasSwiped] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState(() => snapshot(race.current));
  const [record, setRecord] = useState(readRecord);
  const [newRecord, setNewRecord] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [portrait, setPortrait] = useState(() => matchMedia('(orientation: portrait)').matches);
  const [driverLoaded, setDriverLoaded] = useState(false);
  const [driverError, setDriverError] = useState(false);
  const [driverAttempt, setDriverAttempt] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const countdownTime = useRef(3);
  const immersive = phase !== 'ready';

  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const releaseControls = useCallback(() => {
    pointerControls.current.clear(); keyControls.current.clear(); controls.current = emptyControls();
    swipe.current.reset();
    race.current.boost = false; race.current.boostTime = 0;
  }, []);
  const syncControls = useCallback(() => {
    const values = [...pointerControls.current.values()];
    const keys = keyControls.current;
    controls.current = {
      left: values.includes('left') || keys.has('ArrowLeft') || keys.has('a'),
      right: values.includes('right') || keys.has('ArrowRight') || keys.has('d'),
      brake: values.includes('brake') || keys.has('ArrowDown') || keys.has('s'),
      boost: values.includes('boost') || keys.has(' ') || keys.has('Shift'),
      steerTarget: swipe.current.target,
    };
  }, []);
  const pause = useCallback(() => {
    releaseControls();
    if (phaseRef.current === 'racing' || phaseRef.current === 'countdown') changePhase('paused');
  }, [changePhase, releaseControls]);

  const beginCountdown = useCallback(() => {
    releaseControls(); countdownTime.current = 3; setCountdown(3); changePhase('countdown');
  }, [changePhase, releaseControls]);

  const requestGameScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && root.current?.requestFullscreen) await root.current.requestFullscreen();
    } catch { /* Landscape layout also works inside the ordinary browser viewport. */ }
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      await orientation?.lock?.('landscape');
    } catch { /* Manual rotation is the supported fallback. */ }
  }, []);

  const start = (fullscreen = true) => {
    if (!driverLoaded) return;
    race.current = createRace(); setHud(snapshot(race.current)); setNewRecord(false); setHasSwiped(false);
    if (fullscreen) void requestGameScreen();
    if (matchMedia('(orientation: portrait)').matches) changePhase('orient');
    else beginCountdown();
  };
  const resume = () => {
    if (matchMedia('(orientation: portrait)').matches) return;
    beginCountdown();
  };
  const exit = useCallback(() => {
    releaseControls(); changePhase('ready');
    try { screen.orientation?.unlock?.(); } catch { /* Optional browser API. */ }
    if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {});
  }, [changePhase, releaseControls]);

  useEffect(() => { onImmersiveChange(immersive && active); }, [immersive, active, onImmersiveChange]);
  useEffect(() => {
    if (!immersive || !active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [immersive, active]);
  useEffect(() => {
    if (!active) {
      pause();
      try { screen.orientation?.unlock?.(); } catch { /* Optional browser API. */ }
      if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {});
    }
    return releaseControls;
  }, [active, pause, releaseControls]);
  useEffect(() => {
    const media = matchMedia('(orientation: portrait)');
    const onChange = () => {
      setPortrait(media.matches);
      if (media.matches) pause();
      else if (phaseRef.current === 'orient' && !document.hidden) beginCountdown();
    };
    const visibility = () => { if (document.hidden) pause(); };
    const fullscreen = () => { if (!document.fullscreenElement) pause(); };
    media.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreen);
    window.addEventListener('blur', pause);
    window.addEventListener('pagehide', pause);
    return () => {
      media.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullscreen);
      window.removeEventListener('blur', pause); window.removeEventListener('pagehide', pause);
    };
  }, [pause, beginCountdown]);
  useEffect(() => {
    if (!active) return;
    const supported = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'a', 'd', 's', ' ', 'Shift'];
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('button, a, input, textarea, select')) return;
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') { if (!event.repeat) pause(); return; }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (supported.includes(key) && phaseRef.current === 'racing') {
        if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) swipe.current.reset();
        event.preventDefault(); keyControls.current.add(key); syncControls();
        if ((key === ' ' || key === 'Shift') && !event.repeat) triggerBoost(race.current);
      }
    };
    const up = (event: KeyboardEvent) => {
      keyControls.current.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key); syncControls();
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [active, pause, syncControls]);

  useEffect(() => {
    if (!active || !canvas.current) return;
    const element = canvas.current;
    const ctx = element.getContext('2d', { alpha: false });
    if (!ctx) return;
    let width = 1, height = 1, frame = 0, last = 0, accumulator = 0, nextHud = 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const bounds = element.getBoundingClientRect(); width = bounds.width; height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const finish = () => {
      releaseControls(); changePhase('finished');
      const current = { score: score(race.current), position: position(race.current) };
      const previous = readRecord();
      if (!previous || current.score > previous.score) {
        setRecord(current); setNewRecord(true);
        try { localStorage.setItem(RECORD_KEY, JSON.stringify(current)); setStorageFailed(false); }
        catch { setStorageFailed(true); }
      }
    };
    const tick = (now: number) => {
      const elapsed = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      if (phaseRef.current === 'countdown') {
        countdownTime.current -= elapsed;
        setCountdown(Math.max(1, Math.ceil(countdownTime.current)));
        if (countdownTime.current <= 0) { accumulator = 0; changePhase('racing'); }
      } else if (phaseRef.current === 'racing') {
        accumulator += elapsed;
        while (accumulator >= FIXED_STEP && !race.current.finished) {
          stepRace(race.current, controls.current, FIXED_STEP); accumulator -= FIXED_STEP;
        }
        if (race.current.finished) finish();
      } else accumulator = 0;
      renderRace(ctx, width, height, race.current, reducedMotion.matches);
      if (now >= nextHud) { setHud(snapshot(race.current)); nextHud = now + 80; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, changePhase, releaseControls]);

  const holdButton = (control: ButtonControl) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (phaseRef.current !== 'racing') return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      if (control === 'left' || control === 'right') swipe.current.reset();
      pointerControls.current.set(event.pointerId, control); syncControls();
      if (control === 'boost') triggerBoost(race.current);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointerControls.current.delete(event.pointerId); syncControls();
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointerControls.current.delete(event.pointerId); syncControls();
    },
    onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointerControls.current.delete(event.pointerId); syncControls();
    },
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    onClick: () => { if (control === 'boost' && phaseRef.current === 'racing') triggerBoost(race.current); },
  });
  const endSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipe.current.end(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    syncControls();
  };
  const mustRotate = immersive && portrait;

  return <section ref={root} className={`rg ${immersive ? 'rg-immersive' : ''}`} aria-label="Gra wyścigowa: Twój sprint">
    {!immersive && <div className="rg-intro">
      <div className="rg-intro-copy">
        <h1>Teraz <span>Twoja kolej.</span></h1>
        <p>Osiem bolidów. Dziewięćdziesiąt sekund.<br />Ty za kierownicą. Do zobaczenia na podium.</p>
        <div className="rg-race-details"><span><Flag size={16} /> SPRINT 90 S</span><span><Smartphone size={16} /> GRAJ W POZIOMIE</span></div>
        <button className="rg-start" onClick={() => start()} disabled={!driverLoaded}><Play size={20} fill="currentColor" />{driverError ? 'Grafika niedostępna' : driverLoaded ? 'Graj' : 'Przygotowanie kokpitu…'}<ArrowRight size={20} /></button>
        <p className="rg-local-record">{record ? <>Twój rekord: <strong>{record.score.toLocaleString('pl-PL')} pkt</strong> · P{record.position}</> : 'Startujesz z P8. Skończ na podium.'}</p>
      </div>
      <div className="rg-intro-photo"><img src={DRIVER} alt="Ty w czerwonym kombinezonie za kierownicą bolidu, w stylistyce pixel art" /><div><span>KAMERA KIEROWCY</span><b>GŁÓWNA ROLA: TY</b></div></div>
    </div>}

    <div className="rg-stage" aria-label="Tor i kamera kierowcy">
      <div className="rg-track"
        onPointerDown={event => {
          if (phaseRef.current !== 'racing' || event.button !== 0 || (event.target as Element).closest('button, a, input')) return;
          if (!swipe.current.begin(event.pointerId, event.clientX, race.current.x, event.currentTarget.getBoundingClientRect().width)) return;
          event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); syncControls();
        }}
        onPointerMove={event => {
          if (phaseRef.current !== 'racing' || !swipe.current.move(event.pointerId, event.clientX)) return;
          event.preventDefault(); if (!hasSwiped) setHasSwiped(true); syncControls();
        }}
        onPointerUp={endSwipe} onPointerCancel={endSwipe} onLostPointerCapture={endSwipe}
        onContextMenu={event => { if (phaseRef.current === 'racing') event.preventDefault(); }}>
        <canvas ref={canvas} aria-label="Tor wyścigowy widziany zza bolidu. Przesuwaj palec po torze w lewo lub w prawo, aby skręcać. Możesz też użyć przycisków lub strzałek klawiatury." />
        <div className="rg-hud">
          <div className="rg-position"><span>POZYCJA</span><strong>P{hud.position}<small>/ 8</small></strong></div>
          <div className={`rg-timer ${hud.remaining <= 10 ? 'is-urgent' : ''}`}><span>DO METY</span><strong>{String(Math.floor(hud.remaining / 60)).padStart(2, '0')}:{String(hud.remaining % 60).padStart(2, '0')}</strong></div>
          <div className="rg-points"><span>PUNKTY</span><strong>{hud.score.toLocaleString('pl-PL')}</strong></div>
        </div>
        <div className="rg-course-label"><span className="rg-live-dot" /> RIVIERA · TOR ARCADE</div>
        {immersive && <div className={`rg-corner-cue ${hud.tooFast ? 'is-danger' : hud.nextDistance < 160 ? 'is-braking-zone' : ''}`}>
          {hud.nextDistance < 190 ? <>{hud.nextTurn < 0 ? <ArrowLeft size={25} /> : <ArrowRight size={25} />}<div><strong>{hud.inCorner ? hud.cornerName : `${hud.nextTurn < 0 ? 'LEWY' : 'PRAWY'} ZA ${hud.nextDistance} M`}</strong><span>{hud.tooFast ? 'HAMUJ!' : hud.inCorner ? 'CEL' : 'HAMUJ DO'} {hud.cornerSpeed} KM/H</span></div></> : <><Zap size={22} /><div><strong>PROSTA · ATAKUJ</strong><span>{hud.slipstream ? 'CIEŃ AERO · WYPRZEDZAJ' : 'NITRO NA PROSTEJ'}</span></div></>}
        </div>}
        {phase === 'racing' && <div className={`rg-event ${hud.offroad || hud.gripRecovery ? 'is-warning' : ''}`} role="status" aria-live="polite">{hud.gripRecovery ? 'POŚLIZG · ODZYSKAJ PRZYCZEPNOŚĆ' : hud.offroad ? 'POBOCZE · WRÓĆ NA ASFALT' : hud.event || (hud.slipstream ? 'CIEŃ AERODYNAMICZNY · +PRĘDKOŚĆ' : '')}</div>}
        <div className="rg-speed"><Gauge size={17} /><strong>{hud.speed}</strong><span>KM/H</span>{hud.boost && <b>NITRO</b>}</div>
        <div className="rg-steering" role="group" aria-label="Skręcanie">
          <button aria-label="Skręć w lewo, przytrzymaj" disabled={phase !== 'racing'} {...holdButton('left')}><ArrowLeft /></button>
          <button aria-label="Skręć w prawo, przytrzymaj" disabled={phase !== 'racing'} {...holdButton('right')}><ArrowRight /></button>
        </div>
        {phase === 'racing' && !hasSwiped && hud.remaining > 82 && <div className="rg-swipe-hint"><ArrowLeftRight size={17} /> PRZESUŃ PO TORZE</div>}
        {!immersive && <div className="rg-preview-label">TWÓJ TOR. TWÓJ WYŚCIG.</div>}
      </div>

      <aside className="rg-driver-panel" aria-label="Twoja kamera w kokpicie">
        <div className="rg-camera-caption"><span><i /> KIEROWCA</span>{immersive && <button onClick={pause} aria-label="Wstrzymaj wyścig" disabled={phase !== 'racing' && phase !== 'countdown'}><Pause size={18} /></button>}</div>
        <div className="rg-driver-camera" style={{ '--steering': hud.steering, '--lean': `${hud.steering * -3.5}deg` } as CSSProperties}>
          <img className="rg-driver-art" src={`${DRIVER}${driverAttempt ? `?retry=${driverAttempt}` : ''}`} alt="Ty za kierownicą bolidu" draggable={false} onLoad={() => { setDriverLoaded(true); setDriverError(false); }} onError={() => { setDriverError(true); setDriverLoaded(false); }} />
          {driverError && <div className="rg-image-error"><p>Nie udało się wczytać Twojej postaci.</p><button onClick={() => { setDriverError(false); setDriverAttempt(n => n + 1); }}>Wczytaj ponownie</button></div>}

        </div>
        <div className="rg-right-controls">
          <div className="rg-fuel"><span>ERS / NITRO <b>{Math.round(hud.fuel)}%</b></span><div role="progressbar" aria-label="Zapas nitro" aria-valuenow={Math.round(hud.fuel)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${hud.fuel}%` }} /></div></div>
          <div className="rg-pedals"><button className={`rg-brake ${hud.braking ? 'is-active' : ''}`} disabled={phase !== 'racing'} aria-label="Hamulec, przytrzymaj" {...holdButton('brake')}><span className="rg-brake-icon" aria-hidden="true" />{hud.braking ? 'HAMUJESZ' : 'HAMULEC'}</button><button className={`rg-boost ${hud.boost ? 'is-active' : ''}`} aria-pressed={hud.boost} aria-disabled={hud.gripRecovery || hud.offroad || hud.fuel < 8 && !hud.boost} disabled={phase !== 'racing'} aria-label="Nitro, dotknij lub przytrzymaj" {...holdButton('boost')}><Zap size={21} fill="currentColor" />{hud.gripRecovery ? 'POŚLIZG' : hud.offroad ? 'NA ASFALT' : hud.boost ? 'NITRO!' : hud.fuel < 8 ? 'ŁADOWANIE' : 'NITRO'}</button></div>
        </div>
      </aside>

      {immersive && (mustRotate || phase === 'orient' || phase === 'countdown' || phase === 'paused' || phase === 'finished') && <div className={`rg-overlay ${phase === 'countdown' && !mustRotate ? 'rg-countdown-overlay' : ''}`}>
        {mustRotate || phase === 'orient' ? <div className="rg-dialog"><Smartphone className="rg-rotate-icon" size={48} /><h2>Obróć telefon</h2><p>Tor po lewej. Ty w kokpicie po prawej.<br />Dwa kciuki. Pełna kontrola.</p><small>Jeśli ekran się nie obraca, wyłącz blokadę obrotu telefonu.</small><button className="rg-secondary" onClick={exit}><ChevronLeft size={17} /> Wróć</button></div>
          : phase === 'countdown' ? <div className="rg-countdown" role="status" aria-live="polite"><strong key={countdown}>{countdown}</strong><span>{race.current.time > 0 ? 'WRACAMY NA TOR' : 'PRZESUWAJ PALEC PO TORZE, ABY SKRĘCAĆ'}</span></div>
          : phase === 'paused' ? <div className="rg-dialog"><Pause size={32} /><h2>Pit stop.</h2><p>Wyścig poczeka. Wracasz do walki?</p><button className="rg-start" onClick={resume}><Play size={18} fill="currentColor" /> Wznów wyścig</button><button className="rg-secondary" onClick={exit}><ChevronLeft size={17} /> Wyjdź do zakładki</button></div>
          : <div className="rg-dialog rg-result"><Trophy size={32} /><h2>{hud.position === 1 ? 'To Twoje podium.' : hud.position <= 3 ? 'Jesteś na podium!' : 'Meta. Jeszcze raz?'}</h2><div className="rg-result-numbers"><div><span>POZYCJA</span><strong>P{hud.position}<small>/8</small></strong></div><div><span>TWÓJ WYNIK</span><strong>{hud.score.toLocaleString('pl-PL')}<small> pkt</small></strong></div></div><p>{hud.cleanPasses} czystych wyprzedzeń · najlepsza seria ×{hud.bestCombo} · kolizje: {hud.hits}</p>{newRecord && <b className="rg-new-record">NOWY REKORD OSOBISTY</b>}{storageFailed && <small>Rekord zostanie tylko na tę sesję — przeglądarka blokuje zapis.</small>}<div className="rg-result-actions"><button className="rg-start" onClick={() => start()}><RotateCcw size={18} /> Jedź ponownie</button><button className="rg-secondary" onClick={exit}>Zakończ</button></div></div>}
      </div>}
      {immersive && phase === 'racing' && <button className="rg-exit" onClick={pause}><ChevronLeft size={15} /><span>MENU</span></button>}
    </div>

    {!immersive && <div className="rg-how-to"><div><h2>Hamuj przed. Atakuj po.</h2><p>Przesuwaj palec w lewo lub w prawo po torze. Bolid podąża za ruchem; po puszczeniu palca przestajesz skręcać. Drugim kciukiem możesz jednocześnie hamować lub używać nitro. Czytaj wskazówki i hamuj przed zakrętem, żeby zachować przyczepność. Na prostej złap cień aerodynamiczny rywala i zaatakuj z nitro. Czyste wyprzedzanie i dobre wyjście z zakrętu odnawiają ERS.</p></div><div className="rg-keyboard"><span>NA KOMPUTERZE</span><p><kbd>←</kbd><kbd>→</kbd> skręt <kbd>↓</kbd> hamulec<br /><kbd>Spacja</kbd> nitro <kbd>P</kbd> pauza</p><button onClick={() => start(false)} disabled={!driverLoaded}><Maximize2 size={16} /> Graj w oknie</button></div></div>}
  </section>;
}

function snapshot(race: Race) {
  const track = trackAt(race.distance);
  return { position: position(race), remaining: Math.max(0, Math.ceil(RACE_SECONDS - race.time)), speed: Math.round(race.speed * 3.6),
    score: score(race), fuel: race.fuel, steering: race.steering, boost: race.boost,
    event: race.eventTime > 0 ? race.event : '', offroad: Math.abs(race.x) > OFFROAD_LIMIT,
    slipstream: race.slipstream, braking: race.braking, gripRecovery: race.gripRecovery > 0, tooFast: track.inCorner && race.speed > track.safeSpeed + 8,
    nextDistance: Math.ceil(track.nextDistance / 10) * 10, nextTurn: track.nextTurn,
    cornerSpeed: Math.round(track.nextSpeed * 3.6), inCorner: track.inCorner, cornerName: track.name,
    cleanPasses: race.cleanPasses, bestCombo: race.bestCombo, hits: race.hits };
}
