const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1180,height:1000}});
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8001/preview.html');
 await page.locator('[name="attr_character_name"]').fill('Ingrid Ironhand');
 await page.locator('[name="attr_ma"]').fill('3');
 assert.equal(await page.locator('.party').first().isVisible(),true);
 assert.equal(await page.locator('.foe').isVisible(),false);
 for(const section of ['meleeweapons','rangedweapons','traits']) {
  const list=page.locator('.repeating_'+section);
  const controls=list.locator('xpath=following-sibling::div[1]');
  await controls.getByText('Add entry',{exact:true}).click();
  assert.equal(await list.locator(':scope > div').count(),2);
  await list.locator('.preview-delete').last().click();
  assert.equal(await list.locator(':scope > div').count(),1);
 }
 await page.locator('[name="attr_luck"]').fill('3');
 assert.equal(await page.locator('[name="attr_luck"]').isVisible(),true);
 await page.screenshot({path:path.resolve(__dirname,'../party-preview.png'),fullPage:true});
 await page.locator('select[name="attr_sheet_type"]').selectOption('foe');
 assert.equal(await page.locator('.foe').isVisible(),true);
 assert.equal(await page.locator('[name="attr_luck"]').isVisible(),false);
 for(const el of await page.locator('.party').all()) assert.equal(await el.isVisible(),false);
 for(const el of await page.locator('button[type="action"]').all()) assert.equal(await el.isVisible(),false);
 await page.locator('[name="attr_foe_ma"]').fill('15');
 await page.screenshot({path:path.resolve(__dirname,'../foe-preview.png'),fullPage:true});
 await page.locator('select[name="attr_sheet_type"]').selectOption('party');
 assert.equal(await page.locator('[name="attr_ma"]').inputValue(),'3');
 await page.locator('select[name="attr_sheet_type"]').selectOption('foe');
 assert.equal(await page.locator('[name="attr_foe_ma"]').inputValue(),'15');
 await page.setViewportSize({width:520,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS: party/foe visibility, no foe roll buttons, weapon/trait add-delete, player Luck, independent stat values, narrow layout; screenshots saved.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
