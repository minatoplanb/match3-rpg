/**
 * RestScene — Campfire rest with heal or upgrade options
 */
import { ECONOMY } from '../../config/balance.js';
import { playHeal, playSwap } from '../systems/SoundManager.js';

export class RestScene extends Phaser.Scene {
  constructor() {
    super('Rest');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this._chosen = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background — warm campfire tones
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f05, 0x1a0f05, 0x0a0a05, 0x0a0a05, 1);
    bg.fillRect(0, 0, width, height);

    // Firefly particles
    for (let i = 0; i < 15; i++) {
      const colors = [0xf39c12, 0xe67e22, 0xf1c40f, 0xff6b00];
      const orb = this.add.circle(
        width / 2 + (Math.random() - 0.5) * 300,
        height / 2 + (Math.random() - 0.5) * 200,
        0.5 + Math.random() * 1.5,
        Phaser.Utils.Array.GetRandom(colors),
        0.1 + Math.random() * 0.2
      );
      this.tweens.add({
        targets: orb,
        y: orb.y - 30 - Math.random() * 40,
        x: orb.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 2000 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 2000,
        onRepeat: () => {
          orb.setPosition(
            width / 2 + (Math.random() - 0.5) * 300,
            height / 2 + (Math.random() - 0.5) * 200
          );
          orb.setAlpha(0.1 + Math.random() * 0.2);
        },
      });
    }

    // Campfire glow
    const fireGlow = this.add.circle(width / 2, 180, 80, 0xff6b00, 0.08);
    this.tweens.add({
      targets: fireGlow,
      alpha: 0.03, scaleX: 1.15, scaleY: 1.15,
      duration: 1500, yoyo: true, repeat: -1,
    });

    // Campfire icon
    this.add.text(width / 2, 155, '🔥', { fontSize: '56px' }).setOrigin(0.5);

    // Title
    this.add.text(width / 2, 215, 'CAMPFIRE', {
      fontSize: '28px', fontFamily: 'monospace', color: '#f39c12',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 248, 'Take a moment to recover...', {
      fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
    }).setOrigin(0.5);

    // Hero status
    const h = this.hero;
    this.add.text(width / 2, 285, `HP: ${Math.round(h.currentHp)} / ${h.maxHp}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#2ecc71',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0xf39c12, 0.3);
    lineG.lineBetween(width / 2 - 120, 310, width / 2 + 120, 310);

    // Option cards
    const cardW = width - 80;
    const cardH = 160;
    const gap = 20;

    const options = this.getOptions();
    options.forEach((opt, i) => {
      const y = 340 + i * (cardH + gap) + cardH / 2;
      this.drawOptionCard(opt, width, y, cardW, cardH);
    });

    this.cameras.main.fadeIn(300);
  }

  getOptions() {
    const h = this.hero;
    const healAmount = Math.round(h.maxHp * ECONOMY.restNodeHeal);
    const missingHp = h.maxHp - h.currentHp;
    const tierNum = Math.min(4, Math.ceil(this.runState.floor / 5));

    return [
      {
        name: 'Rest & Heal',
        icon: '💚',
        desc: `Restore ${Math.round(ECONOMY.restNodeHeal * 100)}% of max HP.\nHeal ${Math.min(healAmount, missingHp)} HP.`,
        preview: `HP: ${Math.round(h.currentHp)} → ${Math.min(h.maxHp, h.currentHp + healAmount)}`,
        textColor: '#2ecc71',
        borderColor: 0x2ecc71,
        apply: () => {
          h.currentHp = Math.min(h.maxHp, h.currentHp + healAmount);
          playHeal();
        },
      },
      {
        name: 'Train',
        icon: '💪',
        desc: 'Push your limits at the campfire.\nPermanently gain a small stat boost.',
        preview: this.getTrainPreview(tierNum),
        textColor: '#3498db',
        borderColor: 0x3498db,
        apply: () => {
          const stats = ['atk', 'matk', 'def'];
          const chosen = Phaser.Utils.Array.GetRandom(stats);
          h[chosen] += Math.ceil(tierNum / 2);
          playSwap();
        },
      },
      {
        name: 'Meditate',
        icon: '⭐',
        desc: 'Focus your mind and spirit.\nGain skill charge and +15 Max HP.',
        preview: `Max HP: ${h.maxHp} → ${h.maxHp + 15}`,
        textColor: '#9b59b6',
        borderColor: 0x9b59b6,
        apply: () => {
          h.maxHp += 15;
          h.currentHp += 15;
          h.skillCharge = (h.skillCharge || 0) + 30;
          playHeal();
        },
      },
    ];
  }

  getTrainPreview(tierNum) {
    const boost = Math.ceil(tierNum / 2);
    return `Random: +${boost} ATK/MATK/DEF`;
  }

  drawOptionCard(opt, w, y, cardW, cardH) {
    const cardGfx = this.add.graphics();

    const drawCard = (hover = false, selected = false) => {
      cardGfx.clear();
      if (selected) {
        cardGfx.fillStyle(opt.borderColor, 0.15);
      } else if (hover) {
        cardGfx.fillStyle(0x22224a, 0.95);
      } else {
        cardGfx.fillStyle(0x1a1a2e, 0.92);
      }
      cardGfx.fillRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      const borderAlpha = selected ? 0.9 : (hover ? 0.8 : 0.5);
      cardGfx.lineStyle(selected ? 2.5 : 1.5, selected ? 0xffffff : opt.borderColor, borderAlpha);
      cardGfx.strokeRoundedRect(w / 2 - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      cardGfx.fillStyle(opt.borderColor, selected ? 1 : 0.7);
      cardGfx.fillRoundedRect(w / 2 - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16, 3);
    };

    drawCard();

    // Icon circle
    const iconBg = this.add.graphics();
    iconBg.fillStyle(opt.borderColor, 0.15);
    iconBg.fillCircle(w / 2 - cardW / 2 + 50, y - 10, 24);
    iconBg.lineStyle(1.5, opt.borderColor, 0.3);
    iconBg.strokeCircle(w / 2 - cardW / 2 + 50, y - 10, 24);

    // Icon
    this.add.text(w / 2 - cardW / 2 + 50, y - 12, opt.icon, { fontSize: '26px' }).setOrigin(0.5);

    // Name
    this.add.text(w / 2 - cardW / 2 + 90, y - cardH / 2 + 18, opt.name, {
      fontSize: '18px', fontFamily: 'monospace', color: opt.textColor,
      stroke: '#000', strokeThickness: 2,
    });

    // Description
    this.add.text(w / 2 - cardW / 2 + 90, y + 0, opt.desc, {
      fontSize: '12px', fontFamily: 'monospace', color: '#b2bec3',
      lineSpacing: 5, wordWrap: { width: cardW - 130 },
    });

    // Preview
    this.add.text(w / 2 - cardW / 2 + 90, y + 45, opt.preview, {
      fontSize: '12px', fontFamily: 'monospace', color: '#2ecc71',
    });

    // Interactive zone
    const card = this.add.rectangle(w / 2, y, cardW, cardH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    card.on('pointerover', () => { if (!this._chosen) drawCard(true); });
    card.on('pointerout', () => { if (!this._chosen) drawCard(false); });

    card.on('pointerdown', () => {
      if (this._chosen) return;
      this._chosen = true;

      opt.apply();
      drawCard(false, true);

      // Scale bounce
      this.tweens.add({
        targets: [cardGfx, card],
        scaleX: 0.96, scaleY: 0.96,
        duration: 80, yoyo: true,
      });

      this.time.delayedCall(600, () => this.advanceFloor());
    });
  }

  advanceFloor() {
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
