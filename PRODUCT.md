# Track Limits · F1 2026

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Tailwind CSS, Lucide React i Vite. Infografika zachowuje własne SVG, logikę i style w `TrackLimitsInfographic.tsx`. Ten komponent udostępnia też niezależnie ładowane zakładki gier. „Przemek Racing 3D” korzysta z: `RaceGame.tsx`, `race-engine.ts`, `race-track.ts`, `race-renderer.ts`, `race-gesture.ts` i `race-game.css`. „Przemek Racing” korzysta z osobnych `TimeAttackGame.tsx`, `TimeAttackPreview.tsx`, `time-attack-engine.ts`, `time-attack-track.ts`, `time-attack-renderer.ts` i `time-attack.css`. Wspólne nazwy wyświetlane torów i lokalizację zawiera `track-labels.ts`. Obie gry korzystają z lokalnego obrazu `public/game/driver.png`; zakaz bitmap dotyczy samej infografiki.

## Product Purpose

Interaktywna infografika edukacyjna po polsku wyjaśniająca limity toru oraz konsekwencje wykroczeń według dokumentów FIA na 2026 rok. Zakładki mają kolejność „Limity toru” → „Przemek Racing” → „Przemek Racing 3D”. „Przemek Racing” to próba czasowa na zamkniętym torze, zachęcająca do poprawiania własnej linii, hamowania i rekordu. „Przemek Racing 3D” oferuje 90-sekundowy wyścig arcade na fikcyjnym torze Morena Sprint. Nazwa próby czasowej to Pętla Morena; obie gry pokazują lokalizację Gdańsk Morena. Są to nazwy wyświetlane, a geometrie torów pozostają fikcyjne i niezmienione.

## Capabilities and Constraints

Cztery scenariusze położenia bolidu, ciągły suwak, status każdego koła, lupa kontaktu z linią, panel Race Control oraz tryby kwalifikacji, wyścigu i trwałej przewagi. Angielskie komunikaty sędziowskie. Responsywny układ. Ruch z obsługą ograniczenia animacji.

### Przemek Racing 3D

Gra: start lotny z P8, osiem bolidów z rzeczywistym postępem i pozycją wynikającą z dystansu. Automatyczny gaz, skręcanie, hamulec, ERS po dotknięciu na 1,6 s (przytrzymanie przedłuża działanie, dopóki wystarcza energii) i cień aerodynamiczny na prostych. Wskazówki pokazują kierunek, dystans do zakrętu i zalecaną prędkość; nadmierna prędkość zmniejsza przyczepność i może wywołać poślizg. Czyste wyjścia z zakrętów i wyprzedzenia odnawiają ERS oraz dodają punkty, kolizje i poślizgi odejmują punkty. Renderowanie i fizyka współdzielą geometrię toru oraz znormalizowane współrzędne drogi.

Poziomy gest w dowolnym miejscu toru steruje względem początkowej pozycji bolidu, bez skoku przy samym dotknięciu. Zwolnienie, anulowanie, utrata przechwycenia wskaźnika i pauza zerują cel gestu. Hamulec i ERS korzystają z niezależnych wskaźników; strzałki ekranowe i klawisze pozostają dostępne i przejmują skręt od gestu. `race-gesture.ts` wyznacza cel, a silnik zachowuje zwykłą prędkość skręcania i ograniczenia przyczepności.

Gra jest przeznaczona do poziomego ekranu: 75% szerokości zajmuje tor, 25% kamera kierowcy z odsłoniętą twarzą. „Graj” próbuje uruchomić pełny ekran i blokadę orientacji; „Graj w oknie” pomija żądanie pełnego ekranu. Ręczny obrót jest obsługiwanym rozwiązaniem awaryjnym. Utrata widoczności/fokusu, powrót do pionu, opuszczenie pełnego ekranu lub zmiana zakładki wstrzymują wyścig; kontynuacja wymaga przycisku wznowienia. Powrót do infografiki zachowuje jej stan. Sterowanie klawiaturą: ←/→, ↓, Spacja, P. Limity toru są wspólne z próbą czasową: dwa wyjazdy bez kary, trzeci to ostrzeżenie, a od czwartego każde dokłada 5 sekund. Po 90 sekundach rywale jadą dalej przez czas kary, a bolid gracza stoi; premia i rekord biorą pozycję końcową. Rekord jest zapisywany lokalnie pod kluczem `f1-w-punkt:sprint-record:v3`. Zapis `sprint-record:v2` zostaje i nie jest porównywany. Bez konta i backendu. Podczas gry nie są pobierane zewnętrzne dane ani fonty; obraz kierowcy jest serwowany z tego samego originu.

### Przemek Racing

Próba czasowa na zamkniętym, zaokrąglonym torze Pętla Morena o nerkowatym kształcie: 1265 m, sześć zakrętów (pięć prawych i jeden lewy) i trzy sektory. Start i meta współdzielą położenie i styczną. Lewy kciuk steruje względnym analogowym gestem w dolnej lewej strefie, prawy przytrzymuje hamulec; gaz działa sam. Obsługiwane są pion, poziom i klawiatura. Podsterowność przy dużej prędkości, opór trawy i spowolnienie po kontakcie z barierą nagradzają przygotowanie zakrętu. Wszystkie bramki trzeba przejechać na asfalcie w kolejności; próbę kończy jedno pełne okrążenie bez limitu 60 sekund. Osobny silnik używa stałego kroku 120 Hz i wspólnej z rendererem geometrii trasy.

Menu na komputerze zestawia tytuł, opis, start i rekord po lewej z dużym istniejącym portretem w kokpicie po prawej. Poniżej znajduje się pełnej szerokości demonstracja prawdziwego renderera, a dalej mniejsza mapa rzeczywistej geometrii i instrukcje. Telefon układa treść kolejno: opis i start, portret, demonstracja, mapa i szczegóły sterowania. Demonstracja ma własny stan przejazdu i kamery, nie odczytuje ani nie zapisuje rekordów; zatrzymuje się poza aktywnym, widocznym menu, po ukryciu strony i po odmontowaniu, a przy ograniczeniu animacji pozostaje statyczna.

Duży portret podczas próby pojawia się tylko w trzysekundowym odliczaniu nowego startu lub wznowienia oraz jednosekundowej powtórki. Cyfry są poza twarzą: pod portretem, a w niskim poziomie obok niego. Podczas jazdy pozostaje mały portret w górnym rogu.

Referencyjny czas 47,863619334359015 s wyznacza medale na 105/115/130% wyniku, czyli czasu jazdy plus kary. Sekwencja kar jest taka sama jak w sprincie. Opcjonalny duch najlepszego lokalnego okrążenia używa czasu jazdy i nie powoduje kolizji; wolniejszy wynik nie zastępuje rekordu ani ducha. Podczas jazdy różnica jest tempem względem ducha, a sektory zostają przy czasie jazdy. Porównanie na mecie uwzględnia kary. Szybka powtórka ma jednosekundowe odliczanie. Zmiana zakładki lub orientacji i utrata widoczności/fokusu pauzują grę oraz zwalniają sterowanie; jawne wznowienie ma trzysekundowe odliczanie. Nieaktywny moduł zatrzymuje animację, a gry mają odrębny stan immersji. Nawigacja zachowuje trzy adresy: `#track-limits`, `#na-zyletki`, `#gra`.

Klucz `f1-w-punkt:time-attack:loop-record:v2` rozdziela czas jazdy, karę i wynik oraz przechowuje sektory i ograniczony ślad ducha z wersją trasy oraz fizyki. Uszkodzony lub nieaktualny zapis jest odrzucany, a zablokowana pamięć pozwala kontynuować z rekordem sesji. Tor ma wersję `riviera-loop-v1`. Zapis `loop-record:v1` zostaje nietknięty i nie jest porównywany, bo nie zawiera wykroczeń. Zapis otwartej trasy pod `f1-w-punkt:time-attack:record:v1` i poprzedni rekord gry 3D pozostają nietknięte; zapisów nie przenosi się między wersjami. Gra korzysta z istniejącego portretu i jego pochodzenia; awaria obrazu nie blokuje gry. Bez konta, backendu i wymagania pełnego ekranu.

## Brand Commitments

Wyraźnie określony przez użytkownika F1 Broadcast Telemetry Style: tło #0f0f14, karty #15151e, czerwień #e10600, sportowa bezszeryfowa typografia systemowa i monospace dla telemetrii. W infografice wizualizator po lewej, panel kontroli po prawej. Gra rozszerza ten świat o zatwierdzony retro pixel art: `driver.png` powstał przez Imagegen z dwóch referencji użytkownika — zdjęcia tożsamości i wzorca stylistyki kokpitu. Pełny prompt i pochodzenie zapisano w `public/game/driver.provenance.json`; rozpoznawalna, odsłonięta twarz pozostaje częścią zatwierdzonej kompozycji.

## Evidence on Hand

Szczegółowy brief użytkownika oraz oficjalne FIA 2026 Section B Sporting Regulations, Issue 09, i FIA 2026 Penalty / Driving Standards Guidelines, Version 01. Materiał jest edukacyjny, a nie oficjalną aplikacją FIA.

## Open Decisions

Nie określono miejsca wdrożenia. Lokalny podgląd służy sprawdzeniu gotowego komponentu.
