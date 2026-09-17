export const TYPES = ['Rozhovor', 'Pohyb', 'Skupiny', 'Dvojice', 'Premýšľanie', 'Improvizácia', 'Tvorenie', 'Pre zábavu', 'Spoznávanie sa', 'Kvíz', 'Žiaci vedú aktivitu'];
export function validateActivities(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('Chýbajú aktivity.');
  const ids = new Set();
  for (const a of data) {
    if (!a || typeof a.id !== 'string' || !a.id.trim() || ids.has(a.id) || ![1,2].includes(a.gradeLevel) || !['pokojné','živé'].includes(a.tempo) || !Array.isArray(a.types) || !a.types.length || a.types.some(t => !TYPES.includes(t)) || !Array.isArray(a.steps) || !a.steps.length || a.steps.length > 4 || a.steps.some(s => typeof s !== 'string' || !s.trim()) || typeof a.title !== 'string' || !a.title.trim() || typeof a.materials !== 'string' || !a.materials.trim()) throw new Error('Neplatná aktivita: ' + a?.id);
    ids.add(a.id);
  }
  return data;
}
export function filterActivities(data, grade, filter, favorites = []) {
  return data.filter(a => a.gradeLevel === grade && (filter.kind !== 'tempo' || a.tempo === filter.value) && (filter.kind !== 'type' || a.types.includes(filter.value)) && (filter.kind !== 'favorites' || favorites.includes(a.id)));
}
export function pickActivity(pool, currentId, random = Math.random, lastSeen = {}) {
  const others = pool.filter(a => a.id !== currentId);
  const candidates = others.length ? others : pool;
  const priority = a => Object.hasOwn(lastSeen, a.id) ? lastSeen[a.id] : 0;
  const oldest = candidates.reduce((min, a) => Math.min(min, priority(a)), Infinity);
  const choices = candidates.filter(a => priority(a) === oldest);
  return choices.length ? choices[Math.floor(random() * choices.length)] : null;
}
