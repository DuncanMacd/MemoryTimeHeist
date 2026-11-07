# Memory Time Heist

A browser-based time-travel game. Open `index.html` in a modern browser to play; no installation or server is required.

You've travelled back in time to try and steal memory before people buy it in devices and fail to use it in the way you think is best. Unfortunately, you and your AI have travelled slightly too far back in time and need to steal memory for your AI to work out how to get you back to the present day.

Start from the title screen to enter the computer shop. The five levels have memory targets of 64, 128, 256, 512, and 1024 MB (1 GB), respectively, and each has a timer. Search items to collect memory for your AI; the front doors at the bottom of the shop stay locked until you meet the target. Leave before time runs out to advance. Running out of time ends the game. After escaping level five, the levels loop back to level one.

After each successful escape, the level-complete screen shows how much memory you collected. The AI tries to plot a route home; after level five, it succeeds but sends you back to level one. The next level's target, time limit, and **Next Level** button then appear. Select it when ready; the next timer starts only after entering the level. After level five, you can instead select **Title Screen** to end the run and return to the title.

Each searchable item, including storage and the printer, independently contains a random amount of memory. Zero is always possible; the non-zero choices double from the level's minimum to its maximum, as configured in `level-data.js`. Each option is equally likely. The amount is assigned when a level starts and is awarded once when the search completes. The AI panel shows the last find and progress toward the current level's target; its progress bar is orange until the target is met, then turns green. Memory does not carry over between levels. Bench items are shuffled between display positions at the start of each level or on reset; storage behind the counter stays in place. Resetting also rerolls their memory.

**Title Screen** pauses the timer and returns to the story without resetting the shop; start again to resume. The timer also pauses while the browser tab is hidden. After game over, return to the title screen to start again at level 1.

- Move using the arrow keys or WASD.
- Stand still near equipment on a display bench and press Space to take it.
- Search the storage units behind the counter in the same way. They disappear when the search is complete.
- Avoid security guards entering through the back doors: touching one freezes the scene briefly, then ends the game. Guards patrol around the counter and benches on routes determined by their door. Some can spot you within range unless a counter or bench blocks their view. Guards that lose sight investigate your last known location before returning to patrol. On fullforce levels, one guard's sighting alerts the others.
- Each item has its own search time and progress. Move, press Space again, or switch away from the window to pause; return to the item and press Space to resume.
- Use **Reset Shop** to restart the current level with a fresh timer, restore the equipment, clear search progress, and return to the entrance.

Search progress lasts for the current game session; refreshing or reopening the page starts a new game.

## Editing item data

Each searchable object has its own record in `item-data.js`. Bench item IDs describe their original display row, side and left-to-right order, but the items move between display positions when the level starts or resets. Storage units are numbered from left to right behind the counter and stay in place. For example:

```js
"upper-left-printer": {
  searchSeconds: 5
},
```

Change `searchSeconds` to set the duration in seconds. Use a positive number for every item, save the file, and refresh the game. Duplicate items can have different times and always keep their own progress.

## Editing levels

Edit `level-data.js` to change the five levels' `seconds`, `targetMB`, `memoryRange`, `guardCount`, `guardBehaviour`, `guardSpeed`, and `guardArrival` values. Times must be positive numbers and targets must be positive whole numbers of MB. `memoryRange` sets the positive `minMB` and `maxMB` values; both must be whole-number powers of two, with the minimum no greater than the maximum. Zero is always included automatically. Guard counts must be whole numbers from 0 to 4. Behaviour must be `"route"` (patrol only), `"observant"` (individual guards pursue on sight), or `"fullforce"` (a sighting alerts every guard).

`guardSpeed` sets `normal` and `burst` as fractions of player speed, and `burstSeconds` as the duration. For example, `0.75`, `5`, `0.85` means 75% speed normally and 85% for five seconds. Each guard gets one burst per level, triggered by its first sighting or a fullforce alert; it continues counting down even if sight is lost, and afterwards the guard uses normal speed while patrolling or chasing. Patrol-only guards do not get alerted. The normal speed must be positive, the burst speed at least the normal speed, and the duration non-negative. The burst pauses with the level and resets when the level resets.

`guardArrival` contains non-negative `initialDelay` and `interval` values in seconds. With a positive initial delay, guards arrive one at a time, alternating doors: for example, `5, 5` brings guards at 5, 10, 15, and 20 seconds. With an initial delay of zero, up to two guards arrive immediately, one per door, and up to two more arrive after the interval. A zero interval brings all remaining guards immediately. Counts always limit the total, including when a wave is incomplete. Arrival timing pauses with the level and restarts on reset. Save and refresh to apply changes.

The original shop image is flattened. On load, the game prepares the wall and floor behind the storage units and a clean shop background. Equipment and storage are drawn on separate layers, so taking an item hides its layer. Each display bench has equipment on its top level and a wooden front; the checkout counter is scenery. The title and level-complete screens use a fully stocked rendering of these same layers.

The embedded image data in `assets/computer-shop-data.js` lets browsers prepare the layers when the game is opened directly as a local file. If the source image is replaced, regenerate that file from `assets/computer-shop.png` before playing.
