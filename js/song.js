import { SONG_SLIDES, slideAt } from './song-data.js';

const dialog = document.createElement('dialog');
dialog.id = 'song-dialog';
dialog.className = 'song-dialog';
dialog.setAttribute('aria-labelledby', 'song-title');
dialog.innerHTML = `<div class="song-window">
  <header class="song-header"><h2 id="song-title">Hymna ZŠ TROJKA</h2><div class="song-tools"><button type="button" id="song-fullscreen" aria-label="Zobraziť na celú obrazovku">Celá obrazovka</button><button type="button" id="song-close" aria-label="Zavrieť pesničku" autofocus>✕</button></div></header>
  <section class="song-stage" aria-label="Text pesničky"><p id="song-section" class="song-section"></p><div id="song-lines" class="song-lines"></div></section>
  <div class="song-controls"><audio id="school-song" controls preload="none" aria-label="Prehrať hymnu ZŠ TROJKA"><source src="media/trojka-hymna.mp3" type="audio/mpeg">Tvoj prehliadač nepodporuje prehrávanie zvuku.</audio>
    <p id="song-error" role="alert" hidden></p>
  </div>
</div>`;
document.body.append(dialog);
const audio = dialog.querySelector('audio');
const fullscreen = dialog.querySelector('#song-fullscreen');
let index = 0;
let opener = null;
let previousOverflow = '';
function showSlide(next) {
  index = Math.max(0, Math.min(SONG_SLIDES.length - 1, next));
  const slide = SONG_SLIDES[index];
  dialog.querySelector('#song-section').textContent = slide.label;
  const lines = dialog.querySelector('#song-lines');
  lines.replaceChildren(...slide.lines.map(line => {
    const p = document.createElement('p');
    p.textContent = line;
    return p;
  }));
}
function sync() {
  const next = slideAt(audio.currentTime);
  if (index !== next) showSlide(next);
}
function showError(message) {
  const error = dialog.querySelector('#song-error');
  error.textContent = message;
  error.hidden = false;
}
export function openSong(button) {
  if (dialog.open) return;
  opener = button;
  showSlide(slideAt(audio.currentTime));
  previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
function closeSong() {
  audio.pause();
  dialog.close();
}
dialog.querySelector('#song-close').addEventListener('click', closeSong);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeSong(); });
dialog.addEventListener('close', () => {
  audio.pause();
  document.body.style.overflow = previousOverflow;
  if (document.fullscreenElement === dialog) document.exitFullscreen?.().catch(() => {});
  dialog.classList.remove('song-expanded');
  updateFullscreen();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => { if (event.target === dialog) closeSong(); });
for (const event of ['timeupdate', 'seeked', 'loadedmetadata', 'ended']) audio.addEventListener(event, sync);
audio.addEventListener('error', () => showError('Pesničku sa nepodarilo načítať. Skontroluj pripojenie a skús ju pustiť znova.'));
audio.querySelector('source').addEventListener('error', () => showError('Pesničku sa nepodarilo načítať. Skontroluj pripojenie a skús ju pustiť znova.'));
audio.addEventListener('playing', () => { dialog.querySelector('#song-error').hidden = true; });
function updateFullscreen() {
  const expanded = document.fullscreenElement === dialog || dialog.classList.contains('song-expanded');
  fullscreen.textContent = expanded ? 'Zmenšiť obrazovku' : 'Celá obrazovka';
  fullscreen.setAttribute('aria-label', expanded ? 'Ukončiť celú obrazovku' : 'Zobraziť na celú obrazovku');
  fullscreen.setAttribute('aria-pressed', String(expanded));
}
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === dialog) await document.exitFullscreen();
    else if (dialog.classList.contains('song-expanded')) dialog.classList.remove('song-expanded');
    else if (dialog.requestFullscreen && document.fullscreenEnabled) await dialog.requestFullscreen();
    else dialog.classList.add('song-expanded');
  } catch {
    // Some mobile browsers only support a full-window presentation.
    dialog.classList.add('song-expanded');
  }
  updateFullscreen();
});
document.addEventListener('fullscreenchange', updateFullscreen);
