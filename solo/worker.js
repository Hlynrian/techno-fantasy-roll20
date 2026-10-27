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
function effectiveProfile(profile, rosterType) { return rosterType === 'foes' ? 'foe' : profile || 'party'; }
function refreshCrew() {
  getAttrs(['crew_view','selected_member','roster_type'], settings => {
    readRows('repeating_members', memberFields, members => {
      const selected = members.find(m => m.id === settings.selected_member && (settings.crew_view !== 'battle' || m.active === '1'));
      const updates = {selected_name:selected ? selected.member_name || 'Unnamed member' : 'Choose Loadout on a roster entry', selected_ready:selected ? '1' : '0', selected_can_roll:selected && effectiveProfile(selected.profile, settings.roster_type) !== 'foe' && selected.active === '1' ? '1' : '0'};
      members.forEach(m => {
        updates[`repeating_members_${m.id}_display_profile`] = effectiveProfile(m.profile, settings.roster_type);
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
on('sheet:opened change:crew_view change:roster_type change:repeating_members remove:repeating_members', refreshCrew);
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
  getAttrs([...memberFields.map(f=>`${prefix}_${f}`), 'roster_type'], attrs => {
    const member={}; memberFields.forEach(f=>member[f]=attrs[`${prefix}_${f}`]);
    member.profile = effectiveProfile(member.profile, attrs.roster_type);
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
