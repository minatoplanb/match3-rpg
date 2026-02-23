/**
 * ShopScene — Spend gold on potions, stat boosts, and equipment
 */
import { ECONOMY, REWARDS } from '../../config/balance.js';
import { playSwap, playHeal } from '../systems/SoundManager.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this._purchased = new Set();
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a150a, 0x1a150a, 0x0f1a0a, 0x0f1a0a, 1);
    bg.fillRect(0, 0, width, height);

    // Floating gold particles
    for (let i = 0; i < 15; i++) {
      const star = this.add.circle(
        Math.random() * width, Math.random() * height,
        0.5 + Math.random(), 0xf1c40f, 0.1 + Math.random() * 0.15
      );
      this.tweens.add({
        targets: star, alpha: 0.03,
        duration: 1500 + Math.random() * 2000, yoyo: true, repeat: -1,
        delay: Math.random() * 2000,
      });
    }

    // Title
    this.add.text(width / 2, 40, '🛒 SHOP', {
      fontSize: '28px', fontFamily: 'monospace', color: '#f39c12',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Gold display
    this.goldText = this.add.text(width / 2, 75, `Gold: ${this.runState.gold}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0xf39c12, 0.3);
    lineG.lineBetween(width / 2 - 120, 95, width / 2 + 120, 95);

    // Generate shop items
    const items = this.generateShopItems();

    const cardH = 130;
    const cardW = width - 60;
    const startY = 115;
    const gap = 12;

    items.forEach((item, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;
      this.drawShopCard(item, i, width, y, cardW, cardH);
    });

    // Leave button
    const leaveY = height - 55;
    const leaveGfx = this.add.graphics();
    leaveGfx.fillStyle(0x2d3436, 0.7);
    leaveGfx.fillRoundedRect(width / 2 - 80, leaveY - 18, 160, 36, 8);
    leaveGfx.lineStyle(1, 0x636e72, 0.4);
    leaveGfx.strokeRoundedRect(width / 2 - 80, leaveY - 18, 160, 36, 8);

    this.add.text(width / 2, leaveY, '[ LEAVE SHOP ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, leaveY, 160, 36, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leaveShop());

    this.cameras.main.fadeIn(300);
  }

  generateShopItems() {
    const items = [];
    const tierNum = Math.min(4, Math.ceil(this.runState.floor / 5));

    // Small Potion
    items.push({
      id: 'small_potion',
      name: 'Small Potion',
      icon: '🧪',
      desc: `Heal ${Math.round(ECONOMY.smallPotionHeal * 100)}% HP. Adds 1 potion.`,
      price: ECONOMY.shopPrices.smallPotion,
      textColor: '#2ecc71',
      borderColor: 0x2ecc71,
      apply: () => {
        this.runState.potions++;
        const heal = Math.round(this.hero.maxHp * ECONOMY.smallPotionHeal);
        this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + heal);
      },
    });

    // Large Potion
    items.push({
      id: 'large_potion',
      name: 'Large Potion',
      icon: '⚗️',
      desc: `Heal ${Math.round(ECONOMY.largePotionHeal * 100)}% HP. Adds 1 potion.`,
      price: ECONOMY.shopPrices.largePotion,
      textColor: '#e74c3c',
      borderColor: 0xe74c3c,
      apply: () => {
        this.runState.potions++;
        const heal = Math.round(this.hero.maxHp * ECONOMY.largePotionHeal);
        this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + heal);
      },
    });

    // Random stat boost
    const statType = Phaser.Utils.Array.GetRandom(['atk', 'matk', 'def']);
    const boost = tierNum + 1;
    const statLabels = { atk: 'ATK', matk: 'MATK', def: 'DEF' };
    const statPrice = 40 + tierNum * 15;
    items.push({
      id: 'stat_boost',
      name: `${statLabels[statType]} Crystal`,
      icon: '💎',
      desc: `Permanently +${boost} ${statLabels[statType]}.`,
      price: statPrice,
      textColor: '#9b59b6',
      borderColor: 0x9b59b6,
      apply: () => {
        this.hero[statType] += boost;
      },
    });

    // Max HP upgrade
    const hpBoost = 15 + tierNum * 10;
    items.push({
      id: 'hp_boost',
      name: 'Vitality Shard',
      icon: '❤️',
      desc: `Permanently +${hpBoost} Max HP. Also heals.`,
      price: 35 + tierNum * 10,
      textColor: '#e74c3c',
      borderColor: 0xe74c3c,
      apply: () => {
        this.hero.maxHp += hpBoost;
        this.hero.currentHp += hpBoost;
      },
    });

    // Equipment (if available)
    const equipTier = `tier${Math.min(tierNum, 3)}`;
    const equipPool = REWARDS.equipment[equipTier];
    if (equipPool && equipPool.length > 0) {
      const equip = Phaser.Utils.Array.GetRandom(equipPool);
      items.push({
        id: 'equipment',
        name: equip.name,
        icon: '🗡️',
        desc: equip.desc,
        price: 50 + tierNum * 20,
        textColor: '#3498db',
        borderColor: 0x3498db,
        apply: () => {
          if (!this.hero.equipment) this.hero.equipment = {};
          this.hero.equipment[equip.stat] = (this.hero.equipment[equip.stat] || 0) + equip.value;
        },
      });
    }

    return items;
  }

  drawShopCard(item, index, w, y, cardW, cardH) {
    const cardGfx = this.add.graphics();
    const canAfford = this.runState.gold >= item.price;

    const drawCard = (hover = false, purchased = false) => {
      cardGfx.clear();
      if (purchased) {
        cardGfx.fillStyle(0x0a1a0a, 0.7);
      } else if (hover) {
        cardGfx.fillStyle(0x22224a, 0.95);
      } else {
        cardGfx.fillStyle(0x1a1a2e, 0.92);
      }
      cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      const borderAlpha = purchased ? 0.2 : (hover ? 0.8 : 0.5);
      cardGfx.lineStyle(1.5, item.borderColor, borderAlpha);
      cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      cardGfx.fillStyle(item.borderColor, purchased ? 0.2 : 0.7);
      cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
    };

    drawCard();

    // Icon
    this.add.text(w / 2 - cardW / 2 + 45, y - 10, item.icon, { fontSize: '26px' }).setOrigin(0.5);

    // Name
    this.add.text(w / 2 - cardW / 2 + 80, y - cardH / 2 + 16, item.name, {
      fontSize: '17px', fontFamily: 'monospace', color: item.textColor,
      stroke: '#000', strokeThickness: 2,
    });

    // Description
    this.add.text(w / 2 - cardW / 2 + 80, y + 2, item.desc, {
      fontSize: '12px', fontFamily: 'monospace', color: '#b2bec3',
      wordWrap: { width: cardW - 200 },
    });

    // Price tag
    const priceColor = canAfford ? '#f1c40f' : '#e74c3c';
    const priceText = this.add.text(w / 2 + cardW / 2 - 25, y, `${item.price}g`, {
      fontSize: '16px', fontFamily: 'monospace', color: priceColor,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0.5);

    // Status text (shows SOLD after purchase)
    const statusText = this.add.text(w / 2 + cardW / 2 - 25, y + 20, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(1, 0.5);

    // Interactive zone
    const card = this.add.rectangle(w / 2, y, cardW, cardH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    card.on('pointerover', () => {
      if (!this._purchased.has(item.id)) drawCard(true);
    });
    card.on('pointerout', () => {
      if (!this._purchased.has(item.id)) drawCard(false);
    });

    card.on('pointerdown', () => {
      if (this._purchased.has(item.id)) return;
      if (this.runState.gold < item.price) return;

      // Purchase
      this.runState.gold -= item.price;
      this._purchased.add(item.id);
      item.apply();
      playHeal();

      // Update displays
      this.goldText.setText(`Gold: ${this.runState.gold}`);
      drawCard(false, true);
      statusText.setText('SOLD');
      priceText.setColor('#636e72');

      // Flash feedback
      this.tweens.add({
        targets: [cardGfx, card],
        scaleX: 0.97, scaleY: 0.97,
        duration: 80, yoyo: true,
      });
    });
  }

  leaveShop() {
    this.runState.hadRestOrShop = true;
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => {
      this.runState.floor++;
      this.scene.start('Map', {
        ...this.runState,
        hero: this.hero,
        floor: this.runState.floor,
      });
    });
  }
}
