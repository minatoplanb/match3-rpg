/**
 * MapScene — Floor map with 3 node choices per floor
 * V2: Polished cards, better visual hierarchy, progress bar
 */
import { MAP, ECONOMY, ENEMIES, FLOOR_ENCOUNTERS, BOSSES } from '../../config/balance.js';
import { playSwap } from '../systems/SoundManager.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this.floor = data.floor;
    this._nodeSelected = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0f1a3e, 0x0f1a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle stars
    for (let i = 0; i < 15; i++) {
      const star = this.add.circle(
        Math.random() * width, Math.random() * height,
        0.5 + Math.random(), 0xffffff, 0.15 + Math.random() * 0.2
      );
      this.tweens.add({
        targets: star, alpha: 0.05,
        duration: 1500 + Math.random() * 2000, yoyo: true, repeat: -1,
        delay: Math.random() * 2000,
      });
    }

    // Header
    this.add.text(width / 2, 25, `Floor ${this.floor} / 20`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Progress bar
    const progW = 300;
    const progH = 8;
    const progX = width / 2 - progW / 2;
    const progY = 50;
    const progGfx = this.add.graphics();
    progGfx.fillStyle(0x1a1a2e, 0.8);
    progGfx.fillRoundedRect(progX, progY, progW, progH, progH / 2);
    progGfx.fillStyle(0xf1c40f, 0.8);
    progGfx.fillRoundedRect(progX, progY, progW * (this.floor / 20), progH, progH / 2);
    progGfx.lineStyle(1, 0x636e72, 0.3);
    progGfx.strokeRoundedRect(progX, progY, progW, progH, progH / 2);
    // Boss markers
    [5, 10, 15, 20].forEach(bf => {
      const bx = progX + progW * (bf / 20);
      progGfx.fillStyle(bf <= this.floor ? 0xf1c40f : 0x636e72, 0.6);
      progGfx.fillCircle(bx, progY + progH / 2, 4);
    });

    // Hero status summary
    const h = this.hero;
    const hpRatio = h.currentHp / h.maxHp;
    const hpColor = hpRatio < 0.3 ? '#e74c3c' : hpRatio < 0.6 ? '#e67e22' : '#2ecc71';
    this.add.text(width / 2, 72,
      `HP ${Math.round(h.currentHp)}/${h.maxHp}  💰 ${this.runState.gold}  🧪 ${this.runState.potions}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#dfe6e9',
    }).setOrigin(0.5);

    // Chapter name
    const chapter = this.getChapterName();
    this.add.text(width / 2, 95, chapter, {
      fontSize: '15px', fontFamily: 'monospace', color: '#74b9ff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Check if boss floor
    if (MAP.bossFloors.includes(this.floor)) {
      this.drawBossNode(width, height);
    } else {
      this.drawFloorNodes(width, height);
    }

    this.cameras.main.fadeIn(300);
  }

  getChapterName() {
    if (this.floor <= 5) return '🌿 Grassland';
    if (this.floor <= 10) return '🏜️ Desert';
    if (this.floor <= 15) return '❄️ Frostlands';
    return '🔥 Infernal Realm';
  }

  drawBossNode(w, h) {
    const encounter = FLOOR_ENCOUNTERS[this.floor];
    const boss = BOSSES[encounter.boss];

    const y = h / 2 - 20;

    // Boss card — dramatic styling
    const cardGfx = this.add.graphics();
    // Glow behind card
    cardGfx.fillStyle(0xff0000, 0.05);
    cardGfx.fillRoundedRect(w / 2 - 210, y - 140, 420, 270, 16);
    // Card body
    cardGfx.fillStyle(0x1a0a0a, 0.95);
    cardGfx.fillRoundedRect(w / 2 - 200, y - 130, 400, 250, 12);
    // Animated red border
    cardGfx.lineStyle(2, 0xff0000, 0.6);
    cardGfx.strokeRoundedRect(w / 2 - 200, y - 130, 400, 250, 12);

    // Boss icon
    this.add.text(w / 2, y - 85, '👑', { fontSize: '40px' }).setOrigin(0.5);

    // Boss name
    this.add.text(w / 2, y - 35, boss.name, {
      fontSize: '26px', fontFamily: 'monospace', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w / 2, y - 5, boss.nameZh, {
      fontSize: '16px', fontFamily: 'monospace', color: '#dfe6e9',
    }).setOrigin(0.5);

    // Boss stats
    this.add.text(w / 2, y + 25, `HP ${boss.hp}  ATK ${boss.atk}  DEF ${boss.def}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);

    // Mechanic hint
    const mechanicDesc = {
      enrage: 'Enrages at low HP!',
      column_block: 'Blocks board columns!',
      lifesteal: 'Steals life + poisons!',
      burn_gems: 'Burns gems on board!',
    };
    this.add.text(w / 2, y + 50, mechanicDesc[boss.mechanic] || '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffa502',
    }).setOrigin(0.5);

    // "Enter Battle" text — pulsing
    const enterText = this.add.text(w / 2, y + 85, '[ TAP TO FIGHT ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#f39c12',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: enterText, alpha: 0.4,
      duration: 800, yoyo: true, repeat: -1,
    });

    // Interactive zone
    const card = this.add.rectangle(w / 2, y, 400, 250, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    card.on('pointerdown', () => {
      if (this._nodeSelected) return;
      this._nodeSelected = true;
      playSwap();
      this.cameras.main.flash(100, 255, 0, 0);
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        this.scene.start('Combat', {
          ...this.runState,
          hero: this.hero,
          encounterType: 'boss',
        });
      });
    });

    // Pulsing glow
    const glowCircle = this.add.circle(w / 2, y, 130, 0xff0000, 0.03);
    this.tweens.add({
      targets: glowCircle, alpha: 0.08, scaleX: 1.1, scaleY: 1.1,
      duration: 1200, yoyo: true, repeat: -1,
    });
  }

  drawFloorNodes(w, h) {
    const nodeCount = MAP.nodesPerFloor;
    const nodes = this.generateNodes(nodeCount);

    const cardH = 180;
    const cardW = w - 60;
    const startY = 140;
    const gap = 18;

    this.add.text(w / 2, 118, 'Choose your path:', {
      fontSize: '13px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    nodes.forEach((node, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;

      // Card background
      const cardGfx = this.add.graphics();
      cardGfx.fillStyle(0x1a1a2e, 0.92);
      cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      cardGfx.lineStyle(1.5, node.borderColor, 0.5);
      cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      // Left accent
      cardGfx.fillStyle(node.borderColor, 0.7);
      cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);

      // Node icon circle
      const iconBg = this.add.graphics();
      iconBg.fillStyle(node.borderColor, 0.15);
      iconBg.fillCircle(w / 2 - cardW / 2 + 55, y - 10, 26);
      iconBg.lineStyle(1.5, node.borderColor, 0.3);
      iconBg.strokeCircle(w / 2 - cardW / 2 + 55, y - 10, 26);

      // Node icon
      this.add.text(w / 2 - cardW / 2 + 55, y - 12, node.icon, {
        fontSize: '28px',
      }).setOrigin(0.5);

      // Node type name
      this.add.text(w / 2 - cardW / 2 + 100, y - 35, node.label, {
        fontSize: '20px', fontFamily: 'monospace', color: node.textColor,
        stroke: '#000', strokeThickness: 2,
      });

      // Description
      this.add.text(w / 2 - cardW / 2 + 100, y + 0, node.desc, {
        fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
        lineSpacing: 5, wordWrap: { width: cardW - 140 },
      });

      // Interactive zone
      const card = this.add.rectangle(w / 2, y, cardW, cardH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      // Hover
      card.on('pointerover', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x22224a, 0.95);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2, node.borderColor, 0.8);
        cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(node.borderColor, 0.9);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
      });
      card.on('pointerout', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x1a1a2e, 0.92);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(1.5, node.borderColor, 0.5);
        cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(node.borderColor, 0.7);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
      });

      // Click — press feedback + flash
      card.on('pointerdown', () => {
        if (this._nodeSelected) return;
        this._nodeSelected = true;
        playSwap();

        // Flash the card bright
        cardGfx.clear();
        cardGfx.fillStyle(node.borderColor, 0.25);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2.5, 0xffffff, 0.9);
        cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(node.borderColor, 1);
        cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);

        // Scale bounce on all card children
        this.tweens.add({
          targets: [cardGfx, iconBg, card],
          scaleX: 0.96, scaleY: 0.96,
          duration: 80, yoyo: true,
          onComplete: () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.executeNode(node));
          },
        });
      });
    });
  }

  generateNodes(count) {
    const weights = MAP.nodeWeights;
    const types = Object.keys(weights);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const needsRestOrShop = this.floor <= MAP.guaranteeRestOrShopBy
      && this.floor >= 3
      && !this.runState.hadRestOrShop;

    const nodes = [];
    const usedTypes = new Set();

    for (let i = 0; i < count; i++) {
      let type;

      if (i === 0 && needsRestOrShop) {
        type = Math.random() < 0.5 ? 'rest' : 'shop';
      } else {
        let attempts = 0;
        do {
          let roll = Math.random() * totalWeight;
          for (const t of types) {
            roll -= weights[t];
            if (roll <= 0) { type = t; break; }
          }
          attempts++;
        } while (usedTypes.has(type) && attempts < 20);
      }

      usedTypes.add(type);
      nodes.push(this.createNodeData(type));
    }

    return nodes;
  }

  createNodeData(type) {
    // Dynamic enemy info for combat nodes
    const encounter = FLOOR_ENCOUNTERS[this.floor];
    let enemyName = '';
    if (encounter && encounter.enemies) {
      const key = Phaser.Utils.Array.GetRandom(encounter.enemies);
      const template = ENEMIES[key];
      if (template) enemyName = template.name;
    }

    const h = this.hero;
    const healAmt = Math.round(h.maxHp * ECONOMY.restNodeHeal);
    const missingHp = h.maxHp - h.currentHp;

    const configs = {
      combat: {
        type: 'combat', icon: '⚔️', label: 'Combat',
        desc: enemyName
          ? `Fight: ${enemyName}\nReward: gold + item choice.`
          : 'Fight an enemy.\nReward: gold + item choice.',
        textColor: '#e74c3c', borderColor: 0xe74c3c,
      },
      elite: {
        type: 'elite', icon: '⚡', label: 'Elite Combat',
        desc: enemyName
          ? `Fight: ${enemyName} (1.5x stats)\nBetter rewards!`
          : 'A stronger foe (1.5x stats).\nBetter rewards!',
        textColor: '#ffa502', borderColor: 0xffa502,
      },
      shop: {
        type: 'shop', icon: '🛒', label: 'Shop',
        desc: `Buy items, potions, and upgrades.\nYour gold: ${this.runState.gold}g`,
        textColor: '#f39c12', borderColor: 0xf39c12,
      },
      rest: {
        type: 'rest', icon: '🔥', label: 'Campfire',
        desc: `Heal, train, or meditate.\nHeal: +${Math.min(healAmt, missingHp)} HP (${Math.round(ECONOMY.restNodeHeal * 100)}%)`,
        textColor: '#2ecc71', borderColor: 0x2ecc71,
      },
      mystery: {
        type: 'mystery', icon: '❓', label: 'Mystery',
        desc: 'A strange encounter awaits...\nRisk and reward in equal measure.',
        textColor: '#6c5ce7', borderColor: 0x6c5ce7,
      },
      treasure: {
        type: 'treasure', icon: '💎', label: 'Treasure',
        desc: 'Free reward without combat!\nRare and valuable.',
        textColor: '#f1c40f', borderColor: 0xf1c40f,
      },
    };

    return configs[type] || configs.combat;
  }

  executeNode(node) {
    const passData = { ...this.runState, hero: this.hero };
    switch (node.type) {
      case 'combat':
        this.scene.start('Combat', { ...passData, encounterType: 'combat' });
        break;
      case 'elite':
        this.scene.start('Combat', { ...passData, encounterType: 'elite' });
        break;
      case 'shop':
        this.scene.start('Shop', passData);
        break;
      case 'rest':
        this.scene.start('Rest', passData);
        break;
      case 'mystery':
        this.scene.start('Mystery', passData);
        break;
      case 'treasure':
        this.scene.start('Reward', passData);
        break;
    }
  }
}
