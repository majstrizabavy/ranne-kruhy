// Text supplied by the school. Automatic timing is a duration-based estimate,
// not a transcription or a verified alignment with the recording.
const chorus = [
  ['Kto sme? Trojka!', 'Kto sme? Trojka!', 'Kto? Moja škola Trojka!'],
  ['Aká je tá naša Trojka?', 'Najlepšia! Najlepšia!', 'Pre nás vždy tá najlepšia!'],
  ['Hej, hej, na Trojke to žije,', 'hej, hej, tu sa každý smeje!', 'Moja škola, tvoja škola,', 'naša Trojka všetkých volá!']
];
const blocks = (label, lines) => lines.map(lines => ({ label, lines }));
export const SONG_SLIDES = [
  ...blocks('Úvod', [chorus[0]]),
  ...blocks('1. sloha', [['Vo Zvolene školu máme,', 'každé ráno sa vítame.', 'Ahoj, ahoj, poď sa hrať,', 'dnes sa budeme zabávať!']]),
  ...blocks('Refrén', chorus),
  ...blocks('2. sloha', [['Všetci spolu držíme,', 'a silno nám fandíme.', 'Každý z nás má vlastný sen,', 'o krok bližšie každý deň!']]),
  ...blocks('Refrén', chorus),
  ...blocks('Mostík · tlieskanie', [['Tlieskaj, tlieskaj, raz, dva, tri,', 'Trojka žije, raz, dva, tri!', 'Spievaj, spievaj, ty aj ja,', 's kamarátmi sa všetko dá!']]),
  ...blocks('Záverečný refrén', [chorus[0], chorus[1], ['Keď prichádza Trojka,', 's nami sa zasmej!'], ['Hej, hej, na Trojke to žije,', 'hej, hej, tu sa každý smeje!', 'Hej, hej, tu sa každý smeje!', 'Naša Trojka všetkých volá!']]),
  ...blocks('Záver', [['Kto sme? Trojka!', 'Kto sme? Trojka!', 'Trojka, Trojka,', 'hej, hej, hej!']])
];
export function estimatedCues(duration) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const total = SONG_SLIDES.reduce((sum, slide) => sum + slide.lines.length, 0);
  let lines = 0;
  return SONG_SLIDES.map(slide => {
    const start = duration * lines / total;
    lines += slide.lines.length;
    return start;
  });
}
export function slideAt(time, cues) {
  let index = 0;
  for (let i = 1; i < cues.length; i++) {
    if (time < cues[i]) break;
    index = i;
  }
  return index;
}
