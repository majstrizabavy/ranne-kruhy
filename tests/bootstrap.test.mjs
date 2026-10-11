import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('Module loading failure still registers updates and presents a reload button', async () => {
  const source = (await readFile(new URL('../js/bootstrap.js', import.meta.url), 'utf8')).replace("import('./app.js')", 'loadApp()');
  const events = new Map();
  const app = { innerHTML: '', setAttribute(name, value) { this[name] = value; } };
  let reloadClick, registered, reloaded = false;
  const context = vm.createContext({
    navigator: { serviceWorker: { register: async url => { registered = url; } } },
    window: { addEventListener: (name, fn) => events.set(name, fn), location: { reload() { reloaded = true; } } },
    document: { querySelector: selector => selector === '#app' ? app : { addEventListener(name, fn) { reloadClick = fn; } } },
    loadApp: () => Promise.reject(Error('Mixed cached modules'))
  });
  vm.runInContext(source, context);
  await Promise.resolve();
  assert.match(app.innerHTML, /Obnoviť stránku/);
  assert.equal(app['aria-busy'], 'false');
  events.get('load')();
  assert.equal(registered, './sw.js');
  reloadClick();
  assert.equal(reloaded, true);
});
