import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowLeftRight, ArrowRight, CornerDownLeft, CornerDownRight, Ghost, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { ATTACK_RECORD_KEY, ATTACK_STEP, clamp, createAttack, formatTime, ghostTimeAt, MEDALS, medalFor, parseAttackRecord, recordFromRace, stepAttack,
  type AttackInput, type AttackRace, type AttackRecord } from './time-attack-engine';
import { nextCorner, TRACK_LENGTH } from './time-attack-track';
import { renderAttack, trackMapPath } from './time-attack-renderer';
import TimeAttackPreview from './TimeAttackPreview';
import { TRACK_LOCATION, TRACK_NAMES } from './track-labels';
import './time-attack.css';

type Phase = 'ready' | 'tutorial' | 'countdown' | 'racing' | 'paused' | 'finished';
const DRIVER = `${import.meta.env.BASE_URL}game/driver.png`;
const MENU_DRIVER = `${import.meta.env.BASE_URL}game/driver-menu.jpg`;
const TUTORIAL_KEY = 'f1-w-punkt:time-attack:tutorial:v1';
const MAP = trackMapPath();
const MEDAL_NAMES = { gold: 'Złoto', silver: 'Srebro', bronze: 'Brąz' };
function loadRecord() { try { return parseAttackRecord(localStorage.getItem(ATTACK_RECORD_KEY)); } catch { return null; } }
function snapshot(r: AttackRace) { return { time: r.time, s: r.s, speed: r.speed, steering: r.steering, braking: r.braking,
  offroad: r.offroad, understeer: r.understeer, sectors: [...r.sectors], hits: r.hits, event: r.time < r.eventUntil ? r.event : '' }; }
function deltaText(value: number) { return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(2)} s`; }

export default function TimeAttackGame({ active, onImmersiveChange }: { active: boolean; onImmersiveChange: (value: boolean) => void }) {
  const root = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const race = useRef(createAttack()), input = useRef<AttackInput>({ steer: 0, brake: false });
  const phaseRef = useRef<Phase>('ready');
  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState(() => snapshot(race.current));
  const [record, setRecord] = useState<AttackRecord | null>(loadRecord);
  const recordRef = useRef(record), attemptRecord = useRef(record);
  const [showGhost, setShowGhost] = useState(true), ghostRef = useRef(true);
  const [countdown, setCountdown] = useState(3), countdownRef = useRef(3);
  const [newRecord, setNewRecord] = useState(false), [storageFailed, setStorageFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false), [imageAttempt, setImageAttempt] = useState(0);
  const [menuFailed, setMenuFailed] = useState(false);
  const [steerHeld, setSteerHeld] = useState(false);
  const steeringPointer = useRef<{ id: number; origin: number; radius: number } | null>(null);
  const brakePointers = useRef(new Set<number>()), keys = useRef(new Set<string>());
  const immersive = phase !== 'ready';
  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const release = useCallback(() => {
    steeringPointer.current = null; brakePointers.current.clear(); keys.current.clear();
    input.current = { steer: 0, brake: false }; setSteerHeld(false);
  }, []);
  const sync = useCallback(() => {
    const keySteer = Number(keys.current.has('ArrowRight') || keys.current.has('d')) - Number(keys.current.has('ArrowLeft') || keys.current.has('a'));
    if (!steeringPointer.current) input.current.steer = keySteer;
    input.current.brake = brakePointers.current.size > 0 || keys.current.has('ArrowDown') || keys.current.has('s') || keys.current.has(' ');
  }, []);
  const pause = useCallback(() => {
    release();
    if (phaseRef.current === 'racing' || phaseRef.current === 'countdown') changePhase('paused');
  }, [release, changePhase]);
  const countIn = useCallback((seconds = 3) => {
    release(); countdownRef.current = seconds; setCountdown(seconds); changePhase('countdown');
  }, [release, changePhase]);
  const start = (retry = false) => {
    release(); race.current = createAttack(); setHud(snapshot(race.current)); setNewRecord(false);
    attemptRecord.current = recordRef.current;
    let seen = false; try { seen = localStorage.getItem(TUTORIAL_KEY) === 'seen'; } catch { /* Session still works. */ }
    if (!seen && !retry) changePhase('tutorial'); else countIn(retry ? 1 : 3);
  };
  const exit = () => { release(); changePhase('ready'); };
  const finish = useCallback(() => {
    release(); setHud(snapshot(race.current)); changePhase('finished');
    const result = recordFromRace(race.current);
    if (!recordRef.current || result.time < recordRef.current.time) {
      recordRef.current = result; setRecord(result); setNewRecord(true);
      try { localStorage.setItem(ATTACK_RECORD_KEY, JSON.stringify(result)); setStorageFailed(false); }
      catch { setStorageFailed(true); }
    }
  }, [release, changePhase]);

  useEffect(() => { onImmersiveChange(immersive && active); }, [immersive, active, onImmersiveChange]);
  useEffect(() => { if (!active) pause(); return release; }, [active, pause, release]);
  useEffect(() => {
    if (!immersive || !active) return;
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, [immersive, active]);
  useEffect(() => {
    if (!active) return;
    const visibility = () => { if (document.hidden) pause(); };
    const orientation = matchMedia('(orientation: portrait)');
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea, a')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'Escape' || key === 'p') { if (!e.repeat) pause(); return; }
      if (phaseRef.current !== 'racing' || !['ArrowLeft', 'ArrowRight', 'ArrowDown', 'a', 'd', 's', ' '].includes(key)) return;
      e.preventDefault(); keys.current.add(key); sync();
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); sync(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', pause); window.addEventListener('pagehide', pause);
    orientation.addEventListener('change', pause); window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', pause); window.removeEventListener('pagehide', pause);
      orientation.removeEventListener('change', pause); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
    };
  }, [active, pause, sync]);
  useEffect(() => {
    if (!active || !immersive || phase === 'countdown' || phase === 'racing') return;
    root.current?.querySelector<HTMLButtonElement>('.ta-dialog button')?.focus();
  }, [active, immersive, phase]);
  useEffect(() => {
    if (!active || !immersive || !canvas.current) return;
    const element = canvas.current, ctx = element.getContext('2d', { alpha: false });
    if (!ctx) return;
    let w = 1, h = 1, frame = 0, last = 0, accumulator = 0, nextHud = 0;
    const camera = { angle: 0 }, reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const bounds = element.getBoundingClientRect(); w = Math.max(1, bounds.width); h = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(w * dpr); element.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0; last = now;
      // Long interruptions pause rather than silently dropping race time.
      if (dt > 0.25) { pause(); accumulator = 0; }
      else if (phaseRef.current === 'countdown') {
        countdownRef.current -= dt; setCountdown(Math.max(1, Math.ceil(countdownRef.current)));
        if (countdownRef.current <= 0) { accumulator = 0; changePhase('racing'); }
      } else if (phaseRef.current === 'racing') {
        accumulator += dt;
        while (accumulator + 1e-10 >= ATTACK_STEP && !race.current.finished) { stepAttack(race.current, input.current); accumulator -= ATTACK_STEP; }
        if (race.current.finished) finish();
      } else accumulator = 0;
      renderAttack(ctx, w, h, race.current, ghostRef.current ? attemptRecord.current : null, camera, Math.min(dt, 0.1), reduced.matches);
      if (now >= nextHud) { setHud(snapshot(race.current)); nextHud = now + 66; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, immersive, pause, changePhase, finish]);

  const steerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== 'racing' || steeringPointer.current) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    steeringPointer.current = { id: e.pointerId, origin: e.clientX, radius: Math.max(36, Math.min(68, e.currentTarget.clientWidth * 0.32)) };
    input.current.steer = 0; setSteerHeld(true);
  };
  const steerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = steeringPointer.current;
    if (pointer?.id === e.pointerId) { e.preventDefault(); input.current.steer = clamp((e.clientX - pointer.origin) / pointer.radius, -1, 1); }
  };
  const steerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (steeringPointer.current?.id === e.pointerId) { steeringPointer.current = null; setSteerHeld(false); sync(); }
  };
  const brakeDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== 'racing') return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); brakePointers.current.add(e.pointerId); sync();
  };
  const brakeUp = (e: ReactPointerEvent<HTMLButtonElement>) => { brakePointers.current.delete(e.pointerId); sync(); };
  const toggleGhost = () => { ghostRef.current = !ghostRef.current; setShowGhost(ghostRef.current); };
  const corner = nextCorner(hud.s), best = attemptRecord.current;
  const ghostTime = best ? ghostTimeAt(best.trace, hud.s) : null;
  const delta = ghostTime === null ? null : hud.time - ghostTime;
  const medal = medalFor(hud.time);
  const splitIndex = hud.sectors.length - 1;
  const splitDelta = best && splitIndex >= 0 ? hud.sectors[splitIndex] - best.sectors[splitIndex] : null;
  const sectorSplits = hud.sectors.map((t, i) => t - (hud.sectors[i - 1] ?? 0));
  const losses = best ? sectorSplits.map((t, i) => t - (best.sectors[i] - (best.sectors[i - 1] ?? 0))) : [];
  const worst = losses.length === 3 && Math.max(...losses) > 0 ? losses.indexOf(Math.max(...losses)) + 1 : null;
  const driver = (size: 'small' | 'large' | 'hero' | 'countdown' = 'small') => <div className={`ta-driver ta-driver-${size} ${hud.event.startsWith('KONTAKT') ? 'is-hit' : newRecord ? 'is-record' : ''}`}>
    {!imageFailed ? <img key={size === 'hero' ? 'menu' : imageAttempt} src={size === 'hero' && !menuFailed ? MENU_DRIVER : DRIVER} alt={size === 'hero' && !menuFailed ? 'Ty w czerwonym kombinezonie za kierownicą, z rollo kebabem na kierownicy i puszką Specjala obok' : 'Twój portret w czerwonym kombinezonie kierowcy'} onError={() => { if (size === 'hero') setMenuFailed(true); else setImageFailed(true); }} />
      : size === 'countdown' ? <span className="ta-portrait-fallback">Portret niedostępny</span>
      : <button onClick={() => { setImageFailed(false); setImageAttempt(n => n + 1); }}>Wczytaj portret</button>}
  </div>;

  return <section ref={root} className={`ta ${immersive ? 'ta-immersive' : ''} ${phase === 'countdown' ? 'ta-counting' : ''}`} aria-label="Przemek Racing — jedno okrążenie na czas">
    {!immersive && <div className="ta-intro">
      <div className="ta-intro-copy"><h1>Przemek <span>Racing</span></h1><p className="ta-lead">Sześć zakrętów. Jedno okrążenie.<br />Każda setna należy do Ciebie.</p>
        <p className="ta-description">Start i meta w tym samym miejscu. Hamuj przed zakrętem, znajdź swoją linię i pokonaj ducha najlepszego okrążenia.</p>
        <p className="ta-track-name"><strong>{TRACK_NAMES.attack}</strong><span>{TRACK_LOCATION} · 1,265 km</span></p>
        <button className="ta-primary" onClick={() => start()}><Play size={19} fill="currentColor" /> Jedź na czas <ArrowRight size={18} /></button>
        <div className="ta-best">Najlepszy czas na pętli <strong>{record ? formatTime(record.time) : 'Pierwsze okrążenie przed Tobą'}</strong></div>
        <a className="ta-compare" href="#gra">Zagraj w „Przemek Racing 3D” <ArrowRight size={15} /></a>
      </div>
      <figure className="ta-hero-driver">{driver('hero')}<figcaption><span>KAMERA KIEROWCY</span><strong>GŁÓWNA ROLA: TY</strong></figcaption></figure>
      <TimeAttackPreview active={active} />
      <div className="ta-track-info"><svg viewBox="0 0 300 300" role="img" aria-label={`Zamknięta ${TRACK_NAMES.attack}: sześć zakrętów, wspólny start i meta`}><path d={MAP} className="ta-map-shadow" /><path d={MAP} className="ta-map-road" /><path d={MAP} className="ta-map-line" /></svg>
        <div><h2>{TRACK_NAMES.attack}</h2><p>{TRACK_LOCATION}</p><span>START = META · 6 ZAKRĘTÓW · 3 SEKTORY</span></div>
      </div>
      <div className="ta-brief"><div><ArrowLeftRight size={22} /><p><strong>Lewy kciuk prowadzi.</strong><span>Przeciągaj w lewo i prawo. Puszczenie prostuje kierownicę.</span></p></div><div><Pause size={22} /><p><strong>Prawy wyczuwa moment.</strong><span>Przytrzymaj hamulec przed zakrętem. Gaz działa sam.</span></p></div></div>
      <div className="ta-medal-targets" aria-label="Czasy medalowe">{(['gold', 'silver', 'bronze'] as const).map(m => <span key={m} className={`ta-medal-${m}`}><Trophy size={16} />{MEDAL_NAMES[m]} <b>{formatTime(MEDALS[m])}</b></span>)}</div>
      <p className="ta-key-hint">Duch to Twój najlepszy przejazd zapisany w tej przeglądarce. Wolniejsze okrążenie go nie zastępuje. Na komputerze: ← → lub A D — skręt, ↓ lub Spacja — hamulec, P — pauza.</p>
    </div>}

    <div className="ta-stage" hidden={!immersive} inert={phase !== 'racing'}>
      <header className="ta-hud"><div className="ta-clock"><span>TWÓJ CZAS</span><strong>{formatTime(hud.time)}</strong></div>
        <div className={`ta-delta ${delta !== null && delta < 0 ? 'is-ahead' : ''}`}><span>DO REKORDU</span><strong>{delta === null ? '—' : deltaText(delta)}</strong></div>
        <button className="ta-icon-button" aria-label="Wstrzymaj grę" onClick={pause}><Pause size={21} /></button>
      </header>
      <div className="ta-road"><canvas ref={canvas} role="img" aria-label="Tor widziany z góry. Kieruj lewym kciukiem lub strzałkami, hamuj prawym kciukiem lub strzałką w dół." />
        <div className="ta-road-top"><div className="ta-sector-label">SEKTOR {Math.min(3, hud.sectors.length + 1)} / 3 <span>OKRĄŻENIE 1/1 · {Math.min(100, Math.floor(hud.s / TRACK_LENGTH * 100))}%</span></div>{driver()}</div>
        {corner && <div className={`ta-corner ${corner.distance < 32 ? 'is-near' : ''}`}>{corner.curve > 0 ? <CornerDownRight size={22} /> : <CornerDownLeft size={22} />}<div><strong>{corner.distance ? `${Math.round(corner.distance)} m` : 'ZAKRĘT'} <span>{corner.number}/6</span></strong><small>{corner.distance < 32 ? 'DOBIERZ PRĘDKOŚĆ' : 'PRZYGOTUJ WEJŚCIE'}</small></div></div>}
        <div className={`ta-event ${hud.event.startsWith('KONTAKT') || hud.offroad ? 'is-warning' : ''}`} role="status" aria-live="polite">{hud.event}{hud.event.startsWith('SEKTOR') && splitDelta !== null && <b>{deltaText(splitDelta)}</b>}</div>
        <div className="ta-road-bottom"><button className={`ta-ghost-toggle ${showGhost ? 'is-on' : ''}`} onClick={toggleGhost} aria-pressed={showGhost} aria-label={showGhost ? 'Ukryj ducha rekordu' : 'Pokaż ducha rekordu'}><Ghost size={17} />{showGhost ? 'DUCH WŁ.' : 'DUCH WYŁ.'}</button><span>{hud.offroad ? 'WRÓĆ NA ASFALT' : hud.braking ? 'HAMOWANIE' : hud.understeer ? 'ZA SZYBKO · HAMUJ' : 'GAZ AUTO'}<b>{Math.round(hud.speed * 3.6)}<small> km/h</small></b></span></div>
      </div>
      <footer className="ta-controls" onContextMenu={e => e.preventDefault()}><button className={`ta-steer ${steerHeld ? 'is-held' : ''}`} disabled={phase !== 'racing'} aria-label="Skręt: przytrzymaj i przeciągaj poziomo" onPointerDown={steerDown} onPointerMove={steerMove} onPointerUp={steerUp} onPointerCancel={steerUp} onLostPointerCapture={steerUp} style={{ '--steer': hud.steering } as CSSProperties}>
        <span className="ta-steer-rail"><ArrowLeft size={17} /><i /><ArrowRight size={17} /></span><strong>{steerHeld ? 'PROWADZISZ' : 'PRZECIĄGAJ'}</strong><small>LEWY KCIUK</small></button>
        <button className={`ta-brake ${hud.braking ? 'is-active' : ''}`} disabled={phase !== 'racing'} aria-label="Hamulec: przytrzymaj" onPointerDown={brakeDown} onPointerUp={brakeUp} onPointerCancel={brakeUp} onLostPointerCapture={brakeUp}><span className="ta-brake-mark" /><strong>{hud.braking ? 'HAMUJESZ' : 'HAMULEC'}</strong><small>PRAWY KCIUK</small></button>
      </footer>
    </div>

    {immersive && phase !== 'racing' && <div className={`ta-overlay ${phase === 'countdown' ? 'ta-count-in' : ''}`}>
      {phase === 'countdown' ? <div className="ta-countdown">{driver('countdown')}<div className="ta-countdown-copy"><strong aria-live="polite" aria-atomic="true">{countdown}</strong><span>ZNAJDŹ SWOJĄ LINIĘ</span></div></div>
        : <div className="ta-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-dialog-title" onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const buttons = e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }}>
          {phase === 'tutorial' && <><ArrowLeftRight size={32} /><h2 id="ta-dialog-title">Wyczuj. Skręć. Popraw.</h2><p><strong>Lewy kciuk:</strong> dotknij dolnej lewej strefy i przeciągaj na boki. Puszczenie prostuje kierownicę.</p><p><strong>Prawy kciuk:</strong> przytrzymaj hamulec przed zakrętem. Po puszczeniu auto samo przyspieszy.</p><p>Żółte znaczniki zapowiadają zakręty. Przejedź przez wszystkie bramki na asfalcie.</p><button className="ta-primary" onClick={() => { try { localStorage.setItem(TUTORIAL_KEY, 'seen'); } catch { /* Optional persistence. */ } countIn(); }}><Play size={18} /> Rozumiem, jadę</button></>}
          {phase === 'paused' && <><Pause size={30} /><h2 id="ta-dialog-title">Chwila w boksie.</h2><p>Czas stoi. Wróć do swojej linii, kiedy będziesz gotowy.</p><button className="ta-primary" onClick={() => countIn()}><Play size={18} /> Wznów przejazd</button><button className="ta-secondary" onClick={() => start(true)}><RotateCcw size={17} /> Od początku</button></>}
          {phase === 'finished' && <>{driver('large')}<h2 id="ta-dialog-title">{newRecord ? 'To jest Twój rekord.' : 'Jest meta. Jeszcze raz?'}</h2><div className="ta-result-time">{formatTime(hud.time)}</div><p className={medal ? `ta-medal-${medal}` : ''}>{medal ? `${MEDAL_NAMES[medal]} · ${TRACK_NAMES.attack}` : `Do brązu: ${Math.max(0, hud.time - MEDALS.bronze).toFixed(2)} s`}{best && <> · {deltaText(hud.time - best.time)} do poprzedniego rekordu</>}</p>
            <div className="ta-result-sectors">{sectorSplits.map((time, i) => <div key={i}><span>SEKTOR {i + 1}</span><strong>{formatTime(time)}</strong>{best && <small>{deltaText(losses[i])}</small>}</div>)}</div>
            <p>{worst ? `Najwięcej do odzyskania: sektor ${worst}.` : best ? 'Żaden sektor nie był wolniejszy od poprzedniego rekordu.' : 'Duch tego przejazdu czeka w kolejnej próbie.'} Kontakty: {hud.hits}.</p>
            {storageFailed && <p className="ta-storage-note" role="status">Przeglądarka blokuje zapis. Rekord i duch zostają na czas tej sesji.</p>}
            <button className="ta-primary" onClick={() => start(true)}><RotateCcw size={18} /> Jeszcze raz</button></>}
          <button className="ta-text-button" onClick={exit}><ArrowLeft size={16} /> Wróć do zakładek</button>
        </div>}
    </div>}
  </section>;
}
