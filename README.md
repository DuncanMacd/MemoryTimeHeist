# Memory Time Heist

A browser-based time-travel game. Open `index.html` in a modern browser to play; no installation or server is required.

You've travelled back in time to try and steal memory before people buy it in devices and fail to use it in the way you think is best. Unfortunately, you and your AI have travelled slightly too far back in time and need to steal memory for your AI to work out how to get you back to the present day.

Start from the title screen to enter the first location, the computer shop. **Title Screen** returns to the story without resetting the shop; enter again to resume. The game shell in `game-shell.js` keeps the title screen and level navigation separate from the shop's controls and state. Memory collection, additional levels, progression, and winning are not implemented yet.

- Move using the arrow keys or WASD.
- Stand still near equipment on a display bench and press Space to take it.
- Search the storage units behind the counter in the same way. They disappear when the search is complete.
- Each item has its own search time and progress. Move, press Space again, or switch away from the window to pause; return to the item and press Space to resume.
- Use **Reset Shop** to restore the equipment, clear all search progress, reset the storage units, and return to the entrance.

Search progress lasts for the current game session; refreshing or reopening the page starts a new game.

## Editing item data

Each searchable object has its own record in `item-data.js`. Items are grouped by display row and side; their numbers run from left to right. Storage units are numbered from left to right behind the counter. For example:

```js
"upper-left-printer": {
  searchSeconds: 5
},
```

Change `searchSeconds` to set the duration in seconds. Use a positive number for every item, save the file, and refresh the game. Duplicate items can have different times and always keep their own progress. Additional properties can be added to each record later; search results and inventory are not implemented yet.

The original shop image is flattened. On load, the game prepares the wall and floor behind the storage units and a clean shop background. Equipment and storage are drawn on separate layers, so taking an item hides its layer. Each display bench has equipment on its top level and a wooden front; the checkout counter is scenery.

The embedded image data in `assets/computer-shop-data.js` lets browsers prepare the layers when the game is opened directly as a local file. If the source image is replaced, regenerate that file from `assets/computer-shop.png` before playing.
