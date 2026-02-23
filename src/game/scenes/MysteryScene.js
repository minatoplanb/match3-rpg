/**
 * MysteryScene — Random event encounters with risk/reward
 */
import { playHeal, playDamage, playSwap, playVictory } from '../systems/SoundManager.js';

export class MysteryScene extends Phaser.Scene {
  constructor() {
    super('Mystery');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this._chosen = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background — mysterious purple theme
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, width, height);

    // Mysterious floating orbs
    for (let i = 0; i < 20; i++) {
      const colors = [0x6c5ce7, 0xa29bfe, 0x9b59b6, 0x74b9ff];
      const orb = this.add.circle(
        Math.random() * width, Math.random() * height,
        1 + Math.random() * 2, Phaser.Utils.Array.GetRandom(colors),
        0.08 + Math.random() * 0.12
      );
      this.tweens.add({
        targets: orb,
        y: orb.y - 20 - Math.random() * 30,
        x: orb.x + (Math.random() - 0.5) * 40,
        alpha: 0,
        duration: 3000 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 2000,
        onRepeat: () => {
          orb.setPosition(Math.random() * width, height * 0.3 + Math.random() * height * 0.7);
          orb.setAlpha(0.08 + Math.random() * 0.12);
        },
      });
    }

    // Title
    this.add.text(width / 2, 45, '❓ MYSTERY EVENT', {
      fontSize: '26px', fontFamily: 'monospace', color: '#a29bfe',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x6c5ce7, 0.3);
    lineG.lineBetween(width / 2 - 120, 70, width / 2 + 120, 70);

    // Generate the event
    const event = this.generateEvent();

    // Event card — dramatic reveal
    const cardW = width - 80;
    const cardH = 350;
    const cardY = height / 2 - 40;

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0x1a1a2e, 0.95);
    cardGfx.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    cardGfx.lineStyle(2, event.borderColor, 0.5);
    cardGfx.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    // Left accent
    cardGfx.fillStyle(event.borderColor, 0.7);
    cardGfx.fillRoundedRect(width / 2 - cardW / 2 + 4, cardY - cardH / 2 + 10, 6, cardH - 20, 4);

    // Event icon (large)
    this.add.text(width / 2, cardY - 95, event.icon, {
      fontSize: '52px',
    }).setOrigin(0.5);

    // Event name
    this.add.text(width / 2, cardY - 35, event.name, {
      fontSize: '22px', fontFamily: 'monospace', color: event.textColor,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Event description
    this.add.text(width / 2, cardY + 15, event.desc, {
      fontSize: '14px', fontFamily: 'monospace', color: '#b2bec3',
      align: 'center', lineSpacing: 6,
      wordWrap: { width: cardW - 80 },
    }).setOrigin(0.5);

    // Choices
    if (event.choices && event.choices.length > 0) {
      event.choices.forEach((choice, i) => {
        const btnY = cardY + 80 + i * 60;
        const btnW = cardW - 100;
        const btnH = 46;

        const btnGfx = this.add.graphics();
        btnGfx.fillStyle(0x22224a, 0.9);
        btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
        btnGfx.lineStyle(1.5, choice.color || event.borderColor, 0.5);
        btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);

        this.add.text(width / 2, btnY, choice.label, {
          fontSize: '15px', fontFamily: 'monospace', color: choice.textColor || '#dfe6e9',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);

        const btn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => {
          btnGfx.clear();
          btnGfx.fillStyle(0x2a2a5a, 0.95);
          btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
          btnGfx.lineStyle(2, choice.color || event.borderColor, 0.8);
          btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
        });
        btn.on('pointerout', () => {
          btnGfx.clear();
          btnGfx.fillStyle(0x22224a, 0.9);
          btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
          btnGfx.lineStyle(1.5, choice.color || event.borderColor, 0.5);
          btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
        });
        btn.on('pointerdown', () => {
          if (this._chosen) return;
          this._chosen = true;
          choice.apply();
          this.showResult(choice.result);
        });
      });
    } else {
      // Single-outcome event — just show "Continue"
      const btnY = cardY + 100;
      const btnW = 200;
      const btnH = 44;

      event.apply();

      const btnGfx = this.add.graphics();
      btnGfx.fillStyle(0x22224a, 0.9);
      btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
      btnGfx.lineStyle(1.5, event.borderColor, 0.5);
      btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);

      this.add.text(width / 2, btnY, '[ CONTINUE ]', {
        fontSize: '15px', fontFamily: 'monospace', color: '#dfe6e9',
      }).setOrigin(0.5);

      this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this._chosen) return;
          this._chosen = true;
          this.advanceFloor();
        });
    }

    this.cameras.main.fadeIn(300);
  }

  generateEvent() {
    const h = this.hero;
    const tierNum = Math.min(4, Math.ceil(this.runState.floor / 5));
    const events = [];

    // 1) Treasure chest — always good
    const goldAmount = Phaser.Math.Between(20 * tierNum, 50 * tierNum);
    events.push({
      name: 'Treasure Chest',
      icon: '🎁',
      desc: `You discover a hidden treasure chest!\nIt contains ${goldAmount} gold.`,
      textColor: '#f1c40f',
      borderColor: 0xf1c40f,
      apply: () => {
        this.runState.gold += goldAmount;
        playVictory();
      },
    });

    // 2) Healing Spring
    events.push({
      name: 'Healing Spring',
      icon: '🌊',
      desc: 'You find a mystical spring that restores\nyour health and soothes your wounds.',
      textColor: '#2ecc71',
      borderColor: 0x2ecc71,
      apply: () => {
        h.currentHp = Math.min(h.maxHp, h.currentHp + Math.round(h.maxHp * 0.4));
        playHeal();
      },
    });

    // 3) Gambler — risk/reward choice
    events.push({
      name: 'Mysterious Gambler',
      icon: '🎲',
      desc: 'A hooded figure offers you a wager.\n"Care to test your luck?"',
      textColor: '#f39c12',
      borderColor: 0xf39c12,
      choices: [
        {
          label: `🎲 Gamble (bet ${30 * tierNum}g)`,
          textColor: '#f39c12',
          color: 0xf39c12,
          result: null,
          apply: () => {
            const bet = 30 * tierNum;
            if (this.runState.gold < bet) {
              this.showResult({ text: 'Not enough gold!', color: '#e74c3c', sound: 'bad' });
              return;
            }
            this.runState.gold -= bet;
            if (Math.random() < 0.45) {
              const winnings = bet * 3;
              this.runState.gold += winnings;
              this.showResult({ text: `Won ${winnings}g!`, color: '#f1c40f', sound: 'good' });
            } else {
              this.showResult({ text: `Lost ${bet}g...`, color: '#e74c3c', sound: 'bad' });
            }
          },
        },
        {
          label: '🚶 Walk away',
          textColor: '#636e72',
          color: 0x636e72,
          apply: () => { this.advanceFloor(); },
        },
      ],
    });

    // 4) Ancient Altar — sacrifice HP for power
    events.push({
      name: 'Ancient Altar',
      icon: '🗿',
      desc: 'A dark altar pulses with energy.\nOffering your blood may grant power...',
      textColor: '#9b59b6',
      borderColor: 0x9b59b6,
      choices: [
        {
          label: '🩸 Sacrifice (lose 20% HP)',
          textColor: '#e74c3c',
          color: 0xe74c3c,
          apply: () => {
            const cost = Math.round(h.maxHp * 0.2);
            h.currentHp = Math.max(1, h.currentHp - cost);
            const statType = Phaser.Utils.Array.GetRandom(['atk', 'matk', 'def']);
            const boost = tierNum + 2;
            const labels = { atk: 'ATK', matk: 'MATK', def: 'DEF' };
            h[statType] += boost;
            this.showResult({
              text: `+${boost} ${labels[statType]}! (-${cost} HP)`,
              color: '#9b59b6',
              sound: 'good',
            });
          },
        },
        {
          label: '🚶 Leave it alone',
          textColor: '#636e72',
          color: 0x636e72,
          apply: () => { this.advanceFloor(); },
        },
      ],
    });

    // 5) Trap — bad event but with a silver lining
    events.push({
      name: 'Trap!',
      icon: '⚠️',
      desc: 'You trigger a hidden trap!\nPoison darts strike you.',
      textColor: '#e74c3c',
      borderColor: 0xe74c3c,
      apply: () => {
        const dmg = Math.round(h.maxHp * 0.15);
        h.currentHp = Math.max(1, h.currentHp - dmg);
        playDamage();
      },
    });

    // 6) Wandering Merchant — free potion
    events.push({
      name: 'Wandering Merchant',
      icon: '🧙',
      desc: 'A friendly merchant shares a potion\nwith you before continuing on his way.',
      textColor: '#2ecc71',
      borderColor: 0x2ecc71,
      apply: () => {
        this.runState.potions += 1;
        playHeal();
      },
    });

    // 7) Blessing shrine
    events.push({
      name: 'Blessing Shrine',
      icon: '✨',
      desc: 'A warm light envelops you.\nYou feel permanently stronger!',
      textColor: '#f1c40f',
      borderColor: 0xf1c40f,
      apply: () => {
        h.maxHp += 10 + tierNum * 5;
        h.currentHp += 10 + tierNum * 5;
        playVictory();
      },
    });

    return Phaser.Utils.Array.GetRandom(events);
  }

  showResult(result) {
    if (!result) return;

    const { width, height } = this.scale;

    if (result.sound === 'good') playVictory();
    else if (result.sound === 'bad') playDamage();

    // Result banner
    const banner = this.add.text(width / 2, height / 2 + 180, result.text, {
      fontSize: '22px', fontFamily: 'monospace', color: result.color,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(50);

    this.tweens.add({
      targets: banner,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 300, ease: 'Back.easeOut',
    });

    // Auto advance after delay
    this.time.delayedCall(1500, () => this.advanceFloor());
  }

  advanceFloor() {
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
