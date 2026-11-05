# Granica jest biała. — limity toru F1 2026

Projekt zawiera infografikę „Limity toru” oraz dwie osobne gry: „Przemek Racing” i „Przemek Racing 3D”. Punktem wejścia jest **`TrackLimitsInfographic.tsx`**: SVG, logika i style samej infografiki pozostają w tym pliku, natomiast obie gry są niezależnie ładowane przez `React.lazy` z osobnych modułów. Kolejność zakładek to „Limity toru” (`#track-limits`) → „Przemek Racing” (`#na-zyletki`) → „Przemek Racing 3D” (`#gra`); obsługują bezpośrednie linki, historię przeglądarki i nawigację klawiaturą. Lokalny podgląd korzysta z React + Vite + Tailwind CSS.

## Uruchomienie podglądu

```sh
npm install
npm run dev
```

Testy silników i sterowania obu gier, sprawdzenie TypeScript i kompilacja produkcyjna:

```sh
npm test
npm run build
```

## Użycie w istniejącej aplikacji React

Zainstaluj `lucide-react`; aplikacja potrzebuje React i Tailwind CSS. Skopiuj razem, zachowując wzajemne ścieżki importów:

- `TrackLimitsInfographic.tsx` — główny komponent i osadzone style `.tl`.
- `RaceGame.tsx`, `race-engine.ts`, `race-track.ts`, `race-renderer.ts`, `race-gesture.ts` oraz `race-game.css` — leniwie ładowana gra, obsługa gestów i style `.rg`.
- `TimeAttackGame.tsx`, `TimeAttackPreview.tsx`, `time-attack-engine.ts`, `time-attack-track.ts`, `time-attack-renderer.ts` oraz `time-attack.css` — niezależnie ładowana gra „Przemek Racing”, jej demonstracja menu i style `.ta`.
- `track-labels.ts` — wspólne nazwy wyświetlane Pętla Morena i Morena Sprint oraz lokalizacja Gdańsk Morena.
- `public/game/driver.png` i `public/game/driver.provenance.json` — lokalna grafika kierowcy oraz jej pełny prompt i pochodzenie.

Sam plik infografiki nie wystarcza do ponownego użycia obecnego komponentu: bundler musi rozwiązać także importy obu gier. W Vite `public/game/driver.png` jest udostępniany pod `${import.meta.env.BASE_URL}game/driver.png`. Przy innym bundlerze dostosuj tę ścieżkę i obsługę `import.meta.env.BASE_URL`; obecny TypeScript używa również `allowImportingTsExtensions`. Podczas gry obraz jest pobierany z tego samego originu co aplikacja; nie są pobierane zewnętrzne obrazy, fonty ani dane. Linki źródłowe FIA otwierają zewnętrzne dokumenty dopiero po wybraniu ich przez użytkownika.

```tsx
import TrackLimitsInfographic from './TrackLimitsInfographic';

export default function App() {
  return <TrackLimitsInfographic />;
}
```

## Interakcje infografiki

- Cztery gotowe scenariusze i ciągły suwak. Kontakt każdej opony jest obliczany z tej samej geometrii co rysunek, z uwzględnieniem obrotu bolidu i zaokrągleń opon. Scenariusz „Na żyletki” zostawia dokładnie jedną oponę na granicy.
- Lupa kontaktu z białą linią, status FIA i telemetria czterech opon.
- Kwalifikacje, wyścig oraz trwała przewaga. Licznik obsługuje również więcej niż pięć wykroczeń; każde od czwartego dodaje 5 sekund. Symulator kar jest niezależny od wizualizatora.
- Obsługa klawiatury, komunikaty `aria-live`, tekstowe odpowiedniki kolorów i `prefers-reduced-motion`.

## Przemek Racing 3D

Gra to 90-sekundowy start lotny z P8 na fikcyjnym torze arcade Morena Sprint, z wyświetlaną lokalizacją Gdańsk Morena. Siedmiu rywali ma własny dystans i pozycję na drodze; wynik P1–P8 wynika z faktycznego postępu. W poziomie tor zajmuje 75% szerokości, a przednia kamera kierowcy 25%. Twarz pozostaje odsłonięta. Zatwierdzona grafika `driver.png` powstała przez Imagegen z dwóch referencji użytkownika: zdjęcia tożsamości i wzorca pixel-artowego kokpitu.

- Gaz działa automatycznie. Przesuwanie palca w lewo lub w prawo w dowolnym miejscu toru steruje względem pozycji bolidu na początku gestu; samo dotknięcie nie przestawia auta pod palec. Puszczenie, anulowanie gestu, utrata przechwycenia wskaźnika i pauza zwalniają skręt. Hamulec i nitro mają niezależną obsługę wskaźników, więc można je łączyć ze skręcaniem. Strzałki ekranowe i klawiatura pozostają dostępne: ←/→ skręcają, ↓ hamuje, Spacja uruchamia nitro, P wstrzymuje. Strzałki i klawisze skrętu przejmują sterowanie od gestu.
- Dotknięcie nitro daje impuls 1,6 s; przytrzymanie przedłuża go, dopóki wystarcza ERS. Hamowanie, pobocze i poślizg przerywają nitro.
- Wskazówki pokazują kierunek zakrętu, dystans i zalecaną prędkość. Za szybki wjazd zmniejsza skuteczność skręcania i może doprowadzić do poślizgu. Na prostej bliska jazda za rywalem daje cień aerodynamiczny, a wyjście obok z nitro umożliwia wyprzedzanie. Rywale hamują przed zakrętami i mogą odzyskać pozycję.
- Czyste wyjście z zakrętu daje 180 pkt i 15 ERS; czyste wyprzedzenie odnawia 18 ERS i buduje serię punktową. Kolizja odejmuje 180 pkt, poślizg 150 pkt. Końcowy wynik uwzględnia dystans, wyprzedzenia, serię, zakręty i pozycję. Rekord punktowy z pozycją jest zapisywany w `localStorage` pod kluczem `f1-w-punkt:sprint-record:v2`. Jeśli zapis jest blokowany, gra pokazuje komunikat i zachowuje rekord na bieżącą sesję.
- „Graj” próbuje włączyć pełny ekran i orientację poziomą. „Graj w oknie” pomija żądanie pełnego ekranu. Przy braku obsługi API działa ręczny obrót telefonu; pion pokazuje instrukcję obrotu. Utrata widoczności lub fokusu, powrót do pionu, opuszczenie pełnego ekranu i zmiana zakładki pauzują wyścig oraz zwalniają przytrzymane kontrolki. Wznowienie wymaga przycisku i odliczania. Wyjście przywraca nawigację, a stan infografiki pozostaje zachowany.

`race-engine.ts` symuluje ruch stałym krokiem 1/120 s; `race-renderer.ts` rysuje klatki przez `requestAnimationFrame`. Oba korzystają z tej samej definicji drogi i znormalizowanych współrzędnych w `race-track.ts`, dzięki czemu granica fizyki odpowiada geometrii renderowania. `race-gesture.ts` wyznacza względny cel skrętu; silnik realizuje go z normalnymi ograniczeniami przyczepności. Nie ma backendu ani konta.

## Przemek Racing

Osobna próba czasowa pod `#na-zyletki` działa przede wszystkim w pionie i obsługuje też poziom. Zamknięty, zaokrąglony tor Pętla Morena, z wyświetlaną lokalizacją Gdańsk Morena, ma nerkowaty kształt, długość 1265 m, sześć zakrętów (pięć prawych i jeden lewy) oraz trzy sektory. Start i meta leżą w tym samym fizycznym miejscu i mają tę samą styczną. Jedno pełne okrążenie po przejechaniu wszystkich bramek na asfalcie w kolejności kończy próbę; nie ma limitu 60 sekund.

Menu na komputerze pokazuje tytuł, opis, start i rekord po lewej oraz duży istniejący portret w kokpicie po prawej. Pełnej szerokości podgląd poniżej używa rzeczywistego renderera gry; mniejsza mapa trasy i instrukcje są dalej. Na telefonie kolejność to opis i start → portret → demonstracja → mapa, szczegóły i instrukcje. Demonstracja ma oddzielny przejazd i kamerę oraz nie odczytuje ani nie zapisuje rekordów. Zatrzymuje się w nieaktywnej zakładce, po ukryciu strony i odmontowaniu menu; przy `prefers-reduced-motion` jest statyczna.

- Lewy kciuk steruje analogowo przez poziome przeciąganie dolnej lewej strefy względem miejsca dotknięcia. Puszczenie prostuje kierownicę. Prawy kciuk przytrzymuje hamulec; gaz działa automatycznie. Niezależne wskaźniki pozwalają jednocześnie skręcać i hamować. Klawiatura: ←/→ lub A/D — skręt, ↓, S lub Spacja — hamulec, P lub Escape — pauza.
- Wczesne hamowanie i wybór linii pomagają zachować przyczepność. Nadmierna prędkość ogranicza skręt, trawa spowalnia, a bariera odbiera prędkość. Czas referencyjnego kierowcy wynosi 47,863619334359015 s; progi złota, srebra i brązu to odpowiednio 105%, 115% i 130% tej wartości.
- Opcjonalny cyjanowy duch odtwarza najlepsze lokalne okrążenie z interpolowanych próbek i nie powoduje kolizji. Wolniejsze okrążenie nie zastępuje rekordu ani jego ducha. Różnica do rekordu, czasy sektorów i podsumowanie na mecie pomagają znaleźć miejsce do poprawy. Duży portret podczas próby pojawia się wyłącznie w odliczaniu: trzy sekundy przy nowym starcie lub wznowieniu i jedną przy powtórce. Cyfry znajdują się pod twarzą, a w niskim poziomie obok niej. Podczas jazdy pozostaje mały portret w górnym rogu. „Jeszcze raz” rozpoczyna świeżą próbę z jednosekundowym odliczaniem; kamera wybiera najkrótszy obrót, bez pełnego obrotu o 360° przy powtórce.
- Zmiana zakładki lub orientacji, utrata fokusu i ukrycie strony pauzują próbę oraz zwalniają kontrolki. Powrót wymaga jawnego wznowienia i trzysekundowego odliczania. Pełny ekran nie jest wymagany; nieaktywna gra zatrzymuje pętlę animacji. Każda gra ma osobny stan trybu immersyjnego.
- Rekord, sektory i ograniczony rozmiarem ślad ducha mają wersję fizyki i trasy. Zapis używa nowego klucza `f1-w-punkt:time-attack:loop-record:v1`, niezależnego od rekordu „Przemek Racing 3D”. Błędny lub nieaktualny rekord jest pomijany; blokada pamięci nie zatrzymuje gry, a nowy rekord pozostaje w sesji. Nie ma konta ani backendu.

`TimeAttackGame.tsx` zarządza interfejsem i sterowaniem, `time-attack-engine.ts` symuluje ruch stałym krokiem 1/120 s, a `time-attack-track.ts` dostarcza wspólną geometrię dla fizyki, mapy i rysowania w `time-attack-renderer.ts`. Gra ponownie wykorzystuje zatwierdzone `driver.png` z zachowanym pochodzeniem; brak obrazu nie blokuje przejazdu, a przycisk pozwala ponowić jego wczytanie.

### Wersja rekordu zamkniętego toru

Tor ma wersję `riviera-loop-v1` i nowy klucz `f1-w-punkt:time-attack:loop-record:v1`. Nazwy Morena są tylko metadanymi wyświetlania z `track-labels.ts`: geometrie pozostają fikcyjne i niezmienione, a istniejący rekord pętli oraz duch nadal się wczytują. Wprowadzenie zamkniętej pętli rozpoczęło nowy rekord osobisty: zapis poprzedniej otwartej trasy pod `f1-w-punkt:time-attack:record:v1` pozostaje nietknięty i nie jest przenoszony. Rekord gry „Przemek Racing 3D” również pozostaje niezależny.

## Źródła i interpretacja

- [FIA 2026 Sporting Regulations, Issue 09, art. B1.8.6](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf).
- [FIA 2026 Penalty Guidelines, v01](https://api.fia.com/sites/default/files/2026_f1_penalty_guidelines.pdf).
- [FIA 2026 Driving Standards Guidelines, v01, sekcje D i F](https://api.fia.com/sites/default/files/2026_f1_driving_standards_guidelines.pdf).

Skasowanie następnego okrążenia w kwalifikacjach jest warunkowe: zależy od możliwej korzyści i instrukcji dla toru. Oddanie przewagi nie gwarantuje braku kary; decydują sędziowie. Strike’i także zależą od okoliczności. Wytyczne nie zastępują regulaminu. „Styl Antonellego” jest nazwą edukacyjnego scenariusza, a komunikaty Race Control są przykładowe.

## Weryfikacja

Produkcja kompiluje się bez błędów. Przeprowadzono 36 sprawdzeń w Chromium: cztery scenariusze, dokładny styk i przesunięcie o 0,1%, suwak z klawiatury, lupa, eskalacja do siedmiu wykroczeń, oba pozostałe tryby, resety, ograniczenie animacji, brak błędów JavaScript oraz brak poziomego przewijania przy szerokościach 320, 390, 768, 1024 i 1440 px.

Po adaptacji mobilnej wykonano dodatkowe 37 sprawdzeń w Chromium: szerokości 320–844 px, orientacja pionowa i pozioma, pola przycisków i suwaka co najmniej 44×44 px, tekst opisowy co najmniej 14 px, lokalny werdykt przy scenariuszach, skróty nawigacji, dotknięcia oraz syntetyczne poziome i pionowe gesty na suwaku. Poziome przeciągnięcie zmienia pozycję, pionowy gest przewija stronę. Nie testowano na fizycznym telefonie ani w Safari/WebKit.

Gra: wszystkie 23 testy Node (15 silnika i 8 gestów/integracji), `npm run build` oraz `git diff --check` przechodzą. Testy gestów obejmują brak skoku po dotknięciu, zmianę kierunku, zwolnienie i anulowanie skrętu, własność wskaźnika, współpracę z nitro, pierwszeństwo strzałek i ograniczenia przyczepności. Wcześniej w Chromium zaobserwowano wyprzedzenie P8 → P7 po dotknięciu nitro oraz ukończenie pełnego 90-sekundowego sprintu z ekranem wyniku i nowym rekordem.

Po dodaniu gestów sprawdzono przeciąganie wskaźnikiem w Chromium przy 844×390 i 568×320 oraz po wznowieniu przy 1440×900; bolid zmienia kierunek, wskazówka gestu znika, a nitro może pozostać aktywne. Obrót do 390×844 pokazuje instrukcję obrotu i pauzuje grę; powrót do poziomu wymaga jawnego wznowienia. Nie zaobserwowano błędów konsoli ani poziomego przewijania. Kontrolki mają co najmniej 48 px, a kluczowa wskazówka kierunku, dystansu i prędkości co najmniej 11 px przy 568×320. Obrazy tej zmiany w `.impeccable/review/`: `swipe-mobile.jpg`, `swipe-small.jpg`, `swipe-desktop.jpg`; wcześniejszy dowód wyprzedzenia: `overtake-1280.jpg`.

Powyższe sprawdzenia „Przemek Racing 3D” nie potwierdzają działania na fizycznym telefonie, Safari/WebKit, natywnego wielodotyku ani stałych 60 klatek/s na urządzeniu. Test zgodności symulacji przy różnych częstotliwościach renderowania nie jest pomiarem wydajności fizycznego telefonu.

### Weryfikacja „Przemek Racing”

`npm test` uruchamia 39 testów Node: 23 testy gry 3D i gestów oraz 16 testów próby czasowej. Testy próby czasowej obejmują zamknięcie pozycji i stycznej toru, najkrótszy obrót kamery, czas referencyjny i medale, przewagę hamowania, zgodność symulacji przy renderowaniu 30/60/120 klatek/s, współpracę skrętu i hamulca, pobocze i bariery, bramki, sektory, ducha oraz walidację zapisu. `npm run build` sprawdza TypeScript i tworzy produkcyjny build.

Opcjonalny test przeglądarkowy wymaga lokalnie zainstalowanego Playwright oraz jego przeglądarek Chromium i WebKit. Przy działającym `npm run dev` na porcie 5173 uruchom w drugim terminalu:

```sh
node tests/time-attack-browser.mjs
```

Jeżeli Playwright jest zainstalowany poza projektowym `node_modules`, ustaw `PLAYWRIGHT_MODULE` na ścieżkę do zainstalowanego modułu Playwright. Opcjonalne `TEST_URL` zmienia domyślny adres `http://127.0.0.1:5173`.

Raport `artifacts/time-attack/browser-report.json` zawiera 49 zakończonych powodzeniem sprawdzeń i pustą listę błędów. Obejmują nazwy i nową kolejność trzech zakładek, historię, brak przepełnienia przy 320/390/768/1440 px, kontrolki co najmniej 48 px, sekwencję dwóch palców emulowaną przez Chromium CDP (wspólny skręt i hamulec, zwolnienie hamulca, anulowanie dotyku), pauzę po obrocie, zatrzymanie nieaktywnej pętli, niezależne rekordy oraz pełny kontrolowany przejazd przez UI z wirtualnym zegarem RAF, metą, zapisem, ponowną próbą i przeładowaniem. Pełne wolniejsze drugie okrążenie potwierdza, że najlepszy czas i duch pozostają bez zmian. Desktopowy WebKit z mobilnym viewportem potwierdził współpracę skrętu i hamulca. Dodatkowe sprawdzenia potwierdzają nazwy Morena, animację izolowanej demonstracji i jej zatrzymanie po ukryciu strony, statyczny podgląd przy ograniczeniu animacji, duży portret wyłącznie podczas odliczania próby, rozdzielenie cyfr i twarzy, zachowanie istniejącego rekordu po zmianie nazw oraz grę przy awarii obrazu. Aktualne dowody w `artifacts/time-attack/` to: `desktop-intro.png`, `mobile-intro.png`, `menu-320.png`, `menu-768.png`, `desktop-countdown.png`, `mobile-countdown.png`, `landscape-countdown.png`, `mobile-racing.png`, `landscape-racing.png`, `mobile-finish.png`, `webkit-racing.png` i porównawczy `sprint-desktop-intro.png`.

Przegląd końcowy `artifacts/time-attack/morena-finish-review.md` ma werdykt **Ship**, bez istotnych usterek. Mechaniczny detektor dla zmienionego UI zwrócił `[]`; skan rastrów wykazał jeden używany raster i zero brakujących zapisów pochodzenia. Nowych rastrów nie dodano; `driver.png` i jego pochodzenie pozostają bez zmian.

To automatyczna weryfikacja w emulacji przeglądarek. Nie przeprowadzono testu na fizycznym telefonie, w rzeczywistym Safari iOS lub Chrome Android ani przejazdu sterowanego przez człowieka; nie zmierzono stałych 60 klatek/s na urządzeniu.
