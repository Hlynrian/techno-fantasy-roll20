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
function rollStat(a, stat, kind, damage, weaponName) {
    if (a.sheet_type === 'foe') return;
    const targetLabel = a.play_mode === 'pvp' && kind !== 'check' ? 'Opposing roll total' : 'Target number';
    startRoll(`&{template:tfa} {{name=${safeText(a.character_name)}}} {{action=${safeText(weaponName || stat.toUpperCase())} ${kind}}} {{weapon=[[${damage === null ? "?{Weapon damage bonus|2}" : damage}]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{d3=[[1d6]]}} {{bonus=[[${num(a[stat])}]]}} {{mod=[[?{Situational modifier|0}]]}} {{target=[[?{${targetLabel}|13}]]}} {{dbmin=[[?{Double Bonus range|Normal doubles 5 or 6,5|Improved doubles 4 to 6,4|Restricted double 6 only,6}]]}} {{total=[[0]]}} {{margin=[[0]]}} {{success=[[0]]}} {{damage=[[0]]}} {{attack=[[${kind === 'attack' ? 1 : 0}]]}} {{defense=[[${kind === 'defense' ? 1 : 0}]]}} {{db=[[0]]}} {{triples=[[0]]}} {{ones=[[0]]}} {{twos=[[0]]}} {{sixdef=[[0]]}}`, roll => {
      const r = roll.results;
      const out = resolveCheck([r.d1.result, r.d2.result, r.d3.result], num(a[stat]), r.mod.result, r.target.result, a.play_mode, kind, damage === null ? r.weapon.result : damage, r.dbmin.result);
      finishRoll(roll.rollId, {total: out.total, margin: out.margin, success: +out.success, damage: out.damage, db: +out.db, triples: +(out.triples && out.success), ones: +out.ones, twos: +out.twos, sixdef: +(stat === 'rd' && out.success && out.sixes && a.play_mode !== 'pvp')});
    });
}
/* Solo/co-op crew worker. Shared rules functions are embedded by build.py. */
const memberFields = ['member_name','profile','active','health','health_max','luck','armor_dice','incoming_damage',...STATS];
function readRows(section, fields, done) {
  getSectionIDs(section, ids => {
    const keys = ids.flatMap(id => fields.map(f => `${section}_${id}_${f}`));
    getAttrs(keys, attrs => done(ids.map(id => {
      const row = {id}; fields.forEach(f => row[f] = attrs[`${section}_${id}_${f}`]); return row;
    })));
  });
}
function refreshCrew() {
  getAttrs(['crew_view','selected_member'], settings => {
    readRows('repeating_members', memberFields, members => {
      const selected = members.find(m => m.id === settings.selected_member && (settings.crew_view !== 'battle' || m.active === '1'));
      const updates = {selected_name:selected ? selected.member_name || 'Unnamed member' : 'Choose Loadout on a roster entry', selected_ready:selected ? '1' : '0', selected_can_roll:selected && selected.profile !== 'foe' && selected.active === '1' ? '1' : '0'};
      members.forEach(m => {
        updates[`repeating_members_${m.id}_row_visible`] = settings.crew_view !== 'battle' || m.active === '1' ? '1' : '0';
      });
      setAttrs(updates, {silent:true});
      ['weapons','traits'].forEach(type => readRows(`repeating_${type}`, ['owner'], rows => {
        const flags = {};
        rows.forEach(row => {
          flags[`repeating_${type}_${row.id}_row_visible`] = selected && (!row.owner || row.owner === selected.id) ? '1' : '0';
        });
        setAttrs(flags, {silent:true});
      }));
    });
  });
}
on('sheet:opened change:crew_view change:repeating_members remove:repeating_members', refreshCrew);
on('clicked:repeating_members:loadout', event => {
  const id = event.sourceAttribute.replace(/^repeating_members_/, '').replace(/_loadout$/, '');
  setAttrs({selected_member:id}, {silent:true}, refreshCrew);
});
['weapons','traits'].forEach(type => {
  on(`change:repeating_${type}`, event => {
    const match = event.sourceAttribute.match(new RegExp(`^(repeating_${type}_[^_]+)_`));
    if (!match) return;
    const prefix=match[1];
    getAttrs([`${prefix}_owner`,'selected_member'], attrs => {
      if (!attrs[`${prefix}_owner`] && attrs.selected_member) {
        setAttrs({[`${prefix}_owner`]:attrs.selected_member}, {silent:true}, refreshCrew);
      } else refreshCrew();
    });
  });
});
function fetchMember(id, callback) {
  const prefix=`repeating_members_${id}`;
  getAttrs(memberFields.map(f=>`${prefix}_${f}`), attrs => {
    const member={}; memberFields.forEach(f=>member[f]=attrs[`${prefix}_${f}`]);
    callback(member);
  });
}
function canRoll(member) { return member.profile !== 'foe' && member.active === '1' && !!member.member_name; }
STATS.forEach(stat => on(`clicked:repeating_members:${stat}`, event => {
  const id=event.sourceAttribute.replace(/^repeating_members_/, '').replace(new RegExp(`_${stat}$`), '');
  fetchMember(id, member => {
    if (!canRoll(member)) return;
    const kind=['ma','ra'].includes(stat)?'attack':['md','rd'].includes(stat)?'defense':'check';
    rollStat({...member,character_name:member.member_name,sheet_type:'party',play_mode:'solo'}, stat, kind, kind==='attack'?null:num(member.incoming_damage));
  });
}));
on('clicked:repeating_weapons:attack', event => {
  const prefix=event.sourceAttribute.replace(/_attack$/,'');
  getAttrs([`${prefix}_owner`,`${prefix}_weapon_name`,`${prefix}_weapon_damage`,`${prefix}_weapon_type`], a => {
    if (!a[`${prefix}_owner`]) return;
    fetchMember(a[`${prefix}_owner`], member => {
      if (!canRoll(member)) return;
      rollStat({...member,character_name:member.member_name,sheet_type:'party',play_mode:'solo'},a[`${prefix}_weapon_type`]==='ranged'?'ra':'ma','attack',num(a[`${prefix}_weapon_damage`]),a[`${prefix}_weapon_name`]||'Weapon');
    });
  });
});
on('clicked:repeating_members:armor', event => {
  const id=event.sourceAttribute.replace(/^repeating_members_/, '').replace(/_armor$/,'');
  fetchMember(id, member => {
    if (!canRoll(member)) return;
    const count=Math.max(0,Math.min(12,Math.floor(num(member.armor_dice))));
    if (!count) return;
    const fields=Array.from({length:count},(_,i)=>`{{save${i}=[[1d6]]}}`).join(' ');
    startRoll(`&{template:tfa} {{name=${safeText(member.member_name)}}} {{action=Armor save}} {{armor=1}} ${fields} {{saved=[[0]]}} {{short=[[0]]}}`, roll => {
      const dice=Array.from({length:count},(_,i)=>roll.results[`save${i}`].result);
      finishRoll(roll.rollId,{saved:resolveArmor(dice),short:+(dice.filter(d=>d===1).length>=2||dice.filter(d=>d===2).length>=2)});
    });
  });
});
