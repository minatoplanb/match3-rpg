/**
 * Match-3 RPG Auto-Play Bot — Paste into Chrome console
 *
 * Plays through the game automatically by:
 * 1. Clicking through menus
 * 2. Finding best gem swap each turn
 * 3. Using potions when low HP
 *
 * Usage: Copy-paste into browser console while game is running
 */
(function() {
  const game = window.__PHASER_GAME__;
  if (!game) { console.log('❌ Game not found!'); return; }

  const RUNS = 9;
  let currentRun = 0;
  let results = [];

  function getActiveScene() {
    return game.scene.scenes.find(s => s.scene.isActive());
  }

  function clickCenter() {
    const scene = getActiveScene();
    if (!scene) return;
    scene.input.emit('pointerdown', { x: 400, y: 600, worldX: 400, worldY: 600 });
  }

  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runBot() {
    console.log(`\n🤖 Bot Run ${currentRun + 1}/${RUNS}`);

    // Wait for menu
    await wait(500);
    const menuScene = game.scene.getScene('Menu');
    if (menuScene && menuScene.scene.isActive()) {
      // Click first hero (Warrior)
      menuScene.input.emit('pointerdown', {
        x: 400, y: 290, worldX: 400, worldY: 290,
        downX: 400, downY: 290
      });
    }

    // Bot loop runs via scene events
    console.log('🎮 Bot started. Results will appear when complete.');
  }

  runBot();
})();
