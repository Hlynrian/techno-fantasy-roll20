# Techno-Fantasy Adventure 2E — Roll20 sheet

An unofficial first version based on the uploaded combined 2E rulebook (Four-Color Studios, April 2026). The rulebook is not included in this project.

## Install in Roll20

1. The game's creator needs access to Roll20's custom character sheet feature (normally a Pro subscription).
2. In the game's Settings → Game Settings, select **Custom** as the character sheet template. Use the HTML/CSS custom sheet editor, with **Legacy Sanitization off**.
3. Paste all of `sheet.html` into the HTML Layout tab. It includes the sheet-worker JavaScript and roll template.
4. Paste all of `sheet.css` into the CSS Styling tab. Save, launch the game, and create a Character.
5. On the Character Sheet tab, select **Party Member** or **Foe**. For every PvP model use Party Member, with play mode set to PvP.

`preview.html` is a standalone layout preview. Its roll buttons are deliberately disabled; it does not emulate Roll20. `party-preview.png` and `foe-preview.png` show the two layouts.

## Playing

- **Weapons and traits:** Melee weapons, ranged weapons, and traits are repeating lists shared by both profiles. Use Roll20’s **Add** control to add entries, and **Modify** then the delete control to remove entries (and reorder as needed). Each weapon has its own damage, reach/range and properties. Party Members can attack directly from a weapon row; Foes see no roll buttons. The MA/RA stat buttons instead prompt for a weapon damage bonus. Named weapons from the first version migrate into lists once when the sheet opens; legacy values are retained.
- **Luck:** Party Members have an editable Luck remaining field, separate from Boons. Enter starting Luck for the battle and update it manually when spent or regained; Foes do not show Luck.
- **Party Members:** Enter final bonuses for MA, MD, RA, RD, FIT, INT, CHA and PER, including Role, shield and permanent effects. Click a stat abbreviation to roll.
- **Foes:** Enter full TNs (for example, 13), not bonuses. Foes have no roll buttons, and workers reject roll requests while Foe is selected. Players attack vs. MD/RD and defend vs. MA/RA. Foes show power level and behavior instead of player type, Background and campaign details.
- **Solo/co-op/RPG:** On a roll, enter the relevant TN, a situational modifier, and the applicable Double Bonus range. Meeting the TN succeeds. Choose normal doubles 5–6, improved doubles 4–6, or restricted double 6 as appropriate to Traits; opposing effects must be adjudicated by the table.
- **PvP:** Enter the opposing combatant's total for combat rolls. Attacks need to exceed it; defenses may tie. Opposed rolls are entered manually, not automatically linked between sheets. Noncombat checks still use a TN.
- **Damage:** Successful attacks add Results, weapon damage, and +2 for a Double Bonus. Failed defenses report negative Results plus the incoming damage bonus. Enter the enemy's weapon bonus and applicable attacker effects in that incoming bonus; in PvP this includes any attacker Double Bonus. Damage is shown before armor. It is never applied automatically to another character.
- **Triples:** +1 is added only if the check already succeeds. Triples cannot rescue an initial failure or a tied PvP attack.
- **Armor:** Set the number of armor dice and click Roll armor save on a Party Member. Each 4 or 5 negates 1 damage; each 6 negates 2. Double 1s/2s flag a possible Energy Field short; this warning applies only when actually using an Energy Field. Account for armor-piercing effects by changing the dice count before rolling.
- **Resources:** Health, Boons, conditions, ammunition, uses, and advances are tracked manually. Health should not go below zero. A Boon rerolls one die of a 3D6 check; use chat to reroll and recompute that check manually, including any changed Double Bonus or triples. Boons are not automatically spent.
- **Profiles:** Switching Party Member/Foe preserves separate bonus and TN values. Shared details (Health, equipment, traits, notes) remain on the same character. Type/power-level selections are labels and do not reset stats or resources. Health defaults to 15 and Move to 5; adjust for the character's type and Traits. New Foe TNs default to base 11 and must be allocated manually.
- Use repeating Traits/abilities and Gear sections for any number of entries; spell/power costs, trait exceptions and background checks remain manual.

## Verification and limitations

Verified locally: 13 worker tests, rulebook damage examples, all 216 3D6 outcomes across attack/defense/check modes, armor scoring, no Foe rolls, passive perception, browser layout/profile switching, preservation of each profile's stat values, and a 520px-wide layout.

**Not yet verified in a live Roll20 game:** custom roll parsing, computed roll-template display, native repeating-row Add/Modify controls and platform attribute persistence. The browser preview simulates add/delete controls for layout checks; live Roll20 supplies its native repeating-list controls. Run the following acceptance checks after installing:

1. Fill a Party Member's stats and add two Trait rows and two Gear rows. Close/reopen the sheet and confirm data persists.
2. Roll each stat and armor. Confirm individual dice, computed total, Results, success/failure and damage display in chat (not the placeholder zero values).
3. Compare a tie in solo/co-op with an attack tie in PvP. Check DB and triples when they occur.
4. Change to Foe: only full TN inputs should appear; no dice buttons or campaign fields should be visible. Switch back and confirm player stats persist.
5. Have a second player test sheet permissions and rolls in multiplayer.

Rules references: pp. 4–7 (dice, Results, Boons, PvP), 8–14 (stats, types, roles, Backgrounds), 30–31 (weapons/armor), 40–45 (perception and combat), 82–87 (Foes and Traits). The source describes occasional GC stat rolls; this version follows the requested no-roll Foe profile. Such exceptions can be handled separately at the table.

## Development

`worker.js` is the worker source. `build.py` embeds it in `sheet.html`; do not edit the generated worker block directly.

```sh
python3 build.py
node --test tests/worker.test.cjs
python3 preview.py
```

Optional browser check requires Playwright and Chromium. Start `python3 -m http.server 8001 --bind 127.0.0.1` in this folder, then run `node tests/layout.cjs`. Override `CHROMIUM_PATH` or `PREVIEW_URL` if needed. This is a local layout check; it does not contact Roll20.

This project is unaffiliated with Roll20 or Four-Color Studios. Game text and rules remain the property of their respective owners.
