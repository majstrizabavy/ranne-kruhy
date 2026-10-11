import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { QUOTES, quoteForDay } from '../js/quotes-data.js';

test('Every curated quote has its original passage and a primary source', () => {
  assert.equal(QUOTES.length, 10);
  assert.equal(new Set(QUOTES.map(q => q.id)).size, QUOTES.length);
  for (const q of QUOTES) {
    for (const field of ['text', 'author', 'work', 'original']) assert.ok(q[field].trim());
    assert.equal(new URL(q.source).hostname, 'www.gutenberg.org');
  }
});
test('Daily quote is stable within the Slovak day and changes at Slovak midnight', () => {
  assert.equal(quoteForDay(new Date('2026-10-11T00:00:00Z')), quoteForDay(new Date('2026-10-11T21:59:59Z')));
  assert.notEqual(quoteForDay(new Date('2026-10-11T21:59:59Z')), quoteForDay(new Date('2026-10-11T22:00:00Z')));
  assert.notEqual(quoteForDay(new Date('2026-12-01T22:59:59Z')), quoteForDay(new Date('2026-12-01T23:00:00Z')));
});
test('Rotation does not repeat before the full collection, even across DST', () => {
  const days = Array.from({ length: QUOTES.length }, (_, i) => quoteForDay(new Date(Date.UTC(2026, 9, 20 + i, 12))).id);
  assert.equal(new Set(days).size, QUOTES.length);
  assert.equal(quoteForDay(new Date('2026-10-25T00:30:00Z')), quoteForDay(new Date('2026-10-25T01:30:00Z')));
});
test('Quote dialog opens only on request, renders safe text, and restores focus on close', async () => {
  const nodes = new Map();
  function node() {
    return { innerHTML: '', textContent: '', events: new Map(),
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this.events.set(name, callback); },
      querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); },
      showModal() { this.open = true; }, close() { this.open = false; this.events.get('close')(); }
    };
  }
  let dialog;
  const document = { createElement: node, body: { style: { overflow: 'auto' }, append(child) { dialog = child; } } };
  const quote = { text: '<img onerror=bad> Láskavosť.', author: 'Autor', source: 'https://www.gutenberg.org/', work: 'Dielo' };
  const opener = { isConnected: true, focus() { this.focused = true; } };
  const source = (await readFile(new URL('../js/quotes.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace('export function openQuote', 'function openQuote');
  const context = vm.createContext({ document, quoteForDay: () => quote, openerButton: opener });
  vm.runInContext(source, context);
  assert.ok(!dialog.open);
  vm.runInContext('openQuote(openerButton)', context);
  assert.equal(dialog.open, true);
  assert.equal(nodes.get('#daily-quote').textContent, quote.text);
  assert.equal(nodes.get('#daily-quote').innerHTML, '');
  assert.doesNotMatch(dialog.innerHTML, /quote-source|quote-footer|Slovenský preklad/);
  assert.equal(document.body.style.overflow, 'hidden');
  nodes.get('#quote-close').events.get('click')();
  assert.equal(dialog.open, false);
  assert.equal(opener.focused, true);
  assert.equal(document.body.style.overflow, 'auto');
  vm.runInContext('openQuote(openerButton)', context);
  dialog.events.get('click')({ target: dialog });
  assert.equal(dialog.open, false);
});
