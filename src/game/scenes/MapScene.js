/**
 * MapScene — Floor map with 3 node choices per floor
 * Reuses dungeon crawler pattern: 3 nodes, pick one, advance.
 */
import { MAP, ECONOMY, FLOOR_ENCOUNTERS, BOSSES } from '../../config/balance.js';
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
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 1);
    bg.fillRect(0, 0, width, height);

    // Header
    this.add.text(width / 2, 30, `Floor ${this.floor} / 20`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Hero status summary
    const h = this.hero;
    this.add.text(width / 2, 65, `HP ${Math.round(h.currentHp)}/${h.maxHp}  💰 ${this.runState.gold}  🧪 ${this.runState.potions}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#dfe6e9',
    }).setOrigin(0.5);

    // Chapter name
    const chapter = this.getChapterName();
    this.add.text(width / 2, 95, chapter, {
      fontSize: '16px', fontFamily: 'monospace', color: '#74b9ff',
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

    const y = h / 2 - 40;

    // Boss card
    const card = this.add.rectangle(w / 2, y, 400, 250, 0x2d3436, 0.95)
      .setStrokeStyle(3, 0xff0000)
      .setInteractive({ useHandCursor: true });

    // Boss icon
    this.add.text(w / 2, y - 80, '👑', { fontSize: '48px' }).setOrigin(0.5);

    // Boss name
    this.add.text(w / 2, y - 30, boss.name, {
      fontSize: '28px', fontFamily: 'monospace', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w / 2, y + 5, boss.nameZh, {
      fontSize: '18px', fontFamily: 'monospace', color: '#dfe6e9',
    }).setOrigin(0.5);

    // Boss stats
    this.add.text(w / 2, y + 40, `HP ${boss.hp}  ATK ${boss.atk}  DEF ${boss.def}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);

    // Mechanic hint
    const mechanicDesc = {
      enrage: 'Enrages at low HP!',
      column_block: 'Blocks board columns!',
      lifesteal: 'Steals life + poisons!',
      burn_gems: 'Burns gems on board!',
    };
    this.add.text(w / 2, y + 70, mechanicDesc[boss.mechanic] || '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffa502',
    }).setOrigin(0.5);

    // "Enter Battle" text
    this.add.text(w / 2, y + 100, '[ TAP TO FIGHT ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#f39c12',
    }).setOrigin(0.5);

    card.on('pointerdown', () => {
      if (this._nodeSelected) return;
      this._nodeSelected = true;
      playSwap();
      this.tweens.add({
        targets: card,
        scaleX: 0.95, scaleY: 0.95,
        duration: 80, yoyo: true,
        onComplete: () => {
          card.setStrokeStyle(4, 0xffffff);
          this.cameras.main.fadeOut(300);
          this.time.delayedCall(300, () => {
            this.scene.start('Combat', {
              ...this.runState,
              hero: this.hero,
              encounterType: 'boss',
            });
          });
        },
      });
    });

    // Pulsing border
    this.tweens.add({
      targets: card,
      strokeAlpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  drawFloorNodes(w, h) {
    const nodeCount = MAP.nodesPerFloor;
    const nodes = this.generateNodes(nodeCount);

    const cardH = 200;
    const cardW = w - 60;
    const startY = 160;
    const gap = 20;

    this.add.text(w / 2, 130, 'Choose your path:', {
      fontSize: '14px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    nodes.forEach((node, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;

      const card = this.add.rectangle(w / 2, y, cardW, cardH, 0x2d3436, 0.9)
        .setStrokeStyle(2, node.borderColor)
        .setInteractive({ useHandCursor: true });

      // Node icon
      this.add.text(50, y - 30, node.icon, {
        fontSize: '36px',
      });

      // Node type name
      this.add.text(110, y - 40, node.label, {
        fontSize: '20px', fontFamily: 'monospace', color: node.textColor,
        stroke: '#000', strokeThickness: 2,
      });

      // Description
      this.add.text(110, y - 5, node.desc, {
        fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
        lineSpacing: 5, wordWrap: { width: cardW - 140 },
      });

      // Hover
      card.on('pointerover', () => card.setStrokeStyle(3, node.borderColor));
      card.on('pointerout', () => card.setStrokeStyle(2, node.borderColor));

      // Click — press-in feedback + sound, then transition
      card.on('pointerdown', () => {
        if (this._nodeSelected) return;
        this._nodeSelected = true;
        playSwap();
        this.tweens.add({
          targets: card,
          scaleX: 0.95, scaleY: 0.95,
          duration: 80, yoyo: true,
          onComplete: () => {
            card.setStrokeStyle(3, 0xffffff);
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

    // Guarantee rest/shop before floor 5
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
        // Weighted random, avoid duplicates
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
    const configs = {
      combat: {
        type: 'combat', icon: '⚔️', label: 'Combat',
        desc: 'Fight an enemy.\nReward: gold + item choice.',
        textColor: '#e74c3c', borderColor: 0xe74c3c,
      },
      elite: {
        type: 'elite', icon: '⚡', label: 'Elite Combat',
        desc: 'A stronger foe (1.5x stats).\nBetter rewards!',
        textColor: '#ffa502', borderColor: 0xffa502,
      },
      shop: {
        type: 'shop', icon: '🛒', label: 'Shop',
        desc: `Buy potions.\nSmall: ${ECONOMY.shopPrices.smallPotion}g  Large: ${ECONOMY.shopPrices.largePotion}g`,
        textColor: '#f39c12', borderColor: 0xf39c12,
      },
      rest: {
        type: 'rest', icon: '🏕️', label: 'Rest',
        desc: `Heal ${Math.round(ECONOMY.restNodeHeal * 100)}% of max HP.\nSometimes peace is the best weapon.`,
        textColor: '#2ecc71', borderColor: 0x2ecc71,
      },
      mystery: {
        type: 'mystery', icon: '❓', label: 'Mystery',
        desc: 'Random event.\nCould be great... or terrible.',
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
    switch (node.type) {
      case 'combat':
        this.scene.start('Combat', {
          ...this.runState,
          hero: this.hero,
          encounterType: 'combat',
        });
        break;

      case 'elite':
        this.scene.start('Combat', {
          ...this.runState,
          hero: this.hero,
          encounterType: 'elite',
        });
        break;

      case 'shop':
        this.showShop();
        break;

      case 'rest':
        this.doRest();
        break;

      case 'mystery':
        this.doMystery();
        break;

      case 'treasure':
        this.scene.start('Reward', {
          ...this.runState,
          hero: this.hero,
        });
        break;
    }
  }

  showShop() {
    // Simple shop — auto-buy best option then advance
    const h = this.hero;
    const g = this.runState.gold;

    if (g >= ECONOMY.shopPrices.largePotion) {
      this.runState.gold -= ECONOMY.shopPrices.largePotion;
      const heal = Math.round(h.maxHp * ECONOMY.largePotionHeal);
      h.currentHp = Math.min(h.maxHp, h.currentHp + heal);
      this.runState.potions++;
    } else if (g >= ECONOMY.shopPrices.smallPotion) {
      this.runState.gold -= ECONOMY.shopPrices.smallPotion;
      this.runState.potions++;
    }

    this.advanceFloor();
  }

  doRest() {
    const h = this.hero;
    const heal = Math.round(h.maxHp * ECONOMY.restNodeHeal);
    h.currentHp = Math.min(h.maxHp, h.currentHp + heal);
    this.runState.hadRestOrShop = true;
    this.advanceFloor();
  }

  doMystery() {
    const roll = Math.random();
    const h = this.hero;

    if (roll < 0.3) {
      // Good: free heal
      h.currentHp = Math.min(h.maxHp, h.currentHp + Math.round(h.maxHp * 0.3));
    } else if (roll < 0.5) {
      // Good: free gold
      this.runState.gold += 30;
    } else if (roll < 0.7) {
      // Bad: lose HP
      h.currentHp = Math.max(1, h.currentHp - Math.round(h.maxHp * 0.15));
    } else {
      // Neutral: free potion
      this.runState.potions++;
    }

    this.advanceFloor();
  }

  advanceFloor() {
    this.runState.floor++;
    this.scene.start('Map', {
      ...this.runState,
      hero: this.hero,
      floor: this.runState.floor,
    });
  }
}
