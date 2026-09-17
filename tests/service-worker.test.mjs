import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const activities = JSON.parse(await readFile(new URL('../activities.json', import.meta.url), 'utf8'));
const url = 'https://example.com/ranne-kruhy/activities.json';
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

function worker(fetchImpl, { cached = json(activities), failWrite = false, fastTimeout = false } = {}) {
  const listeners = {};
  let saved = cached;
  const cache = {
    match: async key => { assert.equal(key, url); return saved?.clone(); },
    put: async (key, response) => { assert.equal(key, url); if (failWrite) throw Error('Full'); saved = response; }
  };
  const context = vm.createContext({
    URL, Response, AbortController,
    setTimeout: (fn, ms) => { assert.equal(ms, 3000); return setTimeout(fn, fastTimeout ? 5 : ms); },
    clearTimeout,
    fetch: fetchImpl,
    caches: { open: async () => cache },
    self: { location: new URL('https://example.com/ranne-kruhy/sw.js'), addEventListener: (name, fn) => listeners[name] = fn }
  });
  vm.runInContext(source, context);
  return {
    load: () => {
      let result;
      listeners.fetch({ request: { url, method: 'GET' }, respondWith: value => result = value });
      assert.ok(result, 'Subdirectory activities requests must use network-first');
      return result;
    },
    stored: () => saved?.clone(),
    context
  };
}

test('New online activities replace cached data without changing the cache version', async () => {
  const newer = [...activities, { ...activities[0], id: 'new-activity' }];
  const w = worker(async (request, options) => {
    assert.equal(request.url, url);
    assert.equal(options.cache, 'no-store');
    return json(newer);
  });
  assert.deepEqual(await (await w.load()).json(), newer);
  assert.deepEqual(await w.stored().json(), newer);
});

for (const [name, fetchImpl] of [
  ['offline', async () => { throw Error('Offline'); }],
  ['HTTP failure', async () => new Response('Unavailable', { status: 503 })],
  ['invalid JSON', async () => new Response('<html>Error</html>')],
  ['invalid activity', async () => json([{ id: 'broken' }])],
  ['empty list', async () => json([])]
]) test(`${name} preserves and returns the previous offline activities`, async () => {
  const w = worker(fetchImpl);
  assert.deepEqual(await (await w.load()).json(), activities);
  assert.deepEqual(await w.stored().json(), activities);
});

test('Slow connection is aborted at the timeout and uses offline data', async () => {
  let aborted = false;
  const w = worker((request, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(Error('Timeout')); });
  }), { fastTimeout: true });
  assert.deepEqual(await (await w.load()).json(), activities);
  assert.ok(aborted);
});

test('Valid online activities still work when cache storage is full', async () => {
  const w = worker(async () => json(activities), { failWrite: true });
  assert.deepEqual(await (await w.load()).json(), activities);
});

test('Offline without a saved copy returns a network error', async () => {
  const w = worker(async () => { throw Error('Offline'); }, { cached: null });
  assert.equal((await w.load()).type, 'error');
});
