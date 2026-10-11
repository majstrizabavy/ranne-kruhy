import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../js/core.js';
import { createActivityHistory, HISTORY_KEY } from '../js/history.js';

const source = (await readFile(new URL('../js/app.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
import { data } from './fixtures.mjs';

function app(saved = new Map()) {
  const windowEvents = new Map();
  const callbacks = new Map();
  let sequence = 0;
  const elements = new Map();
  function element() {
    return { innerHTML: '', textContent: '', childNodes: [], classList: { add() {} },
      setAttribute() {}, addEventListener() {}, append() {}, focus() {}, animate() {},
      querySelector: () => element(), querySelectorAll: () => [] };
  }
  const context = vm.createContext({
    ...core, createActivityHistory,
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    document: { querySelector: selector => { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); }, createElement: element },
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }), scrollTo() {}, addEventListener: (name, callback) => windowEvents.set(name, callback) },
    navigator: {}, fetch: async () => ({ ok: true, json: async () => data }),
    setTimeout: (fn, ms) => { callbacks.set(++sequence, { fn, ms }); return sequence; },
    clearTimeout: id => callbacks.delete(id)
  });
  vm.runInContext(source, context);
  // Set the loaded fixture synchronously for precise animation control.
  context.fixture = data;
  vm.runInContext('activities = fixture;', context);
  return { context, saved, callbacks, elements, windowEvents };
}

test('Install button stays on home and provides device-specific manual help', () => {
  const a = app();
  vm.runInContext("home();", a.context);
  const html = a.elements.get('#app').innerHTML;
  assert.ok(html.indexOf('data-action="favorites"') < html.indexOf('data-action="install"'));
  assert.match(html, /id="install-help" class="install-help" hidden/);
  assert.match(vm.runInContext("navigator.userAgent='iPhone'; installInstructions();", a.context), /Safari.*Pridať na plochu/);
  assert.match(vm.runInContext("navigator.userAgent='Android'; installInstructions();", a.context), /Chrome/);
  vm.runInContext("installed=true; home();", a.context);
  assert.match(a.elements.get('#app').innerHTML, /aria-controls="install-help" hidden/);
  vm.runInContext("screen='choose'; render();", a.context);
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /data-action="install"/);
});

test('Song opens from a compact home button without an inline player', () => {
  const a = app();
  vm.runInContext('home();', a.context);
  const html = a.elements.get('#app').innerHTML;
  assert.match(html, /data-action="song" aria-haspopup="dialog"/);
  assert.match(html, /Zaspievajme<br>si/);
  assert.match(html, /data-action="quote" aria-haspopup="dialog"/);
  assert.ok(html.indexOf('data-action="song"') < html.indexOf('data-action="quote"'));
  assert.doesNotMatch(html, /<audio|song-panel/);
  vm.runInContext("screen='choose'; render();", a.context);
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /data-action="song"/);
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /data-action="quote"/);
});

test('Native install prompt is triggered by click and dismissal permits another later prompt', async () => {
  const a = app();
  let prompted = 0, prevented = 0;
  const event = { preventDefault() { prevented++; }, async prompt() { prompted++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
  a.windowEvents.get('beforeinstallprompt')(event);
  assert.equal(prevented, 1);
  assert.equal(prompted, 0);
  a.context.installButton = { disabled: false };
  await vm.runInContext('installApp(installButton)', a.context);
  assert.equal(prompted, 1);
  assert.equal(a.context.installButton.disabled, false);
  assert.equal(vm.runInContext('installed', a.context), false);
  a.windowEvents.get('beforeinstallprompt')({ ...event, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  await vm.runInContext('installApp(installButton)', a.context);
  assert.equal(prompted, 2);
  assert.equal(vm.runInContext('installed', a.context), true);
});

test('Manual instructions toggle inline and external installation hides the action', async () => {
  const a = app();
  const help = { hidden: true };
  const button = { hidden: false, setAttribute(name, value) { this[name] = value; } };
  a.elements.get('#app').querySelector = selector => selector === '#install-help' ? help : button;
  a.context.installButton = button;
  await vm.runInContext('installApp(installButton)', a.context);
  assert.equal(help.hidden, false);
  assert.equal(button['aria-expanded'], 'true');
  await vm.runInContext('installApp(installButton)', a.context);
  assert.equal(help.hidden, true);
  a.windowEvents.get('appinstalled')();
  assert.equal(button.hidden, true);
  assert.equal(help.hidden, true);
});

test('Home exposes one shared favorites entry and details use the actual activity grade', () => {
  const a = app();
  vm.runInContext("grade=1; favorites=fixture.filter(a=>a.gradeLevel===2).map(a=>a.id); home();", a.context);
  const homeHtml = a.elements.get('#app').innerHTML;
  assert.equal((homeHtml.match(/data-action="favorites"/g) || []).length, 1);
  assert.ok(homeHtml.indexOf('data-value="2"') < homeHtml.indexOf('data-action="favorites"'));
  assert.match(homeHtml, /aria-label="Moje obľúbené, počet aktivít: 28"/);
  assert.match(homeHtml, /class="tile-count" aria-hidden="true">28<\/span>/);
  assert.match(homeHtml, /<footer class="site-footer">/);
  assert.match(homeHtml, /href="https:\/\/christianalex\.sk\/" target="_blank" rel="noopener noreferrer"/);
  assert.match(homeHtml, /src="media\/christian-alex-logo\.png"/);
  assert.match(homeHtml, /Vytvoril:<br><strong>Mgr\. Christián Vaľko<\/strong>/);
  vm.runInContext("filter={kind:'favorites'}; choose();", a.context);
  assert.equal(vm.runInContext('current.gradeLevel', a.context), 2);
  assert.match(a.elements.get('#app').innerHTML, /Výber z obľúbených · 2\. stupeň/);
  assert.match(a.elements.get('#app').innerHTML, /Späť na úvod/);
  assert.equal(a.elements.get('#change-grade').hidden, true);
  vm.runInContext("screen='choose'; filter={kind:'all'}; render();", a.context);
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /data-action="favorites"/);
});

test('Cancelled animation records nothing; reveal records once and favorite redraw does not', () => {
  const a = app();
  vm.runInContext('choose(900);', a.context);
  assert.equal(a.saved.has(HISTORY_KEY), false);
  vm.runInContext('home();', a.context);
  assert.equal(a.callbacks.size, 0);
  assert.equal(a.saved.has(HISTORY_KEY), false);
  vm.runInContext('choose(900);', a.context);
  const pending = [...a.callbacks.values()].find(timer => timer.ms === 900);
  assert.ok(pending);
  pending.fn();
  const first = a.saved.get(HISTORY_KEY);
  assert.equal(Object.keys(JSON.parse(first).lastSeen).length, 1);
  vm.runInContext('render(false);', a.context);
  assert.equal(a.saved.get(HISTORY_KEY), first);
});

test('App reopening and changing filters keeps history while favorites remain random', () => {
  const a = app();
  vm.runInContext("grade=1; filter={kind:'category', value:'upokojenie'}; choose();", a.context);
  const firstId = vm.runInContext('current.id', a.context);
  const reopened = app(a.saved);
  vm.runInContext("grade=1; filter={kind:'all'}; choose();", reopened.context);
  assert.notEqual(vm.runInContext('current.id', reopened.context), firstId);
  assert.equal(Object.keys(JSON.parse(a.saved.get(HISTORY_KEY)).lastSeen).length, 2);
  reopened.context.favoriteId = firstId;
  vm.runInContext("favorites=[favoriteId]; filter={kind:'favorites'}; choose();", reopened.context);
  assert.equal(vm.runInContext('current.id', reopened.context), firstId);
  assert.equal(JSON.parse(a.saved.get(HISTORY_KEY)).lastSeen[firstId], 3);
});

test('Empty catalogue supports navigation and detail renders two closed disclosures', () => {
  const a = app();
  vm.runInContext("activities=[]; choose();", a.context);
  assert.equal(vm.runInContext('screen', a.context), 'empty');
  vm.runInContext('home();', a.context);
  assert.equal(vm.runInContext('screen', a.context), 'home');
  vm.runInContext("activities=fixture; grade=2; filter={kind:'category', value:'komunikacia'}; choose(); choose();", a.context);
  assert.equal(vm.runInContext('current.gradeLevel', a.context), 2);
  assert.equal(vm.runInContext('current.filter', a.context), 'komunikacia');
  const html = a.elements.get('#app').innerHTML;
  assert.equal((html.match(/<details>/g) || []).length, 2);
  assert.doesNotMatch(html, /<details open|<small>Tempo/);
  assert.match(html, /Typ aktivity/);
  assert.match(html, /Pomôcky/);
});

test('Blocked storage reports failure instead of claiming persistence', () => {
  const a = app();
  vm.runInContext("localStorage.setItem = () => { throw Error('Blocked'); };", a.context);
  assert.equal(vm.runInContext("save('rk-favorites-v2', ['001'])", a.context), false);
  assert.match(a.elements.get('#status').textContent, /nepovolil uloženie/);
  const b = app();
  assert.equal(vm.runInContext("save('rk-favorites-v2', ['001'])", b.context), true);
  assert.equal(b.saved.get('rk-favorites-v2'), '["001"]');
});
