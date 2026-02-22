/**
 * RewardScene — 3-choice rewards after combat
 * Offers: stat boost, equipment, or consumable
 */
import { REWARDS, ECONOMY } from '../../config/balance.js';

export class RewardScene extends Phaser.Scene {
  constructor() {
    super('Reward');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this._chosen = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x1e3a5f, 0x1e3a5f, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, 50, 'CHOOSE A REWARD', {
      fontSize: '24px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Generate 3 diverse reward options
    const rewards = this.generateRewards();

    const cardH = 220;
    const cardW = width - 80;
    const startY = 120;
    const gap = 25;

    rewards.forEach((reward, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;

      const card = this.add.rectangle(width / 2, y, cardW, cardH, 0x2d3436, 0.9)
        .setStrokeStyle(2, reward.borderColor)
        .setInteractive({ useHandCursor: true });

      // Icon
      this.add.text(60, y - 30, reward.icon, { fontSize: '36px' });

      // Name
      this.add.text(120, y - 45, reward.name, {
        fontSize: '20px', fontFamily: 'monospace', color: reward.textColor,
        stroke: '#000', strokeThickness: 2,
      });

      // Description
      this.add.text(120, y - 10, reward.desc, {
        fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
        lineSpacing: 5, wordWrap: { width: cardW - 160 },
      });

      // Effect preview
      this.add.text(120, y + 45, reward.preview, {
        fontSize: '12px', fontFamily: 'monospace', color: '#2ecc71',
      });

      // Hover
      card.on('pointerover', () => {
        card.setStrokeStyle(3, reward.borderColor);
        card.setFillStyle(0x3d3d56, 0.95);
      });
      card.on('pointerout', () => {
        card.setStrokeStyle(2, reward.borderColor);
        card.setFillStyle(0x2d3436, 0.9);
      });

      // Click to claim
      card.on('pointerdown', () => {
        if (this._chosen) return;
        this._chosen = true;
        reward.apply(this.hero, this.runState);
        // Highlight chosen card
        card.setStrokeStyle(3, 0xffffff);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          this.runState.floor++;
          this.scene.start('Map', {
            ...this.runState,
            hero: this.hero,
            floor: this.runState.floor,
          });
        });
      });
    });

    // Skip button
    this.add.text(width / 2, height - 40, '[ SKIP ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this._chosen) return;
        this._chosen = true;
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          this.runState.floor++;
          this.scene.start('Map', {
            ...this.runState,
            hero: this.hero,
            floor: this.runState.floor,
          });
        });
      });

    this.cameras.main.fadeIn(300);
  }

  getTier() {
    const f = this.runState.floor;
    if (f <= 5) return 'tier1';
    if (f <= 10) return 'tier2';
    if (f <= 15) return 'tier3';
    return 'tier4';
  }

  generateRewards() {
    const tier = this.getTier();
    const tierNum = parseInt(tier.charAt(4));
    const rewards = [];

    // Option 1: Stat boost
    const statBoosts = REWARDS.statBoosts[tier];
    const statType = Phaser.Utils.Array.GetRandom(['atk', 'matk', 'def', 'hp']);
    const statRange = statBoosts[statType];
    const statValue = Phaser.Math.Between(statRange.min, statRange.max);

    const statLabels = { atk: 'ATK', matk: 'MATK', def: 'DEF', hp: 'Max HP' };
    rewards.push({
      name: `${statLabels[statType]} Boost`,
      icon: statType === 'hp' ? '❤️' : '💪',
      desc: `Permanently increase ${statLabels[statType]} by ${statValue}.`,
      preview: `${statLabels[statType]}: ${this.hero[statType === 'hp' ? 'maxHp' : statType]} → ${(this.hero[statType === 'hp' ? 'maxHp' : statType]) + statValue}`,
      textColor: '#2ecc71',
      borderColor: 0x2ecc71,
      apply: (hero) => {
        if (statType === 'hp') {
          hero.maxHp += statValue;
          hero.currentHp += statValue;
        } else {
          hero[statType] += statValue;
        }
      },
    });

    // Option 2: Equipment
    const equipTier = `tier${Math.min(tierNum, 3)}`; // Max tier3 for equipment
    const equipPool = REWARDS.equipment[equipTier];
    if (equipPool && equipPool.length > 0) {
      const equip = Phaser.Utils.Array.GetRandom(equipPool);
      rewards.push({
        name: equip.name,
        icon: '🗡️',
        desc: equip.desc,
        preview: equip.stat === 'lifesteal' ? 'Gain lifesteal effect!' : `Bonus: +${Math.round(equip.value * 100)}%`,
        textColor: '#3498db',
        borderColor: 0x3498db,
        apply: (hero) => {
          if (!hero.equipment) hero.equipment = {};
          hero.equipment[equip.stat] = (hero.equipment[equip.stat] || 0) + equip.value;
        },
      });
    }

    // Option 3: Consumable (potion or gold)
    if (Math.random() < 0.5) {
      rewards.push({
        name: 'Health Potion Bundle',
        icon: '🧪',
        desc: 'Receive 2 potions for your journey.',
        preview: `Potions: ${this.runState.potions} → ${this.runState.potions + 2}`,
        textColor: '#e74c3c',
        borderColor: 0xe74c3c,
        apply: (hero, runState) => {
          runState.potions += 2;
        },
      });
    } else {
      const goldAmount = Phaser.Math.Between(20 * tierNum, 40 * tierNum);
      rewards.push({
        name: 'Gold Cache',
        icon: '💰',
        desc: `Find ${goldAmount} gold.`,
        preview: `Gold: ${this.runState.gold} → ${this.runState.gold + goldAmount}`,
        textColor: '#f1c40f',
        borderColor: 0xf1c40f,
        apply: (hero, runState) => {
          runState.gold += goldAmount;
        },
      });
    }

    // Shuffle so options aren't always in same order
    Phaser.Utils.Array.Shuffle(rewards);
    return rewards;
  }
}
