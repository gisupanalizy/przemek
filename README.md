# Granica jest biała. — limity toru F1 2026

Gotowy, samowystarczalny komponent znajduje się w **`TrackLimitsInfographic.tsx`**. Cała wizualizacja SVG, logika i style są zawarte w tym pliku. Pozostałe pliki tworzą lokalny podgląd React + Vite + Tailwind CSS.

## Uruchomienie podglądu

```sh
npm install
npm run dev
```

Sprawdzenie TypeScript i kompilacja produkcyjna:

```sh
npm run build
```

## Użycie w istniejącej aplikacji React

Skopiuj `TrackLimitsInfographic.tsx` i zainstaluj `lucide-react`. Projekt powinien mieć React oraz Tailwind CSS. Style charakterystyczne dla infografiki są osadzone w komponencie i ograniczone prefiksem `.tl`; nie trzeba kopiować dodatkowego arkusza CSS. Nie są pobierane obrazy, fonty ani dane z sieci.

```tsx
import TrackLimitsInfographic from './TrackLimitsInfographic';

export default function App() {
  return <TrackLimitsInfographic />;
}
```

## Interakcje

- Cztery gotowe scenariusze i ciągły suwak. Kontakt każdej opony jest obliczany z tej samej geometrii co rysunek, z uwzględnieniem obrotu bolidu i zaokrągleń opon. Scenariusz „Na żyletki” zostawia dokładnie jedną oponę na granicy.
- Lupa kontaktu z białą linią, status FIA i telemetria czterech opon.
- Kwalifikacje, wyścig oraz trwała przewaga. Licznik obsługuje również więcej niż pięć wykroczeń; każde od czwartego dodaje 5 sekund. Symulator kar jest niezależny od wizualizatora.
- Obsługa klawiatury, komunikaty `aria-live`, tekstowe odpowiedniki kolorów i `prefers-reduced-motion`.

## Źródła i interpretacja

- [FIA 2026 Sporting Regulations, Issue 09, art. B1.8.6](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf).
- [FIA 2026 Penalty Guidelines, v01](https://api.fia.com/sites/default/files/2026_f1_penalty_guidelines.pdf).
- [FIA 2026 Driving Standards Guidelines, v01, sekcje D i F](https://api.fia.com/sites/default/files/2026_f1_driving_standards_guidelines.pdf).

Skasowanie następnego okrążenia w kwalifikacjach jest warunkowe: zależy od możliwej korzyści i instrukcji dla toru. Oddanie przewagi nie gwarantuje braku kary; decydują sędziowie. Strike’i także zależą od okoliczności. Wytyczne nie zastępują regulaminu. „Styl Antonellego” jest nazwą edukacyjnego scenariusza, a komunikaty Race Control są przykładowe.

## Weryfikacja

Produkcja kompiluje się bez błędów. Przeprowadzono 36 sprawdzeń w Chromium: cztery scenariusze, dokładny styk i przesunięcie o 0,1%, suwak z klawiatury, lupa, eskalacja do siedmiu wykroczeń, oba pozostałe tryby, resety, ograniczenie animacji, brak błędów JavaScript oraz brak poziomego przewijania przy szerokościach 320, 390, 768, 1024 i 1440 px.

Po adaptacji mobilnej wykonano dodatkowe 37 sprawdzeń w Chromium: szerokości 320–844 px, orientacja pionowa i pozioma, pola przycisków i suwaka co najmniej 44×44 px, tekst opisowy co najmniej 14 px, lokalny werdykt przy scenariuszach, skróty nawigacji, dotknięcia oraz syntetyczne poziome i pionowe gesty na suwaku. Poziome przeciągnięcie zmienia pozycję, pionowy gest przewija stronę. Nie testowano na fizycznym telefonie ani w Safari/WebKit.
