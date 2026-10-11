import { openQuote } from './quotes.js';
import { openSong } from './song.js';
import { FILTERS, validateActivities, filterActivities, pickActivity } from './core.js';
import { createActivityHistory } from './history.js';
const activityHistory = createActivityHistory({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value)
});
const app = document.querySelector('#app');
const gradeButton = document.querySelector('#change-grade');
const status = document.querySelector('#status');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { announce('Prehliadač nepovolil uloženie. Výber zostane zachovaný počas tohto otvorenia.'); return false; } }
let favorites = read('rk-favorites-v2', []);
if (!Array.isArray(favorites)) favorites = [];
let grade = read('rk-grade', 1);
if (![1,2].includes(grade)) grade = 1;
let activities = [], current = null, filter = {kind:'all'}, screen = 'home';
let statusTimer;
let selectionTimer = null;
let selecting = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const standaloneMode = window.matchMedia('(display-mode: standalone)');
let installed = standaloneMode.matches || navigator.standalone === true;
let installPrompt = null;
function updateInstallButton() {
  const button = app.querySelector('[data-action="install"]');
  if (button) button.hidden = installed;
  if (installed) {
    const help = app.querySelector('#install-help');
    if (help) help.hidden = true;
  }
}
function installInstructions() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'Na iPhone alebo iPade otvor stránku v Safari. V ponuke Zdieľať vyber „Pridať na plochu“ a potvrď pridanie.';
  }
  if (/Android/.test(ua)) return 'V ponuke prehliadača (⋮) vyber „Pridať na plochu“ alebo „Nainštalovať aplikáciu“. Ak možnosť chýba, skús stránku otvoriť v Chrome.';
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua)) return 'V Safari vyber Súbor → Pridať do Docku. Ak túto možnosť nevidíš, otvor stránku v Chrome alebo Edge a vyhľadaj možnosť inštalácie v ponuke prehliadača.';
  return 'V Chrome alebo Edge otvor ponuku prehliadača a vyhľadaj „Nainštalovať Ranné kruhy“ alebo možnosť inštalácie stránky ako aplikácie. Ak ju nevidíš, môžeš si odkaz uložiť medzi záložky. Ikonu na pracovnej ploche vytvorí prehliadač podľa svojich možností.';
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = null;
  updateInstallButton();
  announce('Ranné kruhy sú pridané medzi tvoje aplikácie.');
});
standaloneMode.addEventListener('change', event => {
  installed = event.matches || navigator.standalone === true;
  updateInstallButton();
});
async function installApp(button) {
  if (installed) return;
  if (installPrompt) {
    const pending = installPrompt;
    installPrompt = null;
    button.disabled = true;
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice.outcome === 'accepted') {
        installed = true;
        updateInstallButton();
      }
      return;
    } catch { /* Keep manual instructions available when the prompt fails. */ }
    finally { button.disabled = false; }
  }
  const help = app.querySelector('#install-help');
  if (!help) return;
  help.hidden = !help.hidden;
  button.setAttribute('aria-expanded', String(!help.hidden));
}
function announce(message) { clearTimeout(statusTimer); status.textContent = message; statusTimer = setTimeout(() => status.textContent = '', 5000); }
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  install:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4m0-15v7m-3-3 3 3 3-3"/>',
  arrow:'<path d="m9 5 7 7-7 7"/>', back:'<path d="M20 12H4m7-7-7 7 7 7"/>',
  dice:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" stroke-width="3"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  calm:'<circle cx="12" cy="12" r="9"/><path d="M6 9q2 3 4 0m4 0q2 3 4 0M8 15q4 4 8 0"/>',
  bolt:'<path d="m14 2-9 12h7l-2 8 9-12h-7Z"/>',
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
  target:'<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 10-10m-5 0h5v5"/>',
  bag:'<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 14h6"/>',
  chat:'<path d="M21 11a9 8 0 0 1-9 8H4l-2 3V11a9 8 0 0 1 19 0Z"/><path d="M7 11h.01M12 11h.01M17 11h.01" stroke-width="3"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  pencil:'<path d="m3 21 5-1L21 7l-4-4L4 16l-1 5Zm11-15 4 4"/>',
  question:'<path d="M8 7a4 4 0 0 1 8 0c0 4-4 3-4 7m0 4v1"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.people}</svg>`;
function option(action, symbol, title, subtitle='', primary=false, value='') { return `<button class="option ${primary?'primary':''}" data-action="${action}" data-value="${escape(value)}"><span class="option-icon">${icon(symbol)}</span><span><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</span>${icon('arrow')}</button>`; }

function render(focus = true) {
  app.querySelector('#school-song')?.pause?.();
  if (selecting) { clearTimeout(statusTimer); status.textContent = ''; }
  clearTimeout(selectionTimer);
  selectionTimer = null;
  selecting = false;
  app.setAttribute('aria-busy', 'false');
  app.className = `card ${screen}`;
  gradeButton.hidden = screen === 'home' || filter.kind === 'favorites';
  gradeButton.innerHTML = `${icon('people')} ${grade}. stupeň <span>↔</span>`;
  gradeButton.setAttribute('aria-label', `Zmeniť stupeň, aktuálne ${grade}. stupeň`);
  if (screen === 'home') app.innerHTML = `<div class="intro-copy"><span class="eyebrow">01 / DOBRÝ ZAČIATOK DŇA</span><h1 tabindex="-1">RANNÉ<br><span>KRUHY</span><span class="title-dot">.</span></h1><p class="tagline">Inšpiruj sa aktivitami pre ranné kruhy.</p></div><div class="grade-options">${option('grade','calm','1. stupeň ZŠ','',false,'1')}${option('grade','people','2. stupeň ZŠ','',false,'2')}<div class="home-extras" role="group" aria-label="Doplnky ranného kruhu"><button class="extra-tile" data-action="favorites" aria-label="Moje obľúbené, počet aktivít: ${activities.filter(a=>favorites.includes(a.id)).length}"><span class="tile-icon">${icon('heart')}<span class="tile-count" aria-hidden="true">${activities.filter(a=>favorites.includes(a.id)).length}</span></span><span class="tile-label">Obľúbené</span></button><button class="extra-tile" data-action="song" aria-haspopup="dialog"><span class="tile-icon">${icon('music')}</span><span class="tile-label">Zaspievajme<br>si</span></button><button class="extra-tile" data-action="quote" aria-haspopup="dialog"><span class="tile-icon">${icon('sun')}</span><span class="tile-label">Citát na<br>dnes</span></button></div></div><div class="home-bottom"><div class="install-area"><button class="install-link" data-action="install" aria-expanded="false" aria-controls="install-help" ${installed ? 'hidden' : ''}>${icon('install')} Pridať na plochu</button><p id="install-help" class="install-help" hidden>${escape(installInstructions())}</p></div></div>`;
  if (screen === 'choose') app.innerHTML = `<span class="eyebrow">02 / VÝBER AKTIVITY</span><h1 tabindex="-1">Vyber si<br><span>dnešnú aktivitu.</span></h1><div class="choices">${option('all','dice','PREKVAP MA','Náhodná aktivita',true)}<details class="filter-disclosure"><summary>${icon('search')}<span>Vybrať podľa typu aktivity</span><span class="disclosure-mark" aria-hidden="true"></span></summary><div class="category-grid">${FILTERS.map(f => `<button class="category-option" data-action="category" data-value="${f.value}"><span aria-hidden="true">${f.emoji}</span>${f.label}</button>`).join('')}</div></details></div>`;
  if (screen === 'activity' && current) {
    const a = current, liked = favorites.includes(a.id);
    const selectionLabel = filter.kind === 'all' ? `Výber zo všetkých aktivít · ${grade}. stupeň` : filter.kind === 'favorites' ? `Výber z obľúbených · ${a.gradeLevel}. stupeň` : `Typ výberu: ${FILTERS.find(f => f.value === filter.value)?.label || ''} · ${grade}. stupeň`;
    app.innerHTML = `<div class="activity-top"><button class="back" data-action="back">${icon('back')} ${filter.kind === 'favorites' ? 'Späť na úvod' : 'Zmeniť výber'}</button><div class="activity-tools"><span class="activity-number">Aktivita ${escape(a.id.replace(/^0+(?=\d)/, ''))}</span><button class="heart ${liked?'liked':''}" data-action="favorite" aria-label="${liked?'Odstrániť z obľúbených':'Pridať medzi obľúbené'}" aria-pressed="${liked}">${icon('heart')}</button></div></div><div class="activity-heading"><span class="target">${icon('target')}</span><h1 tabindex="-1">${escape(a.title)}</h1></div><div class="metadata"><div class="activity-type" aria-label="Typ aktivity">${icon('chat')}<span>${a.types.map(escape).join(' · ')}</span></div><div class="activity-materials">${icon('bag')}<span><small>Pomôcky:</small> <strong>${escape(a.materials)}</strong></span></div></div><section class="steps"><h2>Čo robíme?</h2><ol>${a.steps.map(s=>`<li>${escape(s)}</li>`).join('')}</ol></section><div class="activity-extra"><details><summary>Reflexia</summary><ul>${a.reflection.map(q=>`<li>${escape(q)}</li>`).join('')}</ul></details><details><summary>Podrobný návod</summary><p>${escape(a.details)}</p></details></div><button class="another primary" data-action="another">${icon('dice')} Iná aktivita <span>→</span></button><p class="filter-note">${escape(selectionLabel)}</p>`;
  }
  if (screen === 'empty') app.innerHTML = `<button class="back" data-action="back">${icon('back')} ${filter.kind === 'favorites' ? 'Späť na úvod' : 'Zmeniť výber'}</button><div class="empty-icon">${icon(filter.kind==='favorites'?'heart':'search')}</div><h1 tabindex="-1">${filter.kind==='favorites'?'Tvoje obľúbené<br><span>ešte len prídu.</span>':'Tu je zatiaľ ticho.'}</h1><p class="intro">${filter.kind==='favorites'?'Zatiaľ nemáš obľúbenú aktivitu. Pri aktivite ťukni na srdiečko a nájdeš ju tu.':'Pre tento výber zatiaľ nie sú pridané aktivity.'}</p><button class="another primary" data-action="back">${filter.kind === 'favorites' ? 'Späť na úvod' : 'Vybrať aktivitu'} ${icon('arrow')}</button>`;
  app.innerHTML += `<footer class="site-footer"><a class="creator-logo" href="https://christianalex.sk/" target="_blank" rel="noopener noreferrer" aria-label="Christian Alex – web autora (otvorí sa v novej karte)"><img src="media/christian-alex-logo.png" alt="Christian Alex" width="1536" height="1024" loading="lazy" decoding="async"></a><p class="creator-credit">Vytvoril:<br><strong>Mgr. Christián Vaľko</strong></p></footer>`;
  if (focus) { app.querySelector('h1')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}
function choose(duration = 0, another = false) {
  if (selecting) return;
  const pool = filterActivities(activities, grade, filter, favorites);
  // Favorites retain their original random selection; all displayed activities
  // still contribute to the shared history used by the other filters.
  const next = pickActivity(pool, current?.id, Math.random,
    filter.kind === 'favorites' ? {} : activityHistory.snapshot());
  const reveal = () => {
    current = next;
    screen = current ? 'activity' : 'empty';
    render();
    // Record only after reveal, never when a pending dice animation is cancelled.
    if (current) activityHistory.record(current.id);
    if (current && !reducedMotion.matches) {
      // Animate new content, so even consecutive activities with similar titles feel distinct.
      app.querySelectorAll('.activity-heading, .metadata, .steps, .another').forEach((element, index) => {
        element.animate(
          [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 220, delay: index * 30, easing: 'ease-out', fill: 'backwards' }
        );
      });
    }
    if (pool.length === 1) announce('V tomto výbere je zatiaľ jedna aktivita.');
  };
  // Empty and single-item pools do not pretend to roll for a different result.
  if (!duration || reducedMotion.matches || pool.length < 2) { reveal(); return; }
  selecting = true;
  clearTimeout(statusTimer);
  status.textContent = '';
  const content = document.createElement('div');
  content.className = 'selection-content';
  content.inert = true;
  content.setAttribute('aria-hidden', 'true');
  content.append(...app.childNodes);
  const overlay = document.createElement('div');
  overlay.className = 'selection-overlay';
  const label = another ? 'Vyberám ďalšiu aktivitu…' : 'Vyberám aktivitu…';
  const faces = [[5,[1,3,5,7,9]], [2,[1,9]], [3,[1,5,9]], [4,[1,3,7,9]], [1,[5]], [6,[1,3,4,6,7,9]]];
  overlay.innerHTML = `<div class="dice-stage" aria-hidden="true"><div class="rolling-dice">${faces.map(([value, dots]) => `<span class="dice-face face-${value}">${dots.map(position => `<i style="grid-area:${Math.ceil(position / 3)} / ${(position - 1) % 3 + 1}"></i>`).join('')}</span>`).join('')}</div></div><p role="status">${label}</p>`;
  app.append(content, overlay);
  app.classList.add('is-selecting');
  app.setAttribute('aria-busy', 'true');
  window.scrollTo({top:0,behavior:'instant'});
  selectionTimer = setTimeout(() => { status.textContent = ''; reveal(); }, duration);
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && selecting) {
    clearTimeout(selectionTimer);
    selecting = false;
    status.textContent = '';
    choose();
  }
});
app.addEventListener('click', event => {
  if (selecting) return;
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const {action,value} = button.dataset;
  if (action==='grade') { filter={kind:'all'}; grade=Number(value); save('rk-grade',grade); screen='choose'; render(); }
  else if (action==='back') { if (filter.kind === 'favorites') home(); else { screen='choose'; render(); } }
  else if (action==='favorite') { const adding=!favorites.includes(current.id); favorites=adding?[...favorites,current.id]:favorites.filter(id=>id!==current.id); const saved=save('rk-favorites-v2',favorites); render(false); app.querySelector('.heart').focus(); if (saved) announce(adding?'Aktivita je medzi obľúbenými.':'Aktivita bola odstránená z obľúbených.'); }
  else if (action==='install') { void installApp(button); }
  else if (action==='song') openSong(button);
  else if (action==='quote') openQuote(button);
  else if (action==='another') choose(800, true);
  else if (['all','category','favorites'].includes(action)) { filter={kind:action,value}; choose(action==='all' ? 900 : 0); }
});
function home() { filter={kind:'all'}; screen='home'; render(); }
gradeButton.addEventListener('click', home);
document.querySelector('.logo').addEventListener('click', e=>{ e.preventDefault(); home(); });
async function init() {
  try { localStorage.removeItem('rk-favorites'); localStorage.removeItem('rk-activity-history'); } catch { /* Storage may be unavailable. */ }
  try { const response=await fetch('./activities.json'); if (!response.ok) throw new Error('Načítanie zlyhalo'); activities=validateActivities(await response.json()); app.setAttribute('aria-busy','false'); render(false); app.classList.add('welcome-enter'); }
  catch { app.setAttribute('aria-busy','false'); app.innerHTML='<h1>Aktivity sa nepodarilo načítať.</h1><p>Skontroluj pripojenie a skús to znova.</p><button class="another primary" id="retry">Skúsiť znova</button>'; document.querySelector('#retry').onclick=init; }
}
init();
