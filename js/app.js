import { TYPES, validateActivities, filterActivities, pickActivity } from './core.js';
const app = document.querySelector('#app');
const gradeButton = document.querySelector('#change-grade');
const status = document.querySelector('#status');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { announce('Prehliadač nepovolil uloženie. Výber zostane zachovaný počas tohto otvorenia.'); } }
let favorites = read('rk-favorites', []);
if (!Array.isArray(favorites)) favorites = [];
let grade = read('rk-grade', 1);
if (![1,2].includes(grade)) grade = 1;
let activities = [], current = null, filter = {kind:'all'}, screen = 'home', expanded = false;
let statusTimer;
function announce(message) { clearTimeout(statusTimer); status.textContent = message; statusTimer = setTimeout(() => status.textContent = '', 5000); }
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
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
  plus:'<path d="M12 5v14M5 12h14"/>',
  pencil:'<path d="m3 21 5-1L21 7l-4-4L4 16l-1 5Zm11-15 4 4"/>',
  question:'<path d="M8 7a4 4 0 0 1 8 0c0 4-4 3-4 7m0 4v1"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.people}</svg>`;
const typeIcons = ['chat','bolt','people','people','question','calm','pencil','calm','heart','question','people'];
const progress = n => `<div class="progress"><span>0${n}</span><div aria-label="Krok ${n} z 3">${[1,2,3].map(i=>`<i class="${i===n?'active':''}"></i>`).join('')}</div></div>`;
function option(action, symbol, title, subtitle='', primary=false, value='') { return `<button class="option ${primary?'primary':''}" data-action="${action}" data-value="${escape(value)}"><span class="option-icon">${icon(symbol)}</span><span><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</span>${icon('arrow')}</button>`; }
function render(focus = true) {
  app.className = `card ${screen}`;
  gradeButton.hidden = screen === 'home';
  gradeButton.innerHTML = `${icon('people')} ${grade}. stupeň <span>↔</span>`;
  gradeButton.setAttribute('aria-label', `Zmeniť stupeň, aktuálne ${grade}. stupeň`);
  if (screen === 'home') app.innerHTML = `<div class="intro-copy"><span class="eyebrow">01 / DOBRÝ ZAČIATOK DŇA</span><h1 tabindex="-1">RANNÉ<br><span>KRUHY</span><span class="title-dot">.</span></h1><p class="tagline">Na dobrý začiatok dňa.</p><p class="intro">Inšpiruj sa aktivitami na dobrý začiatok dňa</p><p class="author">Autor: Mgr. Christián Vaľko</p></div><div class="grade-options"><h2>Malí alebo veľkí?</h2>${option('grade','calm','Malí <span>– 1. stupeň</span>','',true,'1')}${option('grade','people','Veľkí <span>– 2. stupeň</span>','','','2')}<p class="quiet">Vyber si stupeň a nájdi aktivitu pre svoju triedu.</p></div>${progress(1)}`;
  if (screen === 'choose') app.innerHTML = `<span class="eyebrow">02 / VÝBER AKTIVITY</span><h1 tabindex="-1">Aké tempo<br><span>zvolíme dnes?</span></h1><p class="intro">Klikni a nájdi aktivitu pre svoju triedu.</p><div class="choices">${option('all','dice','PREKVAP MA','Náhodná aktivita',true)}<div class="tempo-options">${option('tempo','calm','Pokojné','Tichší rozbeh dňa',false,'pokojné')}${option('tempo','bolt','Živé','Viac energie a pohybu',false,'živé')}</div></div><button class="disclosure" data-action="expand" aria-expanded="${expanded}" aria-controls="types">${icon('search')} Vybrať podľa typu aktivity <span>${expanded?'−':'+'}</span></button><div id="types" class="type-grid" ${expanded?'':'hidden'}>${TYPES.map((t,i)=>`<button data-action="type" data-value="${t}">${icon(typeIcons[i])}${t}</button>`).join('')}</div><button class="favorites-link" data-action="favorites">${icon('heart')} Moje obľúbené <span>${activities.filter(a=>a.gradeLevel===grade && favorites.includes(a.id)).length}</span></button>${progress(2)}`;
  if (screen === 'activity' && current) {
    const a = current, liked = favorites.includes(a.id);
    app.innerHTML = `<div class="activity-top"><button class="back" data-action="back">${icon('back')} Zmeniť výber</button><span class="eyebrow">03 / AKTIVITA</span></div><div class="activity-heading"><span class="target">${icon('target')}</span><h1 tabindex="-1">${escape(a.title)}</h1><button class="heart ${liked?'liked':''}" data-action="favorite" aria-label="${liked?'Odstrániť z obľúbených':'Pridať medzi obľúbené'}" aria-pressed="${liked}">${icon('heart')}</button></div><div class="metadata"><div>${icon('chat')}<span><small>Typ aktivity</small><strong>${a.types.map(escape).join(' · ')}</strong></span></div><div>${icon(a.tempo==='pokojné'?'calm':'bolt')}<span><small>Tempo</small><strong>${a.tempo==='pokojné'?'Pokojné':'Živé'}</strong></span></div><div>${icon('bag')}<span><small>Pomôcky</small><strong>${escape(a.materials)}</strong></span></div></div><section class="steps"><h2>Čo robíme?</h2><ol>${a.steps.map(s=>`<li>${escape(s)}</li>`).join('')}</ol></section><button class="another primary" data-action="another">${icon('dice')} Iná aktivita <span>→</span></button><p class="filter-note">${escape(filter.kind==='all'?'Náhodný výber':filter.kind==='favorites'?'Moje obľúbené':filter.value)} <span>· približne 10 minút</span></p>`;
  }
  if (screen === 'empty') app.innerHTML = `<button class="back" data-action="back">${icon('back')} Zmeniť výber</button><div class="empty-icon">${icon(filter.kind==='favorites'?'heart':'search')}</div><h1 tabindex="-1">${filter.kind==='favorites'?'Tvoje obľúbené<br><span>ešte len prídu.</span>':'Tu je zatiaľ ticho.'}</h1><p class="intro">${filter.kind==='favorites'?'Pre tento stupeň zatiaľ nemáš obľúbenú aktivitu. Pri aktivite ťukni na srdiečko a nájdeš ju tu.':'Pre tento výber zatiaľ nemáme aktivitu. Skús iný typ alebo tempo.'}</p><button class="another primary" data-action="back">Vybrať aktivitu ${icon('arrow')}</button>`;
  if (focus) { app.querySelector('h1')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}
function choose() { const pool = filterActivities(activities, grade, filter, favorites); current = pickActivity(pool, current?.id); screen = current ? 'activity' : 'empty'; render(); if (pool.length===1) announce('V tomto výbere je zatiaľ jedna aktivita.'); }
app.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const {action,value} = button.dataset;
  if (action==='grade') { grade=Number(value); save('rk-grade',grade); screen='choose'; expanded=false; render(); }
  else if (action==='back') { screen='choose'; render(); }
  else if (action==='expand') { expanded=!expanded; render(false); app.querySelector('[data-action="expand"]').focus(); }
  else if (action==='favorite') { const adding=!favorites.includes(current.id); favorites=adding?[...favorites,current.id]:favorites.filter(id=>id!==current.id); save('rk-favorites',favorites); render(false); app.querySelector('.heart').focus(); announce(adding?'Aktivita je medzi obľúbenými.':'Aktivita bola odstránená z obľúbených.'); }
  else if (action==='another') choose();
  else if (['all','tempo','type','favorites'].includes(action)) { filter={kind:action,value}; choose(); }
});
function home() { if (!activities.length) return; screen='home'; render(); }
gradeButton.addEventListener('click', home);
document.querySelector('.logo').addEventListener('click', e=>{ e.preventDefault(); home(); });
async function init() {
  try { const response=await fetch('./activities.json'); if (!response.ok) throw new Error('Načítanie zlyhalo'); activities=validateActivities(await response.json()); app.setAttribute('aria-busy','false'); render(false); }
  catch { app.setAttribute('aria-busy','false'); app.innerHTML='<h1>Aktivity sa nepodarilo načítať.</h1><p>Skontroluj pripojenie a skús to znova.</p><button class="another primary" id="retry">Skúsiť znova</button>'; document.querySelector('#retry').onclick=init; }
}
init();
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
