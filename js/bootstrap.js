// Register updates independently of app imports: a broken or mixed cached
// module must not prevent the worker from downloading a complete new version.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
import('./app.js').catch(() => {
  const app = document.querySelector('#app');
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = '<h1>Aplikáciu sa nepodarilo spustiť.</h1><p>Skontroluj pripojenie a obnov stránku.</p><button class="another primary" id="reload-app">Obnoviť stránku</button>';
  document.querySelector('#reload-app').addEventListener('click', () => window.location.reload());
});
