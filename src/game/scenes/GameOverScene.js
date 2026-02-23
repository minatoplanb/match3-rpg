/**
 * GameOverScene — Victory or defeat screen with run stats
 * V2: Polished with animations, better stat cards, visual flair
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this.victory = data.victory;
    this.floorsCleared = data.floorsCleared || 0;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    if (this.victory) {
      bg.fillGradientStyle(0x0a1a0a, 0x0a1a0a, 0x0a2a0a, 0x0a2a0a, 1);
    } else {
      bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x200808, 0x200808, 1);
    }
    bg.fillRect(0, 0, width, height);

    // Particles
    const pColor = this.victory ? 0xf1c40f : 0xe74c3c;
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const particle = this.add.circle(px, py, 0.5 + Math.random() * 1.5, pColor, 0.1 + Math.random() * 0.15);
      this.tweens.add({
        targets: particle,
        y: py - 20 - Math.random() * 30,
        alpha: 0,
        duration: 2000 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 2000,
        onRepeat: () => {
          particle.setPosition(Math.random() * width, height * 0.3 + Math.random() * height * 0.7);
          particle.setAlpha(0.1 + Math.random() * 0.15);
        },
      });
    }

    // Result title — animated entrance
    if (this.victory) {
      const title = this.add.text(width / 2, 100, 'VICTORY!', {
        fontSize: '40px', fontFamily: 'monospace', color: '#f1c40f',
        stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setScale(0.3).setAlpha(0);

      this.tweens.add({
        targets: title,
        scaleX: 1, scaleY: 1, alpha: 1,
        duration: 500, ease: 'Back.easeOut',
      });

      this.add.text(width / 2, 150, 'You conquered the dungeon!', {
        fontSize: '15px', fontFamily: 'monospace', color: '#2ecc71',
      }).setOrigin(0.5);
    } else {
      const title = this.add.text(width / 2, 100, 'DEFEATED', {
        fontSize: '40px', fontFamily: 'monospace', color: '#e74c3c',
        stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setScale(0.3).setAlpha(0);

      this.tweens.add({
        targets: title,
        scaleX: 1, scaleY: 1, alpha: 1,
        duration: 500, ease: 'Back.easeOut',
      });

      this.add.text(width / 2, 150, 'The dungeon claims another soul...', {
        fontSize: '15px', fontFamily: 'monospace', color: '#b2bec3',
      }).setOrigin(0.5);
    }

    // Decorative line
    const lineG = this.add.graphics();
    const lineColor = this.victory ? 0xf1c40f : 0xe74c3c;
    lineG.lineStyle(1, lineColor, 0.3);
    lineG.lineBetween(width / 2 - 150, 175, width / 2 + 150, 175);
    lineG.fillStyle(lineColor, 0.6);
    lineG.fillCircle(width / 2, 175, 3);

    // Stats card
    const cardW = 450;
    const cardH = 280;
    const cardY = height / 2 - 10;

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0x1a1a2e, 0.92);
    cardGfx.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 12);
    cardGfx.lineStyle(1.5, lineColor, 0.3);
    cardGfx.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 12);

    // Stats header
    this.add.text(width / 2, cardY - cardH / 2 + 25, 'Run Summary', {
      fontSize: '18px', fontFamily: 'monospace', color: this.victory ? '#f1c40f' : '#e74c3c',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Stats
    const shards = this.calcSoulShards();
    const stats = [
      { label: 'Hero', value: this.hero?.nameZh || 'Unknown', color: '#dfe6e9' },
      { label: 'Floors Cleared', value: `${this.floorsCleared} / 20`, color: '#dfe6e9' },
      { label: 'Gold Earned', value: `${this.runState.gold || 0}`, color: '#f1c40f' },
      { label: 'Potions Used', value: `${Math.max(0, 2 - (this.runState.potions || 0))}`, color: '#2ecc71' },
      { label: 'Soul Shards', value: `${shards}`, color: '#9b59b6' },
    ];

    stats.forEach((stat, i) => {
      const sy = cardY - cardH / 2 + 65 + i * 40;

      // Label
      this.add.text(width / 2 - cardW / 2 + 40, sy, stat.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#636e72',
      });

      // Value
      this.add.text(width / 2 + cardW / 2 - 40, sy, stat.value, {
        fontSize: '14px', fontFamily: 'monospace', color: stat.color,
      }).setOrigin(1, 0);

      // Separator line (except last)
      if (i < stats.length - 1) {
        const sepG = this.add.graphics();
        sepG.lineStyle(1, 0x636e72, 0.15);
        sepG.lineBetween(width / 2 - cardW / 2 + 30, sy + 28, width / 2 + cardW / 2 - 30, sy + 28);
      }
    });

    // Play again button
    const btnY = height - 120;
    const btnW = 280;
    const btnH = 52;

    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(0x1a1a2e, 0.9);
    btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    btnGfx.lineStyle(2, 0xf39c12, 0.6);
    btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    // Gloss
    btnGfx.fillStyle(0xffffff, 0.04);
    btnGfx.fillRoundedRect(width / 2 - btnW / 2 + 2, btnY - btnH / 2 + 2, btnW - 4, btnH / 2 - 2,
      { tl: 8, tr: 8, bl: 0, br: 0 });

    this.add.text(width / 2, btnY, 'PLAY AGAIN', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f39c12',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x22224a, 0.95);
      btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      btnGfx.lineStyle(2, 0xf1c40f, 0.8);
      btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });
    btn.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x1a1a2e, 0.9);
      btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      btnGfx.lineStyle(2, 0xf39c12, 0.6);
      btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('Menu'));
    });

    this.cameras.main.fadeIn(500);
  }

  calcSoulShards() {
    let shards = this.floorsCleared * 3;
    const bossFloors = [5, 10, 15, 20];
    for (const bf of bossFloors) {
      if (this.floorsCleared >= bf) shards += 15;
    }
    return shards;
  }
}
