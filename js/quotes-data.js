// Original Slovak translations of passages verified in these primary texts.
// Aesop entries are morals in the 1919 collection, not claimed verbatim
// statements by the historical Aesop. Keep IDs/order stable for daily rotation.
const aesop = 'https://www.gutenberg.org/files/19994/19994-h/19994-h.htm';
export const QUOTES = [
  { id: 'kindness', text: 'Láskavosť nikdy nie je zbytočná.', author: 'Ezopove bájky', work: 'Lev a myš', original: 'A kindness is never wasted.', source: aesop },
  { id: 'enthusiasm', text: 'Nič veľké sa nikdy nedosiahlo bez nadšenia.', author: 'Ralph Waldo Emerson', work: 'Essays, First Series · Circles', original: 'Nothing great was ever achieved without enthusiasm.', source: 'https://www.gutenberg.org/cache/epub/2944/pg2944-images.html' },
  { id: 'unity', text: 'V jednote je sila.', author: 'Ezopove bájky', work: 'Zväzok prútov', original: 'In unity is strength.', source: aesop },
  { id: 'tomorrow', text: 'Nie je pekné pomyslieť si, že zajtra je nový deň, v ktorom ešte nie sú žiadne chyby?', author: 'Lucy Maud Montgomeryová', work: 'Anna zo Zeleného domu · 21. kapitola', original: 'Isn’t it nice to think that tomorrow is a new day with no mistakes in it yet?', source: 'https://www.gutenberg.org/cache/epub/45/pg45-images.html' },
  { id: 'gentleness', text: 'Jemnosť a láskavé presviedčanie víťazia tam, kde sila a krik zlyhávajú.', author: 'Ezopove bájky', work: 'Severný vietor a slnko', original: 'Gentleness and kind persuasion win where force and bluster fail.', source: aesop },
  { id: 'help', text: 'Nikto nie je na tomto svete zbytočný, ak niekomu inému uľahčuje jeho bremeno.', author: 'Charles Dickens', work: 'Our Mutual Friend · kniha III, kapitola IX', original: 'No one is useless in this world, who lightens the burden of it for any one else.', source: 'https://www.gutenberg.org/files/883/883-h/883-h.htm' },
  { id: 'steady', text: 'Preteky nevyhráva vždy ten najrýchlejší.', author: 'Ezopove bájky', work: 'Zajac a korytnačka', original: 'The race is not always to the swift.', source: aesop },
  { id: 'rose', text: 'Tam, kde sa staráš o ružu, chlapče, nemôže rásť bodliak.', author: 'Frances Hodgson Burnettová', work: 'Tajná záhrada · 27. kapitola', original: 'Where you tend a rose, my lad, a thistle cannot grow.', source: 'https://www.gutenberg.org/files/113/113-h/113-h.htm' },
  { id: 'deeds', text: 'Schopnosti sa dokazujú činmi.', author: 'Ezopove bájky', work: 'Včely, osy a sršeň', original: 'Ability proves itself by deeds.', source: aesop },
  { id: 'freedom', text: 'Nič nie je také cenné ako sloboda.', author: 'Ezopove bájky', work: 'Vlk a pes', original: 'There is nothing worth so much as liberty.', source: aesop }
];
export function quoteForDay(date = new Date()) {
  // All classrooms use the same Slovak calendar day, including DST changes.
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Bratislava', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const value = type => Number(parts.find(part => part.type === type).value);
  const day = Math.floor(Date.UTC(value('year'), value('month') - 1, value('day')) / 86400000);
  return QUOTES[((day % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
export function createQuoteRotation(initial, random = Math.random) {
  let current = initial;
  const seen = new Set([initial.id]);
  return () => {
    let pool = QUOTES.filter(quote => quote.id !== current.id && !seen.has(quote.id));
    if (!pool.length) {
      seen.clear();
      pool = QUOTES.filter(quote => quote.id !== current.id);
    }
    current = pool[Math.floor(random() * pool.length)];
    seen.add(current.id);
    return current;
  };
}
