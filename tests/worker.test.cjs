const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const events={}; let attrs={}, nextDice=[4,4,5], result, rolls=0;
const ctx=vm.createContext({on:(event,fn)=>events[event]=fn, getAttrs:(keys,cb)=>cb(attrs), setAttrs:v=>Object.assign(attrs,v), generateRowID:()=>"-test"+Math.random().toString(36).slice(2), startRoll:(expression,cb)=>{rolls++; const results={d1:{result:nextDice[0]},d2:{result:nextDice[1]},d3:{result:nextDice[2]},mod:{result:0},target:{result:13},dbmin:{result:5},weapon:{result:2}}; for(let i=0;i<12;i++) results['save'+i]={result:nextDice[i%3]}; cb({rollId:'test',results});}, finishRoll:(_,v)=>{result=v;}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../worker.js'),'utf8'),ctx);
const resolve=(...args)=>ctx.resolveCheck(...args);
test('Book attack example: Ingrid 4,4,5 +3 vs 13, weapon +2 = 5 damage',()=>{
 const r=resolve([4,4,5],3,0,13,'solo','attack',2); assert.equal(r.damage,5); assert.equal(r.success,true);
});
test('Book defense example: 3,2,2 +2 vs 15, incoming +2 = 8 damage',()=>{
 assert.equal(resolve([3,2,2],2,0,15,'solo','defense',2).damage,8);
});
test('Solo attack tie hits; PvP attack tie fails; defense tie succeeds',()=>{
 for(const mode of ['solo','pvp']) {
  assert.equal(resolve([3,4,6],0,0,13,mode,'attack',2).success,mode==='solo');
  assert.equal(resolve([3,4,6],0,0,13,mode,'defense',2).success,true);
 }
});
test('Triples never turn an initial failure into success, including PvP ties',()=>{
 assert.equal(resolve([4,4,4],0,0,13,'solo','attack',2).total,12);
 assert.equal(resolve([4,4,4],0,0,12,'pvp','attack',2).success,false);
 assert.equal(resolve([4,4,4],0,0,12,'solo','attack',2).total,13);
});
test('Double Bonus adds damage only on a successful attack',()=>{
 assert.equal(resolve([5,5,3],0,0,13,'solo','attack',2).damage,4);
 assert.equal(resolve([5,5,3],0,0,15,'solo','attack',2).damage,0);
 assert.equal(resolve([5,5,3],0,0,15,'solo','defense',2).damage,4);
});
test('Armor matches the book example and no-save outcomes',()=>{
 assert.equal(ctx.resolveArmor([4,6]),3); assert.equal(ctx.resolveArmor([1,2,3]),0); assert.equal(ctx.resolveArmor([4,5,6]),4);
});
test('All 216 dice outcomes preserve tie rules and nonnegative damage',()=>{
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)for(const mode of ['solo','pvp'])for(const kind of ['attack','defense','check']){
  const r=resolve([a,b,c],2,-1,13,mode,kind,2), base=a+b+c+1;
  assert.equal(r.success,mode==='pvp'&&kind==='attack'?base>13:base>=13);
  assert.ok(r.damage>=0);
  assert.equal(r.total,base+(r.success&&a===b&&b===c?1:0));
 }
});
test('Click handlers calculate attack and defense output; Foe cannot roll',()=>{
 attrs={sheet_type:'party',ma:3,melee_damage:2,play_mode:'solo',character_name:'Ingrid'};
 events['clicked:ma'](); assert.equal(result.damage,5); assert.equal(result.total,16);
 const before=rolls; attrs.sheet_type='foe'; events['clicked:ma'](); events['clicked:armor'](); assert.equal(rolls,before);
});
test('Passive perception uses bonus+11 for Party Member, full TN for Foe',()=>{
 attrs={sheet_type:'party',per:3,foe_per:15}; events['sheet:opened change:per change:foe_per change:sheet_type'](); assert.equal(attrs.passive_per,14);
 attrs.sheet_type='foe'; events['sheet:opened change:per change:foe_per change:sheet_type'](); assert.equal(attrs.passive_per,15);
});
test('Player armor handler reports reduction and Energy Field short warning',()=>{
 attrs={sheet_type:'party',armor_dice:3}; nextDice=[1,1,6]; events['clicked:armor'](); assert.equal(result.saved,2); assert.equal(result.short,1);
});

test('DB range accounts for improved and restricted Double Bonus',()=>{
 assert.equal(resolve([4,4,6],0,0,13,'solo','attack',2,4).db,true);
 assert.equal(resolve([5,5,6],0,0,13,'solo','attack',2,6).db,false);
 assert.equal(resolve([6,6,1],0,0,13,'solo','attack',2,6).db,true);
});

test('Repeating weapon attacks use the clicked row damage and matching attack stat',()=>{
 attrs={sheet_type:'party',ma:3,ra:1,play_mode:'solo',repeating_meleeweapons_abc_weapon_damage:6,repeating_meleeweapons_abc_weapon_name:'Blade',repeating_rangedweapons_xyz_weapon_damage:4}; nextDice=[4,4,5];
 events['clicked:repeating_meleeweapons:attack']({sourceAttribute:'repeating_meleeweapons_abc_attack'}); assert.equal(result.damage,9);
 events['clicked:repeating_rangedweapons:attack']({sourceAttribute:'repeating_rangedweapons_xyz_attack'}); assert.equal(result.damage,5);
 const before=rolls; attrs.sheet_type='foe'; events['clicked:repeating_meleeweapons:attack']({sourceAttribute:'repeating_meleeweapons_abc_attack'}); assert.equal(rolls,before);
});
test('Existing named weapons migrate once, preserving damage, range and notes',()=>{
 attrs={melee_weapon:'Old blade',melee_damage:'0',ranged_weapon:'Old gun',ranged_damage:'4',ranged_range:'24',ranged_properties:'Rapid Fire'};
 events['sheet:opened']();
 const names=Object.keys(attrs).filter(k=>k.endsWith('_weapon_name'));
 assert.equal(names.length,2); assert.equal(attrs.weapons_migrated,'1');
 const gun=names.find(k=>attrs[k]==='Old gun').replace(/_weapon_name$/,'');
 assert.equal(attrs[gun+'_weapon_range'],'24'); assert.equal(attrs[gun+'_weapon_damage'],'4');
 const blade=names.find(k=>attrs[k]==='Old blade').replace(/_weapon_name$/,''); assert.equal(attrs[blade+'_weapon_damage'],'0');
 events['sheet:opened'](); assert.equal(Object.keys(attrs).filter(k=>k.endsWith('_weapon_name')).length,2);
});
