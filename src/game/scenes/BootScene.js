/**
 * BootScene — Generate gem textures + UI assets via Graphics
 * No external sprites needed — all procedural.
 */
import { GEM_LIST, BOARD } from '../../config/balance.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const r = BOARD.gemRadius;
    const d = r * 2;

    // Generate gem textures — colored circles with inner highlight
    GEM_LIST.forEach(gem => {
      const g = this.add.graphics();

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(r + 2, r + 2, r - 2);

      // Main circle
      g.fillStyle(gem.color, 1);
      g.fillCircle(r, r, r - 2);

      // Inner highlight (lighter, smaller circle offset up-left)
      const lighter = Phaser.Display.Color.IntegerToColor(gem.color);
      lighter.brighten(30);
      g.fillStyle(lighter.color, 0.5);
      g.fillCircle(r - 6, r - 6, r * 0.45);

      g.generateTexture(`gem_${gem.id}`, d, d);
      g.destroy();
    });

    // Burned gem overlay (for Dragon Emperor mechanic)
    const bg = this.add.graphics();
    bg.fillStyle(0xff0000, 0.4);
    bg.fillCircle(r, r, r - 2);
    bg.lineStyle(3, 0xff0000, 0.8);
    // X mark
    bg.lineBetween(r - 12, r - 12, r + 12, r + 12);
    bg.lineBetween(r + 12, r - 12, r - 12, r + 12);
    bg.generateTexture('gem_burned', d, d);
    bg.destroy();

    // Special tile textures
    this.makeSpecialGem('gem_line_h', 0xffffff, 'h');
    this.makeSpecialGem('gem_line_v', 0xffffff, 'v');
    this.makeSpecialGem('gem_bomb', 0xff6b6b, 'bomb');
    this.makeSpecialGem('gem_color_bomb', 0xffffff, 'star');

    // Map node icons
    this.makeCircle('node_combat', 18, 0xe74c3c);
    this.makeCircle('node_elite', 18, 0xd63031);
    this.makeCircle('node_shop', 18, 0xf39c12);
    this.makeCircle('node_rest', 18, 0x2ecc71);
    this.makeCircle('node_mystery', 18, 0x6c5ce7);
    this.makeCircle('node_boss', 24, 0xff0000);
    this.makeCircle('node_treasure', 18, 0xf1c40f);

    this.scene.start('Menu');
  }

  makeCircle(key, radius, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeSpecialGem(key, color, type) {
    const r = BOARD.gemRadius;
    const d = r * 2;
    const g = this.add.graphics();

    g.fillStyle(color, 0.15);
    g.fillCircle(r, r, r - 2);

    g.lineStyle(2, color, 0.8);

    if (type === 'h') {
      // Horizontal line
      g.lineBetween(4, r, d - 4, r);
      g.fillStyle(color, 0.6);
      g.fillTriangle(d - 8, r - 6, d - 8, r + 6, d - 2, r);
      g.fillTriangle(8, r - 6, 8, r + 6, 2, r);
    } else if (type === 'v') {
      // Vertical line
      g.lineBetween(r, 4, r, d - 4);
      g.fillStyle(color, 0.6);
      g.fillTriangle(r - 6, d - 8, r + 6, d - 8, r, d - 2);
      g.fillTriangle(r - 6, 8, r + 6, 8, r, 2);
    } else if (type === 'bomb') {
      // Explosion icon — circle with rays
      g.fillStyle(color, 0.4);
      g.fillCircle(r, r, r * 0.4);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = r + Math.cos(angle) * (r * 0.5);
        const y1 = r + Math.sin(angle) * (r * 0.5);
        const x2 = r + Math.cos(angle) * (r * 0.85);
        const y2 = r + Math.sin(angle) * (r * 0.85);
        g.lineBetween(x1, y1, x2, y2);
      }
    } else if (type === 'star') {
      // Star shape for color bomb
      g.fillStyle(0xffffff, 0.8);
      const cx = r, cy = r;
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const dist = i % 2 === 0 ? r * 0.7 : r * 0.35;
        points.push(cx + Math.cos(angle) * dist);
        points.push(cy + Math.sin(angle) * dist);
      }
      g.fillPoints(points, true);
    }

    g.generateTexture(key, d, d);
    g.destroy();
  }
}
