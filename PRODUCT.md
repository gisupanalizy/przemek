# Track Limits · F1 2026

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Tailwind CSS, Lucide React i Vite. Infografika zachowuje własne SVG, logikę i style w `TrackLimitsInfographic.tsx`. Ten komponent udostępnia też niezależnie ładowane zakładki gier. „Twój sprint” korzysta z: `RaceGame.tsx`, `race-engine.ts`, `race-track.ts`, `race-renderer.ts`, `race-gesture.ts` i `race-game.css`. „Na żyletki” korzysta z osobnych `TimeAttackGame.tsx`, `time-attack-engine.ts`, `time-attack-track.ts`, `time-attack-renderer.ts` i `time-attack.css`. Obie gry korzystają z lokalnego obrazu `public/game/driver.png`; zakaz bitmap dotyczy samej infografiki.

## Product Purpose

Interaktywna infografika edukacyjna po polsku wyjaśniająca limity toru oraz konsekwencje wykroczeń według dokumentów FIA na 2026 rok. Osobna zakładka „Twój sprint” oferuje 90-sekundowy wyścig arcade na fikcyjnym torze Riviera. Trzecia zakładka „Na żyletki” to próba czasowa na stałej trasie, zachęcająca do poprawiania własnej linii, hamowania i rekordu.

## Capabilities and Constraints

Cztery scenariusze położenia bolidu, ciągły suwak, status każdego koła, lupa kontaktu z linią, panel Race Control oraz tryby kwalifikacji, wyścigu i trwałej przewagi. Angielskie komunikaty sędziowskie. Responsywny układ. Ruch z obsługą ograniczenia animacji.

### Twój sprint

Gra: start lotny z P8, osiem bolidów z rzeczywistym postępem i pozycją wynikającą z dystansu. Automatyczny gaz, skręcanie, hamulec, nitro po dotknięciu na 1,6 s (przytrzymanie przedłuża działanie, dopóki wystarcza energii) i cień aerodynamiczny na prostych. Wskazówki pokazują kierunek, dystans do zakrętu i zalecaną prędkość; nadmierna prędkość zmniejsza przyczepność i może wywołać poślizg. Czyste wyjścia z zakrętów i wyprzedzenia odnawiają ERS oraz dodają punkty, kolizje i poślizgi odejmują punkty. Renderowanie i fizyka współdzielą geometrię toru oraz znormalizowane współrzędne drogi.

Poziomy gest w dowolnym miejscu toru steruje względem początkowej pozycji bolidu, bez skoku przy samym dotknięciu. Zwolnienie, anulowanie, utrata przechwycenia wskaźnika i pauza zerują cel gestu. Hamulec i nitro korzystają z niezależnych wskaźników; strzałki ekranowe i klawisze pozostają dostępne i przejmują skręt od gestu. `race-gesture.ts` wyznacza cel, a silnik zachowuje zwykłą prędkość skręcania i ograniczenia przyczepności.

Gra jest przeznaczona do poziomego ekranu: 75% szerokości zajmuje tor, 25% kamera kierowcy z odsłoniętą twarzą. „Graj” próbuje uruchomić pełny ekran i blokadę orientacji; „Graj w oknie” pomija żądanie pełnego ekranu. Ręczny obrót jest obsługiwanym rozwiązaniem awaryjnym. Utrata widoczności/fokusu, powrót do pionu, opuszczenie pełnego ekranu lub zmiana zakładki wstrzymują wyścig; kontynuacja wymaga przycisku wznowienia. Powrót do infografiki zachowuje jej stan. Sterowanie klawiaturą: ←/→, ↓, Spacja, P. Rekord punktowy i pozycja są zapisywane lokalnie pod kluczem `f1-w-punkt:sprint-record:v2`, bez konta i backendu. Podczas gry nie są pobierane zewnętrzne dane ani fonty; obraz kierowcy jest serwowany z tego samego originu.

### Na żyletki

Próba czasowa na stałej trasie 1265 m, sześć zakrętów i trzy sektory. Lewy kciuk steruje względnym analogowym gestem w dolnej lewej strefie, prawy przytrzymuje hamulec; gaz działa sam. Obsługiwane są pion, poziom i klawiatura. Podsterowność przy dużej prędkości, opór trawy i spowolnienie po kontakcie z barierą nagradzają przygotowanie zakrętu. Wszystkie bramki trzeba przejechać na asfalcie w kolejności; próbę kończy meta bez limitu 60 sekund. Osobny silnik używa stałego kroku 120 Hz i wspólnej z rendererem geometrii trasy.

Referencyjny czas 47,234004675 s wyznacza medale na 105/115/130%. Opcjonalny duch najlepszego lokalnego przejazdu nie powoduje kolizji; bieżąca różnica i sektory wspierają kolejne próby. Szybka powtórka ma jednosekundowe odliczanie. Zmiana zakładki lub orientacji i utrata widoczności/fokusu pauzują grę oraz zwalniają sterowanie; jawne wznowienie ma trzysekundowe odliczanie. Nieaktywny moduł zatrzymuje animację, a gry mają odrębny stan immersji. Nawigacja zachowuje trzy adresy: `#track-limits`, `#gra`, `#na-zyletki`.

Nowy klucz `f1-w-punkt:time-attack:record:v1` przechowuje czas, sektory i ograniczony ślad ducha z wersją trasy oraz fizyki. Uszkodzony lub nieaktualny zapis jest odrzucany, a zablokowana pamięć pozwala kontynuować z rekordem sesji. Stary rekord pozostaje niezależny. Gra korzysta z istniejącego portretu i jego pochodzenia; awaria obrazu nie blokuje gry. Bez konta, backendu i wymagania pełnego ekranu.

## Brand Commitments

Wyraźnie określony przez użytkownika F1 Broadcast Telemetry Style: tło #0f0f14, karty #15151e, czerwień #e10600, sportowa bezszeryfowa typografia systemowa i monospace dla telemetrii. W infografice wizualizator po lewej, panel kontroli po prawej. Gra rozszerza ten świat o zatwierdzony retro pixel art: `driver.png` powstał przez Imagegen z dwóch referencji użytkownika — zdjęcia tożsamości i wzorca stylistyki kokpitu. Pełny prompt i pochodzenie zapisano w `public/game/driver.provenance.json`; rozpoznawalna, odsłonięta twarz pozostaje częścią zatwierdzonej kompozycji.

## Evidence on Hand

Szczegółowy brief użytkownika oraz oficjalne FIA 2026 Section B Sporting Regulations, Issue 09, i FIA 2026 Penalty / Driving Standards Guidelines, Version 01. Materiał jest edukacyjny, a nie oficjalną aplikacją FIA.

## Open Decisions

Nie określono miejsca wdrożenia. Lokalny podgląd służy sprawdzeniu gotowego komponentu.
