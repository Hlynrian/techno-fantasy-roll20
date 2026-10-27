const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(){
 const events={},attrs={},sections={repeating_members:['alice','bob','foe'],repeating_weapons:['blade','gun'],repeating_traits:['brave']};
 let expression,output,rolls=0;
 const ctx=vm.createContext({on:(names,fn)=>names.split(' ').forEach(n=>events[n]=fn),getAttrs:(keys,cb)=>cb(Object.fromEntries(keys.map(k=>[k,attrs[k]??'']))),getSectionIDs:(name,cb)=>cb(sections[name]||[]),setAttrs:(values,options,cb)=>{Object.assign(attrs,values);if(cb)cb();},startRoll:(text,cb)=>{
  expression=text;rolls++;
  const results={d1:{result:4},d2:{result:4},d3:{result:5},target:{result:13},mod:{result:0},dbmin:{result:5},weapon:{result:2},save0:{result:4},save1:{result:6}};
  cb({rollId:'r',results});
 },finishRoll:(_,values)=>output=values});
 vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../worker.bundle.js'),'utf8'),ctx);
 for(const [id,name,profile,active,ma] of [['alice','Alice','party','1',3],['bob','Bob','party','0',1],['foe','Berserker','foe','1',0]]){
  Object.assign(attrs,{[`repeating_members_${id}_member_name`]:name,[`repeating_members_${id}_profile`]:profile,[`repeating_members_${id}_active`]:active,[`repeating_members_${id}_ma`]:ma,[`repeating_members_${id}_ra`]:1,[`repeating_members_${id}_armor_dice`]:2});
 }
 Object.assign(attrs,{repeating_weapons_blade_owner:'alice',repeating_weapons_blade_weapon_name:'Alice blade',repeating_weapons_blade_weapon_damage:6,repeating_weapons_blade_weapon_type:'melee',repeating_weapons_gun_owner:'bob',repeating_traits_brave_owner:'alice'});
 return {events,attrs,sections,get expression(){return expression},get output(){return output},get rolls(){return rolls}};
}
test('Battle hides inactive members without deleting their data; roster restores them',()=>{
 const s=setup();s.attrs.crew_view='battle';s.events['change:crew_view']();
 assert.equal(s.attrs.repeating_members_bob_row_visible,'0');assert.equal(s.attrs.repeating_members_alice_row_visible,'1');assert.equal(s.attrs.repeating_members_bob_member_name,'Bob');
 s.attrs.crew_view='roster';s.events['change:crew_view']();assert.equal(s.attrs.repeating_members_bob_row_visible,'1');
});
test('Loadout selects member and only exposes their weapons and traits',()=>{
 const s=setup();s.events['clicked:repeating_members:loadout']({sourceAttribute:'repeating_members_alice_loadout'});
 assert.equal(s.attrs.selected_name,'Alice');assert.equal(s.attrs.repeating_weapons_blade_row_visible,'1');assert.equal(s.attrs.repeating_weapons_gun_row_visible,'0');assert.equal(s.attrs.repeating_traits_brave_row_visible,'1');
 s.events['clicked:repeating_members:loadout']({sourceAttribute:'repeating_members_foe_loadout'});assert.equal(s.attrs.selected_can_roll,'0');
});
test('New weapons and traits attach to selected member once and keep owner when selection changes',()=>{
 const s=setup();s.attrs.selected_member='alice';s.sections.repeating_weapons.push('new');
 s.events['change:repeating_weapons']({sourceAttribute:'repeating_weapons_new_weapon_name'});assert.equal(s.attrs.repeating_weapons_new_owner,'alice');
 s.attrs.selected_member='bob';s.events['change:repeating_weapons']({sourceAttribute:'repeating_weapons_new_weapon_damage'});assert.equal(s.attrs.repeating_weapons_new_owner,'alice');assert.equal(s.attrs.repeating_weapons_new_row_visible,'0');
 s.sections.repeating_traits.push('newtrait');s.events['change:repeating_traits']({sourceAttribute:'repeating_traits_newtrait_trait_name'});assert.equal(s.attrs.repeating_traits_newtrait_owner,'bob');
});
test('Member stat roll uses the clicked member name and bonus, not crew name',()=>{
 const s=setup();s.attrs.character_name='Crew';s.events['clicked:repeating_members:ma']({sourceAttribute:'repeating_members_alice_ma'});
 assert.match(s.expression,/name=Alice/);assert.doesNotMatch(s.expression,/name=Crew/);assert.equal(s.output.total,16);
});
test('Weapon roll uses its owner even when another member is selected',()=>{
 const s=setup();s.attrs.selected_member='foe';s.events['clicked:repeating_weapons:attack']({sourceAttribute:'repeating_weapons_blade_attack'});
 assert.match(s.expression,/name=Alice/);assert.match(s.expression,/Alice blade/);assert.equal(s.output.damage,9);
});
test('Foes and inactive members never roll stats, weapons or armor',()=>{
 const s=setup();for(const id of ['bob','foe']){
 s.events['clicked:repeating_members:ma']({sourceAttribute:`repeating_members_${id}_ma`});s.events['clicked:repeating_members:armor']({sourceAttribute:`repeating_members_${id}_armor`});
 s.attrs.repeating_weapons_blade_owner=id;s.events['clicked:repeating_weapons:attack']({sourceAttribute:'repeating_weapons_blade_attack'});
 } assert.equal(s.rolls,0);
});
test('Armor output uses member name and per-die reduction',()=>{
 const s=setup();s.events['clicked:repeating_members:armor']({sourceAttribute:'repeating_members_alice_armor'});assert.match(s.expression,/name=Alice/);assert.equal(s.output.saved,3);
});
test('Deleting selected member clears editor without deleting other loadouts',()=>{
 const s=setup();s.attrs.selected_member='alice';s.sections.repeating_members=['bob','foe'];s.events['remove:repeating_members']();assert.equal(s.attrs.selected_ready,'0');assert.equal(s.attrs.repeating_weapons_blade_owner,'alice');
});
