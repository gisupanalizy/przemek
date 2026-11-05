# Track Limits · F1 2026

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Tailwind CSS, Lucide React i Vite. Infografika zachowuje własne SVG, logikę i style w `TrackLimitsInfographic.tsx`. Ten komponent udostępnia też leniwie ładowaną zakładkę gry: `RaceGame.tsx`, `race-engine.ts`, `race-track.ts`, `race-renderer.ts` i `race-game.css`. Gra korzysta z lokalnego obrazu `public/game/driver.png`; zakaz bitmap dotyczy samej infografiki.

## Product Purpose

Interaktywna infografika edukacyjna po polsku wyjaśniająca limity toru oraz konsekwencje wykroczeń według dokumentów FIA na 2026 rok. Osobna zakładka „Twój sprint” oferuje 90-sekundowy wyścig arcade na fikcyjnym torze Riviera.

## Capabilities and Constraints

Cztery scenariusze położenia bolidu, ciągły suwak, status każdego koła, lupa kontaktu z linią, panel Race Control oraz tryby kwalifikacji, wyścigu i trwałej przewagi. Angielskie komunikaty sędziowskie. Responsywny układ. Ruch z obsługą ograniczenia animacji.

Gra: start lotny z P8, osiem bolidów z rzeczywistym postępem i pozycją wynikającą z dystansu. Automatyczny gaz, skręcanie, hamulec, nitro po dotknięciu na 1,6 s (przytrzymanie przedłuża działanie, dopóki wystarcza energii) i cień aerodynamiczny na prostych. Wskazówki pokazują kierunek, dystans do zakrętu i zalecaną prędkość; nadmierna prędkość zmniejsza przyczepność i może wywołać poślizg. Czyste wyjścia z zakrętów i wyprzedzenia odnawiają ERS oraz dodają punkty, kolizje i poślizgi odejmują punkty. Renderowanie i fizyka współdzielą geometrię toru oraz znormalizowane współrzędne drogi.

Gra jest przeznaczona do poziomego ekranu: 75% szerokości zajmuje tor, 25% kamera kierowcy z odsłoniętą twarzą. „Graj” próbuje uruchomić pełny ekran i blokadę orientacji; „Graj w oknie” pomija żądanie pełnego ekranu. Ręczny obrót jest obsługiwanym rozwiązaniem awaryjnym. Utrata widoczności/fokusu, powrót do pionu, opuszczenie pełnego ekranu lub zmiana zakładki wstrzymują wyścig; kontynuacja wymaga przycisku wznowienia. Powrót do infografiki zachowuje jej stan. Sterowanie klawiaturą: ←/→, ↓, Spacja, P. Rekord punktowy i pozycja są zapisywane lokalnie pod kluczem `f1-w-punkt:sprint-record:v2`, bez konta i backendu. Podczas gry nie są pobierane zewnętrzne dane ani fonty; obraz kierowcy jest serwowany z tego samego originu.

## Brand Commitments

Wyraźnie określony przez użytkownika F1 Broadcast Telemetry Style: tło #0f0f14, karty #15151e, czerwień #e10600, sportowa bezszeryfowa typografia systemowa i monospace dla telemetrii. W infografice wizualizator po lewej, panel kontroli po prawej. Gra rozszerza ten świat o zatwierdzony retro pixel art: `driver.png` powstał przez Imagegen z dwóch referencji użytkownika — zdjęcia tożsamości i wzorca stylistyki kokpitu. Pełny prompt i pochodzenie zapisano w `public/game/driver.provenance.json`; rozpoznawalna, odsłonięta twarz pozostaje częścią zatwierdzonej kompozycji.

## Evidence on Hand

Szczegółowy brief użytkownika oraz oficjalne FIA 2026 Section B Sporting Regulations, Issue 09, i FIA 2026 Penalty / Driving Standards Guidelines, Version 01. Materiał jest edukacyjny, a nie oficjalną aplikacją FIA.

## Open Decisions

Nie określono miejsca wdrożenia. Lokalny podgląd służy sprawdzeniu gotowego komponentu.
