// Layout preview only: simulates repeating rows. Roll20 supplies its own persistence and controls.
let selected='',nextId=0;
const templates={};
function field(row,name){return row.querySelector(`[name="attr_${name}"]:not([type="hidden"])`) || row.querySelector(`[name="attr_${name}"]`);}
function value(row,name){return field(row,name)?.value||'';}
function sync(){
 const battle=document.querySelector('[name=attr_crew_view]').value==='battle';
 const members=[...document.querySelectorAll('.repeating_members > .preview-row')];
 for(const row of members){
  const active=field(row,'active').checked;
  row.querySelector('.active-state').setAttribute('value',active?'1':'0');
  row.querySelector('.profile-state').setAttribute('value',value(row,'profile'));
  row.querySelector('.row-visible').setAttribute('value',!battle||active?'1':'0');
 }
 const member=members.find(row=>row.dataset.id===selected&&(!battle||field(row,'active').checked));
 document.querySelector('[name=attr_selected_name]').textContent=member?value(member,'member_name'):'Choose Loadout on a roster entry';
 document.querySelector('.selected-ready').setAttribute('value',member?'1':'0');
 document.querySelector('.selected-can-roll').setAttribute('value',member&&field(member,'active').checked&&value(member,'profile')!=='foe'?'1':'0');
 for(const type of ['weapons','traits'])for(const row of document.querySelectorAll('.repeating_'+type+' > .preview-row')){
  const visible=member&&value(row,'owner')===selected;
  row.querySelector('.row-visible').setAttribute('value',visible?'1':'0');
  row.querySelector('.preview-controls').style.display=visible?'flex':'none';
 }
}
function addRow(type,values={}){
 const section=document.querySelector('.repeating_'+type),row=templates[type].cloneNode(true);
 row.dataset.id='preview'+(++nextId);
 if(type!=='members')field(row,'owner').value=selected;
 for(const [name,val] of Object.entries(values)){
  const f=field(row,name);if(!f)continue;if(f.type==='checkbox')f.checked=val==='1';else f.value=val;
 }
 const controls=document.createElement('div');controls.className='preview-controls';
 const remove=document.createElement('button');remove.textContent='Delete entry';remove.onclick=()=>{row.remove();sync();};controls.append(remove);row.append(controls);
 for(const button of row.querySelectorAll('button[type=action]')){
  if(button.name==='act_loadout')button.onclick=()=>{selected=row.dataset.id;sync();};else button.disabled=true;
 }
 row.addEventListener('change',sync);row.addEventListener('input',sync);section.append(row);sync();return row;
}
for(const type of ['members','weapons','traits']){
 const section=document.querySelector('.repeating_'+type),row=document.createElement('div');row.className='preview-row';
 while(section.firstChild)row.append(section.firstChild);templates[type]=row;
 const controls=document.createElement('div');controls.className='preview-controls';const add=document.createElement('button');add.textContent='Add '+(type==='members'?'member / foe':type==='weapons'?'weapon':'trait');add.onclick=()=>addRow(type);controls.append(add);section.after(controls);
}
document.querySelector('[name=attr_crew_view]').addEventListener('change',sync);
addRow('members',{member_name:'Ingrid Ironhand',ma:'3',md:'2',health:'15',luck:'2'});
addRow('members',{member_name:'Greycrow',ra:'2',active:'1'});
addRow('members',{member_name:'Reserve scout',active:'0'});
addRow('members',{member_name:'Mutant Berserker',profile:'foe',tn_ma:'13',tn_md:'13',health:'14'});
selected=document.querySelector('.repeating_members > .preview-row').dataset.id;
addRow('weapons',{weapon_name:'Heirloom saber',weapon_damage:'2'});
addRow('traits',{trait_name:'Mighty Blow'});sync();
