/**
 * MenuScene — Hero selection (portrait layout)
 */
import { HEROES, ECONOMY } from '../../config/balance.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, 80, 'MATCH-3 RPG', {
      fontSize: '36px', fontFamily: 'monospace', color: '#e8d44d',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 120, 'Puzzle Quest Roguelike', {
      fontSize: '16px', fontFamily: 'monospace', color: '#b2bec3',
    }).setOrigin(0.5);

    // Hero cards (vertical layout for portrait)
    const heroKeys = ['warrior', 'mage', 'paladin'];
    const difficulties = { warrior: 'Normal Mode', mage: 'Hard Mode', paladin: 'Tank Mode' };
    const heroes = heroKeys.map(key => {
      const t = HEROES[key];
      const mainStat = key === 'mage' ? `MATK ${t.matk}` : `ATK ${t.atk}`;
      return {
        key,
        label: `${t.nameZh} ${t.name}`,
        desc: `${difficulties[key]}\nHP ${t.hp}  ${mainStat}  DEF ${t.def}\nSkill: ${t.skill.name}`,
        detail: t.skill.description,
      };
    });

    const cardH = 180;
    const cardW = width - 80;
    const startY = 200;

    heroes.forEach((hero, i) => {
      const template = HEROES[hero.key];
      const x = width / 2;
      const y = startY + i * (cardH + 20);

      // Card background
      const card = this.add.rectangle(x, y, cardW, cardH, 0x2d3436, 0.9)
        .setStrokeStyle(2, 0x636e72)
        .setInteractive({ useHandCursor: true });

      // Hero color indicator (left bar)
      const colorBar = this.add.rectangle(
        x - cardW / 2 + 6, y, 8, cardH - 10,
        Phaser.Display.Color.HexStringToColor(template.color).color
      );

      // Hero name
      this.add.text(x - cardW / 2 + 30, y - cardH / 2 + 20, hero.label, {
        fontSize: '22px', fontFamily: 'monospace', color: template.color,
        stroke: '#000', strokeThickness: 3,
      });

      // Description
      this.add.text(x - cardW / 2 + 30, y - 10, hero.desc, {
        fontSize: '13px', fontFamily: 'monospace', color: '#dfe6e9',
        lineSpacing: 5,
      });

      // Skill detail (right side)
      this.add.text(x + cardW / 2 - 20, y + cardH / 2 - 25, hero.detail, {
        fontSize: '11px', fontFamily: 'monospace', color: '#f39c12',
      }).setOrigin(1, 1);

      // Hover effect
      card.on('pointerover', () => {
        card.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(template.color).color);
        card.setFillStyle(0x3d3d56, 0.95);
      });
      card.on('pointerout', () => {
        card.setStrokeStyle(2, 0x636e72);
        card.setFillStyle(0x2d3436, 0.9);
      });

      // Click to start
      card.on('pointerdown', () => {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          // Initialize hero state
          const heroState = {
            ...template,
            maxHp: template.hp,
            currentHp: template.hp,
            armor: 0,
            skillCharge: 0,
            equipment: {},
          };

          this.scene.start('Map', {
            heroKey: hero.key,
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
    this.add.text(width / 2, height - 40, 'Match gems to deal damage, heal, and charge skills!', {
      fontSize: '12px', fontFamily: 'monospace', color: '#636e72',
      align: 'center',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500);
  }
}
