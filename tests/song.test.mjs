import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { SONG_SLIDES, estimatedCues, slideAt } from '../js/song-data.js';

test('Lyrics preserve both repeated choruses and the distinct closing chorus', () => {
  assert.equal(SONG_SLIDES.length, 15);
  assert.equal(SONG_SLIDES.flatMap(s => s.lines).length, 51);
  assert.deepEqual(SONG_SLIDES.slice(2, 5).map(s => s.lines), SONG_SLIDES.slice(6, 9).map(s => s.lines));
  assert.ok(SONG_SLIDES.flatMap(s => s.lines).includes('Keď prichádza Trojka,'));
  assert.equal(SONG_SLIDES.at(-1).lines.at(-1), 'hej, hej, hej!');
});
test('Estimated slide selection follows the audio time, including backward seeks', () => {
  assert.deepEqual(estimatedCues(NaN), []);
  assert.deepEqual(estimatedCues(0), []);
  const cues = estimatedCues(180);
  assert.equal(cues.length, SONG_SLIDES.length);
  assert.equal(cues[0], 0);
  assert.ok(cues.every((time, i) => !i || time > cues[i - 1]));
  assert.equal(slideAt(cues[4], cues), 4);
  assert.equal(slideAt(cues[2], cues), 2);
  assert.equal(slideAt(180, cues), SONG_SLIDES.length - 1);
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
  const context = vm.createContext({ document, SONG_SLIDES, estimatedCues, slideAt });
  vm.runInContext(source, context);
  const dialog = document.body.children[0];
  const opener = { isConnected: true, focus() { this.focused = true; } };
  context.openerButton = opener;
  return { context, document, dialog, nodes, opener };
}
test('Modal starts paused, manual navigation disables estimates, and close restores focus', () => {
  const p = player();
  vm.runInContext('openSong(openerButton)', p.context);
  assert.equal(p.dialog.open, true);
  assert.equal(p.document.body.style.overflow, 'hidden');
  assert.match(p.dialog.innerHTML, /controls preload="none"/);
  assert.doesNotMatch(p.dialog.innerHTML, /autoplay/);
  p.nodes.get('#song-next').events.get('click')();
  assert.equal(p.nodes.get('#song-auto').checked, false);
  assert.equal(p.nodes.get('#song-section').textContent, '1. sloha');
  p.nodes.get('audio').currentTime = 100;
  p.nodes.get('audio').events.get('timeupdate')();
  assert.equal(p.nodes.get('#song-section').textContent, '1. sloha');
  p.nodes.get('#song-auto').checked = true;
  p.nodes.get('#song-auto').events.get('change')();
  assert.notEqual(p.nodes.get('#song-section').textContent, '1. sloha');
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
