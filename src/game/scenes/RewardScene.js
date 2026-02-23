/**
 * RewardScene — 3-choice rewards after combat
 * V2: Polished cards with rarity glow, better visual hierarchy
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
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0f1a3e, 0x0f1a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Sparkle particles
    for (let i = 0; i < 12; i++) {
      const star = this.add.circle(
        Math.random() * width, Math.random() * height,
        0.5 + Math.random(), 0xf1c40f, 0.15 + Math.random() * 0.2
      );
      this.tweens.add({
        targets: star, alpha: 0.05,
        duration: 1200 + Math.random() * 1500, yoyo: true, repeat: -1,
        delay: Math.random() * 1500,
      });
    }

    // Title
    this.add.text(width / 2, 45, 'CHOOSE A REWARD', {
      fontSize: '24px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0xf1c40f, 0.3);
    lineG.lineBetween(width / 2 - 120, 65, width / 2 + 120, 65);

    // Generate 3 diverse reward options
    const rewards = this.generateRewards();

    const cardH = 200;
    const cardW = width - 60;
    const startY = 90;
    const gap = 18;

    rewards.forEach((reward, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;

      // Card background
      const cardGfx = this.add.graphics();
      cardGfx.fillStyle(0x1a1a2e, 0.92);
      cardGfx.fillRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      cardGfx.lineStyle(1.5, reward.borderColor, 0.5);
      cardGfx.strokeRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      // Left accent
      cardGfx.fillStyle(reward.borderColor, 0.7);
      cardGfx.fillRoundedRect(width / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);

      // Icon circle
      const iconBg = this.add.graphics();
      iconBg.fillStyle(reward.borderColor, 0.15);
      iconBg.fillCircle(width / 2 - cardW / 2 + 55, y - 15, 26);
      iconBg.lineStyle(1.5, reward.borderColor, 0.3);
      iconBg.strokeCircle(width / 2 - cardW / 2 + 55, y - 15, 26);

      // Icon
      this.add.text(width / 2 - cardW / 2 + 55, y - 18, reward.icon, { fontSize: '28px' }).setOrigin(0.5);

      // Name
      this.add.text(width / 2 - cardW / 2 + 100, y - cardH / 2 + 22, reward.name, {
        fontSize: '19px', fontFamily: 'monospace', color: reward.textColor,
        stroke: '#000', strokeThickness: 2,
      });

      // Description
      this.add.text(width / 2 - cardW / 2 + 100, y - 5, reward.desc, {
        fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
        lineSpacing: 5, wordWrap: { width: cardW - 140 },
      });

      // Effect preview
      this.add.text(width / 2 - cardW / 2 + 100, y + 40, reward.preview, {
        fontSize: '12px', fontFamily: 'monospace', color: '#2ecc71',
      });

      // Interactive zone
      const card = this.add.rectangle(width / 2, y, cardW, cardH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      // Hover
      card.on('pointerover', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x22224a, 0.95);
        cardGfx.fillRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2, reward.borderColor, 0.8);
        cardGfx.strokeRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(reward.borderColor, 0.9);
        cardGfx.fillRoundedRect(width / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
      });
      card.on('pointerout', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x1a1a2e, 0.92);
        cardGfx.fillRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(1.5, reward.borderColor, 0.5);
        cardGfx.strokeRoundedRect(width / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(reward.borderColor, 0.7);
        cardGfx.fillRoundedRect(width / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
      });

      // Click to claim
      card.on('pointerdown', () => {
        if (this._chosen) return;
        this._chosen = true;
        reward.apply(this.hero, this.runState);
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
    const skipGfx = this.add.graphics();
    skipGfx.fillStyle(0x2d3436, 0.6);
    skipGfx.fillRoundedRect(width / 2 - 60, height - 50, 120, 32, 6);
    skipGfx.lineStyle(1, 0x636e72, 0.3);
    skipGfx.strokeRoundedRect(width / 2 - 60, height - 50, 120, 32, 6);

    this.add.text(width / 2, height - 34, '[ SKIP ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, height - 34, 120, 32, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
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
    const equipTier = `tier${Math.min(tierNum, 3)}`;
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

    // Option 3: Consumable
    if (Math.random() < 0.5) {
      rewards.push({
        name: 'Health Potion Bundle',
        icon: '🧪',
        desc: 'Receive 2 potions for your journey.',
        preview: `Potions: ${this.runState.potions} → ${this.runState.potions + 2}`,
        textColor: '#e74c3c',
        borderColor: 0xe74c3c,
        apply: (hero, runState) => { runState.potions += 2; },
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
        apply: (hero, runState) => { runState.gold += goldAmount; },
      });
    }

    Phaser.Utils.Array.Shuffle(rewards);
    return rewards;
  }
}
