# Swift-bird — wersja 10.5

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
