'use strict';

/* Deskryptory „potrafię" (can-do) wg oficjalnej tabeli samooceny Rady Europy.
 *
 * Źródło: tabela samooceny CEFR (Common European Framework of Reference),
 * poziomy A1-C2, sprawności: słuchanie, czytanie, porozumiewanie się,
 * samodzielne wypowiadanie się, pisanie.
 *
 * Mapujemy je na pięć sprawności, które mierzy nasz test poziomujący:
 *   grammar (poprawność form) — nie jest osobną sprawnością CEFR, więc
 *     dajemy deskryptor odnoszący się do dokładności językowej;
 *   vocabulary → zasób słów (część produkcji);
 *   reading → czytanie;
 *   meaning → rozumienie znaczeń (słuchanie/czytanie ze zrozumieniem);
 *   communication → porozumiewanie się (interakcja).
 *
 * Deskryptory są sformułowane w pierwszej osobie, jak w oryginale, żeby
 * uczeń mógł je czytać jako opis „to już potrafię".
 */

const CAN_DO = {
  reading: {
    A1: 'Rozumiem znane nazwy, słowa i bardzo proste zdania, np. na tablicach informacyjnych i plakatach.',
    A2: 'Czytam bardzo krótkie, proste teksty i znajduję konkretne informacje w prostych materiałach codziennych, np. ogłoszeniach, rozkładach jazdy.',
    B1: 'Rozumiem teksty składające się głównie z często używanych słów, dotyczące życia codziennego lub pracy.',
    B2: 'Czytam artykuły i reportaże dotyczące współczesnych problemów, w których piszący prezentują określone stanowiska.',
    C1: 'Rozumiem długie i złożone teksty literackie oraz oparte na faktach, dostrzegając różnice stylu.',
    C2: 'Czytam bez trudu wszelkie formy języka pisanego, w tym teksty abstrakcyjne oraz o skomplikowanej strukturze.'
  },
  meaning: {
    A1: 'Rozumiem znane słowa i podstawowe zwroty, gdy ludzie mówią wolno i wyraźnie.',
    A2: 'Rozumiem wyrażenia i słownictwo związane ze sprawami dla mnie ważnymi, np. rodzina, zakupy, praca.',
    B1: 'Rozumiem główne wątki wypowiedzi na znane mi tematy, gdy używa się standardowego języka.',
    B2: 'Rozumiem dłuższe wypowiedzi i wykłady oraz nadążam za skomplikowanymi wywodami na w miarę znane tematy.',
    C1: 'Rozumiem dłuższe wypowiedzi, nawet gdy nie są jasno skonstruowane, a powiązania są jedynie zasugerowane.',
    C2: 'Rozumiem każdą wypowiedź, nawet w szybkim tempie i z użyciem specjalistycznego języka.'
  },
  communication: {
    A1: 'Potrafię prowadzić prostą rozmowę, jeśli rozmówca mówi wolno i jest gotów mi pomóc.',
    A2: 'Porozumiewam się w prostych, rutynowych sytuacjach, wymagających bezpośredniej wymiany zdań na znane tematy.',
    B1: 'Radzę sobie w większości sytuacji, które mogą się zdarzyć w podróży, i włączam się do rozmowy na znane tematy.',
    B2: 'Porozumiewam się na tyle płynnie i spontanicznie, że mogę prowadzić normalną rozmowę z rodzimym użytkownikiem języka.',
    C1: 'Wyrażam myśli płynnie i spontanicznie, sprawnie posługując się językiem w kontaktach towarzyskich i zawodowych.',
    C2: 'Biorę bez trudu udział w każdej rozmowie, trafnie posługując się idiomami i wyrażeniami potocznymi.'
  },
  vocabulary: {
    A1: 'Używam prostych zwrotów i zdań, aby opisać miejsce, w którym mieszkam, i ludzi, których znam.',
    A2: 'Posługuję się zestawem zwrotów i zdań, by opisać rodzinę, innych ludzi, warunki życia i pracę.',
    B1: 'Łączę wyrażenia, by opisać przeżycia, marzenia, nadzieje i zamierzenia oraz krótko uzasadnić opinie.',
    B2: 'Formułuję przejrzyste, szczegółowe wypowiedzi na wiele tematów związanych z moimi zainteresowaniami.',
    C1: 'Przedstawiam jasne, rozbudowane opisy skomplikowanych zagadnień, rozwijając poszczególne myśli.',
    C2: 'Przedstawiam płynny, klarowny wywód w stylu odpowiednim do kontekstu, pomagając odbiorcy zapamiętać najważniejsze treści.'
  },
  grammar: {
    A1: 'Używam podstawowych form i konstrukcji w prostych, wyuczonych zwrotach.',
    A2: 'Stosuję poprawnie proste konstrukcje, choć popełniam podstawowe błędy.',
    B1: 'Posługuję się dość poprawnie zasobem typowych konstrukcji związanych z częstymi sytuacjami.',
    B2: 'Zachowuję dobrą poprawność gramatyczną; błędy zdarzają się rzadko i nie utrudniają zrozumienia.',
    C1: 'Utrzymuję wysoki poziom poprawności; błędy są rzadkie i trudne do zauważenia.',
    C2: 'Panuję nad gramatyką w pełni, nawet w złożonych wypowiedziach, także wtedy, gdy skupiam uwagę na czymś innym.'
  }
};

/* Zwraca deskryptor dla sprawności i poziomu; przy braku poziomu (poniżej A1)
   zwraca zachętę zamiast pustki. */
function canDoFor(area, cefr){
  const byArea = CAN_DO[area];
  if(!byArea) return null;
  if(!cefr) return 'To dobry moment, aby zbudować podstawy w tym obszarze.';
  return byArea[cefr] || null;
}

const AREA_LABELS = {
  grammar: 'Poprawność językowa',
  vocabulary: 'Wypowiedź i słownictwo',
  reading: 'Czytanie',
  meaning: 'Rozumienie',
  communication: 'Porozumiewanie się'
};

if (typeof window !== 'undefined'){
  window.CAN_DO = CAN_DO; window.canDoFor = canDoFor; window.AREA_LABELS = AREA_LABELS;
}
if (typeof module !== 'undefined'){
  module.exports = { CAN_DO, canDoFor, AREA_LABELS };
}
