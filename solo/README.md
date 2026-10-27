# Solo / co-op Crew sheet

This is a separate Roll20 sheet for one player running a crew and its game-controlled opposition. The original RPG/individual-character version remains in the repository root.

## Install

Create a separate Roll20 game for this version. Roll20 normally selects one custom sheet template per game, so replacing the RPG HTML/CSS in an existing game would change the sheet for all Characters there. Custom sheets normally require Pro.

Paste `solo/sheet.html` into the custom sheet HTML editor and `solo/sheet.css` into CSS; turn Legacy Sanitization off. The HTML already contains the worker and roll template. Create one Roll20 Character and give it the crew's name.

## Use

1. Add a roster entry for each member or foe with Roll20's native Add control. Use Modify to delete or reorder entries.
2. Enter its name and select Party or Foe. Mark Active for participants in the current battle. Reserve entries keep their information.
3. The collapsed summary shows Active, name, profile, Health and initiative chit. Expand **Combat & details** for stats, Move, Luck, conditions, armor and campaign details.
4. Choose **Battle · active only** to hide reserves. Returning to Full roster restores them without changing data. An inactive selected loadout is also hidden in Battle view.
5. Click **Loadout** on a roster entry to show its weapon and trait lists in the editor below the roster. Use Add/Modify for as many weapons and traits as needed. A new entry links to the selected member when edited. Finish editing it before selecting another member. Nothing is reassigned when you switch selection; duplicate display names are supported because links use stable row identifiers internally.
6. Roll from that member's stat buttons or their weapon entries. Chat shows the member's name, never the crew name. Weapon rolls use the owning member's MA/RA and the clicked weapon's damage. A member must be named and Active to roll. Foes have full TN inputs and no roll buttons or Luck.

Party stat bonuses and Foe TNs are separate fields. Profile switches preserve both. HP, Move and other shared fields remain on the entry. Defaults are HP 15, Move 5, Party bonuses 0, Foe TNs 11; allocate values manually. Health, Luck, shared Luck, Boons, Bumps, Heat and conditions are manual trackers. Shared Luck is intended for resources such as a subplot pool, not automatic pooling of personal Luck.

X-Factor and initiative chit fields are reminders only. They do not draw cards, update Roll20's turn tracker or apply TN/damage/action bonuses. Set incoming damage bonus for each member before defense rolls. Apply trait exceptions, resources, damage and armor effects manually. Boon rerolls are handled in chat as in the RPG version.

Only one loadout editor is visible at a time. This avoids nested repeating lists, which Roll20 does not support. Weapons and traits are linked to their member, not to the currently displayed selection when rolling. Deleting a member hides its linked lists but retains those rows to avoid silently deleting data; delete unwanted weapons and traits before removing the member. No automatic import from existing RPG Characters is provided.

## Validation

- Eight solo worker tests cover filtering without data loss, loadout ownership, row-specific roll name/stats/damage, new-entry assignment, inactive/Foe roll guards, armor and deletion behavior.
- Thirteen existing RPG calculation tests also pass.
- Browser checks cover collapse/expand, active-only view, Foe TNs and hidden roll/Luck controls, loadout switching with preserved entries, and a 520px layout.
- Live Roll20 validation is still required for native repeating controls, saved data across sessions, sheet-worker events and computed chat templates. The preview simulates the controls and does not save data or roll dice.

To regenerate and test from the repository root:

```sh
python3 solo/build.py
python3 solo/preview.py
node --test tests/worker.test.cjs solo/tests/worker.test.cjs
```

`solo/build.py` reuses the RPG version's tested dice functions, roll formatter and chat template without modifying the RPG files. Edit solo worker source in `solo/worker.js`, not the generated bundle or HTML.

For the optional Playwright browser check, serve the repository locally on port 8002 and run `node solo/tests/layout.cjs`. `CHROMIUM_PATH` and `PREVIEW_URL` can override defaults.
