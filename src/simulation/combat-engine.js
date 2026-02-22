/**
 * Headless Match-3 Combat Engine — No Phaser dependency
 *
 * Simulates match-3 board + combat with random "smart" moves.
 * Used by the balance simulator to run thousands of games.
 */
import {
  GEM_COUNT, BOARD, FORMULAS,
  HEROES, ENEMIES, BOSSES, ENEMY_SCALING, FLOOR_ENCOUNTERS, ECONOMY
} from '../config/balance.js';
import { resolveMatches } from '../game/systems/MatchResolver.js';

export class HeadlessCombatEngine {
  constructor(hero, floor, encounterType = 'combat') {
    this.hero = { ...hero };
    this.floor = floor;
    this.encounterType = encounterType;
    this.turnCount = 0;
    this.totalDamageDealt = 0;

    // Create board
    this.board = this.createBoard();

    // Create enemy
    this.enemy = this.createEnemy();
  }

  createBoard() {
    const { rows, cols } = BOARD;
    const board = [];
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        let gemId;
        do {
          gemId = Math.floor(Math.random() * GEM_COUNT);
        } while (this.wouldMatchAt(board, r, c, gemId));
        board[r][c] = { gemId, special: null };
      }
    }
    return board;
  }

  wouldMatchAt(board, row, col, gemId) {
    if (col >= 2 && board[row][col - 1]?.gemId === gemId && board[row][col - 2]?.gemId === gemId) return true;
    if (row >= 2 && board[row - 1]?.[col]?.gemId === gemId && board[row - 2]?.[col]?.gemId === gemId) return true;
    return false;
  }

  createEnemy() {
    const encounter = FLOOR_ENCOUNTERS[this.floor];
    if (!encounter) return { name: 'Unknown', hp: 50, maxHp: 50, currentHp: 50, atk: 10, def: 5 };

    if (encounter.boss) {
      const t = BOSSES[encounter.boss];
      return { ...t, maxHp: t.hp, currentHp: t.hp, isBoss: true, enraged: false };
    }

    const key = encounter.enemies[Math.floor(Math.random() * encounter.enemies.length)];
    const t = ENEMIES[key];
    const s = 1 + this.floor * ENEMY_SCALING.hp;
    const as = 1 + this.floor * ENEMY_SCALING.atk;
    const ds = 1 + this.floor * ENEMY_SCALING.def;
    const em = this.encounterType === 'elite' ? 1.5 : 1;

    return {
      ...t,
      maxHp: Math.round(t.hp * s * em),
      currentHp: Math.round(t.hp * s * em),
      atk: Math.round(t.atk * as * em),
      def: Math.round(t.def * ds * em),
      isBoss: false,
    };
  }

  /**
   * Run a full combat to completion.
   * @returns {{ won: boolean, turnsPlayed: number, heroHpRemaining: number }}
   */
  runCombat() {
    const maxTurns = 50;

    while (this.turnCount < maxTurns) {
      // Player turn: find best move and execute
      const move = this.findBestMove();
      if (!move) break; // No valid moves

      this.executeMove(move);
      this.turnCount++;

      if (this.enemy.currentHp <= 0) {
        return { won: true, turnsPlayed: this.turnCount, heroHpRemaining: this.hero.currentHp };
      }

      // Enemy turn
      this.enemyTurn();

      if (this.hero.currentHp <= 0) {
        return { won: false, turnsPlayed: this.turnCount, heroHpRemaining: 0 };
      }
    }

    // Timeout = loss
    return { won: false, turnsPlayed: this.turnCount, heroHpRemaining: this.hero.currentHp };
  }

  findBestMove() {
    const { rows, cols } = BOARD;
    let bestMove = null;
    let bestScore = -1;

    // Try all possible swaps
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Try swap right
        if (c + 1 < cols) {
          const score = this.evaluateSwap(r, c, r, c + 1);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { r1: r, c1: c, r2: r, c2: c + 1 };
          }
        }
        // Try swap down
        if (r + 1 < rows) {
          const score = this.evaluateSwap(r, c, r + 1, c);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { r1: r, c1: c, r2: r + 1, c2: c };
          }
        }
      }
    }

    return bestMove;
  }

  evaluateSwap(r1, c1, r2, c2) {
    // Temporarily swap
    const temp = this.board[r1][c1];
    this.board[r1][c1] = this.board[r2][c2];
    this.board[r2][c2] = temp;

    const matches = this.findAllMatches();

    // Swap back
    this.board[r2][c2] = this.board[r1][c1];
    this.board[r1][c1] = temp;

    if (matches.length === 0) return -1;

    // Score: prioritize damage when enemy is low, heal when hero is low
    let score = 0;
    for (const match of matches) {
      const count = match.cells.length;
      const gemId = match.gemId;

      // Sword/Fire = damage priority
      if (gemId === 0 || gemId === 1) score += count * 3;
      // Shield = armor
      else if (gemId === 2) score += count * 1.5;
      // Heart = heal (more valuable when low HP)
      else if (gemId === 3) {
        const hpRatio = this.hero.currentHp / this.hero.maxHp;
        score += count * (hpRatio < 0.5 ? 4 : 1);
      }
      // Coin = gold
      else if (gemId === 4) score += count * 0.5;
      // Star = charge
      else if (gemId === 5) score += count * 1;

      // Bonus for longer matches
      if (count >= 4) score += 3;
      if (count >= 5) score += 5;
    }

    return score;
  }

  executeMove(move) {
    const { r1, c1, r2, c2 } = move;

    // Swap
    const temp = this.board[r1][c1];
    this.board[r1][c1] = this.board[r2][c2];
    this.board[r2][c2] = temp;

    // Process cascades
    let cascadeLevel = 0;
    let hasMatches = true;

    while (hasMatches) {
      const matches = this.findAllMatches();
      if (matches.length === 0) { hasMatches = false; break; }

      cascadeLevel++;

      // Count gems per type
      const gemCounts = {};
      const toRemove = new Set();
      for (const match of matches) {
        for (const cell of match.cells) {
          toRemove.add(`${cell.r},${cell.c}`);
        }
        gemCounts[match.gemId] = (gemCounts[match.gemId] || 0) + match.cells.length;
      }

      // Resolve effects
      const effects = resolveMatches(gemCounts, cascadeLevel, this.hero, {});
      this.applyEffects(effects);

      // Remove matched gems
      for (const key of toRemove) {
        const [r, c] = key.split(',').map(Number);
        this.board[r][c] = { gemId: -1, special: null };
      }

      // Drop and fill
      this.dropAndFill();
    }
  }

  applyEffects(effects) {
    // Apply damage to enemy
    if (effects.physicalDamage > 0) {
      const reduced = this.applyDef(effects.physicalDamage, this.enemy.def);
      this.enemy.currentHp -= reduced;
      this.totalDamageDealt += reduced;
    }
    if (effects.magicDamage > 0) {
      const reduced = this.applyDef(effects.magicDamage, this.enemy.def);
      this.enemy.currentHp -= reduced;
      this.totalDamageDealt += reduced;
    }

    // Heal
    if (effects.heal > 0) {
      this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + effects.heal);
    }

    // Armor
    if (effects.armor > 0) {
      this.hero.armor = (this.hero.armor || 0) + effects.armor;
    }

    // Skill charge
    if (effects.charge > 0) {
      this.hero.skillCharge = (this.hero.skillCharge || 0) + effects.charge;
    }

    // Lifesteal
    if (effects.lifestealHeal > 0) {
      this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + effects.lifestealHeal);
    }
  }

  applyDef(dmg, def) {
    const reduction = def / (def + FORMULAS.ARMOR_CONSTANT);
    const variance = 1 + (Math.random() * 2 - 1) * FORMULAS.DAMAGE_VARIANCE;
    return Math.max(1, Math.round(dmg * (1 - reduction) * variance));
  }

  enemyTurn() {
    const e = this.enemy;
    const h = this.hero;

    // Enrage check
    if (e.mechanic === 'enrage' && !e.enraged && e.currentHp <= e.maxHp * (e.enrageThreshold || 0.3)) {
      e.enraged = true;
      e.atk = Math.round(e.atk * (e.enrageMultiplier || 1.5));
    }

    let damage = e.atk;

    // Armor absorption
    const armor = h.armor || 0;
    if (armor > 0) {
      const absorbed = Math.min(armor, damage);
      damage -= absorbed;
      h.armor -= absorbed;
    }

    // Defense reduction
    const defReduction = h.def / (h.def + FORMULAS.ARMOR_CONSTANT);
    damage = Math.max(1, Math.round(damage * (1 - defReduction)));

    h.currentHp -= damage;

    // Boss lifesteal
    if (e.mechanic === 'lifesteal' && e.lifesteal) {
      e.currentHp = Math.min(e.maxHp, e.currentHp + Math.round(damage * e.lifesteal));
    }

    // Boss poison
    if (e.mechanic === 'lifesteal' && e.poisonPercent) {
      h.currentHp -= Math.round(h.maxHp * e.poisonPercent);
    }

    // Armor decay
    h.armor = Math.floor((h.armor || 0) * FORMULAS.ARMOR_DECAY);
  }

  findAllMatches() {
    const { rows, cols } = BOARD;
    const matches = [];

    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const gemId = this.board[r][c].gemId;
        if (gemId < 0) { c++; continue; }
        let len = 1;
        while (c + len < cols && this.board[r][c + len].gemId === gemId) len++;
        if (len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ r, c: c + i });
          matches.push({ gemId, cells, direction: 'horizontal', length: len });
        }
        c += len;
      }
    }

    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const gemId = this.board[r][c].gemId;
        if (gemId < 0) { r++; continue; }
        let len = 1;
        while (r + len < rows && this.board[r + len][c].gemId === gemId) len++;
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

  dropAndFill() {
    const { rows, cols } = BOARD;

    for (let c = 0; c < cols; c++) {
      const column = [];
      for (let r = rows - 1; r >= 0; r--) {
        if (this.board[r][c].gemId >= 0) column.push(this.board[r][c]);
      }
      const emptyCount = rows - column.length;
      for (let i = 0; i < emptyCount; i++) {
        column.push({ gemId: Math.floor(Math.random() * GEM_COUNT), special: null });
      }
      for (let i = 0; i < rows; i++) {
        this.board[rows - 1 - i][c] = column[i];
      }
    }
  }
}
