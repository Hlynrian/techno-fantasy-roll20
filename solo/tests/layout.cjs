const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:1150,height:1000}});await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8002/solo/preview.html');
 const rows=page.locator('.repeating_members > .preview-row');assert.equal(await rows.count(),4);
 assert.equal(await page.locator('.member-card:visible').count(),4);
 await page.locator('[name=attr_crew_view]').selectOption('battle');assert.equal(await page.locator('.member-card:visible').count(),3);
 await page.locator('[name=attr_crew_view]').selectOption('roster');assert.equal(await page.locator('.member-card:visible').count(),4);
 assert.equal(await rows.first().locator('.member-details').isVisible(),false);
 await rows.first().locator('.expand-toggle').check();assert.equal(await rows.first().locator('.member-details').isVisible(),true);
 await rows.first().locator('.expand-toggle').uncheck();
 const foe=rows.last();await foe.locator('.expand-toggle').check();assert.equal(await foe.locator('.party-stat:visible').count(),0);assert.equal(await foe.locator('.foe-stat:visible').count(),8);assert.equal(await foe.locator('[name=attr_luck]').isVisible(),false);
 await foe.locator('[name=act_loadout]').click();assert.equal(await page.locator('.loadout-card:visible').count(),0);
 await page.getByRole('button',{name:'Add weapon',exact:true}).click();
 const weapon=page.locator('.repeating_weapons .loadout-card:visible');await weapon.locator('[name=attr_weapon_name]').fill('Rusty blade');assert.equal(await weapon.locator('[name=act_attack]').isVisible(),false);
 await rows.first().locator('[name=act_loadout]').click();assert.equal(await page.locator('.repeating_weapons .loadout-card:visible [name=attr_weapon_name]').inputValue(),'Heirloom saber');
 await foe.locator('[name=act_loadout]').click();assert.equal(await page.locator('.repeating_weapons .loadout-card:visible [name=attr_weapon_name]').inputValue(),'Rusty blade');
 const rosterType=page.locator('select[name=attr_roster_type]');
 await rosterType.selectOption('foes');
 await rows.first().locator('.expand-toggle').check();
 assert.equal(await rows.first().locator('.party-stat:visible').count(),0);
 assert.equal(await rows.first().locator('.foe-stat:visible').count(),8);
 assert.equal(await rows.first().locator('[name=attr_luck]').isVisible(),false);
 assert.equal(await page.locator('[name=attr_shared_luck]').isVisible(),false);
 await rows.first().locator('[name=act_loadout]').click();
 assert.equal(await page.locator('[name=act_attack]:visible').count(),0);
 await rosterType.selectOption('crew');
 assert.equal(await rows.first().locator('[name=attr_ma]').inputValue(),'3');
 assert.equal(await rows.first().locator('.party-stat:visible').count(),8);
 assert.equal(await page.locator('.repeating_weapons .loadout-card:visible [name=attr_weapon_name]').inputValue(),'Heirloom saber');
 await rows.first().locator('.expand-toggle').uncheck();
 await page.screenshot({path:path.resolve(__dirname,'../crew-preview.png'),fullPage:true});
 await page.setViewportSize({width:520,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS solo layout: active filter, collapse, Foe TNs/no rolls, linked lists retained, narrow layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
