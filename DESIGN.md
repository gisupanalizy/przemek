# Granica jest biała.

User-pinned visual authority: F1 TV broadcast telemetry. Implement the infographic directly in code, without bitmap assets. Its SVG, logic and styles remain self-contained in `TrackLimitsInfographic.tsx`; the exported component now also lazy-loads the game modules and local driver image. The Vite wrapper supplies a live preview. The approved game extension preserves the incumbent visual world; no new-world redesign applies.

Read/operate hybrid: the top-down contact diagram leads, a compact control desk explains its outcome, and the penalty simulator makes the distinction between position and accumulated offences explicit.

Ground #0f0f14, panel #15151e, asphalt #252530, F1 red #e10600. Within the infographic, green and amber communicate contact and edge conditions. In the game, gold marks time, results and nitro controls; cyan marks ERS, nitro and aerodynamic tow. Compact uppercase labels, italic display lettering, monospace for telemetry, tabular numbers. Square broadcast rails, quiet 12px panel corners, structural dividers.

Desktop: large visualizer left, current decision and session simulator right. Mobile: diagram and scenario controls first, current decision and penalties second. Progressive details use native disclosure. Every input is labelled, status is announced politely, colour has a textual equivalent, motion respects reduced-motion preferences.

Geometry: a horizontal outer boundary at SVG y=245. A rigid, rotated car moves laterally; all four tyre contact rectangles use the same transform as the rendered car. Contact derives from the actual polygon corners, including exact tangency. The third preset retains exactly one tyre; no separate hard-coded judgement per scenario.

Mobile adaptation: use a system reading face, 14–16px descriptive text, touch targets at least 44px, and a two-column scenario picker. Crop the diagram around the car with SVG `slice` rather than shrinking its labels; the readable HTML legend carries zone names. Reposition the magnifier bubble within the crop and keep its connector attached to the actual tyre. Repeat the current verdict immediately beside the driving controls. Section shortcuts link directly to the visualizer and penalty rules. Coarse-pointer devices receive the touch layout in landscape through 950px. Range inputs reserve a 44px touch area and allow vertical page panning.

## Layout

The approved landscape game divides the stage into a chase-camera road (75%) and frontal driver camera (25%). Steering sits at the lower left; brake and nitro sit below the driver camera. Keep the identity plate recognizable and its face uncovered during play. Immersive play hides site navigation and uses available viewport height with safe-area padding. Portrait play shows a rotation prompt; browser fullscreen and orientation locking are progressive enhancements with manual rotation fallback. The primary “Graj” action requests fullscreen; “Graj w oknie” starts in the browser viewport.

Gameplay controls retain at least 48px touch targets. Corner direction, distance and recommended speed retain at least 11px text at the smallest approved landscape viewport (568×320). These game HUD sizes do not replace the infographic’s mobile reading-text rules.

## Components

The game keeps the broadcast type relationship: italic system-sans display headings, monospace HUD and tabular telemetry. Road, scenery and cars are authored in canvas; the approved raster driver plate uses pixelated rendering and top-aligned cropping. `public/game/driver.png` is an identity-preserving Imagegen asset made from the user’s identity photo and pixel-art cockpit reference. Its embedded prompt and provenance live in `public/game/driver.provenance.json`. This raster exception belongs to the game.

The road, opponents, corner cues, ERS meter and driver camera form one operational stage. Neutral cues show the next direction, distance and target speed; amber marks the braking zone and red an excessive corner speed. Text names braking, offroad and grip-recovery states. Active nitro turns cyan; pause and results use a dark stage overlay. Motion reduction removes driver lean, transitions, impact shake and speed streaks.

The game shell lives in `RaceGame.tsx` and `race-game.css`; simulation in `race-engine.ts`, shared normalized road geometry in `race-track.ts`, and canvas drawing in `race-renderer.ts`. Keep physics and drawing on that shared geometry. Losing focus or visibility, returning to portrait, leaving fullscreen or switching tabs pauses play and releases held controls. Resume requires an explicit action; leaving the game preserves the infographic state.
