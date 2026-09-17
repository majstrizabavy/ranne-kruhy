const CACHE = 'ranne-kruhy-v11';
const ASSETS = ['./','./index.html','./styles.css','./js/app.js','./js/core.js','./js/history.js','./activities.json','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const ACTIVITIES_URL = new URL('./activities.json', self.location.href).href;

function validateActivities(data) {
  const types = ['Rozhovor', 'Pohyb', 'Skupiny', 'Dvojice', 'Premýšľanie', 'Improvizácia', 'Tvorenie', 'Pre zábavu', 'Spoznávanie sa', 'Kvíz', 'Žiaci vedú aktivitu'];
  const ids = new Set();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  if (!Array.isArray(data) || !data.length) throw new Error('Empty activities');
  for (const activity of data) {
    if (!activity || !text(activity.id) || ids.has(activity.id) || !text(activity.title) ||
        ![1, 2].includes(activity.gradeLevel) || !['pokojné', 'živé'].includes(activity.tempo) ||
        !Array.isArray(activity.types) || !activity.types.length || activity.types.some(type => !types.includes(type)) ||
        !text(activity.materials) || !Array.isArray(activity.steps) || !activity.steps.length ||
        activity.steps.length > 4 || !activity.steps.every(text)) throw new Error('Invalid activity');
    ids.add(activity.id);
  }
}

async function loadActivities(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    // Bypass the browser HTTP cache as well as the service worker cache.
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Activities request failed');
    validateActivities(await response.clone().json());
    clearTimeout(timeout);
    // A storage failure must not prevent using a valid online response.
    try {
      const cache = await caches.open(CACHE);
      await cache.put(ACTIVITIES_URL, response.clone());
    } catch { /* Offline storage may be unavailable or full. */ }
    return response;
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(ACTIVITIES_URL)) || Response.error();
  } finally {
    clearTimeout(timeout);
  }
}
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ranne-kruhy-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin) return;
  if (new URL(event.request.url).pathname === new URL(ACTIVITIES_URL).pathname) {
    event.respondWith(loadActivities(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request).catch(()=>event.request.mode==='navigate' ? caches.match('./index.html') : Response.error())));
});
