/**
 * CombatScene — Match-3 board + enemy + turn-based combat
 *
 * Layout (portrait 800x1200):
 *   [0-40]      HUD (floor, gold, potions)
 *   [40-200]    Enemy area (sprite + HP bar + name)
 *   [200-540]   Hero status + combo text + damage numbers
 *   [540-1160]  Match-3 board (7×7, ~85px cells)
 *   [1160-1200] Skill button / bottom margin
 */
import {
  GEM_LIST, GEM_COUNT, BOARD, FORMULAS,
  HEROES, ENEMIES, BOSSES, ENEMY_SCALING, FLOOR_ENCOUNTERS, ECONOMY
} from '../../config/balance.js';
import { resolveMatches } from '../systems/MatchResolver.js';
import {
  playGemMatch, playSwap, playInvalidSwap, playDamage, playHeal,
  playEnemyHit, playSkill, playVictory, playDefeat, playBossAppear,
  startBGM, stopBGM
} from '../systems/SoundManager.js';

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('Combat');
  }

  init(data) {
    this.runState = data;
    this.hero = data.hero;
    this.floor = data.floor;
    this.encounterType = data.encounterType || 'combat';

    this.turnCount = 0;
    this.comboLevel = 0;
    this.inputEnabled = false;
    this.battleOver = false;
    this.selectedGem = null;

    // Enemy state
    this.enemy = null;
    this.isBoss = false;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const encounter = FLOOR_ENCOUNTERS[this.floor] || { theme: 'grassland' };
    this.drawBackground(width, height, encounter.theme);

    // Spawn enemy
    this.spawnEnemy();

    // Draw HUD
    this.drawHUD(width);

    // Draw hero status area
    this.drawHeroStatus(width);

    // Create the match-3 board
    this.createBoard();

    // Draw skill button
    this.drawSkillButton(width, height);

    // Floating text pool
    this.floatingTexts = [];

    // Start BGM + boss sound
    startBGM();
    if (this.isBoss) playBossAppear();

    // Swipe/drag detection for mobile
    this.dragStart = null;
    this.input.on('pointerup', (pointer) => this.onPointerUp(pointer));
    this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));

    // Fade in, then enable input
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => {
      this.inputEnabled = true;
    });
  }

  onPointerMove(pointer) {
    if (!this.dragStart || !this.inputEnabled || this.battleOver || !pointer.isDown) return;

    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;
    const threshold = BOARD.cellSize * 0.35; // 35% of cell size to trigger swipe

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    const { row, col } = this.dragStart;
    let targetRow = row;
    let targetCol = col;

    // Determine swipe direction (dominant axis)
    if (Math.abs(dx) > Math.abs(dy)) {
      targetCol = col + (dx > 0 ? 1 : -1);
    } else {
      targetRow = row + (dy > 0 ? 1 : -1);
    }

    // Bounds check
    if (targetRow < 0 || targetRow >= BOARD.rows || targetCol < 0 || targetCol >= BOARD.cols) {
      this.dragStart = null;
      return;
    }

    // Execute swap
    this.hideSelectionRing();
    this.selectedGem = null;
    this.dragStart = null;
    this.attemptSwap(row, col, targetRow, targetCol);
  }

  onPointerUp() {
    this.dragStart = null;
  }

  // ── BACKGROUND ──────────────────────────────────────────────

  drawBackground(w, h, theme) {
    const colors = {
      grassland: [0x1a3a1a, 0x0d1f0d],
      desert: [0x3a2a1a, 0x1f150d],
      frostlands: [0x1a2a3a, 0x0d1520],
      infernal: [0x3a1a1a, 0x200d0d],
    };
    const [top, bottom] = colors[theme] || colors.grassland;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(top, top, bottom, bottom, 1);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(0);
  }

  // ── ENEMY SPAWN ──────────────────────────────────────────────

  spawnEnemy() {
    const encounter = FLOOR_ENCOUNTERS[this.floor];
    if (!encounter) return;

    if (encounter.boss) {
      const template = BOSSES[encounter.boss];
      this.isBoss = true;
      this.enemy = {
        ...template,
        maxHp: template.hp,
        currentHp: template.hp,
        isBoss: true,
        enraged: false,
        blockedColumn: -1,
        burnedGems: [],
        turnsSinceBlock: 0,
      };
    } else {
      const enemyKey = encounter.enemies[Math.floor(Math.random() * encounter.enemies.length)];
      const template = ENEMIES[enemyKey];
      const scale = 1 + this.floor * ENEMY_SCALING.hp;
      const atkScale = 1 + this.floor * ENEMY_SCALING.atk;
      const defScale = 1 + this.floor * ENEMY_SCALING.def;

      // Elite encounters get 1.5x stats
      const eliteMult = this.encounterType === 'elite' ? 1.5 : 1;

      this.enemy = {
        ...template,
        hp: Math.round(template.hp * scale * eliteMult),
        maxHp: Math.round(template.hp * scale * eliteMult),
        currentHp: Math.round(template.hp * scale * eliteMult),
        atk: Math.round(template.atk * atkScale * eliteMult),
        def: Math.round(template.def * defScale * eliteMult),
        isBoss: false,
        isElite: this.encounterType === 'elite',
      };
    }

    this.drawEnemy();
  }

  drawEnemy() {
    const w = this.scale.width;
    const e = this.enemy;

    // Enemy name
    const nameColor = e.isBoss ? '#ff6b6b' : (e.isElite ? '#ffa502' : '#dfe6e9');
    const prefix = e.isBoss ? '👑 ' : (e.isElite ? '⚡ ' : '');
    this.enemyNameText = this.add.text(w / 2, 50, `${prefix}${e.name}`, {
      fontSize: e.isBoss ? '24px' : '20px',
      fontFamily: 'monospace',
      color: nameColor,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Enemy sprite (colored rectangle as placeholder)
    const spriteSize = e.isBoss ? 100 : 70;
    const enemyGfx = this.add.graphics();
    const eColor = Phaser.Display.Color.HexStringToColor(e.color || '#e74c3c').color;
    enemyGfx.fillStyle(eColor, 1);
    enemyGfx.fillRoundedRect(w / 2 - spriteSize / 2, 75, spriteSize, spriteSize, 8);
    // Eyes
    enemyGfx.fillStyle(0xffffff, 1);
    enemyGfx.fillCircle(w / 2 - spriteSize * 0.15, 75 + spriteSize * 0.35, 6);
    enemyGfx.fillCircle(w / 2 + spriteSize * 0.15, 75 + spriteSize * 0.35, 6);
    enemyGfx.fillStyle(0x000000, 1);
    enemyGfx.fillCircle(w / 2 - spriteSize * 0.12, 75 + spriteSize * 0.37, 3);
    enemyGfx.fillCircle(w / 2 + spriteSize * 0.18, 75 + spriteSize * 0.37, 3);
    enemyGfx.setDepth(10);
    this.enemySprite = enemyGfx;

    // HP bar background
    const barW = 300;
    const barH = 20;
    const barX = w / 2 - barW / 2;
    const barY = 75 + spriteSize + 10;

    this.enemyBarBg = this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setDepth(20);
    this.enemyBarFill = this.add.rectangle(barX + 2, barY + 2, barW - 4, barH - 4, 0xe74c3c)
      .setOrigin(0, 0).setDepth(21);
    this.enemyHpText = this.add.text(w / 2, barY + barH / 2, `${e.currentHp} / ${e.maxHp}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(22);

    this.enemyBarX = barX + 2;
    this.enemyBarMaxW = barW - 4;
  }

  updateEnemyHP() {
    const e = this.enemy;
    const ratio = Math.max(0, e.currentHp / e.maxHp);
    this.enemyBarFill.width = this.enemyBarMaxW * ratio;
    this.enemyHpText.setText(`${Math.max(0, e.currentHp)} / ${e.maxHp}`);

    // Change color based on HP
    if (ratio < 0.25) this.enemyBarFill.setFillStyle(0xff0000);
    else if (ratio < 0.5) this.enemyBarFill.setFillStyle(0xe67e22);
    else this.enemyBarFill.setFillStyle(0xe74c3c);
  }

  // ── HUD ──────────────────────────────────────────────────────

  drawHUD(w) {
    // Floor indicator
    this.floorText = this.add.text(20, 12, `Floor ${this.floor}/20`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(30);

    // Gold
    this.goldText = this.add.text(w / 2, 12, `💰 ${this.runState.gold}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(30);

    // Potions
    this.potionText = this.add.text(w - 20, 12, `🧪 ${this.runState.potions}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#2ecc71',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(30);

    // Potion button (tap potions text to use)
    this.potionText.setInteractive({ useHandCursor: true });
    this.potionText.on('pointerdown', () => this.usePotion());
  }

  // ── HERO STATUS ──────────────────────────────────────────────

  drawHeroStatus(w) {
    const y = 230;

    // Hero name + class
    const h = this.hero;
    this.heroNameText = this.add.text(w / 2, y, `${h.nameZh} Lv.${this.floor}`, {
      fontSize: '18px', fontFamily: 'monospace',
      color: HEROES[this.runState.heroKey]?.color || '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // HP bar
    const barW = 350;
    const barH = 22;
    const barX = w / 2 - barW / 2;
    const barY = y + 25;

    this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setDepth(20);
    this.heroHpFill = this.add.rectangle(barX + 2, barY + 2, barW - 4, barH - 4, 0x2ecc71)
      .setOrigin(0, 0).setDepth(21);
    this.heroHpText = this.add.text(w / 2, barY + barH / 2,
      `HP ${h.currentHp} / ${h.maxHp}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5).setDepth(22);

    this.heroBarX = barX + 2;
    this.heroBarMaxW = barW - 4;

    // Armor display
    this.armorText = this.add.text(w / 2, barY + barH + 8, `🛡️ Armor: ${h.armor || 0}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#74b9ff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    // Skill charge bar
    const skillY = barY + barH + 32;
    const skillBarW = 200;
    const skillBarH = 14;
    const skillBarX = w / 2 - skillBarW / 2;

    this.add.rectangle(skillBarX + skillBarW / 2, skillY + skillBarH / 2, skillBarW, skillBarH, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setDepth(20);
    this.skillBarFill = this.add.rectangle(skillBarX + 2, skillY + 2, 0, skillBarH - 4, 0x9b59b6)
      .setOrigin(0, 0).setDepth(21);
    this.skillChargeText = this.add.text(w / 2, skillY + skillBarH / 2, 'Skill: 0%', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(22);

    this.skillBarX = skillBarX + 2;
    this.skillBarMaxW = skillBarW - 4;

    // Combo text (hidden until cascade)
    this.comboText = this.add.text(w / 2, 400, '', {
      fontSize: '32px', fontFamily: 'monospace', color: '#f39c12',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    // Stats display
    this.statsText = this.add.text(w / 2, skillY + skillBarH + 14, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#b2bec3',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);
    this.updateStatsText();
  }

  updateStatsText() {
    const h = this.hero;
    const equip = h.equipment || {};
    let lines = `ATK ${h.atk}  MATK ${h.matk}  DEF ${h.def}`;
    const bonuses = [];
    if (equip.swordBonus) bonuses.push(`⚔️+${Math.round(equip.swordBonus * 100)}%`);
    if (equip.fireBonus) bonuses.push(`🔥+${Math.round(equip.fireBonus * 100)}%`);
    if (equip.shieldBonus) bonuses.push(`🛡️+${Math.round(equip.shieldBonus * 100)}%`);
    if (equip.healBonus) bonuses.push(`💚+${Math.round(equip.healBonus * 100)}%`);
    if (equip.lifesteal) bonuses.push(`🩸${Math.round(equip.lifesteal * 100)}%`);
    if (bonuses.length) lines += '\n' + bonuses.join('  ');
    this.statsText.setText(lines);
  }

  updateHeroHP() {
    const h = this.hero;
    const ratio = Math.max(0, h.currentHp / h.maxHp);
    this.heroHpFill.width = this.heroBarMaxW * ratio;
    this.heroHpText.setText(`HP ${Math.max(0, Math.round(h.currentHp))} / ${h.maxHp}`);

    if (ratio < 0.25) this.heroHpFill.setFillStyle(0xff0000);
    else if (ratio < 0.5) this.heroHpFill.setFillStyle(0xe67e22);
    else this.heroHpFill.setFillStyle(0x2ecc71);

    this.armorText.setText(`🛡️ Armor: ${Math.round(h.armor || 0)}`);
  }

  updateSkillBar() {
    const h = this.hero;
    const template = HEROES[this.runState.heroKey];
    const cost = template.skill.cost;
    const charge = h.skillCharge || 0;
    const ratio = Math.min(1, charge / cost);
    this.skillBarFill.width = this.skillBarMaxW * ratio;
    this.skillChargeText.setText(`Skill: ${Math.round(ratio * 100)}%`);

    if (ratio >= 1) {
      this.skillBarFill.setFillStyle(0xf39c12);
    } else {
      this.skillBarFill.setFillStyle(0x9b59b6);
    }
  }

  // ── MATCH-3 BOARD ────────────────────────────────────────────

  createBoard() {
    const { cols, rows, cellSize, originX, originY } = BOARD;

    // Board background
    const boardBg = this.add.graphics();
    boardBg.fillStyle(0x000000, 0.4);
    boardBg.fillRoundedRect(
      originX - 10, originY - 10,
      cols * cellSize + 20, rows * cellSize + 20, 12
    );
    boardBg.setDepth(5);

    // Grid lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.08);
    for (let c = 0; c <= cols; c++) {
      grid.lineBetween(originX + c * cellSize, originY, originX + c * cellSize, originY + rows * cellSize);
    }
    for (let r = 0; r <= rows; r++) {
      grid.lineBetween(originX, originY + r * cellSize, originX + cols * cellSize, originY + r * cellSize);
    }
    grid.setDepth(6);

    // Initialize the board data (2D array)
    this.boardData = [];
    for (let r = 0; r < rows; r++) {
      this.boardData[r] = [];
      for (let c = 0; c < cols; c++) {
        // Avoid initial matches by checking left-2 and up-2
        let gemId;
        do {
          gemId = Math.floor(Math.random() * GEM_COUNT);
        } while (this.wouldMatchAt(r, c, gemId));
        this.boardData[r][c] = { gemId, special: null };
      }
    }

    // Create gem sprites
    this.gemSprites = [];
    for (let r = 0; r < rows; r++) {
      this.gemSprites[r] = [];
      for (let c = 0; c < cols; c++) {
        this.gemSprites[r][c] = this.createGemSprite(r, c);
      }
    }

    // Selection highlight ring
    this.selectionRing = this.add.graphics();
    this.selectionRing.setDepth(15);
    this.selectionRing.setVisible(false);
  }

  wouldMatchAt(row, col, gemId) {
    // Check horizontal (left 2)
    if (col >= 2
      && this.boardData[row][col - 1]?.gemId === gemId
      && this.boardData[row][col - 2]?.gemId === gemId) {
      return true;
    }
    // Check vertical (up 2)
    if (row >= 2
      && this.boardData[row - 1]?.[col]?.gemId === gemId
      && this.boardData[row - 2]?.[col]?.gemId === gemId) {
      return true;
    }
    return false;
  }

  createGemSprite(row, col) {
    const { cellSize, originX, originY } = BOARD;
    const x = originX + col * cellSize + cellSize / 2;
    const y = originY + row * cellSize + cellSize / 2;
    const gemId = this.boardData[row][col].gemId;

    const sprite = this.add.image(x, y, `gem_${gemId}`)
      .setDisplaySize(cellSize - 8, cellSize - 8)
      .setDepth(10)
      .setInteractive({ useHandCursor: true, draggable: false });

    sprite.setData('row', row);
    sprite.setData('col', col);

    // BUG FIX: read row/col from sprite DATA, not closure capture.
    // After dropAndFill, sprites get reused and their data updated,
    // but closure-captured values would still point to the OLD position.
    sprite.on('pointerdown', (pointer) => {
      this.onGemPointerDown(sprite, pointer);
    });

    return sprite;
  }

  getGemPosition(row, col) {
    const { cellSize, originX, originY } = BOARD;
    return {
      x: originX + col * cellSize + cellSize / 2,
      y: originY + row * cellSize + cellSize / 2,
    };
  }

  onGemPointerDown(sprite, pointer) {
    if (!this.inputEnabled || this.battleOver) return;

    // Read CURRENT position from sprite data (not closure)
    const row = sprite.getData('row');
    const col = sprite.getData('col');

    // Track drag start for swipe detection
    this.dragStart = { row, col, x: pointer.x, y: pointer.y, sprite };

    if (this.selectedGem === null) {
      // First selection
      this.selectedGem = { row, col };
      this.showSelectionRing(row, col);
    } else {
      const sel = this.selectedGem;

      // Check adjacency
      const dr = Math.abs(sel.row - row);
      const dc = Math.abs(sel.col - col);

      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // Adjacent — attempt swap
        this.hideSelectionRing();
        this.selectedGem = null;
        this.attemptSwap(sel.row, sel.col, row, col);
      } else if (sel.row === row && sel.col === col) {
        // Same gem — deselect
        this.hideSelectionRing();
        this.selectedGem = null;
      } else {
        // Not adjacent — select new gem
        this.selectedGem = { row, col };
        this.showSelectionRing(row, col);
      }
    }
  }

  showSelectionRing(row, col) {
    const pos = this.getGemPosition(row, col);
    const size = BOARD.cellSize - 4;
    this.selectionRing.clear();
    this.selectionRing.lineStyle(3, 0xffffff, 0.9);
    this.selectionRing.strokeRoundedRect(
      pos.x - size / 2, pos.y - size / 2, size, size, 6
    );
    this.selectionRing.setVisible(true);

    // Pulse animation
    if (this.selectionTween) this.selectionTween.destroy();
    this.selectionTween = this.tweens.add({
      targets: this.selectionRing,
      alpha: { from: 1, to: 0.4 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  hideSelectionRing() {
    this.selectionRing.setVisible(false);
    this.selectionRing.clear();
    if (this.selectionTween) {
      this.selectionTween.destroy();
      this.selectionTween = null;
    }
  }

  attemptSwap(r1, c1, r2, c2) {
    this.inputEnabled = false;

    // Swap data
    const temp = this.boardData[r1][c1];
    this.boardData[r1][c1] = this.boardData[r2][c2];
    this.boardData[r2][c2] = temp;

    // Check if this creates any match
    const matches = this.findAllMatches();

    if (matches.length === 0) {
      // No match — swap back
      playInvalidSwap();
      this.boardData[r2][c2] = this.boardData[r1][c1];
      this.boardData[r1][c1] = temp;

      // Animate swap and swap-back
      const pos1 = this.getGemPosition(r1, c1);
      const pos2 = this.getGemPosition(r2, c2);
      const s1 = this.gemSprites[r1][c1];
      const s2 = this.gemSprites[r2][c2];

      this.tweens.add({
        targets: s1, x: pos2.x, y: pos2.y, duration: 120, ease: 'Quad.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: s1, x: pos1.x, y: pos1.y, duration: 120, ease: 'Quad.easeInOut',
          });
        }
      });
      this.tweens.add({
        targets: s2, x: pos1.x, y: pos1.y, duration: 120, ease: 'Quad.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: s2, x: pos2.x, y: pos2.y, duration: 120, ease: 'Quad.easeInOut',
            onComplete: () => { this.inputEnabled = true; }
          });
        }
      });
      return;
    }

    // Valid swap — animate then process
    playSwap();
    const pos1 = this.getGemPosition(r1, c1);
    const pos2 = this.getGemPosition(r2, c2);
    const s1 = this.gemSprites[r1][c1];
    const s2 = this.gemSprites[r2][c2];

    // Swap sprite references
    this.gemSprites[r1][c1] = s2;
    this.gemSprites[r2][c2] = s1;
    s1.setData('row', r2); s1.setData('col', c2);
    s2.setData('row', r1); s2.setData('col', c1);

    this.tweens.add({
      targets: s1, x: pos2.x, y: pos2.y, duration: 120, ease: 'Quad.easeInOut',
    });
    this.tweens.add({
      targets: s2, x: pos1.x, y: pos1.y, duration: 120, ease: 'Quad.easeInOut',
      onComplete: () => {
        this.comboLevel = 0;
        this.processMatches();
      }
    });
  }

  // ── MATCH DETECTION ──────────────────────────────────────────

  findAllMatches() {
    const { rows, cols } = BOARD;
    const matches = [];

    // Horizontal matches
    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const gemId = this.boardData[r][c].gemId;
        if (gemId < 0) { c++; continue; }
        let len = 1;
        while (c + len < cols && this.boardData[r][c + len].gemId === gemId) len++;
        if (len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ r, c: c + i });
          matches.push({ gemId, cells, direction: 'horizontal', length: len });
        }
        c += len;
      }
    }

    // Vertical matches
    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const gemId = this.boardData[r][c].gemId;
        if (gemId < 0) { r++; continue; }
        let len = 1;
        while (r + len < rows && this.boardData[r + len][c].gemId === gemId) len++;
        if (len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ r: r + i, c });
          matches.push({ gemId, cells, direction: 'vertical', length: len });
        }
        r += len;
      }
    }

    return matches;
  }

  // ── MATCH PROCESSING (cascade loop) ──────────────────────────

  processMatches() {
    const matches = this.findAllMatches();
    if (matches.length === 0) {
      // No more matches — end of cascade chain
      this.onMatchChainComplete();
      return;
    }

    this.comboLevel++;
    playGemMatch(this.comboLevel);

    // Show combo text for cascades
    if (this.comboLevel > 1) {
      this.showComboText(this.comboLevel);
    }

    // Collect unique cells to remove and count gems by type
    const toRemove = new Set();
    const gemCounts = {};
    let specialsToCreate = [];

    for (const match of matches) {
      for (const cell of match.cells) {
        toRemove.add(`${cell.r},${cell.c}`);
      }
      gemCounts[match.gemId] = (gemCounts[match.gemId] || 0) + match.cells.length;

      // Check for special tile creation (match-4, match-5, T/L shapes)
      if (match.length === 4) {
        // Line blast — place at middle of match
        const mid = match.cells[Math.floor(match.cells.length / 2)];
        specialsToCreate.push({
          r: mid.r, c: mid.c, gemId: match.gemId,
          special: match.direction === 'horizontal' ? 'line_h' : 'line_v'
        });
      } else if (match.length >= 5) {
        // Color bomb
        const mid = match.cells[Math.floor(match.cells.length / 2)];
        specialsToCreate.push({
          r: mid.r, c: mid.c, gemId: match.gemId, special: 'color_bomb'
        });
      }
    }

    // Check for T/L shapes (intersection of horizontal + vertical)
    this.detectTLShapes(matches, specialsToCreate, toRemove);

    // Resolve match effects (damage, heal, etc)
    const effects = resolveMatches(gemCounts, this.comboLevel, this.hero, this.runState);
    this.applyMatchEffects(effects);

    // Animate removal
    const removeCells = [...toRemove].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { r, c };
    });

    this.animateRemoval(removeCells, () => {
      // Place special tiles
      for (const sp of specialsToCreate) {
        // Only place if the cell was cleared
        this.boardData[sp.r][sp.c] = { gemId: sp.gemId, special: sp.special };
      }

      // Drop gems down + fill from top
      this.dropAndFill(() => {
        // Check for more matches (cascade)
        this.time.delayedCall(100, () => this.processMatches());
      });
    });
  }

  detectTLShapes(matches, specialsToCreate, toRemove) {
    // Find cells that appear in both a horizontal and vertical match
    const hCells = new Set();
    const vCells = new Set();

    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell.r},${cell.c}`;
        if (match.direction === 'horizontal') hCells.add(key);
        else vCells.add(key);
      }
    }

    for (const key of hCells) {
      if (vCells.has(key)) {
        const [r, c] = key.split(',').map(Number);
        // This is an intersection — T or L shape → bomb
        // Don't create if we already have a higher-tier special here
        const existingSpecial = specialsToCreate.find(s => s.r === r && s.c === c);
        if (!existingSpecial) {
          specialsToCreate.push({
            r, c, gemId: this.boardData[r][c].gemId, special: 'bomb'
          });
        }
      }
    }
  }

  animateRemoval(cells, onComplete) {
    let completed = 0;
    const total = cells.length;

    if (total === 0) { onComplete(); return; }

    for (const { r, c } of cells) {
      const sprite = this.gemSprites[r][c];
      if (!sprite) { completed++; continue; }

      this.tweens.add({
        targets: sprite,
        scaleX: 0, scaleY: 0, alpha: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          sprite.destroy();
          this.gemSprites[r][c] = null;
          this.boardData[r][c] = { gemId: -1, special: null }; // Mark as empty
          completed++;
          if (completed >= total) onComplete();
        }
      });
    }
  }

  dropAndFill(onComplete) {
    const { rows, cols, cellSize } = BOARD;
    let animations = 0;
    let completed = 0;

    const checkDone = () => {
      completed++;
      if (completed >= animations) onComplete();
    };

    // Build a new sprite grid
    const newSprites = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (let c = 0; c < cols; c++) {
      // Collect surviving gems (bottom-up) with their OLD row + sprite
      const surviving = [];
      for (let r = rows - 1; r >= 0; r--) {
        if (this.boardData[r][c].gemId >= 0) {
          surviving.push({
            data: this.boardData[r][c],
            oldRow: r,
            sprite: this.gemSprites[r][c],
          });
        }
      }
      // surviving[0] = bottommost gem

      const emptyCount = rows - surviving.length;

      // Generate new gems to fill from top
      const newGems = [];
      for (let i = 0; i < emptyCount; i++) {
        newGems.push({ gemId: Math.floor(Math.random() * GEM_COUNT), special: null });
      }

      // Write board data: surviving fill bottom, new fill top
      for (let i = 0; i < surviving.length; i++) {
        this.boardData[rows - 1 - i][c] = surviving[i].data;
      }
      for (let i = 0; i < emptyCount; i++) {
        this.boardData[i][c] = newGems[i];
      }

      // Move surviving sprites to new positions (or leave in place)
      for (let i = 0; i < surviving.length; i++) {
        const newRow = rows - 1 - i;
        const entry = surviving[i];
        let sprite = entry.sprite;

        if (!sprite) {
          // Sprite was destroyed (e.g. special tile placed after removal) — create fresh
          sprite = this.createGemSprite(newRow, c);
          newSprites[newRow][c] = sprite;
          continue;
        }

        const targetPos = this.getGemPosition(newRow, c);
        sprite.setData('row', newRow);
        sprite.setData('col', c);

        if (entry.oldRow !== newRow) {
          // Gem needs to drop — animate it
          animations++;
          this.tweens.add({
            targets: sprite,
            y: targetPos.y,
            duration: 200,
            ease: 'Bounce.easeOut',
            delay: 10 * (newRow - entry.oldRow),
            onComplete: checkDone,
          });
        }
        // else: gem stayed in place — no animation needed

        newSprites[newRow][c] = sprite;
      }

      // Create new sprites for the fresh gems (drop in from above)
      for (let i = 0; i < emptyCount; i++) {
        const newRow = i;
        const sprite = this.createGemSprite(newRow, c);
        const targetPos = this.getGemPosition(newRow, c);

        // Start above the board
        sprite.y = BOARD.originY - (emptyCount - i) * cellSize;

        animations++;
        this.tweens.add({
          targets: sprite,
          y: targetPos.y,
          duration: 250,
          ease: 'Bounce.easeOut',
          delay: 30 * i + 10 * c,
          onComplete: checkDone,
        });

        newSprites[newRow][c] = sprite;
      }
    }

    // Replace sprite grid
    this.gemSprites = newSprites;

    if (animations === 0) onComplete();
  }

  // ── MATCH EFFECTS ────────────────────────────────────────────

  applyMatchEffects(effects) {
    const h = this.hero;
    const e = this.enemy;

    // Physical damage
    if (effects.physicalDamage > 0) {
      const reduced = this.applyDefense(effects.physicalDamage, e.def);
      e.currentHp -= reduced;
      this.showFloatingText(this.scale.width / 2, 130, `-${Math.round(reduced)}`, '#e74c3c');
      this.flashEnemy();
      playDamage();
    }

    // Magic damage
    if (effects.magicDamage > 0) {
      const reduced = this.applyDefense(effects.magicDamage, e.def);
      e.currentHp -= reduced;
      this.showFloatingText(this.scale.width / 2 + 40, 130, `-${Math.round(reduced)}`, '#e67e22');
      this.flashEnemy();
      playDamage();
    }

    // Heal
    if (effects.heal > 0) {
      h.currentHp = Math.min(h.maxHp, h.currentHp + effects.heal);
      this.showFloatingText(this.scale.width / 2, 220, `+${Math.round(effects.heal)}`, '#2ecc71');
      playHeal();
    }

    // Armor
    if (effects.armor > 0) {
      h.armor = (h.armor || 0) + effects.armor;
      this.showFloatingText(this.scale.width / 2 - 40, 260, `+${Math.round(effects.armor)} 🛡️`, '#3498db');
    }

    // Gold
    if (effects.gold > 0) {
      this.runState.gold += effects.gold;
      this.goldText.setText(`💰 ${this.runState.gold}`);
    }

    // Skill charge
    if (effects.charge > 0) {
      h.skillCharge = (h.skillCharge || 0) + effects.charge;
    }

    // Lifesteal from equipment
    if (effects.lifestealHeal > 0) {
      h.currentHp = Math.min(h.maxHp, h.currentHp + effects.lifestealHeal);
    }

    // Update displays
    this.updateEnemyHP();
    this.updateHeroHP();
    this.updateSkillBar();
  }

  applyDefense(damage, def) {
    // damage * (1 - def/(def + ARMOR_CONSTANT))
    const reduction = def / (def + FORMULAS.ARMOR_CONSTANT);
    const variance = 1 + (Math.random() * 2 - 1) * FORMULAS.DAMAGE_VARIANCE;
    return Math.max(1, Math.round(damage * (1 - reduction) * variance));
  }

  // ── TURN END ─────────────────────────────────────────────────

  onMatchChainComplete() {
    if (this.battleOver) return;

    // Check if enemy is dead
    if (this.enemy.currentHp <= 0) {
      this.onEnemyDefeated();
      return;
    }

    // Enemy turn
    this.time.delayedCall(300, () => this.enemyTurn());
  }

  enemyTurn() {
    if (this.battleOver) return;
    this.turnCount++;

    const e = this.enemy;
    const h = this.hero;

    // Boss mechanics
    if (e.isBoss) {
      this.processBossMechanic();
    }

    // Enemy attack
    let damage = e.atk;

    // Boss enrage check
    if (e.mechanic === 'enrage' && !e.enraged && e.currentHp <= e.maxHp * e.enrageThreshold) {
      e.enraged = true;
      e.atk = Math.round(e.atk * e.enrageMultiplier);
      damage = e.atk;
      this.showFloatingText(this.scale.width / 2, 120, 'ENRAGED!', '#ff0000');
      this.cameras.main.shake(200, 0.01);
    }

    // Apply hero armor
    const armor = h.armor || 0;
    if (armor > 0) {
      const absorbed = Math.min(armor, damage);
      damage -= absorbed;
      h.armor -= absorbed;
    }

    // Apply hero defense
    const defReduction = h.def / (h.def + FORMULAS.ARMOR_CONSTANT);
    damage = Math.max(1, Math.round(damage * (1 - defReduction)));

    h.currentHp -= damage;
    this.showFloatingText(this.scale.width / 2, 240, `-${damage}`, '#ff6b6b');
    this.cameras.main.shake(100, 0.005);
    playEnemyHit();

    // Armor decay
    h.armor = Math.floor((h.armor || 0) * FORMULAS.ARMOR_DECAY);

    // Boss lifesteal
    if (e.mechanic === 'lifesteal' && e.lifesteal) {
      const healed = Math.round(damage * e.lifesteal);
      e.currentHp = Math.min(e.maxHp, e.currentHp + healed);
      this.showFloatingText(this.scale.width / 2, 140, `+${healed}`, '#2ecc71');
    }

    // Boss poison
    if (e.mechanic === 'lifesteal' && e.poisonPercent) {
      const poisonDmg = Math.round(h.maxHp * e.poisonPercent);
      h.currentHp -= poisonDmg;
      this.showFloatingText(this.scale.width / 2 + 60, 280, `-${poisonDmg} ☠️`, '#a29bfe');
    }

    this.updateHeroHP();
    this.updateEnemyHP();

    // Check if hero is dead
    if (h.currentHp <= 0) {
      h.currentHp = 0;
      this.updateHeroHP();
      this.onHeroDefeated();
      return;
    }

    // Re-enable input for next turn
    this.time.delayedCall(400, () => {
      this.inputEnabled = true;
    });
  }

  processBossMechanic() {
    const e = this.enemy;

    if (e.mechanic === 'column_block') {
      e.turnsSinceBlock = (e.turnsSinceBlock || 0) + 1;
      if (e.turnsSinceBlock >= e.blockInterval) {
        e.turnsSinceBlock = 0;
        // Block a random column
        const prevCol = e.blockedColumn;
        const newCol = Math.floor(Math.random() * BOARD.cols);
        e.blockedColumn = newCol;
        this.showBlockedColumn(newCol, prevCol);
        this.showFloatingText(this.scale.width / 2, 120, 'Column Blocked!', '#e17055');
      }
    }

    if (e.mechanic === 'burn_gems') {
      // Burn random gems on the board
      this.burnRandomGems(e.burnCount);
    }
  }

  showBlockedColumn(col, prevCol) {
    // Remove previous block visual
    if (this.blockedColOverlay) this.blockedColOverlay.destroy();

    const { originX, originY, cellSize, rows } = BOARD;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(originX + col * cellSize, originY, cellSize, rows * cellSize);
    overlay.lineStyle(2, 0xff0000, 0.8);
    overlay.strokeRect(originX + col * cellSize, originY, cellSize, rows * cellSize);
    overlay.setDepth(14);
    this.blockedColOverlay = overlay;
  }

  burnRandomGems(count) {
    const { rows, cols } = BOARD;
    const available = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.boardData[r][c].gemId >= 0 && !this.boardData[r][c].burned) {
          available.push({ r, c });
        }
      }
    }

    // Clear previous burns
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.boardData[r][c].burned = false;
      }
    }
    if (this.burnOverlays) this.burnOverlays.forEach(o => o.destroy());
    this.burnOverlays = [];

    // Burn new gems
    Phaser.Utils.Array.Shuffle(available);
    const toBurn = available.slice(0, Math.min(count, available.length));

    for (const { r, c } of toBurn) {
      this.boardData[r][c].burned = true;
      const pos = this.getGemPosition(r, c);
      const overlay = this.add.image(pos.x, pos.y, 'gem_burned')
        .setDisplaySize(BOARD.cellSize - 8, BOARD.cellSize - 8)
        .setDepth(12).setAlpha(0.7);
      this.burnOverlays.push(overlay);
    }
  }

  // ── SKILL ────────────────────────────────────────────────────

  drawSkillButton(w, h) {
    const template = HEROES[this.runState.heroKey];
    const btnY = h - 30;

    this.skillBtn = this.add.text(w / 2, btnY, `⚡ ${template.skill.nameZh}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#b2bec3',
      backgroundColor: '#2d3436', padding: { x: 16, y: 8 },
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });

    this.skillBtn.on('pointerdown', () => this.activateSkill());
  }

  activateSkill() {
    if (!this.inputEnabled || this.battleOver) return;

    const h = this.hero;
    const template = HEROES[this.runState.heroKey];
    const cost = template.skill.cost;

    if ((h.skillCharge || 0) < cost) return; // Not enough charge

    h.skillCharge -= cost;
    this.updateSkillBar();
    playSkill();

    const heroKey = this.runState.heroKey;
    const e = this.enemy;

    if (heroKey === 'warrior') {
      // Blade Storm: 2x sword damage + convert 5 random gems to sword (id 0)
      const dmg = FORMULAS.BASE_SWORD_DMG * (1 + h.atk * FORMULAS.ATK_SCALING) * 2;
      const reduced = this.applyDefense(dmg, e.def);
      e.currentHp -= reduced;
      this.showFloatingText(this.scale.width / 2, 170, `-${Math.round(reduced)} ⚔️`, '#e74c3c');
      this.flashEnemy();
      this.cameras.main.shake(150, 0.008);

      // Convert 5 random gems to sword
      this.convertRandomGems(0, 5);
    } else if (heroKey === 'mage') {
      // Meteor: 3x fire damage, ignores armor
      const dmg = FORMULAS.BASE_FIRE_DMG * (1 + h.matk * FORMULAS.MATK_SCALING) * 3;
      const variance = 1 + (Math.random() * 2 - 1) * FORMULAS.DAMAGE_VARIANCE;
      const finalDmg = Math.round(dmg * variance);
      e.currentHp -= finalDmg;
      this.showFloatingText(this.scale.width / 2, 170, `-${finalDmg} 🔥`, '#e67e22');
      this.flashEnemy();
      this.cameras.main.shake(200, 0.012);
    } else if (heroKey === 'paladin') {
      // Holy Shield: full heal + 50% max HP as armor for 2 turns
      h.currentHp = h.maxHp;
      h.armor = (h.armor || 0) + Math.round(h.maxHp * 0.5);
      this.showFloatingText(this.scale.width / 2, 260, 'FULL HEAL!', '#2ecc71');
      this.showFloatingText(this.scale.width / 2 - 40, 260, `+${Math.round(h.maxHp * 0.5)} 🛡️`, '#3498db');
    }

    this.updateEnemyHP();
    this.updateHeroHP();

    if (e.currentHp <= 0) {
      this.onEnemyDefeated();
    }
  }

  convertRandomGems(targetGemId, count) {
    const { rows, cols } = BOARD;
    const available = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.boardData[r][c].gemId !== targetGemId && this.boardData[r][c].gemId >= 0) {
          available.push({ r, c });
        }
      }
    }

    Phaser.Utils.Array.Shuffle(available);
    const toConvert = available.slice(0, Math.min(count, available.length));

    for (const { r, c } of toConvert) {
      this.boardData[r][c].gemId = targetGemId;
      const sprite = this.gemSprites[r][c];
      if (sprite) {
        this.tweens.add({
          targets: sprite,
          scaleX: 0, scaleY: 0,
          duration: 100,
          yoyo: true,
          onYoyo: () => {
            sprite.setTexture(`gem_${targetGemId}`);
          },
        });
      }
    }
  }

  // ── BATTLE END ───────────────────────────────────────────────

  onEnemyDefeated() {
    this.battleOver = true;
    this.inputEnabled = false;
    stopBGM();
    playVictory();

    const w = this.scale.width;

    // Between-room heal
    const healAmt = Math.round(this.hero.maxHp * FORMULAS.BETWEEN_ROOM_HEAL);
    this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + healAmt);

    // Gold reward
    const goldReward = this.encounterType === 'elite'
      ? Phaser.Math.Between(ECONOMY.goldPerElite.min, ECONOMY.goldPerElite.max)
      : Phaser.Math.Between(ECONOMY.goldPerCombat.min, ECONOMY.goldPerCombat.max);
    this.runState.gold += goldReward;

    // Potion drop chance
    if (Math.random() < ECONOMY.potionDropChance) {
      this.runState.potions++;
    }

    // ── ENEMY DEATH ANIMATION ──
    // 1) Screen freeze flash
    this.cameras.main.flash(150, 255, 255, 255);

    // 2) Enemy shake violently
    if (this.enemySprite) {
      this.tweens.add({
        targets: this.enemySprite,
        x: { value: '+=6', duration: 30, yoyo: true, repeat: 8 },
      });
    }

    // 3) After shake, enemy explodes into particles + fades
    this.time.delayedCall(300, () => {
      // Spawn "explosion" particles (colored circles flying out)
      const eColor = this.enemy.color || '#e74c3c';
      const colorInt = Phaser.Display.Color.HexStringToColor(eColor).color;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        const px = w / 2 + Math.cos(angle) * 10;
        const py = 110;

        const particle = this.add.circle(px, py, 4 + Math.random() * 4, colorInt)
          .setDepth(50).setAlpha(0.9);

        this.tweens.add({
          targets: particle,
          x: px + Math.cos(angle) * dist,
          y: py + Math.sin(angle) * dist - 20,
          alpha: 0,
          scaleX: 0.2, scaleY: 0.2,
          duration: 400 + Math.random() * 200,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy(),
        });
      }

      // Fade out enemy sprite + name + HP bar
      [this.enemySprite, this.enemyNameText, this.enemyBarBg, this.enemyBarFill, this.enemyHpText].forEach(obj => {
        if (obj) {
          this.tweens.add({
            targets: obj,
            alpha: 0,
            scaleX: 1.3, scaleY: 1.3,
            duration: 400,
            ease: 'Cubic.easeOut',
          });
        }
      });
    });

    // 4) Show VICTORY banner with rewards
    this.time.delayedCall(800, () => {
      // Dark overlay
      const overlay = this.add.rectangle(w / 2, 110, 500, 80, 0x000000, 0.7)
        .setDepth(55).setAlpha(0);

      const victoryText = this.add.text(w / 2, 100, 'VICTORY!', {
        fontSize: '36px', fontFamily: 'monospace', color: '#f1c40f',
        stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(56).setAlpha(0).setScale(0.3);

      const rewardText = this.add.text(w / 2, 135, `+${goldReward} 💰`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#f39c12',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(56).setAlpha(0);

      // Animate in
      this.tweens.add({ targets: overlay, alpha: 1, duration: 200 });
      this.tweens.add({
        targets: victoryText,
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut',
      });
      this.tweens.add({
        targets: rewardText,
        alpha: 1,
        duration: 300,
        delay: 200,
      });
    });

    // 5) Transition after celebration
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(400);
      this.time.delayedCall(400, () => {
        if (this.floor === 20 && this.isBoss) {
          this.scene.start('GameOver', {
            ...this.runState,
            hero: this.hero,
            victory: true,
            floorsCleared: this.floor,
          });
        } else {
          this.scene.start('Reward', {
            ...this.runState,
            hero: this.hero,
          });
        }
      });
    });
  }

  onHeroDefeated() {
    this.battleOver = true;
    this.inputEnabled = false;
    stopBGM();
    playDefeat();

    const w = this.scale.width;

    // Screen goes red
    this.cameras.main.shake(400, 0.02);

    // Red vignette overlay
    const redOverlay = this.add.rectangle(w / 2, 600, 800, 1200, 0xff0000, 0)
      .setDepth(55);
    this.tweens.add({
      targets: redOverlay,
      fillAlpha: 0.3,
      duration: 500,
    });

    // Defeat text
    this.time.delayedCall(600, () => {
      const defeatText = this.add.text(w / 2, 180, 'DEFEATED', {
        fontSize: '40px', fontFamily: 'monospace', color: '#ff0000',
        stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(56).setAlpha(0).setScale(1.5);

      this.tweens.add({
        targets: defeatText,
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 500,
        ease: 'Cubic.easeOut',
      });

      // Floor reached text
      const floorText = this.add.text(w / 2, 225, `Reached Floor ${this.floor}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#b2bec3',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(56).setAlpha(0);

      this.tweens.add({
        targets: floorText,
        alpha: 1,
        duration: 300,
        delay: 300,
      });
    });

    // Transition
    this.time.delayedCall(2500, () => {
      this.cameras.main.fadeOut(400);
      this.time.delayedCall(400, () => {
        this.scene.start('GameOver', {
          ...this.runState,
          hero: this.hero,
          victory: false,
          floorsCleared: this.floor - 1,
        });
      });
    });
  }

  // ── POTIONS ──────────────────────────────────────────────────

  usePotion() {
    if (this.runState.potions <= 0 || this.battleOver) return;
    this.runState.potions--;
    const heal = Math.round(this.hero.maxHp * ECONOMY.smallPotionHeal);
    this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + heal);
    this.updateHeroHP();
    this.potionText.setText(`🧪 ${this.runState.potions}`);
    this.showFloatingText(this.scale.width - 80, 40, `+${heal}`, '#2ecc71');
  }

  // ── VISUAL EFFECTS ───────────────────────────────────────────

  showFloatingText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontSize: '20px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  showComboText(level) {
    this.comboText.setText(`${level}x COMBO!`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);

    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.2, scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          scaleX: 0.8, scaleY: 0.8,
          duration: 600,
          delay: 400,
        });
      }
    });

    // Screen shake on high combos
    if (level >= 3) {
      this.cameras.main.shake(100, 0.003 * level);
    }
  }

  flashEnemy() {
    // Flash enemy sprite white briefly
    if (this.enemySprite) {
      this.tweens.add({
        targets: this.enemySprite,
        alpha: 0.3,
        duration: 60,
        yoyo: true,
        repeat: 1,
      });
    }
  }
}
