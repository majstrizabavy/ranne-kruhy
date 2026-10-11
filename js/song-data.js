// Lyrics and cue times supplied by the author after listening.
export const SONG_SLIDES = [
  {
    "label": "Úvod",
    "lines": [
      "Keď prichádza Trojka,",
      "Trojka, kto sme?",
      "Trojka! Moja škola Trojka!"
    ]
  },
  {
    "label": "1. sloha",
    "lines": [
      "Vo Zvolene školu máme,",
      "každé ráno sa vítame.",
      "Ahoj, ahoj, poď sa hrať,",
      "dnes sa budeme zabávať!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Kto? Moja škola Trojka!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Aká je tá naša Trojka?",
      "Najlepšia! Najlepšia!",
      "Pre nás vždy tá najlepšia!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Hej, hej, na Trojke to žije,",
      "hej, hej, hej, tu sa každý smeje!",
      "Moja škola, tvoja škola,",
      "naša Trojka všetkých volá!"
    ]
  },
  {
    "label": "2. sloha",
    "lines": [
      "Všetci spolu držíme,",
      "a silno nám fandíme.",
      "Každý z nás má vlastný sen",
      "o krok bližšie každý deň!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Kto? Moja škola Trojka!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Aká je tá naša Trojka?",
      "Najlepšia! Najlepšia!",
      "Pre nás vždy tá najlepšia!"
    ]
  },
  {
    "label": "Refrén",
    "lines": [
      "Hej, hej, na Trojke to žije,",
      "hej, hej, tu sa každý smeje!",
      "Moja škola, tvoja škola,",
      "naša Trojka všetkých volá!"
    ]
  },
  {
    "label": "Mostík · tlieskanie",
    "lines": [
      "Tlieskaj, tlieskaj, raz, dva, tri,",
      "Trojka žije, raz, dva, tri!",
      "Spievaj, spievaj, ty aj ja,",
      "s kamarátmi sa všetko dá!"
    ]
  },
  {
    "label": "Záverečný refrén",
    "lines": [
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Kto? Moja škola Trojka!"
    ]
  },
  {
    "label": "Záverečný refrén",
    "lines": [
      "Aká je tá naša Trojka?",
      "Najlepšia! Najlepšia!",
      "Pre nás vždy tá najlepšia!"
    ]
  },
  {
    "label": "Záverečný refrén",
    "lines": [
      "Keď prichádza Trojka,",
      "s nami sa zasmej!"
    ]
  },
  {
    "label": "Záverečný refrén",
    "lines": [
      "Hej, hej, na Trojke to žije,",
      "hej, hej, tu sa každý smeje!",
      "Hej, hej, tu sa každý smeje!",
      "Naša Trojka všetkých volá!"
    ]
  },
  {
    "label": "Záver",
    "lines": [
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Trojka, Trojka,",
      "hej, hej, hej!"
    ]
  },
  {
    "label": "Záver",
    "lines": [
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Kto sme? Trojka!",
      "Hey hey heeey…"
    ]
  }
];
// The final untimed outro starts after 2:31 and remains to the end.
export const SONG_CUES = [0,12,28,35,42,57,70,77,85,100,117,123,131,136,146,152];
// Older cached players still import this name during a deployment. Keep the
// export compatible, but return the supplied fixed times instead of estimates.
export function estimatedCues() { return [...SONG_CUES]; }
export function slideAt(time, cues = SONG_CUES) {
  let index = 0;
  for (let i = 1; i < cues.length; i++) {
    if (time < cues[i]) break;
    index = i;
  }
  return index;
}
