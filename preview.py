"""Build a local layout preview; roll workers run only inside Roll20."""
from pathlib import Path
import re
root=Path(__file__).parent
html=re.sub(r'<script type="text/worker">[\s\S]*?</script>', '', (root/'sheet.html').read_text())
html=re.sub(r'<rolltemplate[\s\S]*?</rolltemplate>', '', html)
preview='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TFA 2E · Sheet layout preview</title><style>body{margin:0;background:#d9ded8;padding:24px} .preview-note{max-width:1080px;font:14px/1.5 Arial;margin:0 0 12px} fieldset{border:0;padding:0;margin:0} button:disabled{opacity:.65;cursor:default!important}</style><style>'''+(root/'sheet.css').read_text()+'''</style><p class="preview-note">Layout preview · Switch Party Member / Foe below. Roll buttons are disabled here; use sheet.html and sheet.css inside Roll20 to roll dice.</p>'''+html+'''<script>
for (const button of document.querySelectorAll('button')) button.disabled=true;
// Preview-only controls simulate Roll20's native repeating-section Add/Modify UI.
for (const section of document.querySelectorAll('fieldset[class^="repeating_"]')) {
 const template = section.firstElementChild.cloneNode(true);
 const controls = document.createElement('div'); controls.className='preview-list-controls';
 const add = document.createElement('button'); add.type='button'; add.textContent='Add entry';
 const attachDelete = row => {
  const remove = document.createElement('button'); remove.type='button'; remove.textContent='Delete entry'; remove.className='preview-delete';
  remove.addEventListener('click',()=>row.remove()); row.appendChild(remove);
 };
 for(const row of section.children) attachDelete(row);
 add.addEventListener('click',()=>{
  const row=template.cloneNode(true); attachDelete(row); section.appendChild(row);
 });
 controls.appendChild(add); section.after(controls);
}
document.addEventListener('change', event=>{
 const name=event.target.name;
 if(!name)return;
 if(name==='attr_sheet_type') document.querySelector('input.sheet-type').value=event.target.value;
 const type=document.querySelector('input.sheet-type').value;
 const per=Number(document.querySelector('[name="attr_'+(type==='foe'?'foe_per':'per')+'"]').value)||0;
 document.querySelector('[name="attr_passive_per"]').value=type==='foe'?per:11+per;
});
</script></html>'''
(root/'preview.html').write_text(preview)
