# Pixel Heist

A small, browser-based computer shop game. Open `index.html` in a modern browser to play; no installation or server is required.

- Move using the arrow keys or WASD.
- Stand still near equipment on a display bench and press Space to take it.
- Search the storage units behind the counter in the same way. They disappear when the search is complete.
- Each item has its own search time and progress. Move, press Space again, or switch away from the window to pause; return to the item and press Space to resume.
- Use **Reset Shop** to restore the equipment, clear all search progress, reset the storage units, and return to the entrance.

Search progress lasts for the current game session; refreshing or reopening the page starts a new game.

The original shop image is flattened. On load, the game prepares the wall and floor behind the storage units and a clean shop background. Equipment and storage are drawn on separate layers, so taking an item hides its layer. Each display bench has equipment on its top level and a wooden front; the checkout counter is scenery.

The embedded image data in `assets/computer-shop-data.js` lets browsers prepare the layers when the game is opened directly as a local file. If the source image is replaced, regenerate that file from `assets/computer-shop.png` before playing.
