import Phaser from 'phaser';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin.js';
import { BootScene } from './game/scenes/BootScene.js';
import { MenuScene } from './game/scenes/MenuScene.js';
import { MapScene } from './game/scenes/MapScene.js';
import { CombatScene } from './game/scenes/CombatScene.js';
import { RewardScene } from './game/scenes/RewardScene.js';
import { GameOverScene } from './game/scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 1200,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene, MapScene, CombatScene, RewardScene, GameOverScene],
  plugins: {
    scene: [{
      key: 'rexBoard',
      plugin: BoardPlugin,
      mapping: 'rexBoard',
    }],
  },
};

const game = new Phaser.Game(config);
window.__PHASER_GAME__ = game;
