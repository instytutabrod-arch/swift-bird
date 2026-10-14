'use strict';

/* Kolokacje biznesowe B2-C2 — sedno nauki słownictwa dla dorosłych.
 *
 * Na tym poziomie uczeń zna już znaczenia słów. Prawdziwa trudność to
 * NATURALNE POŁĄCZENIA: mówi się "reach an agreement", nie "achieve an
 * agreement"; "meet a deadline", nie "fulfill a deadline". Kolokacja
 * odróżnia komunikację płynną od poprawnej-ale-obcej.
 *
 * Każdy wpis:
 *   word      — słowo główne (kotwica)
 *   pl        — polskie znaczenie (dla pewności, nie jako sedno)
 *   cefr      — poziom B2 / C1 / C2
 *   goes      — typowe, naturalne połączenia (to buduje płynność)
 *   example   — słowo w zdaniu, z kontekstem zawodowym
 *   pitfall   — częsty błąd Polaka: co brzmi logicznie, ale jest niepoprawne
 *
 * Podział na zestawy tematyczne, żeby uczeń uczył się partiami.
 */

const COLLOCATION_SETS = [
  {
    id: 'meetings-deals', title: 'Spotkania i umowy', cefr: 'B2',
    words: [
      { word:'agreement', pl:'porozumienie', cefr:'B2',
        goes:['reach an agreement','come to an agreement','reach a mutual agreement','break an agreement'],
        example:'After hours of talks, we finally reached an agreement.',
        pitfall:'Nie „achieve an agreement" — porozumienie się „reach", nie „achieve".' },
      { word:'deadline', pl:'termin', cefr:'B2',
        goes:['meet a deadline','miss a deadline','set a deadline','a tight deadline','extend a deadline'],
        example:'We are working under a tight deadline this quarter.',
        pitfall:'Nie „fulfill a deadline" ani „realize a deadline" — mówi się „meet a deadline".' },
      { word:'proposal', pl:'propozycja, oferta', cefr:'B2',
        goes:['put forward a proposal','submit a proposal','turn down a proposal','a detailed proposal'],
        example:'She put forward a proposal to restructure the team.',
        pitfall:'„Put forward", nie „put front". Odrzucić to „turn down", nie „refuse".' },
      { word:'terms', pl:'warunki', cefr:'B2',
        goes:['negotiate the terms','agree on terms','favourable terms','terms and conditions'],
        example:'We negotiated the terms of the contract for a week.',
        pitfall:'„Agree ON terms", z „on". Bez „on" brzmi niekompletnie.' },
      { word:'commitment', pl:'zobowiązanie', cefr:'C1',
        goes:['make a commitment','honour a commitment','a long-term commitment','a firm commitment'],
        example:'The supplier honoured its commitment despite the delays.',
        pitfall:'Dotrzymać to „honour", nie „keep" w rejestrze formalnym.' }
    ]
  },
  {
    id: 'strategy-growth', title: 'Strategia i rozwój', cefr: 'C1',
    words: [
      { word:'market share', pl:'udział w rynku', cefr:'B2',
        goes:['gain market share','lose market share','capture market share','a significant market share'],
        example:'The new product helped us gain market share quickly.',
        pitfall:'Zdobyć to „gain" lub „capture", nie „win market share".' },
      { word:'revenue', pl:'przychód', cefr:'B2',
        goes:['generate revenue','boost revenue','revenue stream','a drop in revenue'],
        example:'Subscriptions generate steady revenue for the company.',
        pitfall:'„Generate revenue", nie „make revenue" w formalnym rejestrze.' },
      { word:'growth', pl:'wzrost', cefr:'C1',
        goes:['drive growth','sustainable growth','sustain growth','stunt growth','exponential growth'],
        example:'Their strategy is designed to drive sustainable growth.',
        pitfall:'Napędzać to „drive growth", nie „push growth".' },
      { word:'leverage', pl:'wykorzystać, dźwignia', cefr:'C1',
        goes:['leverage resources','leverage expertise','leverage technology','financial leverage'],
        example:'We can leverage our existing network to enter the market.',
        pitfall:'Jako czasownik znaczy „mądrze wykorzystać", nie dosłownie „podnieść dźwignią".' },
      { word:'stakeholder', pl:'interesariusz', cefr:'C1',
        goes:['engage stakeholders','key stakeholders','stakeholder buy-in','align stakeholders'],
        example:'The plan failed because we did not engage key stakeholders.',
        pitfall:'„Buy-in" to poparcie, nie zakup. „Get stakeholder buy-in" = zdobyć poparcie.' },
      { word:'to scale', pl:'skalować', cefr:'C1',
        goes:['scale up','scale a business','scale operations','scale rapidly'],
        example:'The challenge now is to scale the business without losing quality.',
        pitfall:'„Scale up" = rosnąć w skali. Nie mylić z „escalate" (eskalować problem).' }
    ]
  },
  {
    id: 'negotiation-influence', title: 'Negocjacje i wpływ', cefr: 'C2',
    words: [
      { word:'concession', pl:'ustępstwo', cefr:'C1',
        goes:['make a concession','offer a concession','extract a concession','a major concession'],
        example:'Neither side was willing to make the first concession.',
        pitfall:'Zrobić ustępstwo to „make a concession", nie „do a concession".' },
      { word:'leverage', pl:'przewaga negocjacyjna', cefr:'C2',
        goes:['have leverage','gain leverage','use leverage','considerable leverage'],
        example:'With three offers on the table, she had real leverage.',
        pitfall:'W negocjacjach „leverage" to przewaga, siła przetargowa, nie „advantage".' },
      { word:'to concede', pl:'przyznać, ustąpić', cefr:'C2',
        goes:['concede a point','concede ground','reluctantly concede','concede defeat'],
        example:'He reluctantly conceded that the objection was valid.',
        pitfall:'„Concede a point" = przyznać rację w jednej kwestii, nie poddać się całkowicie.' },
      { word:'to reconcile', pl:'pogodzić', cefr:'C2',
        goes:['reconcile differences','reconcile two positions','hard to reconcile','reconcile with'],
        example:'It was difficult to reconcile the two departments\u2019 priorities.',
        pitfall:'Pogodzić sprzeczne rzeczy to „reconcile", nie „agree" ani „connect".' },
      { word:'to underpin', pl:'stanowić podstawę', cefr:'C2',
        goes:['underpin a strategy','underpin an argument','firmly underpin','underpin growth'],
        example:'Solid data underpins every recommendation in the report.',
        pitfall:'„Underpin" = stanowić fundament czegoś. Nie mylić z „undermine" (podkopać) — to przeciwieństwo.' },
      { word:'caveat', pl:'zastrzeżenie', cefr:'C2',
        goes:['add a caveat','an important caveat','with one caveat','a significant caveat'],
        example:'I support the plan, with one caveat about the timeline.',
        pitfall:'„Caveat" to formalne zastrzeżenie, nie zwykłe „but". Podnosi rejestr wypowiedzi.' }
    ]
  }
];

if (typeof window !== 'undefined'){
  window.COLLOCATION_SETS = COLLOCATION_SETS;
}
if (typeof module !== 'undefined'){
  module.exports = { COLLOCATION_SETS };
}
