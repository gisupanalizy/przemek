import { useId, useState, type CSSProperties } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleCheck,
  CircleHelp, Crosshair, ExternalLink, Flag, Info, Maximize2,
  Plus, Radio, RotateCcw, ShieldCheck, Timer, TriangleAlert, X,
} from 'lucide-react';

/**
 * Drop-in React + Tailwind component. Dependencies: react, lucide-react.
 * All artwork and scoped CSS live in this file; no images, fonts or APIs.
 * Sources checked 2026-11-04. Messages and car number are illustrative.
 */
const SOURCES = {
  regulations: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf',
  penalties: 'https://api.fia.com/sites/default/files/2026_f1_penalty_guidelines.pdf',
  driving: 'https://api.fia.com/sites/default/files/2026_f1_driving_standards_guidelines.pdf',
};

const EDGE = 245;
const CAR_X = 410;
const ANGLE = -8;
const SIN = Math.sin(ANGLE * Math.PI / 180);
const COS = Math.cos(ANGLE * Math.PI / 180);
const MIN_Y = 128;
const TRAVEL = 214;
const GREEN = '#64dfac';
const RED = '#ff646b';
const AMBER = '#f4cf6a';
const TYRES = [
  { id: 'FL', label: 'Lewy przód', x: 85, y: -42 },
  { id: 'FR', label: 'Prawy przód', x: 85, y: 42 },
  { id: 'RL', label: 'Lewy tył', x: -90, y: -42 },
  { id: 'RR', label: 'Prawy tył', x: -90, y: 42 },
] as const;

// Exact support point of a rotated rounded rectangle (46 × 26, radius 3).
// The decision and magnifying lens share this geometry with the SVG tyres.
function tyreTop(x: number, y: number) {
  return SIN * x + COS * y - Math.abs(SIN) * 20 - Math.abs(COS) * 10 - 3;
}
const LIMIT_Y = EDGE - tyreTop(85, -42);
const LIMIT_POSITION = (LIMIT_Y - MIN_Y) / TRAVEL * 100;
const SCENARIOS = [
  { short: 'Klasyczna linia', description: '0 kół poza torem', position: 0, count: '0', note: 'Wszystkie cztery opony na asfalcie. Pełna kontrola, pełna legalność.' },
  { short: 'Agresywny najazd', description: '2 koła na tarce', position: (244 - MIN_Y) / TRAVEL * 100, count: '2', note: 'Prawa para opon na tarce. Lewa para nadal utrzymuje kontakt z torem.' },
  { short: 'Na żyletki', description: '3 poza · 1 na linii', position: LIMIT_POSITION, count: '3', note: 'Styl Antonellego: trzy opony poza torem, jedna styka się z białą linią. To wystarczy.' },
  { short: 'Poza limitem', description: '4 koła poza torem', position: 100, count: '4', note: 'Żadna opona nie dotyka toru ani białej linii. To przekroczenie limitów.' },
] as const;

type Session = 'qualifying' | 'race' | 'advantage';

export default function TrackLimitsInfographic() {
  const uid = useId().replace(/:/g, '');
  const [position, setPosition] = useState<number>(SCENARIOS[1].position);
  const [session, setSession] = useState<Session>('race');
  const [strikes, setStrikes] = useState(0);
  const [lastCorner, setLastCorner] = useState(false);
  const [advantageReturned, setAdvantageReturned] = useState(false);
  const [mitigating, setMitigating] = useState(false);
  const [showLens, setShowLens] = useState(true);

  const carY = MIN_Y + position / 100 * TRAVEL;
  const tyres = TYRES.map(t => ({
    ...t,
    top: carY + tyreTop(t.x, t.y),
    inside: carY + tyreTop(t.x, t.y) <= EDGE + 0.00001,
  }));
  const inside = tyres.filter(t => t.inside).length;
  const outside = 4 - inside;
  const nearest = Math.min(...tyres.filter(t => t.inside).map(t => Math.abs(t.top - EDGE)));
  const onEdge = inside === 1 && nearest < 2;
  const legal = inside > 0;
  const tone = !legal ? 'red' : onEdge ? 'amber' : 'green';
  const color = !legal ? RED : onEdge ? AMBER : GREEN;
  const selectedScenario = SCENARIOS.findIndex(s => Math.abs(s.position - position) < 0.001);
  const currentNote = selectedScenario >= 0 ? SCENARIOS[selectedScenario].note
    : legal ? `${inside} ${inside === 1 ? 'opona zachowuje' : 'opony zachowują'} kontakt z torem. Przesuwaj bolid, aby znaleźć granicę.`
      : 'Wszystkie cztery opony całkowicie za białą linią. Tarka nie jest częścią toru.';
  const totalPenalty = Math.max(0, strikes - 3) * 5;
  const contactX = CAR_X + COS * (85 + 20) - SIN * (-42 - 10);
  const contactY = carY + tyreTop(85, -42);
  const lensGap = (contactY - EDGE) * 3;

  function resetAll() {
    setPosition(SCENARIOS[1].position);
    setSession('race');
    setStrikes(0);
    setLastCorner(false);
    setAdvantageReturned(false);
    setMitigating(false);
    setShowLens(true);
  }

  const statusTitle = !legal ? 'WYKROCZENIE!' : onEdge ? 'LEGALNY — NA LIMICIE' : 'LEGALNY';
  const statusDetail = !legal ? 'Brak kontaktu z torem · Art. B1.8.6'
    : onEdge ? 'Styk 1 opony z białą linią wystarczy.'
      : `${inside} ${inside === 4 ? 'koła' : inside === 1 ? 'koło' : 'koła'} w limitach toru`;

  return (
    <div className="tl min-h-screen bg-[#0f0f14] text-white" style={{ '--tl-signal': color } as CSSProperties}>
      <style>{STYLES}</style>
      <header className="tl-topbar">
        <div className="tl-topbar-inner">
          <a className="tl-brand" href="#track-limits" aria-label="Limity toru F1 — początek">
            <span className="tl-speedmark" aria-hidden="true"><i /><i /><i /></span>
            <strong>F1 <span>W PUNKT</span></strong>
          </a>
          <div className="tl-topbar-right"><span className="tl-season">SEZON <b>2026</b></span><a href={SOURCES.regulations} target="_blank" rel="noreferrer">Regulamin FIA <ArrowUpRight size={14} /></a></div>
        </div>
      </header>

      <main id="track-limits" className="tl-main">
        <div className="tl-intro">
          <div>
            <h1>Granica jest <span>biała.</span></h1>
            <p>Cztery koła. Jedna linia. Zobacz, gdzie kończy się tor,<br className="tl-desktop-break" /> a zaczynają decyzje sędziów.</p>
          </div>
          <div className="tl-rule-tag"><ShieldCheck size={20} /><div><strong>ZASADA 4 KÓŁ</strong><span>FIA 2026 · Art. B1.8.6</span></div></div>
        </div>

        <nav className="tl-mobile-nav" aria-label="Sekcje infografiki">
          <a href={`#${uid}-visualizer`}><Crosshair size={16} /> Bolid i granica</a>
          <a href={`#${uid}-penalties`}><Flag size={16} /> Zasady kar <ArrowDown size={14} /></a>
        </nav>

        <div className="tl-workspace grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,1fr)]">
          <section id={`${uid}-visualizer`} className="tl-visual-panel" aria-labelledby={`${uid}-visual-title`}>
            <div className="tl-panel-heading">
              <h2 id={`${uid}-visual-title`}><Crosshair size={17} /> Na granicy toru</h2>
              <span className="tl-micro">WIDOK Z GÓRY <Maximize2 size={12} /></span>
            </div>
            <div className="tl-diagram">
              <div className="tl-diagram-meta"><span><i className="tl-dot" /> POZYCJA NA ŻYWO</span><span>SCHEMAT EDUKACYJNY</span><div className="tl-mobile-direction">KIERUNEK JAZDY <ArrowRight size={15} /></div></div>
              <svg viewBox="0 0 800 445" preserveAspectRatio="xMidYMid slice" className="tl-track-svg" role="img" aria-labelledby={`${uid}-svg-title ${uid}-svg-desc`}>
                <title id={`${uid}-svg-title`}>Położenie bolidu względem białej linii</title>
                <desc id={`${uid}-svg-desc`}>{outside} kół poza torem. {statusTitle}. {statusDetail}. Kierunek jazdy w prawo. Prawa strona bolidu jest na dole schematu.</desc>
                <defs>
                  <pattern id={`${uid}-kerb`} width="88" height="68" patternUnits="userSpaceOnUse">
                    <rect width="88" height="68" fill="#d6d5d3" /><path d="M0 0H44V68H0Z" fill="#b83236" />
                    <path d="M0 5H88M0 12H88M0 19H88M0 26H88M0 33H88M0 40H88M0 47H88M0 54H88M0 61H88" stroke="#0f0f14" opacity=".14" strokeWidth="1" />
                  </pattern>
                  <pattern id={`${uid}-runoff`} width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#244d43" /><path d="M0 0H36" stroke="#2b584c" strokeWidth="1" /></pattern>
                  <clipPath id={`${uid}-lens`}><circle cx="681" cy="119" r="71" /></clipPath>
                  <marker id={`${uid}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 1L6 4L0 7" fill="none" stroke="#84848e" strokeWidth="1.4" /></marker>
                </defs>

                <rect width="800" height="445" fill="#252530" />
                <path d="M-50 38 C90 38 135 70 270 85 S600 85 830 85" stroke="#62626e" strokeWidth="1" strokeDasharray="7 10" fill="none" opacity=".5" />
                <path className="tl-track-direction" d="M20 138H164" stroke="#84848e" strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
                <text className="tl-track-direction" x="20" y="124" fill="#c2c2cc" fontSize="10" letterSpacing="1.5">KIERUNEK JAZDY</text>
                <rect y="233" width="800" height="12" fill="#faf9f5" />
                <rect y="245" width="800" height="69" fill={`url(#${uid}-kerb)`} />
                <rect y="314" width="800" height="131" fill={`url(#${uid}-runoff)`} />
                <path d="M0 326H800" stroke="#336256" strokeWidth="2" />
                <g className="tl-svg-label">
                  <rect x="20" y="173" width="143" height="29" rx="4" fill="#1b1b25" fillOpacity=".9" />
                  <text x="32" y="191" fill="#d9d9e1">ASFALT TORU</text>
                  <path d="M40 202V226" stroke="#9d9da7" strokeWidth="1" />
                  <circle cx="40" cy="239" r="3" fill="#15151e" />
                  <rect x="20" y="255" width="195" height="37" rx="4" fill="#111118" fillOpacity=".94" />
                  <text x="31" y="271" fill="#fff">BIAŁA LINIA = CZĘŚĆ TORU</text>
                  <text x="31" y="284" fill="#c5c5cf" fontSize="9">Kontakt z linią = legalnie</text>
                  <rect x="20" y="342" width="195" height="37" rx="4" fill="#132d26" fillOpacity=".96" />
                  <text x="31" y="358" fill="#e4eeea">TARKA ≠ CZĘŚĆ TORU</text>
                  <text x="31" y="371" fill="#b8d5ca" fontSize="9">Czerwono-biały pas poza linią</text>
                  <text x="31" y="418" fill="#c0d8cd">POBOCZE / ASTROTURF</text>
                </g>

                <g className="tl-car-position transition-all duration-500" style={{ transform: `translate(${CAR_X}px, ${carY}px)` }}>
                  <g transform={`rotate(${ANGLE})`}>
                    <g stroke="#6c7480" strokeWidth="2.5" fill="none"><path d="M-85 -6L-90 -42M-85 6L-90 42M39 -9L85 -42M39 9L85 42M-38 -15L-90 -42M-38 15L-90 42M18 -9L85 -42M18 9L85 42" /></g>
                    <path d="M-117 -28L-68 -21L-34 -28L14 -25L44 -16L106 -8L124 0L106 8L44 16L14 25L-34 28L-68 21L-117 28Z" fill="#aeb5c2" stroke="#06070b" strokeWidth="2" />
                    <path d="M-85 -20L-35 -25L-5 -18L-25 -6L-68 -8Z M-85 20L-35 25L-5 18L-25 6L-68 8Z" fill="#d2d7de" />
                    <path d="M-76 -8L-42 -17L-10 -10L-2 0L-10 10L-42 17L-76 8Z" fill="#e10600" />
                    <path d="M-85 -3L-19 -6L21 -6L105 -4L120 0L105 4L21 6L-19 6L-85 3Z" fill="#e10600" />
                    <path d="M-55 -3L-75 0L-55 3" stroke="#ff786f" fill="none" />
                    <path d="M-18 -11Q-35 0 -18 11L4 9Q17 0 4 -9Z" fill="#090b12" stroke="#5c606d" strokeWidth="2" />
                    <circle cx="-7" cy="0" r="6" fill="#f5ce58" /><path d="M-10 -5L-4 5" stroke="#202029" strokeWidth="3" />
                    <path d="M-23 -12Q16 -20 18 0Q16 20 -23 12M18 0H33" stroke="#e3e6eb" strokeWidth="4" fill="none" />
                    <path d="M6 -18L8 -24L19 -24L20 -19M6 18L8 24L19 24L20 19" fill="#e10600" />
                    <g fill="#151620" stroke="#06070b" strokeWidth="1.5">
                      <path d="M-119 -48L-104 -46L-104 46L-119 48Z" /><path d="M107 -53L129 -53L133 -45L121 -32L121 32L133 45L129 53L107 53L111 26L116 0L111 -26Z" />
                    </g>
                    <g stroke="#c7ccd4" strokeWidth="2" fill="none"><path d="M-115 -44V44M-109 -43V43M115 -48L119 -28M115 48L119 28" /><path d="M123 -49V-33M123 49V33" stroke="#e10600" strokeWidth="3" /></g>
                    <path d="M-126 -49V49M130 -54V54" stroke="#e10600" strokeWidth="3" />
                    <text x="49" y="3.5" fill="#fff" fontSize="10" fontWeight="800" fontFamily="monospace">12</text>
                    {tyres.map(t => (
                      <g key={t.id} data-tyre={t.id} data-inside={String(t.inside)}>
                        <rect x={t.x - 23} y={t.y - 13} width="46" height="26" rx="3" fill="#08090c" stroke={t.inside ? onEdge && inside === 1 ? AMBER : GREEN : RED} strokeWidth="2.4" className="tl-tyre" />
                        <path d={`M${t.x - 16} ${t.y - 9}V${t.y + 9}M${t.x + 16} ${t.y - 9}V${t.y + 9}`} stroke="#42434b" strokeWidth="2" />
                        <path d={`M${t.x - 7} ${t.y}H${t.x + 7}`} stroke={t.inside ? GREEN : RED} strokeWidth="2" />
                      </g>
                    ))}
                  </g>
                </g>

                {showLens && outside === 3 && (
                  <g className="tl-lens">
                    <path className="tl-lens-connector-desktop" d={`M${contactX} ${contactY}L609 173`} stroke={color} strokeWidth="1.2" strokeDasharray="4 5" fill="none" />
                    <path className="tl-lens-connector-mobile" d={`M${contactX} ${contactY}L458 173`} stroke={color} strokeWidth="1.2" strokeDasharray="4 5" fill="none" />
                    <circle cx={contactX} cy={contactY} r="8" stroke={color} strokeWidth="1.5" fill="none" />
                    <g className="tl-lens-bubble">
                    <circle cx="681" cy="119" r="75" fill="#111119" stroke="#50505e" strokeWidth="1" />
                    <g clipPath={`url(#${uid}-lens)`}>
                      <rect x="605" y="44" width="152" height="150" fill="#252530" />
                      <rect x="605" y="116" width="152" height="14" fill="#f8f7f1" />
                      <rect x="605" y="130" width="152" height="65" fill={`url(#${uid}-kerb)`} />
                      <g style={{ transform: `translateY(${lensGap}px)` }} className="tl-lens-tyre">
                        <path d="M652 239V149Q652 130 671 130H700Q717 130 717 149V239Z" fill="#08090c" stroke={color} strokeWidth="3" />
                        <path d="M662 148V232M708 148V232" stroke="#30313b" strokeWidth="4" />
                      </g>
                      <circle cx="682" cy="130" r="4" fill={color} />
                    </g>
                    <rect x="629" y="190" width="104" height="25" rx="4" fill="#111119" stroke="#50505e" />
                    <text x="681" y="206" textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="monospace">{legal ? 'STYK Z LINIĄ' : 'BRAK STYKU'}</text>
                    <text className="tl-lens-caption" x="681" y="30" textAnchor="middle" fill="#d0d0da" fontSize="10" letterSpacing="1">POWIĘKSZENIE ×3</text>
                    </g>
                  </g>
                )}
                <g transform="translate(697 359)" fill="none" stroke="#91b6a6" strokeWidth="1"><path d="M0 0V42M-6 8L0 0L6 8" /><text x="0" y="58" textAnchor="middle" fill="#c0d8cd" stroke="none" fontSize="9">PRAWA STRONA</text></g>
              </svg>
              <div className="tl-mobile-zones" aria-label="Strefy toru"><span><i style={{ background: '#686877' }} />Asfalt <b>TOR</b></span><span><i style={{ background: '#faf9f5' }} />Biała linia <b>TOR</b></span><span><i style={{ background: '#b83236' }} />Tarka <b>POZA TOREM</b></span><span><i style={{ background: '#488b70' }} />Pobocze <b>POZA TOREM</b></span></div>
              <div className="tl-diagram-footer"><span><i style={{ background: GREEN }} /> Kontakt z torem</span><span><i style={{ background: RED }} /> Poza torem</span><button type="button" onClick={() => setShowLens(v => !v)} aria-pressed={showLens}><Crosshair size={13} /> Lupa {showLens ? 'wł.' : 'wył.'}</button></div>
            </div>

            <div className="tl-driving-controls">
              <div className={`tl-mobile-verdict tl-tone-${tone}`} aria-label="Bieżący werdykt dla wybranej pozycji">
                {legal ? <CircleCheck size={23} /> : <TriangleAlert size={23} />}
                <div><strong>{statusTitle}</strong><span>{statusDetail}</span></div>
                <b>{inside}<small>/4</small></b>
              </div>
              <div className="tl-control-label"><h3>Wybierz linię jazdy</h3><span>SPRAWDŹ 4 SCENARIUSZE</span></div>
              <div className="tl-scenarios" role="group" aria-label="Scenariusze linii jazdy">
                {SCENARIOS.map((s, i) => <button type="button" key={s.short} aria-pressed={selectedScenario === i} className={`tl-scenario ${selectedScenario === i ? 'is-selected' : ''}`} onClick={() => setPosition(s.position)}>
                  <span className="tl-scenario-top"><span className="tl-scenario-number">0{i + 1}</span><MiniTrack count={Number(s.count)} />{selectedScenario === i && <Check size={13} />}</span>
                  <strong>{s.short}</strong><span>{s.description}</span>
                </button>)}
              </div>
              <div className="tl-range-label"><label htmlFor={`${uid}-position`}>Pozycja bolidu względem białej linii</label><output htmlFor={`${uid}-position`}>{Math.round(position)}<small>%</small></output></div>
              <input id={`${uid}-position`} className="tl-position-range" type="range" min="0" max="100" step="0.1" value={position} onChange={e => setPosition(Number(e.target.value))} aria-valuetext={`${Math.round(position)} procent, ${outside} kół poza torem, ${statusTitle}`} style={{ '--tl-progress': `${position}%` } as CSSProperties} />
              <div className="tl-range-ends"><span>NA TORZE</span><span>NA POBOCZU</span></div>
              <p className="tl-scenario-note"><Info size={14} /><span>{currentNote}</span></p>
            </div>
          </section>

          <aside className="tl-sidebar">
            <section className="tl-status-panel" aria-labelledby={`${uid}-status-title`}>
              <div className="tl-panel-heading"><h2 id={`${uid}-status-title`}><Radio size={17} /> FIA Race Control</h2><span className="tl-simulation"><i /> SYMULACJA</span></div>
              <div className={`tl-verdict tl-tone-${tone}`} role="status" aria-live="polite" aria-atomic="true">
                <div className="tl-verdict-icon">{legal ? <CircleCheck size={28} strokeWidth={1.7} /> : <TriangleAlert size={28} strokeWidth={1.7} />}</div>
                <div><span className="tl-message-id">CAR 12 — TRACK LIMITS</span><h3>{statusTitle}</h3><p>{statusDetail}</p></div>
              </div>
              <div className="tl-wheel-telemetry">
                <div className="tl-telemetry-title"><span>KONTAKT OPON Z TOREM</span><b>{inside}<span> / 4</span></b></div>
                <div className="tl-wheels">{tyres.map(t => <div key={t.id} className={t.inside ? 'is-inside' : 'is-outside'}><span className="tl-wheel-chip">{t.inside ? <Check size={12} /> : <X size={12} />}{t.id}</span><span>{t.label}</span></div>)}</div>
              </div>
            </section>

            <section id={`${uid}-penalties`} className="tl-penalty-panel" aria-labelledby={`${uid}-penalties-title`}>
              <div className="tl-panel-heading"><h2 id={`${uid}-penalties-title`}><Flag size={17} /> Co na to sędziowie?</h2><span className="tl-micro">2026</span></div>
              <div className="tl-session-tabs" role="group" aria-label="Rodzaj sesji">
                {([{ id: 'qualifying', label: 'Kwalifikacje' }, { id: 'race', label: 'Wyścig' }, { id: 'advantage', label: 'Wyprzedzanie' }] as const).map(s => <button type="button" key={s.id} aria-pressed={session === s.id} onClick={() => setSession(s.id)}>{s.label}</button>)}
              </div>
              <div className="tl-session-content">
                <p className="tl-session-explainer">{session === 'race' ? 'Policz wyjazdy wszystkimi 4 kołami poza tor.' : session === 'qualifying' ? 'Kwalifikacje i kwalifikacje do sprintu.' : 'Zyskanie trwałej przewagi poza torem.'}</p>
                {session === 'race' && <>
                  <section className="tl-race-rules" aria-labelledby={`${uid}-race-rules-title`}>
                    <h3 id={`${uid}-race-rules-title`}>Kara czasowa od 4. wykroczenia</h3>
                    <p>Nie ma dozwolonej puli wyjazdów. W standardowej procedurze pierwsze trzy wykroczenia nie skutkują karą czasową.</p>
                    <ol aria-label="Oficjalna sekwencja kar za limity toru w wyścigu">
                      <li><span>1.–2.</span><span>Strike — bez kary czasowej</span></li>
                      <li className="tl-rule-warning"><span>3.</span><span>Czarno-biała flaga — ostrzeżenie</span></li>
                      <li className="tl-rule-penalty"><span>4.</span><span>+5 sekund</span></li>
                      <li className="tl-rule-penalty"><span>5. i kolejne</span><span>Każde: dodatkowe +5 sekund</span></li>
                    </ol>
                    <p className="tl-rules-example">5 wykroczeń = +10 s łącznie. Licznik obejmuje cały wyścig i nie zeruje się po karze.</p>
                    <a href={`${SOURCES.penalties}#page=2`} target="_blank" rel="noreferrer">FIA 2026 Penalty Guidelines · str. 2 <ExternalLink size={11} /></a>
                  </section>
                  <div className="tl-strikes" role="group" aria-label="Liczba wykroczeń w wyścigu">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setStrikes(n)} className={`${n <= strikes ? 'tl-strike-filled' : ''} ${n >= 4 && n <= strikes ? 'tl-strike-penalty' : ''} ${n === strikes ? 'tl-strike-current' : ''}`} aria-label={`Ustaw liczbę wykroczeń: ${n}`} aria-pressed={strikes === n}><span>{n === 5 ? '5+' : n}</span><small>{n < 3 ? 'STRIKE' : n === 3 ? 'FLAGA' : '+5 SEK.'}</small></button>)}</div>
                  <div className={`tl-race-message ${strikes >= 4 ? 'tl-tone-red' : strikes >= 3 ? 'tl-tone-amber' : ''}`} role="status" aria-live="polite" aria-atomic="true">
                    <span className="tl-message-id">CAR 12 — {strikes >= 4 ? 'TIME PENALTY' : strikes === 3 ? 'BLACK AND WHITE FLAG' : 'TRACK LIMITS'}</span>
                    <div className="tl-race-message-title">{strikes === 3 ? <BlackWhiteFlag /> : strikes >= 4 ? <Timer size={24} /> : <Flag size={22} />}<strong>{strikes === 0 ? 'CZYSTE KONTO' : strikes <= 2 ? `STRIKE ${strikes}` : strikes === 3 ? 'OSTATNIE OSTRZEŻENIE' : strikes === 4 ? '+5 SEKUND' : 'KOLEJNE +5 SEKUND'}</strong></div>
                    <p>{strikes === 0 ? 'Pierwszy wyjazd rozpocznie sekwencję ostrzeżeń.' : strikes === 1 ? 'Race Control odnotowuje wykroczenie. Bez kary czasowej.' : strikes === 2 ? 'Drugi strike. Inżynier może ostrzec kierowcę przez radio.' : strikes === 3 ? 'BLACK & WHITE FLAG — oficjalne ostrzeżenie sędziowskie.' : 'Kara do odbycia podczas pit-stopu lub doliczenia do czasu na mecie.'}</p>
                    <div className="tl-penalty-total"><span>ŁĄCZNA KARA CZASOWA</span><b>+{totalPenalty}<small> s</small></b></div>
                  </div>
                  <div className="tl-counter-actions"><button type="button" className="tl-add-button" onClick={() => setStrikes(n => n + 1)}><Plus size={16} /> Dodaj wyjazd poza tor</button><button type="button" className="tl-icon-button" onClick={() => setStrikes(0)} aria-label="Wyzeruj licznik wykroczeń" title="Wyzeruj licznik"><RotateCcw size={16} /></button></div>
                  <p className="tl-panel-footnote">Nieprawidłowy czas okrążenia także jest usuwany. Sędziowie mogą nie naliczyć strike’a np. po wypchnięciu przez rywala lub unikaniu kolizji. Zyskanie trwałej przewagi podlega odrębnej ocenie i może oznaczać karę już przy pierwszym wyjeździe.</p>
                </>}

                {session === 'qualifying' && <>
                  <div className="tl-qualifying-message tl-tone-red" role="status" aria-live="polite"><span className="tl-message-id">CAR 12 — TRACK LIMITS</span><Timer size={31} /><h3>LAP TIME DELETED</h3><p>Czas okrążenia zostaje skasowany.</p><div className="tl-deleted-lap"><span>OKRĄŻENIE 07 · PRZYKŁAD</span><s>1:24.862</s><X size={17} /></div>{lastCorner && <div className="tl-next-lap"><ArrowRight size={15} /><span>Możliwe skasowanie także następnego okrążenia, jeżeli wyjazd dał korzyść.</span></div>}</div>
                  <label className="tl-checkbox-row"><input type="checkbox" checked={lastCorner} onChange={e => setLastCorner(e.target.checked)} /><span>Wyjazd w ostatnim zakręcie</span></label>
                  <p className="tl-panel-footnote">Kolejne okrążenie usuwa się przy możliwej korzyści — szczegóły określają notatki dyrektora wyścigu dla danego toru.</p>
                </>}

                {session === 'advantage' && <>
                  <div className={`tl-advantage-message ${advantageReturned ? 'tl-tone-green' : 'tl-tone-red'}`} role="status" aria-live="polite"><span className="tl-message-id">CAR 12 — {advantageReturned ? 'ADVANTAGE RETURNED' : 'LASTING ADVANTAGE'}</span><div className="tl-race-message-title">{advantageReturned ? <CircleCheck size={24} /> : <TriangleAlert size={24} />}<strong>{advantageReturned ? 'PRZEWAGA ODDANA' : mitigating ? '+5 SEKUND' : '+10 SEKUND'}</strong></div><p>{advantageReturned ? 'Pełny zwrot przewagi może pozwolić uniknąć kary. Ostateczna ocena należy do sędziów.' : 'Wyprzedzenie lub utrzymanie pozycji poza torem może wymagać oddania całej przewagi, w tym pozycji.'}</p><div className="tl-advantage-guide"><ArrowDown size={15} /><span>{advantageReturned ? 'Decyzja po ocenie okoliczności' : mitigating ? 'Okoliczności łagodzące · niższa kara bazowa' : 'Kara bazowa · możliwa surowsza sankcja'}</span></div></div>
                  <label className="tl-checkbox-row"><input type="checkbox" checked={advantageReturned} onChange={e => setAdvantageReturned(e.target.checked)} /><span>Oddano całą przewagę / pozycję</span></label>
                  <label className="tl-checkbox-row"><input type="checkbox" checked={mitigating} onChange={e => setMitigating(e.target.checked)} disabled={advantageReturned} /><span>Okoliczności łagodzące</span></label>
                  <p className="tl-panel-footnote">Dyrektor wyścigu może umożliwić oddanie przewagi. Powrót na tor musi być bezpieczny.</p>
                </>}
                <div className="tl-simulator-note"><Info size={13} /><span>Symulator kar działa niezależnie od pozycji bolidu.</span></div>
              </div>
            </section>
          </aside>
        </div>

        <section className="tl-principle" aria-labelledby={`${uid}-principle-title`}>
          <div className="tl-principle-number">1<span>OPONA</span></div>
          <div className="tl-principle-copy"><h2 id={`${uid}-principle-title`}>Milimetr kontaktu. Pełna legalność.</h2><p>Wystarczy kontakt jednej opony z torem lub białą linią. Tarka i pobocze są już poza torem.<br className="tl-desktop-break" /> Nie liczy się, ile bolidu wystaje — liczy się, czy zachował kontakt.</p></div>
          <div className="tl-principle-icon" aria-hidden="true"><ShieldCheck size={35} strokeWidth={1.2} /></div>
        </section>

        <details className="tl-regulatory-notes"><summary><span><CircleHelp size={15} /> Co jeszcze warto wiedzieć?</span><ChevronDown size={15} /></summary><div className="tl-details-body"><p>Wyjazd nie oznacza automatycznie strike’a: sędziowie oceniają m.in. utratę kontroli, unikanie kolizji, wypchnięcie przez rywala i zdarzenia ukarane z innego powodu. Celowe lub niesportowe zachowanie może oznaczać bezpośrednią karę.</p><p>„Styl Antonellego” to potoczna nazwa scenariusza, a nie osobny przepis. Schemat pokazuje opony w rzucie z góry; nie odtwarza pomiaru z kamer FIA. Kolory wskazują kontakt opon, a nie oficjalny sygnał sędziowski.</p><p>Art. B1.8.6 definiuje granicę toru; eskalację pokazują wytyczne FIA, które nie zastępują regulaminu. Rozstrzygnięcie konkretnego incydentu należy do sędziów.</p></div></details>

        <footer className="tl-footer"><div><span className="tl-footer-label">ŹRÓDŁA FIA</span><a href={SOURCES.regulations} target="_blank" rel="noreferrer">Regulamin 2026 · B1.8.6 <ExternalLink size={11} /></a><a href={SOURCES.penalties} target="_blank" rel="noreferrer">Taryfikator kar <ExternalLink size={11} /></a><a href={SOURCES.driving} target="_blank" rel="noreferrer">Standardy jazdy <ExternalLink size={11} /></a></div><button type="button" onClick={resetAll}><RotateCcw size={13} /> Zresetuj symulację</button></footer>
        <p className="tl-disclaimer">Niezależny materiał edukacyjny. Regulamin: Issue 09, 01.10.2026 · Wytyczne: v01 · Weryfikacja: 04.11.2026. Komunikaty są symulacją, nie transmisją FIA.</p>
      </main>
    </div>
  );
}

function MiniTrack({ count }: { count: number }) {
  return <svg viewBox="0 0 53 28" width="53" height="28" aria-hidden="true"><path d="M0 15H53" stroke="#565664" strokeWidth="1" /><path d="M0 18H53" stroke="#55515a" strokeWidth="3" strokeDasharray="5 5" />{[[14, 5], [32, 5], [14, 22], [32, 22]].map(([x, y], i) => <rect key={i} x={x} y={y} width="7" height="4" rx="1" fill={i >= 4 - count ? '#c67b80' : '#b9c1c9'} />)}<path d="M10 12H43" stroke="#8d8d9a" strokeWidth="3" /></svg>;
}

function BlackWhiteFlag() {
  return <svg width="36" height="30" viewBox="0 0 36 30" role="img" aria-label="Flaga czarno-biała, podział ukośny"><path d="M4 28V2" stroke="#bbbcc9" strokeWidth="2" /><path d="M5 3H33V22H5Z" fill="#f4f3ee" stroke="#82838e" /><path d="M5 3H33L5 22Z" fill="#06070a" /></svg>;
}

const STYLES = `
.tl{--tl-bg:#0f0f14;--tl-panel:#15151e;--tl-border:#2b2b38;--tl-text:#f3f3f7;--tl-muted:#a5a5b4;--tl-red:#e10600;color:var(--tl-text);font-family:"Titillium Web","Arial Narrow","Segoe UI",Arial,sans-serif;font-size:14px;line-height:1.5;color-scheme:dark;min-width:300px}
.tl *{box-sizing:border-box}.tl h1,.tl h2,.tl h3,.tl p{margin:0}.tl button,.tl input,.tl a{-webkit-tap-highlight-color:transparent}.tl button,.tl input{font:inherit}.tl button{cursor:pointer}.tl button{color:inherit}.tl a{color:inherit;text-decoration:none}.tl button:focus-visible,.tl a:focus-visible,.tl input:focus-visible,.tl summary:focus-visible{outline:2px solid #f4cf6a;outline-offset:4px}.tl ::selection{background:#e10600;color:#fff}.tl{scrollbar-color:#474755 #15151e}.tl button{transition:background-color .18s,color .18s,border-color .18s}.tl button:disabled{opacity:.45;cursor:not-allowed}.tl button svg{flex-shrink:0}.tl a:hover{color:#fff}.tl a:hover svg{color:#ff6b66}.tl-mobile-zones{display:none}
.tl-race-rules{padding-bottom:17px;margin-bottom:18px;border-bottom:1px solid #343442}.tl-race-rules h3{font-size:16px;font-weight:700;line-height:1.4;letter-spacing:-.2px}.tl-race-rules p{font-size:11px;line-height:1.7;color:#b8b8c7;margin-top:7px}.tl-race-rules ol{list-style:none;margin:13px 0;padding:0;display:grid;gap:7px}.tl-race-rules li{display:grid;grid-template-columns:82px minmax(0,1fr);gap:10px;align-items:baseline;font-size:11px;color:#dedee8;line-height:1.5}.tl-race-rules li>span:first-child{font:10px ui-monospace,SFMono-Regular,Consolas,monospace;color:#bebecd}.tl-race-rules .tl-rule-warning>span{color:#f4cf6a}.tl-race-rules .tl-rule-penalty>span{color:#ff858a}.tl-race-rules .tl-rules-example{font-size:10px;color:#c5c5d3}.tl-race-rules>a{display:flex;align-items:center;gap:6px;width:fit-content;font-size:9px;color:#bcbccc;margin-top:9px;text-decoration:underline;text-underline-offset:3px}
.tl-mobile-nav,.tl-mobile-verdict,.tl-lens-connector-mobile,.tl-mobile-direction{display:none}.tl-visual-panel,.tl-penalty-panel{scroll-margin-top:18px}
.tl-topbar{border-bottom:1px solid var(--tl-border);background:#111118}.tl-topbar-inner{max-width:1392px;margin:auto;min-height:66px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;gap:20px}.tl-brand{display:flex;align-items:center;gap:13px}.tl-brand strong{font-weight:900;font-size:21px;font-style:italic;letter-spacing:-.7px}.tl-brand strong span{font-size:12px;font-weight:600;font-style:normal;letter-spacing:1.8px;margin-left:12px;color:#bdbdc9}.tl-speedmark{display:flex;align-items:center;gap:4px;transform:skew(-28deg);height:23px}.tl-speedmark i{width:6px;height:23px;background:#e10600}.tl-speedmark i:first-child{width:20px}.tl-topbar-right{display:flex;gap:25px;align-items:center;font-size:12px;color:#a5a5b4}.tl-topbar-right a{display:flex;align-items:center;gap:8px}.tl-season{font:10px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px}.tl-season b{font-weight:600;color:#f1f1f6;margin-left:5px;border:1px solid #343440;padding:4px 6px;border-radius:3px}
.tl-main{max-width:1392px;margin:auto;padding:42px 40px 24px}.tl-intro{display:flex;align-items:center;justify-content:space-between;gap:30px;margin-bottom:35px}.tl h1{font-size:clamp(35px,4.1vw,56px);font-weight:850;font-style:italic;line-height:1.08;letter-spacing:-1.8px;text-wrap:balance}.tl h1 span{position:relative;white-space:nowrap}.tl h1 span:after{content:"";position:absolute;width:52px;height:4px;background:#e10600;right:5px;bottom:-10px;transform:skew(-25deg)}.tl-intro p{color:#a5a5b4;font-size:14px;margin-top:22px;line-height:1.7}.tl-rule-tag{display:flex;align-items:center;gap:14px;border:1px solid #343440;border-radius:7px;padding:14px 20px;color:#c7c7d2}.tl-rule-tag svg{color:#e10600}.tl-rule-tag strong{font-size:11px;letter-spacing:1.5px;display:block;color:#e7e7ee}.tl-rule-tag span{font:10px ui-monospace,SFMono-Regular,Consolas,monospace;display:block;color:#a5a5b4;margin-top:5px}
.tl-workspace{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(340px,1fr);gap:24px;align-items:start}.tl-visual-panel,.tl-status-panel,.tl-penalty-panel{background:var(--tl-panel);border:1px solid var(--tl-border);border-radius:12px;overflow:hidden}.tl-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:17px 21px;border-bottom:1px solid var(--tl-border)}.tl h2{font-size:14px;font-weight:650;letter-spacing:.1px}.tl-panel-heading h2{display:flex;gap:9px;align-items:center}.tl-panel-heading h2 svg{color:#b3b3c1}.tl-micro{display:flex;align-items:center;gap:8px;color:#a4a4b3;font:9px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.8px;white-space:nowrap}.tl-simulation{font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px;color:#a5a5b4;display:flex;gap:5px;align-items:center}.tl-simulation i{width:4px;height:4px;background:#a5a5b4;border-radius:50%}
.tl-diagram{background:#252530;position:relative}.tl-diagram-meta{position:absolute;z-index:1;top:17px;left:20px;right:20px;display:flex;justify-content:space-between;gap:15px;color:#b1b1c0;font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px;pointer-events:none}.tl-diagram-meta span:first-child{display:flex;align-items:center;gap:7px;color:#e3e3eb}.tl-dot{width:5px;height:5px;background:#64dfac;border-radius:50%}.tl-track-svg{display:block;width:100%;height:auto;padding-top:9px}.tl-svg-label{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px;font-weight:600;letter-spacing:.4px}.tl-car-position{transition:transform .5s cubic-bezier(.22,1,.36,1)}.tl-tyre{transition:stroke .5s ease}.tl-lens-tyre{transition:transform .5s cubic-bezier(.22,1,.36,1)}.tl-lens{pointer-events:none}.tl-diagram-footer{display:flex;align-items:center;gap:20px;padding:12px 20px;background:#111a18;border-top:1px solid #315246;font-size:10px;color:#bed0c7}.tl-diagram-footer>span{display:flex;align-items:center;gap:6px}.tl-diagram-footer i{height:5px;width:5px;border-radius:50%}.tl-diagram-footer button{margin-left:auto;padding:3px 0;background:none;border:0;display:flex;gap:6px;align-items:center;color:#c8d7d0;font-size:10px}.tl-diagram-footer button:hover{color:#fff}
.tl-driving-controls{padding:20px 21px 17px}.tl-control-label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.tl-control-label h3{font-size:12px;font-weight:600}.tl-control-label>span{font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px;color:#a5a5b4}.tl-scenarios{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tl-scenario{position:relative;border:1px solid #333340;border-radius:6px;padding:10px 10px 11px;background:#191923;text-align:left;min-width:0}.tl-scenario:hover{border-color:#676777;background:#20202d}.tl-scenario.is-selected{border-color:#e10600;background:#29191f}.tl-scenario-top{display:flex;gap:3px;align-items:center;height:28px;margin-bottom:7px}.tl-scenario-top>svg:first-of-type{margin-left:auto}.tl-scenario-top>svg:last-child:not(:first-of-type){color:#ff6e6e;position:absolute;top:5px;right:5px;width:10px;height:10px}.tl-scenario-number{font:9px ui-monospace,SFMono-Regular,Consolas,monospace;color:#a5a5b4;align-self:flex-start}.tl-scenario.is-selected .tl-scenario-number{color:#ff6b66}.tl-scenario strong{display:block;font-size:11px;font-weight:600;line-height:1.5;white-space:nowrap}.tl-scenario>span:last-child{display:block;font-size:9px;color:#adadbb;margin-top:3px;white-space:nowrap}.tl-range-label{display:flex;align-items:center;justify-content:space-between;margin-top:22px;margin-bottom:10px;gap:12px}.tl-range-label label{font-size:11px;color:#c1c1cd}.tl-range-label output{font:16px ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums;font-weight:600}.tl-range-label output small{font-size:10px;color:#9e9ead;padding-left:3px}.tl-position-range{-webkit-appearance:none;appearance:none;display:block;width:100%;height:5px;border-radius:4px;background:linear-gradient(to right,#e10600 var(--tl-progress),#373744 var(--tl-progress));margin:15px 0;cursor:ew-resize;touch-action:pan-y}.tl-position-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;background:#fff;border:4px solid #e10600;border-radius:50%;width:17px;height:17px}.tl-position-range::-moz-range-thumb{background:#fff;border:4px solid #e10600;border-radius:50%;width:10px;height:10px}.tl-range-ends{display:flex;justify-content:space-between;font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.9px;color:#a5a5b4}.tl-scenario-note{display:flex;gap:8px;color:#adadbb;font-size:11px;line-height:1.6;margin-top:18px!important;min-height:35px}.tl-scenario-note svg{flex-shrink:0;margin-top:2px;color:#a5a5b4}
.tl-sidebar{display:flex;flex-direction:column;gap:20px}.tl-verdict{display:flex;align-items:center;gap:13px;padding:20px 21px;background:#172520;border-bottom:1px solid #294437}.tl-tone-green{--tl-tone:#64dfac;--tl-tone-ground:#172520;--tl-tone-border:#294437}.tl-tone-amber{--tl-tone:#f4cf6a;--tl-tone-ground:#28241b;--tl-tone-border:#50442b}.tl-tone-red{--tl-tone:#ff646b;--tl-tone-ground:#2a191f;--tl-tone-border:#543039}.tl-verdict{background:var(--tl-tone-ground);border-bottom-color:var(--tl-tone-border)}.tl-verdict-icon{color:var(--tl-tone);display:flex}.tl-message-id{display:block;font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.8px;color:#aaaab9;line-height:1.5}.tl-verdict .tl-message-id{color:var(--tl-tone);opacity:.88}.tl-verdict h3{font-size:clamp(14px,1.4vw,18px);font-weight:750;color:var(--tl-tone);margin:5px 0 3px;line-height:1.3;letter-spacing:.2px}.tl-verdict p{font-size:11px;color:#d0d3d7;line-height:1.5}.tl-wheel-telemetry{padding:14px 21px 17px}.tl-telemetry-title{display:flex;align-items:center;justify-content:space-between;font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px;color:#a5a5b4;margin-bottom:10px}.tl-telemetry-title b{font-size:15px;letter-spacing:0;color:var(--tl-signal)}.tl-telemetry-title b span{color:#9b9bac;font-size:11px;font-weight:400}.tl-wheels{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.tl-wheels>div{display:flex;flex-direction:column;align-items:center;gap:5px}.tl-wheel-chip{display:flex;width:100%;align-items:center;justify-content:center;gap:7px;border:1px solid #2b493d;background:#18271f;border-radius:4px;padding:6px;font:10px ui-monospace,SFMono-Regular,Consolas,monospace;color:#64dfac}.is-outside .tl-wheel-chip{border-color:#50313a;background:#2b1c24;color:#ff858a}.tl-wheels>div>span:last-child{font-size:8px;color:#a8a8b8}
.tl-session-tabs{display:flex;gap:3px;padding:5px;margin:17px 18px 0;border:1px solid #30303e;border-radius:6px;background:#101017}.tl-session-tabs button{flex:1;padding:8px 4px;background:transparent;border:0;border-radius:3px;color:#adadbd;font-size:11px;font-weight:550}.tl-session-tabs button:hover{color:#fff;background:#20202b}.tl-session-tabs button[aria-pressed=true]{color:#fff;background:#353541}.tl-session-content{padding:16px 20px 17px}.tl-session-explainer{font-size:11px;line-height:1.6;color:#b1b1c0;margin-bottom:16px!important}.tl-strikes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:17px}.tl-strikes button{background:#1e1e29;border:1px solid #353543;border-radius:5px;padding:10px 2px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;position:relative}.tl-strikes button:hover{background:#31313d}.tl-strikes button>span{font:19px ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:500;color:#b0b0c0}.tl-strikes small{font:7px ui-monospace,SFMono-Regular,Consolas,monospace;color:#a5a5b4;letter-spacing:.4px;white-space:nowrap}.tl-strikes .tl-strike-filled{background:#33303a;border-color:#78717d}.tl-strikes .tl-strike-filled>span{color:#f0e6e5}.tl-strikes .tl-strike-current{border-color:#f4cf6a;background:#30291d}.tl-strikes .tl-strike-current>span{color:#f4cf6a}.tl-strikes .tl-strike-penalty{background:#341b22;border-color:#bb343d}.tl-strikes .tl-strike-penalty>span{color:#ff787e}.tl-strikes .tl-strike-penalty.tl-strike-current{border-color:#ff646b}
.tl-race-message,.tl-qualifying-message,.tl-advantage-message{padding:15px;border-radius:6px;background:var(--tl-tone-ground,#1c1c27);border:1px solid var(--tl-tone-border,#343442);min-height:163px}.tl-race-message-title{display:flex;align-items:center;gap:10px;margin:15px 0 10px;color:var(--tl-tone,#d8d8e3)}.tl-race-message-title strong{font:600 17px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:-.3px;line-height:1.3}.tl-race-message p,.tl-qualifying-message p,.tl-advantage-message p{font-size:11px;line-height:1.7;color:#c5c5d0}.tl-penalty-total{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--tl-tone-border,#363642);margin-top:14px;padding-top:10px;gap:15px}.tl-penalty-total>span{font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.8px;color:#b3b3c3}.tl-penalty-total b{font:600 24px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--tl-tone,#e9e9f2);font-variant-numeric:tabular-nums}.tl-penalty-total small{font-size:13px;font-weight:400}.tl-counter-actions{display:flex;gap:8px;margin-top:14px}.tl-add-button{flex:1;display:flex;justify-content:center;align-items:center;gap:8px;border:1px solid #e10600;background:#e10600;color:#fff!important;padding:11px 8px;border-radius:5px;font-size:11px!important;font-weight:600!important;min-height:39px}.tl-add-button:hover{background:#b80500;border-color:#b80500}.tl-icon-button{display:flex;align-items:center;justify-content:center;background:#21212c;border:1px solid #383846;border-radius:5px;width:40px;min-height:40px;color:#c2c2d0!important}.tl-icon-button:hover{background:#30303e}.tl-panel-footnote{font-size:10px;line-height:1.75;color:#a5a5b4;margin-top:13px!important}.tl-simulator-note{display:flex;align-items:flex-start;gap:6px;font-size:9px;color:#9e9eaf;margin-top:13px;padding-top:12px;border-top:1px solid #2b2b38;line-height:1.6}.tl-simulator-note svg{flex-shrink:0;margin-top:1px}.tl-qualifying-message>svg{display:block;color:#ff646b;margin-top:19px;margin-bottom:12px}.tl-qualifying-message h3{font:600 20px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:-.4px;color:#ff737a;margin-bottom:7px}.tl-deleted-lap{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:15px;margin-top:16px;border-top:1px solid #543039}.tl-deleted-lap>span{font:7px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.4px;color:#bdb0bb}.tl-deleted-lap s{font:16px ui-monospace,SFMono-Regular,Consolas,monospace;color:#e6bec4}.tl-deleted-lap svg{color:#ff646b}.tl-next-lap,.tl-advantage-guide{display:flex;align-items:center;gap:9px;margin-top:15px;font-size:10px;color:#f4cf6a;line-height:1.6}.tl-next-lap svg,.tl-advantage-guide svg{flex-shrink:0}.tl-checkbox-row{display:flex;align-items:center;gap:9px;font-size:11px;color:#c1c1cf;margin-top:16px;cursor:pointer;min-height:23px}.tl-checkbox-row input{accent-color:#e10600;width:15px;height:15px;cursor:pointer;margin:0;flex-shrink:0}.tl-checkbox-row:has(input:disabled){color:#9292a3}.tl-advantage-guide{color:var(--tl-tone);border-top:1px solid var(--tl-tone-border);padding-top:13px}.tl-advantage-message{min-height:208px}
.tl-principle{display:flex;align-items:center;gap:27px;border-top:1px solid #343440;border-bottom:1px solid #343440;margin-top:29px;padding:24px 4px}.tl-principle-number{font:italic 700 58px/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#f3f3f7;min-width:75px;text-align:center}.tl-principle-number span{display:block;font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:2px;color:#acacba;margin-top:9px}.tl-principle h2{font-size:18px;font-weight:650;letter-spacing:-.3px;margin-bottom:7px}.tl-principle p{color:#a9a9b9;font-size:12px;line-height:1.8}.tl-principle-icon{margin-left:auto;color:#737382;padding-right:20px}.tl-regulatory-notes{border-bottom:1px solid #2b2b38}.tl-regulatory-notes summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:17px 4px;font-size:11px;color:#b9b9c8;cursor:pointer;gap:15px}.tl-regulatory-notes summary::-webkit-details-marker{display:none}.tl-regulatory-notes summary>span{display:flex;align-items:center;gap:9px}.tl-regulatory-notes[open] summary>svg{transform:rotate(180deg)}.tl-details-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:25px;padding:0 4px 20px}.tl-details-body p{font-size:11px;line-height:1.8;color:#a5a5b4}.tl-footer{display:flex;justify-content:space-between;gap:16px;padding:20px 4px 12px;font-size:10px;color:#aaaabb}.tl-footer>div{display:flex;align-items:center;gap:19px;flex-wrap:wrap}.tl-footer-label{font:8px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:1px;color:#a5a5b4}.tl-footer a,.tl-footer button{display:flex;gap:5px;align-items:center}.tl-footer button{border:0;background:transparent;font-size:10px;color:#b8b8c5;white-space:nowrap;padding:0}.tl-footer button:hover{color:#fff}.tl-disclaimer{font-size:9px!important;color:#9595a5;padding:0 4px;line-height:1.7!important}
@media(min-width:1450px){.tl-main{padding-top:50px}.tl-intro{margin-bottom:40px}}
@media(max-width:1100px){.tl-topbar-inner{padding:0 26px}.tl-main{padding:35px 26px 24px}.tl-workspace{gap:18px;grid-template-columns:minmax(0,1.4fr) minmax(330px,1fr)}.tl-panel-heading{padding:16px}.tl-driving-controls{padding:18px 16px}.tl-scenarios{gap:6px}.tl-scenario{padding:8px 7px}.tl-scenario strong{font-size:9px}.tl-scenario>span:last-child{font-size:8px}.tl-scenario-top svg{width:41px}.tl-diagram-meta{font-size:7px;left:14px;right:14px}.tl-control-label>span{font-size:7px}.tl-session-content{padding:15px}.tl-session-tabs{margin:15px 14px 0}.tl-verdict{padding:20px 16px}.tl-wheel-telemetry{padding:14px 16px}.tl-principle p br{display:none}}
@media(max-width:860px){.tl-workspace{grid-template-columns:1fr}.tl-topbar-inner{min-height:60px}.tl-main{padding-top:30px}.tl-intro{margin-bottom:30px}.tl h1{font-size:46px}.tl-rule-tag{padding:11px 13px}.tl-rule-tag strong{font-size:9px}.tl-rule-tag span{font-size:8px}.tl-rule-tag svg{width:17px}.tl-sidebar{display:grid;grid-template-columns:1fr 1.12fr;align-items:start;gap:18px}.tl-status-panel .tl-panel-heading{padding:17px 13px}.tl-status-panel h2{font-size:12px}.tl-simulation{font-size:7px}.tl-verdict{padding:18px 13px}.tl-verdict h3{font-size:14px}.tl-verdict p{font-size:10px}.tl-wheels{gap:5px}.tl-wheels>div>span:last-child{font-size:7px}.tl-wheel-telemetry{padding:14px 13px}.tl-scenario{padding:11px 12px}.tl-scenario strong{font-size:12px}.tl-scenario>span:last-child{font-size:10px}.tl-scenario-top svg{width:53px}.tl-scenario-top{margin-bottom:5px}.tl-control-label>span{font-size:8px}.tl-driving-controls{padding:21px}.tl-scenario-note{min-height:18px}.tl-diagram-meta{font-size:8px;left:20px;right:20px}.tl-principle{gap:20px}.tl-principle-icon{padding-right:0}.tl-footer{align-items:flex-start}.tl-footer>div{gap:11px 16px}.tl-footer-label{flex-basis:100%}.tl-footer button{padding-top:2px}}
@media(max-width:600px){.tl-topbar-inner{padding:0 18px;min-height:57px}.tl-brand strong{font-size:19px}.tl-brand strong span{font-size:9px;margin-left:7px;letter-spacing:1px}.tl-brand{gap:9px}.tl-speedmark{height:19px;gap:3px}.tl-speedmark i{height:19px;width:4px}.tl-speedmark i:first-child{width:16px}.tl-topbar-right{gap:0}.tl-topbar-right>a{display:none}.tl-season{font-size:8px}.tl-season b{padding:4px}.tl-main{padding:30px 14px 22px}.tl-intro{display:block;margin:0 4px 24px}.tl h1{font-size:39px;letter-spacing:-1.5px}.tl-intro p{font-size:12px;margin-top:20px;line-height:1.75;max-width:43ch}.tl-rule-tag{border:0;background:none;padding:0;margin-top:19px;gap:8px}.tl-rule-tag>div{display:flex;align-items:center;gap:10px}.tl-rule-tag strong{font-size:8px;letter-spacing:1px}.tl-rule-tag span{font-size:8px;margin:0}.tl-rule-tag svg{width:15px;height:17px}.tl-workspace{gap:16px}.tl-panel-heading{padding:15px}.tl-panel-heading h2{font-size:12px;gap:7px}.tl-micro{font-size:8px;letter-spacing:.2px;gap:5px}.tl-panel-heading h2 svg{width:15px;height:15px}.tl-diagram-meta{top:13px;left:12px;right:12px;font-size:6px;letter-spacing:.5px}.tl-track-svg{padding-top:12px}.tl-diagram-footer{gap:12px;padding:10px 12px;font-size:8px}.tl-diagram-footer button{font-size:8px;gap:4px}.tl-diagram-footer button svg{width:11px}.tl-driving-controls{padding:18px 14px 15px}.tl-control-label h3{font-size:11px}.tl-control-label>span{font-size:6px}.tl-scenarios{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tl-scenario{padding:10px 12px}.tl-scenario-top{height:23px;margin-bottom:4px}.tl-scenario strong{font-size:12px}.tl-scenario>span:last-child{font-size:10px}.tl-scenario-top>svg:first-of-type{margin-right:5px}.tl-range-label label{font-size:10px}.tl-range-label{margin-top:20px}.tl-scenario-note{font-size:10px;min-height:34px;margin-top:15px!important}.tl-sidebar{display:flex;gap:16px}.tl-status-panel .tl-panel-heading{padding:15px}.tl-status-panel h2{font-size:12px}.tl-simulation{font-size:8px}.tl-verdict{padding:20px 17px}.tl-verdict h3{font-size:17px}.tl-verdict p{font-size:11px}.tl-wheel-telemetry{padding:16px}.tl-wheels{gap:10px}.tl-wheels>div>span:last-child{font-size:8px}.tl-wheel-chip{padding:8px}.tl-session-tabs{margin:17px 15px 0}.tl-session-content{padding:17px 16px}.tl-strikes{gap:8px}.tl-strikes button{padding:12px 2px 10px}.tl-strikes small{font-size:8px}.tl-session-tabs button{font-size:11px}.tl-penalty-total{padding-top:13px}.tl-race-message-title strong{font-size:17px}.tl-principle{margin-top:23px;gap:17px;padding:24px 3px;align-items:flex-start}.tl-principle-number{min-width:42px;font-size:47px}.tl-principle-number span{font-size:7px;letter-spacing:1px}.tl-principle h2{font-size:15px;line-height:1.4;margin-bottom:8px}.tl-principle p{font-size:11px;line-height:1.8}.tl-principle-icon{display:none}.tl-details-body{grid-template-columns:1fr;gap:13px}.tl-footer{display:block;font-size:9px;padding-top:19px}.tl-footer>div{gap:12px 17px}.tl-footer button{margin-top:20px;font-size:10px}.tl-disclaimer{font-size:8px!important}.tl-desktop-break{display:none}}
@media(prefers-reduced-motion:reduce){.tl *,.tl *:before,.tl *:after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
@media(max-width:600px){.tl-sidebar{align-items:stretch}.tl-mobile-zones{display:grid;grid-template-columns:1fr 1fr;gap:9px 16px;background:#1b2222;padding:13px 14px;font-size:10px;color:#dedee8}.tl-mobile-zones>span{display:flex;align-items:center;gap:6px}.tl-mobile-zones i{width:6px;height:6px;border-radius:1px}.tl-mobile-zones b{margin-left:auto;font:6px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.3px;color:#c3c3ce}}

/* Mobile is a reading and touch layout, not a scaled desktop dashboard. */
@media(max-width:767px),(max-width:950px) and (pointer:coarse){
  .tl{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-size:16px;min-width:0}
  .tl-main{padding:25px max(14px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))}
  .tl-topbar-inner{padding-left:max(18px,env(safe-area-inset-left));padding-right:max(18px,env(safe-area-inset-right))}
  .tl-brand{min-height:44px}.tl-brand strong,.tl h1{font-family:"Arial Narrow","Segoe UI",Arial,sans-serif}
  .tl-intro{display:block;margin:0 2px 20px}.tl h1{font-size:clamp(31px,8.6vw,46px);letter-spacing:-1.2px;line-height:1.12}
  .tl-intro p{font-size:16px;line-height:1.6;margin-top:20px;color:#bcbcc9}.tl-rule-tag{padding:0;border:0;margin-top:16px;gap:8px}
  .tl-rule-tag>div{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px}.tl-rule-tag strong{font-size:10px;letter-spacing:.8px}.tl-rule-tag span{font-size:10px;margin:0}
  .tl-mobile-nav{display:flex;gap:10px;margin:0 0 18px}.tl-mobile-nav a{display:flex;align-items:center;justify-content:center;gap:7px;min-height:46px;flex:1;padding:10px 8px;border:1px solid #3c3c4b;border-radius:6px;background:#191923;font-size:13px;font-weight:600}
  .tl-workspace{grid-template-columns:1fr;gap:18px}.tl-sidebar{display:flex;align-items:stretch;gap:18px;min-width:0}
  .tl-panel-heading,.tl-status-panel .tl-panel-heading{padding:16px}.tl-panel-heading h2,.tl-status-panel h2{font-size:16px;gap:8px}.tl-panel-heading h2 svg{width:17px;height:17px}
  .tl-micro{font-size:9px;letter-spacing:0}.tl-micro svg{display:none}.tl-simulation{font-size:9px;letter-spacing:.5px}
  .tl-diagram-meta{font-size:9px;top:16px;left:16px;right:16px;letter-spacing:.5px}.tl-diagram-meta>span:nth-child(2){display:none}.tl-mobile-direction{display:flex;align-items:center;gap:6px}
  .tl-diagram-footer{padding:3px 14px;gap:12px;font-size:11px;flex-wrap:wrap}.tl-diagram-footer>span{min-height:30px;gap:5px}.tl-diagram-footer button{min-height:44px;min-width:65px;justify-content:flex-end;font-size:12px;gap:5px}.tl-diagram-footer button svg{width:14px}
  .tl-driving-controls{padding:16px}.tl-mobile-verdict{display:flex;align-items:center;gap:10px;padding:14px 12px;margin-bottom:20px;background:var(--tl-tone-ground);border:1px solid var(--tl-tone-border);border-radius:6px;color:var(--tl-tone)}
  .tl-mobile-verdict>svg{flex-shrink:0}.tl-mobile-verdict>div{min-width:0}.tl-mobile-verdict strong{display:block;font-size:13px;line-height:1.4}.tl-mobile-verdict>div>span{display:block;color:#d1d1dc;font-size:12px;line-height:1.5;margin-top:4px}
  .tl-mobile-verdict>b{font:600 21px ui-monospace,SFMono-Regular,Consolas,monospace;margin-left:auto;white-space:nowrap}.tl-mobile-verdict small{font-size:11px;padding-left:2px}
  .tl-control-label{margin-bottom:12px}.tl-control-label h3{font-size:15px}.tl-control-label>span{display:none}
  .tl-scenarios{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tl-scenario{padding:10px 11px;min-height:106px}
  .tl-scenario-top{height:22px;margin-bottom:8px}.tl-scenario-top svg{width:47px}.tl-scenario-number{font-size:11px}.tl-scenario strong{font-size:14px;line-height:1.3;white-space:normal;min-height:36px}
  .tl-scenario>span:last-child{font-size:12px;white-space:normal;line-height:1.5;margin-top:2px}.tl-scenario.is-selected{border-color:#ff5f59}.tl-scenario:active,.tl-mobile-nav a:active{background:#36303a}
  .tl-range-label{margin-top:22px;margin-bottom:2px;gap:14px}.tl-range-label label{font-size:14px;line-height:1.5}.tl-range-label output{font-size:21px}.tl-range-label output small{font-size:13px}
  .tl-position-range{height:44px;background-size:100% 6px;background-repeat:no-repeat;background-position:center;margin:0;touch-action:pan-y}
  .tl-position-range::-webkit-slider-thumb{width:28px;height:28px;border-width:5px}.tl-position-range::-moz-range-thumb{width:18px;height:18px;border-width:5px}
  .tl-range-ends{font-size:10px;letter-spacing:.6px}.tl-scenario-note{font-size:14px;line-height:1.65;min-height:0;margin-top:18px!important;gap:9px}.tl-scenario-note svg{width:16px;height:16px;margin-top:4px}
  .tl-verdict{padding:20px 17px;gap:12px}.tl-verdict h3{font-size:18px;line-height:1.4}.tl-verdict p{font-size:14px;line-height:1.6}.tl-message-id{font-size:10px;letter-spacing:.35px}
  .tl-wheel-telemetry{padding:17px}.tl-telemetry-title{font-size:10px;letter-spacing:.4px}.tl-telemetry-title b{font-size:20px}.tl-telemetry-title b span{font-size:13px}
  .tl-wheels{gap:8px}.tl-wheel-chip{font-size:13px;min-height:37px;padding:8px 3px;gap:5px}.tl-wheels>div>span:last-child{font-size:10px;line-height:1.4}
  .tl-session-tabs{margin:16px 14px 0;gap:2px;padding:4px}.tl-session-tabs button{min-height:46px;padding:8px 3px;font-size:12px}
  .tl-session-content{padding:18px 16px}.tl-session-explainer{font-size:15px;line-height:1.65;margin-bottom:18px!important}
  .tl-race-rules h3{font-size:20px;line-height:1.4}.tl-race-rules p{font-size:14px;line-height:1.7;margin-top:10px}.tl-race-rules ol{gap:13px;margin:18px 0}
  .tl-race-rules li{grid-template-columns:75px minmax(0,1fr);gap:10px;font-size:14px;line-height:1.6}.tl-race-rules li>span:first-child{font-size:12px;line-height:1.6}
  .tl-race-rules .tl-rules-example{font-size:13px;line-height:1.7}.tl-race-rules>a{min-height:44px;font-size:12px;line-height:1.6;margin-top:6px}
  .tl-strikes{gap:7px;margin-bottom:18px}.tl-strikes button{padding:12px 2px;min-height:70px;gap:8px}.tl-strikes button>span{font-size:23px}.tl-strikes small{font-size:8px;letter-spacing:0}
  .tl-race-message,.tl-qualifying-message,.tl-advantage-message{padding:16px}.tl-race-message-title{margin:18px 0 12px;gap:9px}.tl-race-message-title strong{font-size:18px;line-height:1.4;overflow-wrap:anywhere}
  .tl-race-message p,.tl-qualifying-message p,.tl-advantage-message p{font-size:14px;line-height:1.75}.tl-penalty-total{gap:12px;margin-top:17px;padding-top:15px}.tl-penalty-total>span{font-size:10px;letter-spacing:.3px;line-height:1.6}.tl-penalty-total b{font-size:28px}
  .tl-counter-actions{gap:10px;margin-top:16px}.tl-add-button{min-height:48px;font-size:14px!important;padding:11px 8px;gap:7px}.tl-icon-button{min-width:48px;width:48px;min-height:48px}
  .tl-panel-footnote{font-size:13px;line-height:1.75;margin-top:17px!important}.tl-simulator-note{font-size:12px;line-height:1.7;gap:8px;margin-top:17px;padding-top:16px}.tl-simulator-note svg{width:15px;height:15px;margin-top:3px}
  .tl-qualifying-message h3{font-size:22px;line-height:1.4}.tl-checkbox-row{min-height:48px;font-size:14px;line-height:1.6;gap:12px;margin-top:8px}.tl-checkbox-row input{width:20px;height:20px}
  .tl-deleted-lap{flex-wrap:wrap;gap:8px}.tl-deleted-lap>span{font-size:9px}.tl-deleted-lap s{font-size:18px}.tl-next-lap,.tl-advantage-guide{font-size:13px;line-height:1.7}
  .tl-principle{padding:24px 2px;gap:16px}.tl-principle h2{font-size:19px;line-height:1.45}.tl-principle p{font-size:15px;line-height:1.75}.tl-principle-number{min-width:40px;font-size:46px}.tl-principle-number span{font-size:8px;letter-spacing:.5px}.tl-principle-icon{display:none}
  .tl-regulatory-notes summary{min-height:56px;font-size:14px;gap:12px;padding:15px 2px}.tl-details-body{grid-template-columns:1fr;gap:16px;padding:0 2px 20px}.tl-details-body p{font-size:14px;line-height:1.75}
  .tl-footer{display:block;padding:20px 2px 10px}.tl-footer-label{font-size:10px;flex-basis:100%}.tl-footer>div{gap:2px 16px}.tl-footer a{min-height:44px;font-size:12px;line-height:1.6}.tl-footer button{min-height:44px;margin-top:12px;font-size:13px;padding:0 4px}.tl-disclaimer{font-size:11px!important;line-height:1.8!important;padding:0 2px}
}
@media(max-width:600px){
  .tl-track-svg{height:clamp(300px,85vw,365px);padding-top:0;width:100%}
  .tl-svg-label,.tl-lens-connector-desktop,.tl-lens-caption,.tl-track-direction{display:none}
  .tl-lens-connector-mobile{display:block}.tl-lens-bubble{transform:translateX(-151px)}
  .tl-lens-bubble text{font-size:14px}
  .tl-mobile-zones{gap:12px 16px;padding:15px 14px;font-size:12px;line-height:1.5}.tl-mobile-zones b{font-size:8px;letter-spacing:0}.tl-mobile-zones i{width:7px;height:7px}
}
@media(max-width:359px){
  .tl-panel-heading,.tl-status-panel .tl-panel-heading{padding:14px 12px}.tl-panel-heading h2,.tl-status-panel h2{font-size:14px}.tl-micro,.tl-simulation{font-size:8px}
  .tl-driving-controls,.tl-session-content{padding:15px 12px}.tl-scenario{padding:10px 8px}.tl-scenario strong{font-size:13px}.tl-scenario>span:last-child{font-size:11px}
  .tl-mobile-verdict{padding:12px 9px;gap:8px}.tl-mobile-verdict strong{font-size:12px}.tl-mobile-verdict>div>span{font-size:11px}.tl-mobile-verdict>b{font-size:18px}.tl-mobile-verdict>svg{width:20px}
  .tl-mobile-zones{gap:12px;padding:14px 12px;font-size:11px}.tl-mobile-zones b{font-size:7px}
  .tl-session-tabs{margin-left:10px;margin-right:10px}.tl-session-tabs button{font-size:11px}.tl-race-rules li{grid-template-columns:66px minmax(0,1fr);gap:8px;font-size:13px}.tl-race-rules li>span:first-child{font-size:11px}
  .tl-race-message,.tl-qualifying-message,.tl-advantage-message{padding:13px}.tl-race-message-title strong{font-size:16px}.tl-strikes{gap:5px}.tl-strikes small{font-size:7px}.tl-add-button{font-size:12px!important}
}
`;
