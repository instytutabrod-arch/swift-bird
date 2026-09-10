# Swift-bird — wersja 11.0

Szkolna aplikacja internetowa do nauki angielskich słów. Uczniowie logują się
bez adresu e-mail: imieniem, pierwszą literą nazwiska i indywidualnym
4-cyfrowym PIN-em. W fazie testowej mogą sami zakładać konta. Postępy są przechowywane w PostgreSQL i działają na różnych
urządzeniach po zalogowaniu na to samo konto.

## Co zawiera aplikacja

- 500 unikalnych słów podzielonych na 25 sekcji po 20 słów;
- pierwsza sekcja jest otwarta, kolejne są zablokowane;
- nowe słowo wymaga jednej poprawnej próby wymowy, a następnie ręcznego
  wpisania poprawnego słowa spośród czterech podpowiedzi;
- po poprawnym wpisaniu aplikacja odtwarza słowo i losową angielską pochwałę;
- na egzaminie trafiona para odtwarza samo słowo, bez pochwały;
- po zebraniu 20 słów uczeń zdaje egzamin: 4 rundy po 5 par;
- egzamin ma dwie kolumny, piktogramy i słowa, a oba elementy można
  odsłuchać; poprawna para odtwarza samo słowo, błędna mówi `Try again`;
- dopiero zdany egzamin odblokowuje następną sekcję;
- panel administratora tworzy konta, pokazuje postępy i generuje nowy PIN;
- panel ma tryb testowy: przejście całej ścieżki ucznia z pominięciem
  mikrofonu, wpisywania i rund egzaminu, przy wszystkich sekcjach otwartych;
- uczeń może też sam założyć konto i wymyślić własny PIN, o ile zmienna
  `ALLOW_SELF_REGISTRATION` nie jest ustawiona na `0`.

PIN jest pokazywany tylko po utworzeniu konta albo po resecie. W bazie znajduje
się wyłącznie jego solony skrót kryptograficzny, dlatego administrator powinien
od razu skopiować, zapisać lub wydrukować dane dla ucznia. Reset unieważnia
poprzedni PIN i wylogowuje aktywne sesje tego ucznia.

## Wymagane zmienne

| Zmienna | Znaczenie |
|---|---|
| `DATABASE_URL` | adres bazy PostgreSQL |
| `ADMIN_PASSWORD` | hasło panelu administratora, minimum 12 znaków |
| `PORT` | ustawiany automatycznie przez Railway; lokalnie domyślnie `8080` |
| `ALLOW_SELF_REGISTRATION` | `0` wyłącza samodzielne zakładanie kont; domyślnie włączone |

Serwer sam tworzy wymagane tabele przy pierwszym uruchomieniu.

## Wdrożenie na istniejącej usłudze Railway

1. W projekcie Railway wybierz **+ New → Database → PostgreSQL**.
2. W usłudze `swift-bird`, w zakładce **Variables**, dodaj:
   - `DATABASE_URL` jako odwołanie do `DATABASE_URL` usługi PostgreSQL
     (zwykle `${{Postgres.DATABASE_URL}}`);
   - `ADMIN_PASSWORD` jako własne, długie hasło administratora.
3. Opcjonalnie ustaw healthcheck na `/api/health`.
4. Z katalogu nadrzędnego wyślij tę wersję:

```bash
railway up ./swift-bird --path-as-root -s swift-bird
```

Jeżeli rozpakowany katalog na Macu nazywa się `swift-bird-v10.1`, użyj jego pełnej
ścieżki zamiast `./swift-bird`. Istniejąca domena Railway pozostaje bez zmian.

Po wdrożeniu otwórz `/`, wybierz **Panel administratora**, zaloguj się hasłem z
`ADMIN_PASSWORD`, utwórz pierwszego ucznia i zapisz wygenerowany PIN.

## Moduły

Aplikacja realizuje pięć poziomów taksonomii Blooma, zgodnie z układem
wymagań edukacyjnych dla klasy 4. Poziom szósty (tworzenie i ewaluacja)
jest świadomie odłożony, bo ocena swobodnych tekstów dziecka wymaga modelu
językowego albo przeglądu przez nauczyciela.

| Moduł | Poziom | Plik z treścią | Na czym polega |
|---|---|---|---|
| M1 Kolekcja słów | zapamiętanie | `words.js` | 500 słów, wymowa, pisownia, powtórki, egzamin par |
| M2 Klocki zdań | zrozumienie | `patterns.js` | 7 wzorców, 70 zdań; cała gramatyka klasy 4 bez reguł na ekranie |
| M3 Historyjki | zrozumienie | `stories.js` | 8 tekstów; pytanie o główną myśl i o szczegół |
| M4 Sytuacje | zastosowanie | `dialogues.js` | 8 dialogów, 24 tury; odpowiedź głosem, pełnym zdaniem |
| M5 Detektyw | analiza | `errors.js` | 20 błędów z uzasadnieniem, 6 porównań, 6 układanek |

Zasady, na których to stoi, opisuje osobny dokument metodologiczny.
Trzy najważniejsze konsekwencje w kodzie:

- **Chunki przed regułami.** M2 nie pokazuje żadnej reguły gramatycznej.
  Dziecko widzi zdanie wzorcowe i układa kolejne. Nazwy czasów pojawiają się
  dopiero w M5, gdy trzeba ich użyć do uzasadnienia.
- **Informacja zwrotna, która nie wyręcza.** Po błędzie najpierw sygnał, potem
  podpowiedź kierunkowa, dopiero po kilku próbach poprawna odpowiedź.
- **Bank błędów zasilany własnymi pomyłkami.** Każdy błąd w M2 i M4 trafia do
  rejestru (`state.mistakes`, ostatnie 60) i wraca do dziecka jako zadanie
  w M5. Dlatego rejestracja błędów powstała razem z M2, a nie dopiero z M5.

## Sesja

Sesja ma twardy limit **25 minut** i dzieli się na trzy etapy plus
podsumowanie, bo dwadzieścia pięć minut jednego typu zadania to dla
dziesięciolatki za dużo: po kilkunastu minutach spada jakość odpowiedzi.

| Etap | Budżet | Zawartość |
|---|---|---|
| Rozgrzewka | 5 min | powtórki słów |
| Rdzeń | 12 min | klocki zdań, historyjka albo dialog, przeplecione ze słowami |
| Domknięcie | 6 min | detektyw: błędy, porównania, układanki |

Między etapami jest ekran przerwy z kolejnym przystankiem wyprawy. Obok pełnej
sesji dostępny jest przycisk **Mam tylko chwilę**, czyli osiem minut.
Każdy ukończony etap zapisuje się osobno, więc przerwanie niczego nie kasuje.

Moduły odblokowują się stopniowo: klocki zdań po 12 słowach, historyjki po 25
słowach i 5 poprawnych zdaniach, dialogi po 40 słowach i 12 zdaniach,
detektyw po 20 zdaniach albo 6 zarejestrowanych błędach.

## Nagrody

Rama fabularna: **wyprawa jerzyka z Jerzykowa na Tasmanię**, 25 przystanków,
po jednym na sekcję. Zdany egzamin przenosi ptaka dalej i odsłania fakt
o miejscu. Sama wyprawa jest wymyślona, ale każdy fakt jest prawdziwy;
przystanek 13 mówi wprost, że jerzyk z polskich dachów leci do Afryki,
a do Australii dolatuje igłosternik białogardły.

Trzy zasady, których kod pilnuje testami:

1. **Piórka wyłącznie za rzeczy trudne**, nigdy za czas spędzony w aplikacji.
   Nagradzanie samej obecności uczy przesiadywania, nie uczenia się.
2. **Nagroda odsłania treść, nie ozdobniki.**
3. **Zero rankingów między dziećmi.** Porównania szkodzą słabszym, a silniejszym
   niczego nie dodają.

Odznaki (`Pierwsza setka`, `Bez potknięcia`, `Detektyw`, `Rozmówca`,
`Złote słowo`, `Budowniczy zdań`, `Wytrwałość`) są za konkretne dokonania,
nie za frekwencję. Wyzwanie dnia zmienia się codziennie i mieści się
w zwykłej sesji.

## Głos

Aplikacja sama wybiera kobiecy głos angielski z tych, które ma system.
Interfejs przeglądarki nie udostępnia informacji o płci głosu, więc jedyną
drogą jest rozpoznanie po nazwie. Punktacja premiuje znane głosy kobiece
(Google UK English Female, Samantha, Hazel, Karen, Sonia), odrzuca męskie
i lekko preferuje akcent brytyjski. Dopasowanie działa na całych słowach,
bo inaczej fragment `male` trafiałby w nazwę `Female`.

Wybrany głos widać w panelu administratora, w karcie **Diagnostyka**, razem
z przyciskiem **Posłuchaj głosu**. Jeśli panel pokazuje, że kobiecego głosu
nie znaleziono, żadne sortowanie tego nie naprawi: trzeba doinstalować dane
głosowe w systemie, na Androidzie przez Ustawienia, Tekst na mowę, silnik
Google, English (United Kingdom).

## Tryb testowy

Panel administratora, karta **Diagnostyka**, przycisk **Wejdź w tryb testowy**.
Otwiera ścieżkę ucznia z przyciskami pomijania: wymowy, wpisywania i rundy
egzaminu. Dodatkowo, dopóki sekcja nie ma 20 słów, dostępny jest przycisk
**Uzupełnij sekcję do 20 słów**. Wszystkie 25 sekcji jest odblokowanych.

Tryb testowy nie omija bramki egzaminu. Egzamin zawsze wymaga 20 zebranych
słów w sekcji, także dla administratora: skrót uzupełnia sekcję, po czym
egzamin otwiera się tą samą drogą co u ucznia. Dzięki temu test sprawdza
realny warunek, a nie ścieżkę, której uczeń nigdy nie przejdzie.

Tryb jest zamknięty dla uczniów na dwa niezależne sposoby. Warunkiem włączenia
jest rola `admin` w sesji po stronie serwera, a nie sama flaga po stronie
przeglądarki. Do tego `saveProgress` odrzuca zapis dla każdej roli innej niż
`student`, więc klikanie w trybie testowym nie zmienia żadnego konta ucznia,
nawet gdyby pierwsza zapora zawiodła.

## Uruchomienie i testy lokalne

Wymagany jest Node.js 20+ i dostępna baza PostgreSQL:

```bash
npm ci
DATABASE_URL="postgresql://..." ADMIN_PASSWORD="minimum-12-znakow" npm start
```

Testy:

```bash
npm test
```

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | interfejs aplikacji |
| `app.js` | nauka, wymowa, egzaminy, panel i synchronizacja |
| `words.js` | 25 sekcji i 500 słów z piktogramami |
| `styles.css` | wygląd na tablet, telefon i komputer |
| `server.js` | logowanie, rejestracja, sesje, konta, postępy i pliki statyczne |
| `patterns.js`, `stories.js`, `dialogues.js`, `errors.js` | treści modułów M2 do M5 |
| `journey.js` | 25 przystanków wyprawy, po jednym na sekcję |
| `Dockerfile` | produkcyjny obraz Node dla Railway |
| `sw.js`, `manifest.webmanifest` | instalowalna aplikacja PWA |
| `.env.example` | przykładowe nazwy zmiennych do pracy lokalnej |

## Ważne ograniczenia

- Sprawdzanie wymowy korzysta z mechanizmu rozpoznawania mowy przeglądarki.
  W Chrome wymaga HTTPS, internetu i zgody na mikrofon. Wymagana jest dokładna
  zgodność rozpoznanego słowa ze wzorcem, sprawdzana na pięciu wariantach
  rozpoznania. Nie jest to profesjonalna analiza fonetyczna.
- Aplikacja nigdy nie pokazuje dziecku surowej transkrypcji, która nie jest
  szukanym słowem. Silnik rozpoznawania potrafi bowiem zwrócić wulgaryzm przy
  dziecięcej wymowie niewinnego słowa, na przykład `horse`. Dodatkowo działa
  lista blokowanych słów.
- Ograniczanie prób logowania trzyma licznik w pamięci procesu, więc restart
  usługi go zeruje. Do zamknięcia przed wyjściem z fazy testowej: licznik
  nieudanych prób w tabeli `students` i blokada konta zamiast blokady adresu.
- Pełna praca wymaga internetu, ponieważ logowanie i postępy korzystają z bazy.
- Aplikacja jest w fazie testowej. Przed użyciem w prawdziwej szkole wymaga
  uporządkowania podstaw przetwarzania danych dzieci: umowy powierzenia
  przetwarzania, retencji, kopii zapasowych oraz wyłączenia samodzielnej
  rejestracji zmienną `ALLOW_SELF_REGISTRATION=0`.
- Samodzielna rejestracja jest z natury otwarta: każdy, kto zna adres, może
  utworzyć konto. Na czas testów to wygoda, na produkcji zagrożenie.
