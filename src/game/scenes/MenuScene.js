/**
 * MenuScene — Hero selection (portrait layout)
 * V2: Polished with animated title, hero icons, background effects
 */
import { HEROES, ECONOMY } from '../../config/balance.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    // Background — deep gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0f1a3e, 0x0f1a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Animated background stars/particles
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const size = 0.5 + Math.random() * 1.5;
      const star = this.add.circle(px, py, size, 0xffffff, 0.2 + Math.random() * 0.3);
      this.tweens.add({
        targets: star,
        alpha: 0.05,
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }

    // Decorative gem showcase (floating gems behind title)
    const gemColors = [0xe74c3c, 0xe67e22, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6];
    gemColors.forEach((color, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 100;
      const gx = width / 2 + Math.cos(angle) * dist;
      const gy = 85 + Math.sin(angle) * 35;
      const gem = this.add.circle(gx, gy, 8, color, 0.2);
      this.tweens.add({
        targets: gem,
        y: gy - 5,
        alpha: 0.08,
        duration: 2000 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Title — glowing
    const titleText = this.add.text(width / 2, 65, 'MATCH-3 RPG', {
      fontSize: '42px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Title glow effect
    this.tweens.add({
      targets: titleText,
      alpha: 0.85,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, 105, 'Puzzle Quest Roguelike', {
      fontSize: '15px', fontFamily: 'monospace', color: '#74b9ff',
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0xf1c40f, 0.3);
    lineG.lineBetween(width / 2 - 150, 125, width / 2 + 150, 125);
    lineG.fillStyle(0xf1c40f, 0.6);
    lineG.fillCircle(width / 2, 125, 3);

    // Hero cards (vertical layout for portrait)
    const heroKeys = ['warrior', 'mage', 'paladin'];
    const difficulties = { warrior: 'Normal Mode', mage: 'Hard Mode', paladin: 'Tank Mode' };
    const heroIcons = { warrior: '⚔', mage: '🔮', paladin: '🛡' };

    const cardH = 175;
    const cardW = width - 60;
    const startY = 165;

    this.add.text(width / 2, 145, 'Choose your hero', {
      fontSize: '13px', fontFamily: 'monospace', color: '#636e72',
    }).setOrigin(0.5);

    heroKeys.forEach((key, i) => {
      const template = HEROES[key];
      const x = width / 2;
      const y = startY + i * (cardH + 18) + cardH / 2;

      // Card background with subtle gradient
      const cardGfx = this.add.graphics();
      cardGfx.fillStyle(0x1a1a2e, 0.92);
      cardGfx.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      // Border in hero color
      const heroColorInt = Phaser.Display.Color.HexStringToColor(template.color).color;
      cardGfx.lineStyle(2, heroColorInt, 0.5);
      cardGfx.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      // Left accent bar
      cardGfx.fillStyle(heroColorInt, 0.8);
      cardGfx.fillRoundedRect(x - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16,
        { tl: 3, bl: 3, tr: 3, br: 3 });

      // Hero icon circle
      const iconBg = this.add.graphics();
      iconBg.fillStyle(heroColorInt, 0.2);
      iconBg.fillCircle(x - cardW / 2 + 55, y - 10, 28);
      iconBg.lineStyle(1.5, heroColorInt, 0.4);
      iconBg.strokeCircle(x - cardW / 2 + 55, y - 10, 28);

      // Hero icon (emoji)
      this.add.text(x - cardW / 2 + 55, y - 12, heroIcons[key], {
        fontSize: '28px',
      }).setOrigin(0.5);

      // Hero name
      this.add.text(x - cardW / 2 + 100, y - cardH / 2 + 20, `${template.nameZh} ${template.name}`, {
        fontSize: '20px', fontFamily: 'monospace', color: template.color,
        stroke: '#000', strokeThickness: 3,
      });

      // Difficulty tag
      const diffColor = key === 'warrior' ? '#2ecc71' : key === 'mage' ? '#e74c3c' : '#3498db';
      this.add.text(x + cardW / 2 - 20, y - cardH / 2 + 22, difficulties[key], {
        fontSize: '11px', fontFamily: 'monospace', color: diffColor,
      }).setOrigin(1, 0);

      // Stats
      const mainStat = key === 'mage' ? `MATK ${template.matk}` : `ATK ${template.atk}`;
      this.add.text(x - cardW / 2 + 100, y - 5,
        `HP ${template.hp}  ${mainStat}  DEF ${template.def}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#b2bec3',
      });

      // Skill info
      this.add.text(x - cardW / 2 + 100, y + 20,
        `Skill: ${template.skill.nameZh} — ${template.skill.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#74b9ff',
      });

      // Skill description
      this.add.text(x - cardW / 2 + 100, y + 42, template.skill.description, {
        fontSize: '11px', fontFamily: 'monospace', color: '#636e72',
        wordWrap: { width: cardW - 130 },
      });

      // Interactive hit area
      const card = this.add.rectangle(x, y, cardW, cardH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      // Hover effect
      card.on('pointerover', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x22224a, 0.95);
        cardGfx.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2.5, heroColorInt, 0.8);
        cardGfx.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(heroColorInt, 0.9);
        cardGfx.fillRoundedRect(x - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16,
          { tl: 3, bl: 3, tr: 3, br: 3 });
      });
      card.on('pointerout', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x1a1a2e, 0.92);
        cardGfx.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2, heroColorInt, 0.5);
        cardGfx.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(heroColorInt, 0.8);
        cardGfx.fillRoundedRect(x - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16,
          { tl: 3, bl: 3, tr: 3, br: 3 });
      });

      // Click to start — press feedback
      card.on('pointerdown', () => {
        // Flash card bright
        cardGfx.clear();
        cardGfx.fillStyle(heroColorInt, 0.2);
        cardGfx.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.lineStyle(2.5, 0xffffff, 0.9);
        cardGfx.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
        cardGfx.fillStyle(heroColorInt, 1);
        cardGfx.fillRoundedRect(x - cardW / 2 + 3, y - cardH / 2 + 8, 5, cardH - 16,
          { tl: 3, bl: 3, tr: 3, br: 3 });

        // Scale bounce
        this.tweens.add({
          targets: [cardGfx, card],
          scaleX: 0.96, scaleY: 0.96,
          duration: 80, yoyo: true,
        });

        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          const heroState = {
            ...template,
            maxHp: template.hp,
            currentHp: template.hp,
            armor: 0,
            skillCharge: 0,
            equipment: {},
          };

          this.scene.start('Map', {
            heroKey: key,
            hero: heroState,
            floor: 1,
            gold: ECONOMY.startingGold,
            potions: ECONOMY.startingPotions,
            stats: { turnsPlayed: 0, enemiesKilled: 0, goldEarned: 0 },
          });
        });
      });
    });

    // Bottom text
    const tipText = this.add.text(width / 2, height - 35,
      'Match gems to deal damage, heal, and charge skills!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4a4a6a',
      align: 'center',
    }).setOrigin(0.5);

    // Version
    this.add.text(width / 2, height - 15, 'v0.2.0', {
      fontSize: '10px', fontFamily: 'monospace', color: '#2d2d4a',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500);
  }
}
