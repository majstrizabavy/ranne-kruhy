import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { SONG_SLIDES, SONG_CUES, slideAt } from '../js/song-data.js';

test('Lyrics preserve both repeated choruses and the distinct closing chorus', () => {
  assert.equal(SONG_SLIDES.length, 16);
  assert.equal(SONG_SLIDES.flatMap(s => s.lines).length, 55);
  assert.equal(SONG_SLIDES[4].lines[1], 'hej, hej, hej, tu sa každý smeje!');
  assert.ok(SONG_SLIDES.flatMap(s => s.lines).includes('Keď prichádza Trojka,'));
  assert.equal(SONG_SLIDES.at(-1).lines.at(-1), 'Hey hey heeey…');
});
test('Fixed cues switch at every supplied boundary and stay on the final outro', () => {
  assert.deepEqual(SONG_CUES, [0,12,28,35,42,57,70,77,85,100,117,123,131,136,146,152]);
  assert.equal(SONG_CUES.length, SONG_SLIDES.length);
  for (let i=1;i<SONG_CUES.length;i++) {
    assert.equal(slideAt(SONG_CUES[i] - .01), i - 1);
    assert.equal(slideAt(SONG_CUES[i]), i);
  }
  assert.equal(slideAt(500), 15);
});

const source = (await readFile(new URL('../js/song.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export function openSong', 'function openSong');
function player() {
  const nodes = new Map();
  function node() {
    const events = new Map(), classes = new Set();
    return { events, children: [], hidden: true, textContent: '', innerHTML: '', currentTime: 0, duration: 180, checked: true,
      style: {}, classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, fn) { events.set(name, fn); },
      querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); },
      append(child) { this.children.push(child); }, replaceChildren(...children) { this.children = children; },
      showModal() { this.open = true; }, close() { this.open = false; events.get('close')?.(); },
      pause() { this.paused = true; }, focus() { this.focused = true; }
    };
  }
  const document = node();
  document.body = node();
  document.body.style.overflow = 'auto';
  document.createElement = node;
  const context = vm.createContext({ document, SONG_SLIDES, SONG_CUES, slideAt });
  vm.runInContext(source, context);
  const dialog = document.body.children[0];
  const opener = { isConnected: true, focus() { this.focused = true; } };
  context.openerButton = opener;
  return { context, document, dialog, nodes, opener };
}
test('Modal follows the recording without manual navigation and close restores focus', () => {
  const p = player();
  vm.runInContext('openSong(openerButton)', p.context);
  assert.equal(p.dialog.open, true);
  assert.equal(p.document.body.style.overflow, 'hidden');
  assert.match(p.dialog.innerHTML, /controls preload="none"/);
  assert.doesNotMatch(p.dialog.innerHTML, /autoplay/);
  assert.doesNotMatch(p.dialog.innerHTML, /song-next|song-prev|song-auto|orientačné/);
  p.nodes.get('audio').currentTime = 57;
  p.nodes.get('audio').events.get('timeupdate')();
  assert.equal(p.nodes.get('#song-section').textContent, '2. sloha');
  p.nodes.get('#song-close').events.get('click')();
  assert.equal(p.nodes.get('audio').paused, true);
  assert.equal(p.dialog.open, false);
  assert.equal(p.document.body.style.overflow, 'auto');
  assert.equal(p.opener.focused, true);
});
test('Fullscreen fallback can be entered and exited, and Escape stops the song', async () => {
  const p = player();
  vm.runInContext('openSong(openerButton)', p.context);
  const button = p.nodes.get('#song-fullscreen');
  await button.events.get('click')();
  assert.equal(p.dialog.classList.contains('song-expanded'), true);
  assert.equal(button['aria-pressed'], 'true');
  await button.events.get('click')();
  assert.equal(p.dialog.classList.contains('song-expanded'), false);
  p.dialog.events.get('cancel')({ preventDefault() {} });
  assert.equal(p.nodes.get('audio').paused, true);
  assert.equal(p.dialog.open, false);
});
test('Native fullscreen state and seek events stay synchronized', async () => {
  const p = player();
  p.document.fullscreenEnabled = true;
  p.dialog.requestFullscreen = async () => { p.document.fullscreenElement = p.dialog; };
  p.document.exitFullscreen = async () => { p.document.fullscreenElement = null; };
  vm.runInContext('openSong(openerButton)', p.context);
  const button = p.nodes.get('#song-fullscreen');
  await button.events.get('click')();
  assert.equal(p.document.fullscreenElement, p.dialog);
  await button.events.get('click')();
  assert.equal(p.document.fullscreenElement, null);
  const audio = p.nodes.get('audio');
  audio.currentTime = 170;
  audio.events.get('seeked')();
  assert.equal(p.nodes.get('#song-section').textContent, 'Záver');
  audio.currentTime = 0;
  audio.events.get('seeked')();
  assert.equal(p.nodes.get('#song-section').textContent, 'Úvod');
});
