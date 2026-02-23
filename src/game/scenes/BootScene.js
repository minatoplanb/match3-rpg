/**
 * BootScene — Generate gem textures + UI assets via Graphics
 * No external sprites needed — all procedural.
 * V2: High-quality gems with symbols, gradients, glow
 */
import { GEM_LIST, BOARD } from '../../config/balance.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const { width, height } = this.scale;

    // Loading screen background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0f1a3e, 0x0f1a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Game title
    this.add.text(width / 2, height / 2 - 80, 'MATCH-3 RPG', {
      fontSize: '36px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 40, 'Puzzle Quest Roguelike', {
      fontSize: '14px', fontFamily: 'monospace', color: '#74b9ff',
    }).setOrigin(0.5);

    // Loading bar
    const barW = 300;
    const barH = 16;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 + 20;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 0.9);
    barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    barBg.lineStyle(1, 0x636e72, 0.4);
    barBg.strokeRoundedRect(barX, barY, barW, barH, barH / 2);

    const barFill = this.add.graphics();
    const loadText = this.add.text(width / 2, barY + barH + 18, 'Loading...', {
      fontSize: '12px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    // Simulate loading steps with delayed calls so the bar can update
    const totalSteps = 5;
    let step = 0;

    const updateBar = (progress, label) => {
      barFill.clear();
      barFill.fillStyle(0xf1c40f, 0.9);
      barFill.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4, (barH - 4) / 2);
      loadText.setText(label);
    };

    // Step 1: Generate gem textures
    this.time.delayedCall(100, () => {
      updateBar(0.1, 'Generating gems...');
      this.generateGemTextures();
      step++;
    });

    // Step 2: Generate enemy textures
    this.time.delayedCall(250, () => {
      updateBar(0.4, 'Creating enemies...');
      this.generateEnemyTextures();
      step++;
    });

    // Step 3: Generate UI textures
    this.time.delayedCall(400, () => {
      updateBar(0.6, 'Building UI...');
      this.generateUITextures();
      step++;
    });

    // Step 4: Generate special tiles
    this.time.delayedCall(500, () => {
      updateBar(0.85, 'Preparing specials...');
      this.generateSpecialTextures();
      step++;
    });

    // Step 5: Done — transition
    this.time.delayedCall(700, () => {
      updateBar(1.0, 'Ready!');
      this.time.delayedCall(300, () => {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('Menu'));
      });
    });
  }

  generateGemTextures() {
    const r = BOARD.gemRadius;
    const d = r * 2;
    const pad = 4; // padding for glow
    const texSize = d + pad * 2;

    // Generate gem textures — polished with gradient + symbol
    GEM_LIST.forEach(gem => {
      const g = this.add.graphics();
      const cx = texSize / 2;
      const cy = texSize / 2;
      const gemR = r - 1;

      // 1) Drop shadow
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(cx + 2, cy + 3, gemR);

      // 2) Outer glow ring
      g.fillStyle(gem.color, 0.12);
      g.fillCircle(cx, cy, gemR + 2);

      // 3) Base circle — darker ring for depth
      const darkerColor = Phaser.Display.Color.IntegerToColor(gem.color);
      darkerColor.darken(25);
      g.fillStyle(darkerColor.color, 1);
      g.fillCircle(cx, cy, gemR);

      // 4) Main body — gradient via concentric circles
      for (let i = 5; i >= 0; i--) {
        const t = i / 5;
        const radius = gemR * (0.55 + t * 0.4);
        const blended = Phaser.Display.Color.IntegerToColor(gem.color);
        if (t > 0.5) blended.brighten(10 * (t - 0.5));
        g.fillStyle(blended.color, 0.9 + t * 0.1);
        g.fillCircle(cx - t * 2, cy - t * 2, radius);
      }

      // 5) Glossy highlight — upper-left crescent
      g.fillStyle(0xffffff, 0.30);
      g.fillCircle(cx - gemR * 0.25, cy - gemR * 0.25, gemR * 0.45);
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(cx - gemR * 0.15, cy - gemR * 0.15, gemR * 0.6);

      // 6) Draw symbol
      this.drawGemSymbol(g, gem.id, cx, cy, gemR);

      // 7) Rim highlight (bottom-right edge)
      g.lineStyle(1.5, 0xffffff, 0.12);
      g.beginPath();
      g.arc(cx, cy, gemR - 1, Math.PI * 0.1, Math.PI * 0.6);
      g.strokePath();

      g.generateTexture(`gem_${gem.id}`, texSize, texSize);
      g.destroy();
    });

    // Burned gem overlay (for Dragon Emperor mechanic)
    const burnedG = this.add.graphics();
    burnedG.fillStyle(0xff0000, 0.4);
    burnedG.fillCircle(r, r, r - 2);
    burnedG.lineStyle(3, 0xff0000, 0.8);
    burnedG.lineBetween(r - 12, r - 12, r + 12, r + 12);
    burnedG.lineBetween(r + 12, r - 12, r - 12, r + 12);
    burnedG.generateTexture('gem_burned', d, d);
    burnedG.destroy();
  }

  generateSpecialTextures() {
    this.makeSpecialGem('gem_line_h', 0xffffff, 'h');
    this.makeSpecialGem('gem_line_v', 0xffffff, 'v');
    this.makeSpecialGem('gem_bomb', 0xff6b6b, 'bomb');
    this.makeSpecialGem('gem_color_bomb', 0xffffff, 'star');
  }

  generateUITextures() {
    // Map node icons
    this.makeNodeIcon('node_combat', 18, 0xe74c3c, '⚔');
    this.makeNodeIcon('node_elite', 18, 0xd63031, '⚡');
    this.makeNodeIcon('node_shop', 18, 0xf39c12, '$');
    this.makeNodeIcon('node_rest', 18, 0x2ecc71, '+');
    this.makeNodeIcon('node_mystery', 18, 0x6c5ce7, '?');
    this.makeNodeIcon('node_boss', 24, 0xff0000, '☠');
    this.makeNodeIcon('node_treasure', 18, 0xf1c40f, '★');

    // Bar textures
    this.makeBarTexture('bar_bg', 200, 20, 0x1a1a2e, 0x2d3436);
    this.makeBarTexture('bar_hp_green', 200, 20, 0x00b894, 0x55efc4);
    this.makeBarTexture('bar_hp_red', 200, 20, 0xd63031, 0xff7675);
    this.makeBarTexture('bar_skill', 200, 14, 0x6c5ce7, 0xa29bfe);
  }

  // ── GEM SYMBOLS ───────────────────────────────────────────

  drawGemSymbol(g, gemId, cx, cy, r) {
    const s = r * 0.38; // symbol scale

    g.lineStyle(2.5, 0xffffff, 0.85);

    switch (gemId) {
      case 0: // Sword — crossed blades
        g.fillStyle(0xffffff, 0.15);
        // Vertical blade
        g.lineBetween(cx, cy - s * 1.1, cx, cy + s * 1.1);
        // Crossguard
        g.lineBetween(cx - s * 0.6, cy - s * 0.15, cx + s * 0.6, cy - s * 0.15);
        // Blade tip (triangle)
        g.fillStyle(0xffffff, 0.25);
        g.fillTriangle(cx - s * 0.2, cy - s * 1.1, cx + s * 0.2, cy - s * 1.1, cx, cy - s * 1.4);
        // Pommel
        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(cx, cy + s * 1.1, s * 0.15);
        break;

      case 1: // Fire — flame shape
        g.lineStyle(0);
        g.fillStyle(0xffffff, 0.3);
        // Main flame body
        const flamePoints = [
          cx, cy - s * 1.3,           // top tip
          cx + s * 0.3, cy - s * 0.6, // right upper
          cx + s * 0.7, cy + s * 0.2, // right mid
          cx + s * 0.5, cy + s * 0.8, // right lower
          cx, cy + s * 0.5,           // bottom center
          cx - s * 0.5, cy + s * 0.8, // left lower
          cx - s * 0.7, cy + s * 0.2, // left mid
          cx - s * 0.3, cy - s * 0.6, // left upper
        ];
        g.fillPoints(flamePoints, true);
        // Inner flame
        g.fillStyle(0xffffff, 0.25);
        const innerFlame = [
          cx, cy - s * 0.8,
          cx + s * 0.25, cy - s * 0.1,
          cx + s * 0.35, cy + s * 0.5,
          cx, cy + s * 0.2,
          cx - s * 0.35, cy + s * 0.5,
          cx - s * 0.25, cy - s * 0.1,
        ];
        g.fillPoints(innerFlame, true);
        break;

      case 2: // Shield — shield outline
        g.lineStyle(2.5, 0xffffff, 0.7);
        // Shield body as polygon
        const shieldPts = [
          cx - s * 0.75, cy - s * 0.9,  // top-left
          cx + s * 0.75, cy - s * 0.9,  // top-right
          cx + s * 0.75, cy + s * 0.1,  // mid-right
          cx, cy + s * 1.1,             // bottom point
          cx - s * 0.75, cy + s * 0.1,  // mid-left
        ];
        g.strokePoints(shieldPts, true);
        // Inner cross on shield
        g.lineStyle(1.5, 0xffffff, 0.35);
        g.lineBetween(cx, cy - s * 0.6, cx, cy + s * 0.5);
        g.lineBetween(cx - s * 0.45, cy - s * 0.2, cx + s * 0.45, cy - s * 0.2);
        break;

      case 3: // Heart — heart shape
        g.lineStyle(0);
        g.fillStyle(0xffffff, 0.35);
        // Heart using two circles + triangle
        const hSize = s * 0.55;
        g.fillCircle(cx - hSize * 0.55, cy - hSize * 0.2, hSize * 0.65);
        g.fillCircle(cx + hSize * 0.55, cy - hSize * 0.2, hSize * 0.65);
        g.fillTriangle(
          cx - hSize * 1.15, cy + hSize * 0.05,
          cx + hSize * 1.15, cy + hSize * 0.05,
          cx, cy + hSize * 1.5
        );
        // Small inner highlight
        g.fillStyle(0xffffff, 0.2);
        g.fillCircle(cx - hSize * 0.3, cy - hSize * 0.35, hSize * 0.3);
        break;

      case 4: // Coin — circle with G
        g.lineStyle(2, 0xffffff, 0.5);
        g.strokeCircle(cx, cy, s * 0.75);
        // Inner ring
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeCircle(cx, cy, s * 0.55);
        // "G" letter approximation — a "C" with a horizontal bar
        g.lineStyle(2, 0xffffff, 0.5);
        g.beginPath();
        g.arc(cx, cy, s * 0.35, -Math.PI * 0.3, Math.PI * 0.9);
        g.strokePath();
        g.lineBetween(cx, cy, cx + s * 0.3, cy);
        break;

      case 5: // Star — 5-pointed star
        g.lineStyle(0);
        g.fillStyle(0xffffff, 0.4);
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const dist = i % 2 === 0 ? s * 0.9 : s * 0.4;
          points.push(cx + Math.cos(angle) * dist);
          points.push(cy + Math.sin(angle) * dist);
        }
        g.fillPoints(points, true);
        // Center highlight
        g.fillStyle(0xffffff, 0.2);
        g.fillCircle(cx, cy, s * 0.25);
        break;
    }
  }

  // ── ENEMY TEXTURES ─────────────────────────────────────────

  generateEnemyTextures() {
    const enemies = {
      slime:          { color: 0x2ecc71, shape: 'slime' },
      goblin:         { color: 0xe67e22, shape: 'goblin' },
      wolf:           { color: 0x95a5a6, shape: 'wolf' },
      goblin_archer:  { color: 0xd35400, shape: 'goblin' },
      scorpion:       { color: 0xc0392b, shape: 'insect' },
      mummy:          { color: 0xbdc3c7, shape: 'tall' },
      sand_mage:      { color: 0xf39c12, shape: 'mage' },
      ice_golem:      { color: 0x74b9ff, shape: 'golem' },
      frost_witch:    { color: 0xa29bfe, shape: 'mage' },
      skeleton:       { color: 0xdfe6e9, shape: 'skeleton' },
      imp:            { color: 0xfd79a8, shape: 'imp' },
      fire_elemental: { color: 0xe17055, shape: 'elemental' },
      demon_knight:   { color: 0x636e72, shape: 'knight' },
    };

    const bosses = {
      ogre_king:      { color: 0xd63031, shape: 'ogre' },
      sand_wyrm:      { color: 0xe17055, shape: 'wyrm' },
      lich_lord:      { color: 0x6c5ce7, shape: 'mage' },
      dragon_emperor: { color: 0xfdcb6e, shape: 'dragon' },
    };

    for (const [key, data] of Object.entries({ ...enemies, ...bosses })) {
      const isBoss = key in bosses;
      const size = isBoss ? 120 : 80;
      this.drawEnemyTexture(`enemy_${key}`, size, data.color, data.shape, isBoss);
    }

    // Fallback generic enemy texture
    this.drawEnemyTexture('enemy_generic', 80, 0xe74c3c, 'slime', false);
  }

  drawEnemyTexture(key, size, color, shape, isBoss) {
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    const lighter = Phaser.Display.Color.IntegerToColor(color);
    lighter.brighten(30);
    const darker = Phaser.Display.Color.IntegerToColor(color);
    darker.darken(30);

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx + 2, cy + size * 0.4, size * 0.7, size * 0.15);

    switch (shape) {
      case 'slime':
        // Blob shape
        g.fillStyle(darker.color, 1);
        g.fillEllipse(cx, cy + size * 0.1, size * 0.75, size * 0.55);
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy + size * 0.05, size * 0.65, size * 0.5);
        // Highlight
        g.fillStyle(lighter.color, 0.4);
        g.fillEllipse(cx - size * 0.1, cy - size * 0.08, size * 0.3, size * 0.2);
        break;

      case 'goblin':
        // Body
        g.fillStyle(color, 1);
        g.fillRoundedRect(cx - size * 0.25, cy - size * 0.15, size * 0.5, size * 0.55, 8);
        // Head
        g.fillStyle(color, 1);
        g.fillCircle(cx, cy - size * 0.2, size * 0.22);
        // Ears
        g.fillStyle(darker.color, 1);
        g.fillTriangle(cx - size * 0.3, cy - size * 0.22, cx - size * 0.15, cy - size * 0.42, cx - size * 0.1, cy - size * 0.18);
        g.fillTriangle(cx + size * 0.3, cy - size * 0.22, cx + size * 0.15, cy - size * 0.42, cx + size * 0.1, cy - size * 0.18);
        break;

      case 'wolf':
        // Body — elongated
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy + size * 0.05, size * 0.7, size * 0.4);
        // Head
        g.fillStyle(color, 1);
        g.fillCircle(cx + size * 0.2, cy - size * 0.15, size * 0.2);
        // Ears
        g.fillStyle(darker.color, 1);
        g.fillTriangle(cx + size * 0.12, cy - size * 0.35, cx + size * 0.18, cy - size * 0.45, cx + size * 0.25, cy - size * 0.3);
        g.fillTriangle(cx + size * 0.25, cy - size * 0.35, cx + size * 0.32, cy - size * 0.45, cx + size * 0.38, cy - size * 0.3);
        // Snout
        g.fillStyle(lighter.color, 0.6);
        g.fillEllipse(cx + size * 0.35, cy - size * 0.12, size * 0.12, size * 0.08);
        break;

      case 'insect':
        // Segmented body
        g.fillStyle(color, 1);
        g.fillEllipse(cx - size * 0.15, cy + size * 0.05, size * 0.3, size * 0.35);
        g.fillEllipse(cx + size * 0.15, cy + size * 0.05, size * 0.35, size * 0.3);
        // Pincers
        g.lineStyle(3, darker.color, 1);
        g.beginPath();
        g.arc(cx - size * 0.2, cy - size * 0.2, size * 0.15, 0, Math.PI * 0.8);
        g.strokePath();
        g.beginPath();
        g.arc(cx + size * 0.2, cy - size * 0.2, size * 0.15, Math.PI * 0.2, Math.PI);
        g.strokePath();
        // Tail
        g.lineStyle(3, darker.color, 1);
        g.beginPath();
        g.arc(cx + size * 0.3, cy - size * 0.1, size * 0.25, Math.PI * 0.5, Math.PI * 1.5);
        g.strokePath();
        break;

      case 'tall':
        // Tall humanoid (mummy)
        g.fillStyle(color, 1);
        g.fillRoundedRect(cx - size * 0.2, cy - size * 0.3, size * 0.4, size * 0.7, 6);
        // Head
        g.fillCircle(cx, cy - size * 0.35, size * 0.15);
        // Wrappings — horizontal lines
        g.lineStyle(1.5, darker.color, 0.5);
        for (let i = 0; i < 5; i++) {
          const ly = cy - size * 0.15 + i * size * 0.1;
          g.lineBetween(cx - size * 0.18, ly, cx + size * 0.18, ly);
        }
        break;

      case 'mage':
        // Robed figure with hat
        g.fillStyle(color, 1);
        // Robe (triangle body)
        g.fillTriangle(cx - size * 0.3, cy + size * 0.35, cx + size * 0.3, cy + size * 0.35, cx, cy - size * 0.1);
        // Head
        g.fillCircle(cx, cy - size * 0.15, size * 0.13);
        // Hat
        g.fillStyle(darker.color, 1);
        g.fillTriangle(cx - size * 0.18, cy - size * 0.22, cx + size * 0.18, cy - size * 0.22, cx, cy - size * 0.48);
        // Staff
        g.lineStyle(2, lighter.color, 0.7);
        g.lineBetween(cx + size * 0.25, cy - size * 0.25, cx + size * 0.3, cy + size * 0.35);
        // Orb on staff
        g.fillStyle(lighter.color, 0.8);
        g.fillCircle(cx + size * 0.25, cy - size * 0.28, size * 0.06);
        break;

      case 'golem':
        // Blocky large body
        g.fillStyle(darker.color, 1);
        g.fillRoundedRect(cx - size * 0.32, cy - size * 0.2, size * 0.64, size * 0.6, 4);
        g.fillStyle(color, 1);
        g.fillRoundedRect(cx - size * 0.28, cy - size * 0.22, size * 0.56, size * 0.55, 4);
        // Head
        g.fillRoundedRect(cx - size * 0.15, cy - size * 0.38, size * 0.3, size * 0.2, 3);
        // Cracks
        g.lineStyle(1.5, darker.color, 0.5);
        g.lineBetween(cx - size * 0.1, cy - size * 0.05, cx + size * 0.05, cy + size * 0.15);
        g.lineBetween(cx + size * 0.05, cy + size * 0.15, cx + size * 0.2, cy + size * 0.1);
        break;

      case 'skeleton':
        // Skull + ribcage
        g.fillStyle(color, 1);
        // Skull
        g.fillCircle(cx, cy - size * 0.22, size * 0.18);
        g.fillRoundedRect(cx - size * 0.12, cy - size * 0.18, size * 0.24, size * 0.12, 2);
        // Ribcage
        g.lineStyle(2, color, 0.8);
        g.lineBetween(cx, cy - size * 0.08, cx, cy + size * 0.3);
        for (let i = 0; i < 3; i++) {
          const ry = cy + i * size * 0.1;
          g.beginPath();
          g.arc(cx, ry, size * 0.15, Math.PI * 0.2, Math.PI * 0.8);
          g.strokePath();
        }
        break;

      case 'imp':
        // Small winged demon
        g.fillStyle(color, 1);
        g.fillCircle(cx, cy, size * 0.2);
        // Wings
        g.fillStyle(darker.color, 0.7);
        g.fillTriangle(cx - size * 0.35, cy - size * 0.2, cx - size * 0.08, cy - size * 0.05, cx - size * 0.1, cy + size * 0.15);
        g.fillTriangle(cx + size * 0.35, cy - size * 0.2, cx + size * 0.08, cy - size * 0.05, cx + size * 0.1, cy + size * 0.15);
        // Horns
        g.fillStyle(darker.color, 1);
        g.fillTriangle(cx - size * 0.1, cy - size * 0.2, cx - size * 0.05, cy - size * 0.2, cx - size * 0.15, cy - size * 0.38);
        g.fillTriangle(cx + size * 0.1, cy - size * 0.2, cx + size * 0.05, cy - size * 0.2, cx + size * 0.15, cy - size * 0.38);
        // Tail
        g.lineStyle(2, darker.color, 0.8);
        g.beginPath();
        g.arc(cx + size * 0.15, cy + size * 0.25, size * 0.15, -Math.PI * 0.5, Math.PI * 0.5);
        g.strokePath();
        break;

      case 'elemental':
        // Swirling flame/energy shape
        g.fillStyle(color, 0.8);
        g.fillCircle(cx, cy, size * 0.25);
        // Energy tendrils
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
          const dist = size * 0.2;
          const endDist = size * 0.38;
          g.lineStyle(3, lighter.color, 0.6);
          g.lineBetween(
            cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist,
            cx + Math.cos(angle) * endDist, cy + Math.sin(angle + 0.3) * endDist
          );
        }
        // Core glow
        g.fillStyle(lighter.color, 0.5);
        g.fillCircle(cx, cy, size * 0.12);
        break;

      case 'knight':
        // Armored humanoid
        g.fillStyle(color, 1);
        // Body armor
        g.fillRoundedRect(cx - size * 0.22, cy - size * 0.15, size * 0.44, size * 0.5, 4);
        // Helmet
        g.fillStyle(darker.color, 1);
        g.fillRoundedRect(cx - size * 0.16, cy - size * 0.38, size * 0.32, size * 0.25, 6);
        // Visor slit
        g.fillStyle(0xff0000, 0.6);
        g.fillRect(cx - size * 0.1, cy - size * 0.28, size * 0.2, size * 0.04);
        // Shoulder pads
        g.fillStyle(color, 1);
        g.fillCircle(cx - size * 0.28, cy - size * 0.08, size * 0.1);
        g.fillCircle(cx + size * 0.28, cy - size * 0.08, size * 0.1);
        // Sword
        g.lineStyle(2, lighter.color, 0.7);
        g.lineBetween(cx + size * 0.35, cy - size * 0.3, cx + size * 0.35, cy + size * 0.25);
        break;

      case 'ogre':
        // Large bulky body
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy + size * 0.05, size * 0.65, size * 0.55);
        // Head
        g.fillCircle(cx, cy - size * 0.28, size * 0.2);
        // Jaw
        g.fillStyle(darker.color, 1);
        g.fillEllipse(cx, cy - size * 0.15, size * 0.22, size * 0.1);
        // Tusks
        g.fillStyle(0xffffff, 0.8);
        g.fillTriangle(cx - size * 0.1, cy - size * 0.15, cx - size * 0.06, cy - size * 0.15, cx - size * 0.08, cy - size * 0.05);
        g.fillTriangle(cx + size * 0.1, cy - size * 0.15, cx + size * 0.06, cy - size * 0.15, cx + size * 0.08, cy - size * 0.05);
        // Crown
        g.fillStyle(0xf1c40f, 0.8);
        g.fillRect(cx - size * 0.15, cy - size * 0.42, size * 0.3, size * 0.06);
        g.fillTriangle(cx - size * 0.12, cy - size * 0.42, cx - size * 0.06, cy - size * 0.42, cx - size * 0.09, cy - size * 0.48);
        g.fillTriangle(cx, cy - size * 0.42, cx + size * 0.06, cy - size * 0.42, cx + size * 0.03, cy - size * 0.5);
        g.fillTriangle(cx + size * 0.12, cy - size * 0.42, cx + size * 0.06, cy - size * 0.42, cx + size * 0.09, cy - size * 0.48);
        break;

      case 'wyrm':
        // Serpentine/worm body
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy + size * 0.1, size * 0.3, size * 0.45);
        // Segments
        g.fillStyle(darker.color, 0.3);
        for (let i = 0; i < 4; i++) {
          const sy = cy - size * 0.15 + i * size * 0.12;
          g.fillEllipse(cx, sy, size * 0.28, size * 0.05);
        }
        // Head/maw
        g.fillStyle(color, 1);
        g.fillCircle(cx, cy - size * 0.3, size * 0.18);
        // Mandibles
        g.lineStyle(3, darker.color, 0.8);
        g.beginPath();
        g.arc(cx, cy - size * 0.3, size * 0.22, -Math.PI * 0.2, Math.PI * 0.2);
        g.strokePath();
        g.beginPath();
        g.arc(cx, cy - size * 0.3, size * 0.22, Math.PI * 0.8, Math.PI * 1.2);
        g.strokePath();
        break;

      case 'dragon':
        // Dragon — large winged beast
        g.fillStyle(color, 1);
        // Body
        g.fillEllipse(cx, cy + size * 0.05, size * 0.45, size * 0.35);
        // Head
        g.fillCircle(cx + size * 0.15, cy - size * 0.22, size * 0.16);
        // Snout
        g.fillEllipse(cx + size * 0.3, cy - size * 0.2, size * 0.12, size * 0.07);
        // Wings
        g.fillStyle(darker.color, 0.7);
        g.fillTriangle(cx - size * 0.4, cy - size * 0.35, cx - size * 0.1, cy - size * 0.05, cx - size * 0.05, cy + size * 0.15);
        g.fillTriangle(cx + size * 0.1, cy - size * 0.4, cx + size * 0.4, cy - size * 0.1, cx + size * 0.05, cy + size * 0.05);
        // Horns
        g.fillStyle(lighter.color, 0.6);
        g.fillTriangle(cx + size * 0.1, cy - size * 0.32, cx + size * 0.15, cy - size * 0.32, cx + size * 0.05, cy - size * 0.45);
        g.fillTriangle(cx + size * 0.2, cy - size * 0.32, cx + size * 0.25, cy - size * 0.32, cx + size * 0.28, cy - size * 0.45);
        // Fire breath glow
        g.fillStyle(0xff6b00, 0.3);
        g.fillCircle(cx + size * 0.38, cy - size * 0.18, size * 0.08);
        break;

      default:
        // Generic enemy shape
        g.fillStyle(color, 1);
        g.fillRoundedRect(cx - size * 0.25, cy - size * 0.25, size * 0.5, size * 0.5, 8);
        break;
    }

    // Eyes — all enemies get eyes
    const eyeY = shape === 'slime' ? cy : cy - size * 0.2;
    const eyeSpread = size * 0.1;
    const eyeSize = isBoss ? size * 0.05 : size * 0.04;

    if (shape !== 'skeleton' && shape !== 'elemental') {
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(cx - eyeSpread, eyeY, eyeSize * 1.5);
      g.fillCircle(cx + eyeSpread, eyeY, eyeSize * 1.5);
      g.fillStyle(0x000000, 1);
      g.fillCircle(cx - eyeSpread + 1, eyeY + 1, eyeSize);
      g.fillCircle(cx + eyeSpread + 1, eyeY + 1, eyeSize);
    } else if (shape === 'skeleton') {
      // Hollow eye sockets
      g.fillStyle(0x000000, 0.9);
      g.fillCircle(cx - eyeSpread, cy - size * 0.27, eyeSize * 1.2);
      g.fillCircle(cx + eyeSpread, cy - size * 0.27, eyeSize * 1.2);
      // Red glow in sockets
      g.fillStyle(0xff0000, 0.6);
      g.fillCircle(cx - eyeSpread, cy - size * 0.27, eyeSize * 0.6);
      g.fillCircle(cx + eyeSpread, cy - size * 0.27, eyeSize * 0.6);
    } else if (shape === 'elemental') {
      // Glowing eye points
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx - eyeSpread, cy - size * 0.05, eyeSize);
      g.fillCircle(cx + eyeSpread, cy - size * 0.05, eyeSize);
    }

    // Boss aura
    if (isBoss) {
      g.lineStyle(2, lighter.color, 0.3);
      g.strokeCircle(cx, cy, size * 0.46);
      g.lineStyle(1, lighter.color, 0.15);
      g.strokeCircle(cx, cy, size * 0.5);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── NODE ICONS ──────────────────────────────────────────────

  makeNodeIcon(key, radius, color, symbol) {
    const g = this.add.graphics();
    const d = radius * 2;

    // Outer glow
    g.fillStyle(color, 0.15);
    g.fillCircle(radius, radius, radius);

    // Main circle
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius - 2);

    // Border
    g.lineStyle(1.5, 0xffffff, 0.3);
    g.strokeCircle(radius, radius, radius - 2);

    // Inner highlight
    const lighter = Phaser.Display.Color.IntegerToColor(color);
    lighter.brighten(40);
    g.fillStyle(lighter.color, 0.3);
    g.fillCircle(radius - 3, radius - 3, radius * 0.4);

    g.generateTexture(key, d, d);
    g.destroy();
  }

  // ── BAR TEXTURES ──────────────────────────────────────────

  makeBarTexture(key, width, height, colorDark, colorLight) {
    const g = this.add.graphics();
    // Rounded bar with gradient simulation
    g.fillStyle(colorDark, 1);
    g.fillRoundedRect(0, 0, width, height, height / 2);
    // Lighter top half for gradient look
    g.fillStyle(colorLight, 0.4);
    g.fillRoundedRect(0, 0, width, height / 2, { tl: height / 2, tr: height / 2, bl: 0, br: 0 });
    // Glossy strip
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(2, 1, width - 4, height * 0.35, height / 3);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  // ── SPECIAL GEMS ──────────────────────────────────────────

  makeSpecialGem(key, color, type) {
    const r = BOARD.gemRadius;
    const d = r * 2;
    const g = this.add.graphics();

    g.fillStyle(color, 0.15);
    g.fillCircle(r, r, r - 2);

    g.lineStyle(2, color, 0.8);

    if (type === 'h') {
      g.lineBetween(4, r, d - 4, r);
      g.fillStyle(color, 0.6);
      g.fillTriangle(d - 8, r - 6, d - 8, r + 6, d - 2, r);
      g.fillTriangle(8, r - 6, 8, r + 6, 2, r);
    } else if (type === 'v') {
      g.lineBetween(r, 4, r, d - 4);
      g.fillStyle(color, 0.6);
      g.fillTriangle(r - 6, d - 8, r + 6, d - 8, r, d - 2);
      g.fillTriangle(r - 6, 8, r + 6, 8, r, 2);
    } else if (type === 'bomb') {
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
