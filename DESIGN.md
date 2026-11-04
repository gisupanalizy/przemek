# Granica jest biała.

User-pinned visual authority: F1 TV broadcast telemetry. Implement this directly in code; no bitmap assets. A standalone reusable React component is the deliverable; the Vite wrapper only supplies a live preview.

Read/operate hybrid: the top-down contact diagram leads, a compact control desk explains its outcome, and the penalty simulator makes the distinction between position and accumulated offences explicit.

Ground #0f0f14, panel #15151e, asphalt #252530, F1 red #e10600. Green and amber exclusively communicate contact and edge conditions. Compact uppercase labels, italic display lettering, monospace for telemetry, tabular numbers. Square broadcast rails, quiet 12px panel corners, structural dividers.

Desktop: large visualizer left, current decision and session simulator right. Mobile: diagram and scenario controls first, current decision and penalties second. Progressive details use native disclosure. Every input is labelled, status is announced politely, colour has a textual equivalent, motion respects reduced-motion preferences.

Geometry: a horizontal outer boundary at SVG y=245. A rigid, rotated car moves laterally; all four tyre contact rectangles use the same transform as the rendered car. Contact derives from the actual polygon corners, including exact tangency. The third preset retains exactly one tyre; no separate hard-coded judgement per scenario.

Mobile adaptation: use a system reading face, 14–16px descriptive text, touch targets at least 44px, and a two-column scenario picker. Crop the diagram around the car with SVG `slice` rather than shrinking its labels; the readable HTML legend carries zone names. Reposition the magnifier bubble within the crop and keep its connector attached to the actual tyre. Repeat the current verdict immediately beside the driving controls. Section shortcuts link directly to the visualizer and penalty rules. Coarse-pointer devices receive the touch layout in landscape through 950px. Range inputs reserve a 44px touch area and allow vertical page panning.
