# Granica jest biała.

User-pinned visual authority: F1 TV broadcast telemetry. Implement the infographic directly in code, without bitmap assets. Its SVG, logic and styles remain self-contained in `TrackLimitsInfographic.tsx`; the exported component independently lazy-loads the two games, which reuse the local driver image. The Vite wrapper supplies a live preview. The approved game extensions preserve the incumbent visual world; no new-world redesign applies.

Read/operate hybrid: the top-down contact diagram leads, a compact control desk explains its outcome, and the penalty simulator makes the distinction between position and accumulated offences explicit.

Ground #0f0f14, panel #15151e, asphalt #252530, F1 red #e10600. Within the infographic, green and amber communicate contact and edge conditions. In Przemek Racing 3D, gold marks time, results and ERS controls; cyan marks ERS energy, active ERS and aerodynamic tow. Compact uppercase labels, italic display lettering, monospace for telemetry, tabular numbers. Square broadcast rails, quiet 12px panel corners, structural dividers.

Desktop: large visualizer left, current decision and session simulator right. Mobile: diagram and scenario controls first, current decision and penalties second. Progressive details use native disclosure. Every input is labelled, status is announced politely, colour has a textual equivalent, motion respects reduced-motion preferences.

Geometry: a horizontal outer boundary at SVG y=245. A rigid, rotated car moves laterally; all four tyre contact rectangles use the same transform as the rendered car. Contact derives from the actual polygon corners, including exact tangency. The third preset retains exactly one tyre; no separate hard-coded judgement per scenario.

Mobile adaptation: use a system reading face, 14–16px descriptive text, touch targets at least 44px, and a two-column scenario picker. Crop the diagram around the car with SVG `slice` rather than shrinking its labels; the readable HTML legend carries zone names. Reposition the magnifier bubble within the crop and keep its connector attached to the actual tyre. Repeat the current verdict immediately beside the driving controls. Section shortcuts link directly to the visualizer and penalty rules. Coarse-pointer devices receive the touch layout in landscape through 950px. Range inputs reserve a 44px touch area and allow vertical page panning.

## Layout

### Przemek Racing 3D

The approved landscape game divides the stage into a chase-camera road (75%) and frontal driver camera (25%). The road accepts relative horizontal drag steering; fallback arrows sit at the lower left, and brake and ERS sit below the driver camera. Keep the identity plate recognizable and its face uncovered during play. Immersive play hides site navigation and uses available viewport height with safe-area padding. Portrait play shows a rotation prompt; browser fullscreen and orientation locking are progressive enhancements with manual rotation fallback. The primary “Graj” action requests fullscreen; “Graj w oknie” starts in the browser viewport.

Gameplay controls retain at least 48px touch targets. Corner direction, distance and recommended speed retain at least 11px text at the smallest approved landscape viewport (568×320). These game HUD sizes do not replace the infographic’s mobile reading-text rules.

### Przemek Racing

The separate time-trial surface is portrait first, with landscape support and no fullscreen requirement. Desktop entry pairs the italic title, copy, immediate start and record on the left with the large approved cockpit portrait on the right. A full-width demonstration of the actual top-down renderer follows; the smaller route map and instructions sit below it. Screens through 700px stack copy/start, portrait, demo, then map/details and instructions. The map uses the actual closed 1265m rounded kidney circuit with six corners (five right and one left), three sectors and a shared start/finish position and tangent. During play, a compact timing rail sits above the dominant top-down road and two large thumb areas sit below it. The small portrait remains in the road's upper corner; this surface does not use the 3D game's 25% camera rail. Safe-area padding and viewport height contain immersive play. Low landscape screens shorten the HUD and place control content horizontally while retaining at least 48px targets.

## Components

### Przemek Racing 3D

The game keeps the broadcast type relationship: italic system-sans display headings, monospace HUD and tabular telemetry. Road, scenery and cars are authored in canvas; the approved raster driver plate uses pixelated rendering and top-aligned cropping. `public/game/driver.png` is an identity-preserving Imagegen asset made from the user’s identity photo and pixel-art cockpit reference. Its embedded prompt and provenance live in `public/game/driver.provenance.json`. This raster exception belongs to the game.

The road, opponents, corner cues, ERS meter and driver camera form one operational stage. Neutral cues show the next direction, distance and target speed; amber marks the braking zone and red an excessive corner speed. Text names braking, offroad and grip-recovery states. The ready control reads “ERS”, active control and speed indicator read “ERS AKTYWNY”, energy meter reads “ENERGIA ERS”, and the straight hint reads “UŻYJ ERS NA PROSTEJ”. The active button label can wrap to two lines on small screens. Active ERS turns cyan; pause and results use a dark stage overlay. Motion reduction removes driver lean, transitions, impact shake and speed streaks.

An 11px monospace hint above the arrows introduces road swiping for the first eight seconds, disappearing after the first meaningful drag. Touching the road does not jump the car; dragging steers relative to the starting lane through the existing physics. Release, cancellation, capture loss and pause clear the gesture target. Brake and ERS retain independent pointer ownership; arrows and keyboard steering take precedence over the gesture.

The game shell lives in `RaceGame.tsx` and `race-game.css`; simulation in `race-engine.ts`, shared normalized road geometry in `race-track.ts`, canvas drawing in `race-renderer.ts`, and reusable relative gesture state in `race-gesture.ts`. Keep physics and drawing on that shared geometry. Losing focus or visibility, returning to portrait, leaving fullscreen or switching tabs pauses play and releases held controls. Resume requires an explicit action; leaving the game preserves the infographic state.

### Przemek Racing

Keep the same italic system-sans display voice and monospace, tabular timing hierarchy. The time-trial stage uses deep green-black rails, muted trackside greens, warm gold timing and medal accents, a red player car and a translucent cyan personal-best ghost. Treat these as local race scenery and state roles within the pinned broadcast world. A completed lap ends the attempt. Keep the closed route, car rotation and forward road visible. During an attempt, the large portrait appears only for the existing three-second fresh-start/resume and one-second retry countdowns. Place the numeral below the face in portrait and desktop, beside it in low landscape; never cover the face. Racing restores the small upper-corner portrait, and results retain the compact portrait.

The left thumb area has a relative analog steering rail; its indicator follows steering, and the held label confirms pointer ownership. The separate right brake area changes its fill and label while held. Release, cancellation, capture loss and pause release controls. Text names automatic throttle, braking, excessive speed, offroad and barrier contact. Sector and finish summaries pair times with signed deltas; the ghost toggle pairs its cyan state with text and `aria-pressed`. Gold focus outlines, dark modal overlays, a focus-contained dialog and explicit resume support keyboard navigation. The camera follows the shortest angular path, including retry, without a full 360° spin. Reduced motion removes CSS animation/transitions and camera easing.

`TimeAttackPreview.tsx` presents the real renderer using separate race and camera state, with no record reads or writes. Animate only in the active visible menu; stop on hidden pages, inactivity and menu unmount. Reduced motion keeps this demo static. `track-labels.ts` supplies the display names Pętla Morena (Przemek Racing) and Morena Sprint (Przemek Racing 3D), both at Gdańsk Morena. These labels do not change the fictional geometries, `riviera-loop-v1` or `f1-w-punkt:time-attack:loop-record:v1`.

`TimeAttackGame.tsx` and `time-attack.css` own this surface; `time-attack-engine.ts`, `time-attack-track.ts` and `time-attack-renderer.ts` keep simulation and drawing on one independent geometry. Reuse `public/game/driver.png` with its existing provenance, pixelated rendering and recognizable uncovered face. The image can be reloaded after failure without preventing play. Navigation keeps the order Limity toru → Przemek Racing (`#na-zyletki`) → Przemek Racing 3D (`#gra`). The cyan ghost represents the best local lap; a slower latest lap does not replace it. See `.impeccable/surfaces/time-attack.md` for the confirmed surface contract and evidence scope.
