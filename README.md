# Granica jest biała. — limity toru F1 2026

Projekt zawiera infografikę „Limity toru” i grę „Twój sprint”. Punktem wejścia jest **`TrackLimitsInfographic.tsx`**: SVG, logika i style samej infografiki pozostają w tym pliku, natomiast zakładka gry jest ładowana przez `React.lazy` z osobnych modułów. Lokalny podgląd korzysta z React + Vite + Tailwind CSS.

## Uruchomienie podglądu

```sh
npm install
npm run dev
```

Testy silnika gry, sprawdzenie TypeScript i kompilacja produkcyjna:

```sh
npm test
npm run build
```

## Użycie w istniejącej aplikacji React

Zainstaluj `lucide-react`; aplikacja potrzebuje React i Tailwind CSS. Skopiuj razem, zachowując wzajemne ścieżki importów:

- `TrackLimitsInfographic.tsx` — główny komponent i osadzone style `.tl`.
- `RaceGame.tsx`, `race-engine.ts`, `race-track.ts`, `race-renderer.ts` oraz `race-game.css` — leniwie ładowana gra i jej style `.rg`.
- `public/game/driver.png` i `public/game/driver.provenance.json` — lokalna grafika kierowcy oraz jej pełny prompt i pochodzenie.

Sam plik infografiki nie wystarcza do ponownego użycia obecnego komponentu: bundler musi rozwiązać także import gry. W Vite `public/game/driver.png` jest udostępniany pod `${import.meta.env.BASE_URL}game/driver.png`. Przy innym bundlerze dostosuj tę ścieżkę i obsługę `import.meta.env.BASE_URL`; obecny TypeScript używa również `allowImportingTsExtensions`. Podczas gry obraz jest pobierany z tego samego originu co aplikacja; nie są pobierane zewnętrzne obrazy, fonty ani dane. Linki źródłowe FIA otwierają zewnętrzne dokumenty dopiero po wybraniu ich przez użytkownika.

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

## Twój sprint

Gra to 90-sekundowy start lotny z P8 na fikcyjnym torze Riviera arcade. Siedmiu rywali ma własny dystans i pozycję na drodze; wynik P1–P8 wynika z faktycznego postępu. W poziomie tor zajmuje 75% szerokości, a przednia kamera kierowcy 25%. Twarz pozostaje odsłonięta. Zatwierdzona grafika `driver.png` powstała przez Imagegen z dwóch referencji użytkownika: zdjęcia tożsamości i wzorca pixel-artowego kokpitu.

- Gaz działa automatycznie. ←/→ skręcają, ↓ hamuje, Spacja uruchamia nitro, P wstrzymuje. Przyciski dotykowe pozwalają łączyć sterowanie z hamulcem lub nitro. Dotknięcie nitro daje impuls 1,6 s; przytrzymanie przedłuża go, dopóki wystarcza ERS. Hamowanie, pobocze i poślizg przerywają nitro.
- Wskazówki pokazują kierunek zakrętu, dystans i zalecaną prędkość. Za szybki wjazd zmniejsza skuteczność skręcania i może doprowadzić do poślizgu. Na prostej bliska jazda za rywalem daje cień aerodynamiczny, a wyjście obok z nitro umożliwia wyprzedzanie. Rywale hamują przed zakrętami i mogą odzyskać pozycję.
- Czyste wyjście z zakrętu daje 180 pkt i 15 ERS; czyste wyprzedzenie odnawia 18 ERS i buduje serię punktową. Kolizja odejmuje 180 pkt, poślizg 150 pkt. Końcowy wynik uwzględnia dystans, wyprzedzenia, serię, zakręty i pozycję. Rekord punktowy z pozycją jest zapisywany w `localStorage` pod kluczem `f1-w-punkt:sprint-record:v2`. Jeśli zapis jest blokowany, gra pokazuje komunikat i zachowuje rekord na bieżącą sesję.
- „Graj” próbuje włączyć pełny ekran i orientację poziomą. „Graj w oknie” pomija żądanie pełnego ekranu. Przy braku obsługi API działa ręczny obrót telefonu; pion pokazuje instrukcję obrotu. Utrata widoczności lub fokusu, powrót do pionu, opuszczenie pełnego ekranu i zmiana zakładki pauzują wyścig oraz zwalniają przytrzymane kontrolki. Wznowienie wymaga przycisku i odliczania. Wyjście przywraca nawigację, a stan infografiki pozostaje zachowany.

`race-engine.ts` symuluje ruch stałym krokiem 1/120 s; `race-renderer.ts` rysuje klatki przez `requestAnimationFrame`. Oba korzystają z tej samej definicji drogi i znormalizowanych współrzędnych w `race-track.ts`, dzięki czemu granica fizyki odpowiada geometrii renderowania. Nie ma backendu ani konta.

## Źródła i interpretacja

- [FIA 2026 Sporting Regulations, Issue 09, art. B1.8.6](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf).
- [FIA 2026 Penalty Guidelines, v01](https://api.fia.com/sites/default/files/2026_f1_penalty_guidelines.pdf).
- [FIA 2026 Driving Standards Guidelines, v01, sekcje D i F](https://api.fia.com/sites/default/files/2026_f1_driving_standards_guidelines.pdf).

Skasowanie następnego okrążenia w kwalifikacjach jest warunkowe: zależy od możliwej korzyści i instrukcji dla toru. Oddanie przewagi nie gwarantuje braku kary; decydują sędziowie. Strike’i także zależą od okoliczności. Wytyczne nie zastępują regulaminu. „Styl Antonellego” jest nazwą edukacyjnego scenariusza, a komunikaty Race Control są przykładowe.

## Weryfikacja

Produkcja kompiluje się bez błędów. Przeprowadzono 36 sprawdzeń w Chromium: cztery scenariusze, dokładny styk i przesunięcie o 0,1%, suwak z klawiatury, lupa, eskalacja do siedmiu wykroczeń, oba pozostałe tryby, resety, ograniczenie animacji, brak błędów JavaScript oraz brak poziomego przewijania przy szerokościach 320, 390, 768, 1024 i 1440 px.

Po adaptacji mobilnej wykonano dodatkowe 37 sprawdzeń w Chromium: szerokości 320–844 px, orientacja pionowa i pozioma, pola przycisków i suwaka co najmniej 44×44 px, tekst opisowy co najmniej 14 px, lokalny werdykt przy scenariuszach, skróty nawigacji, dotknięcia oraz syntetyczne poziome i pionowe gesty na suwaku. Poziome przeciągnięcie zmienia pozycję, pionowy gest przewija stronę. Nie testowano na fizycznym telefonie ani w Safari/WebKit.

Gra: 15 testów Node silnika oraz `npm run build` przechodzą. Testy obejmują m.in. rzeczywistą zmianę pozycji, 90-sekundową metę, stały krok symulacji, nitro po krótkim dotknięciu, hamowanie, cień aerodynamiczny, kolizje, wynik i zgodność geometrii fizyki z rysowaniem. W Chromium zaobserwowano wyprzedzenie P8 → P7 po dotknięciu nitro oraz ukończenie pełnego 90-sekundowego sprintu z ekranem wyniku i nowym rekordem. Sprawdzono widoki 844×390, 568×320, 390×844 (instrukcja obrotu) i 1440×900. Kontrolki sterowania podczas wyścigu mają co najmniej 48 px, a kluczowa wskazówka kierunku, dystansu i prędkości co najmniej 11 px przy 568×320. Aktualne obrazy kontrolne zapisano w `.impeccable/review/` jako `mobile.jpg`, `mobile-small.jpg`, `portrait.jpg`, `desktop.jpg` i `overtake-1280.jpg`.

Te sprawdzenia przeglądarkowe nie potwierdzają działania na fizycznym telefonie, Safari/WebKit, natywnego wielodotyku ani stałych 60 klatek/s na urządzeniu. Test zgodności symulacji przy różnych częstotliwościach renderowania nie jest pomiarem wydajności fizycznego telefonu.
