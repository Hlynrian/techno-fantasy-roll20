/* Roll20 sheet worker. Embedded into sheet.html by build.py. */
const STATS = ['ma', 'md', 'ra', 'rd', 'fit', 'int', 'cha', 'per'];
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function resolveCheck(dice, bonus, modifier, target, mode, kind, weapon, dbMin = 5) {
  const counts = dice.reduce((a, d) => (a[d] = (a[d] || 0) + 1, a), {});
  const base = dice.reduce((a, b) => a + b, 0) + bonus + modifier;
  const success = mode === 'pvp' && kind === 'attack' ? base > target : base >= target;
  const triples = Object.values(counts).some(n => n === 3);
  const db = Object.entries(counts).some(([die, count]) => Number(die) >= dbMin && count >= 2);
  const total = base + (success && triples ? 1 : 0);
  const margin = total - target;
  let damage = 0;
  if (kind === 'attack' && success) damage = Math.max(0, margin + weapon + (db ? 2 : 0));
  if (kind === 'defense' && !success) damage = Math.max(0, -margin + weapon);
  return {total, margin, success, db, triples, damage, ones: (counts[1] || 0) >= 2, twos: (counts[2] || 0) >= 2, sixes: (counts[6] || 0) >= 2};
}
function resolveArmor(dice) { return dice.reduce((sum, die) => sum + (die === 6 ? 2 : die >= 4 ? 1 : 0), 0); }
function safeText(s) { return String(s || '').replace(/[{}|\[\]<>\r\n]/g, ' ').slice(0, 150); }
on('sheet:opened change:per change:foe_per change:sheet_type', () => {
  getAttrs(['per', 'foe_per', 'sheet_type'], a => setAttrs({passive_per: a.sheet_type === 'foe' ? num(a.foe_per) : 11 + num(a.per)}));
});
function rollStat(a, stat, kind, damage, weaponName) {
    if (a.sheet_type === 'foe') return;
    const targetLabel = a.play_mode === 'pvp' && kind !== 'check' ? 'Opposing roll total' : 'Target number';
    startRoll(`&{template:tfa} {{name=${safeText(a.character_name)}}} {{action=${safeText(weaponName || stat.toUpperCase())} ${kind}}} {{weapon=[[${damage === null ? "?{Weapon damage bonus|2}" : damage}]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{d3=[[1d6]]}} {{bonus=[[${num(a[stat])}]]}} {{mod=[[?{Situational modifier|0}]]}} {{target=[[?{${targetLabel}|13}]]}} {{dbmin=[[?{Double Bonus range|Normal doubles 5 or 6,5|Improved doubles 4 to 6,4|Restricted double 6 only,6}]]}} {{total=[[0]]}} {{margin=[[0]]}} {{success=[[0]]}} {{damage=[[0]]}} {{attack=[[${kind === 'attack' ? 1 : 0}]]}} {{defense=[[${kind === 'defense' ? 1 : 0}]]}} {{db=[[0]]}} {{triples=[[0]]}} {{ones=[[0]]}} {{twos=[[0]]}} {{sixdef=[[0]]}}`, roll => {
      const r = roll.results;
      const out = resolveCheck([r.d1.result, r.d2.result, r.d3.result], num(a[stat]), r.mod.result, r.target.result, a.play_mode, kind, damage === null ? r.weapon.result : damage, r.dbmin.result);
      finishRoll(roll.rollId, {total: out.total, margin: out.margin, success: +out.success, damage: out.damage, db: +out.db, triples: +(out.triples && out.success), ones: +out.ones, twos: +out.twos, sixdef: +(stat === 'rd' && out.success && out.sixes && a.play_mode !== 'pvp')});
    });
}
STATS.forEach(stat => on(`clicked:${stat}`, () => {
  getAttrs(['sheet_type', 'character_name', 'play_mode', stat, 'incoming_damage'], a => {
    const kind = ['ma', 'ra'].includes(stat) ? 'attack' : ['md', 'rd'].includes(stat) ? 'defense' : 'check';
    rollStat(a, stat, kind, kind === 'attack' ? null : num(a.incoming_damage));
  });
}));
['melee', 'ranged'].forEach(type => on(`clicked:repeating_${type}weapons:attack`, event => {
  // sourceAttribute identifies the clicked row; never use another row's damage.
  const prefix = event.sourceAttribute.replace(/_attack$/, '');
  const stat = type === 'melee' ? 'ma' : 'ra';
  getAttrs(['sheet_type', 'character_name', 'play_mode', stat, `${prefix}_weapon_name`, `${prefix}_weapon_damage`], a => {
    rollStat(a, stat, 'attack', num(a[`${prefix}_weapon_damage`]), a[`${prefix}_weapon_name`] || `${type} weapon`);
  });
}));
// Preserve weapons entered in the first single-weapon version, without deleting legacy data.
on('sheet:opened', () => getAttrs(['weapons_migrated', 'melee_weapon', 'melee_damage', 'melee_properties', 'ranged_weapon', 'ranged_damage', 'ranged_range', 'ranged_properties'], a => {
  if (a.weapons_migrated === '1') return;
  const values = {weapons_migrated: '1'};
  ['melee', 'ranged'].forEach(type => {
    if (!a[`${type}_weapon`]) return;
    const prefix = `repeating_${type}weapons_${generateRowID()}`;
    values[`${prefix}_weapon_name`] = a[`${type}_weapon`];
    values[`${prefix}_weapon_damage`] = a[`${type}_damage`] || '2';
    values[`${prefix}_weapon_properties`] = a[`${type}_properties`] || '';
    if (type === 'ranged') values[`${prefix}_weapon_range`] = a.ranged_range || '12';
    else values[`${prefix}_weapon_reach`] = '1';
  });
  setAttrs(values);
}));
on('clicked:armor', () => getAttrs(['sheet_type', 'character_name', 'armor_dice'], a => {
  if (a.sheet_type === 'foe') return;
  const count = Math.max(0, Math.min(12, Math.floor(num(a.armor_dice))));
  if (!count) return;
  const fields = Array.from({length:count}, (_,i) => `{{save${i}=[[1d6]]}}`).join(' ');
  startRoll(`&{template:tfa} {{name=${safeText(a.character_name)}}} {{action=Armor save}} {{armor=1}} ${fields} {{saved=[[0]]}} {{short=[[0]]}}`, roll => {
    const dice = Array.from({length:count}, (_,i) => roll.results[`save${i}`].result);
    finishRoll(roll.rollId, {saved:resolveArmor(dice), short: +(dice.filter(d=>d===1).length>=2 || dice.filter(d=>d===2).length>=2)});
  });
}));
