/**
 * GameOverScene — Victory or defeat screen with run stats
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
      bg.fillGradientStyle(0x1a3a1a, 0x1a3a1a, 0x0d3d0d, 0x0d3d0d, 1);
    } else {
      bg.fillGradientStyle(0x3a1a1a, 0x3a1a1a, 0x1f0d0d, 0x1f0d0d, 1);
    }
    bg.fillRect(0, 0, width, height);

    // Result title
    if (this.victory) {
      this.add.text(width / 2, 100, '🏆 VICTORY! 🏆', {
        fontSize: '36px', fontFamily: 'monospace', color: '#f1c40f',
        stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5);

      this.add.text(width / 2, 150, 'You conquered the dungeon!', {
        fontSize: '16px', fontFamily: 'monospace', color: '#2ecc71',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, 100, '💀 DEFEATED 💀', {
        fontSize: '36px', fontFamily: 'monospace', color: '#e74c3c',
        stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5);

      this.add.text(width / 2, 150, 'The dungeon claims another soul...', {
        fontSize: '16px', fontFamily: 'monospace', color: '#b2bec3',
      }).setOrigin(0.5);
    }

    // Stats card
    const cardY = height / 2 - 30;
    this.add.rectangle(width / 2, cardY, 500, 300, 0x2d3436, 0.9)
      .setStrokeStyle(2, 0x636e72);

    const stats = [
      `Hero: ${this.hero?.nameZh || 'Unknown'}`,
      `Floors Cleared: ${this.floorsCleared} / 20`,
      `Gold Earned: ${this.runState.gold || 0}`,
      `Potions Used: ${Math.max(0, 2 - (this.runState.potions || 0))}`,
      '',
      `Soul Shards Earned: ${this.calcSoulShards()}`,
    ];

    stats.forEach((line, i) => {
      this.add.text(width / 2, cardY - 100 + i * 35, line, {
        fontSize: '16px', fontFamily: 'monospace',
        color: i === stats.length - 1 ? '#9b59b6' : '#dfe6e9',
      }).setOrigin(0.5);
    });

    // Play again button
    const btnY = height - 150;
    const btn = this.add.rectangle(width / 2, btnY, 300, 60, 0x2d3436, 0.9)
      .setStrokeStyle(2, 0xf39c12)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, btnY, '🔄 PLAY AGAIN', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f39c12',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setStrokeStyle(3, 0xf1c40f));
    btn.on('pointerout', () => btn.setStrokeStyle(2, 0xf39c12));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('Menu'));
    });

    this.cameras.main.fadeIn(500);
  }

  calcSoulShards() {
    // 3 per floor + 15 per boss + 5 per elite
    let shards = this.floorsCleared * 3;
    const bossFloors = [5, 10, 15, 20];
    for (const bf of bossFloors) {
      if (this.floorsCleared >= bf) shards += 15;
    }
    return shards;
  }
}
