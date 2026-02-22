/**
 * EnemyAI — Enemy attack patterns and boss mechanics
 * Used by CombatScene for enemy turn logic.
 */
import { ENEMIES, BOSSES, ENEMY_SCALING, FORMULAS } from '../../config/balance.js';

export function createEnemy(enemyKey, floor, isElite = false) {
  const template = ENEMIES[enemyKey];
  if (!template) return null;

  const hpScale = 1 + floor * ENEMY_SCALING.hp;
  const atkScale = 1 + floor * ENEMY_SCALING.atk;
  const defScale = 1 + floor * ENEMY_SCALING.def;
  const eliteMult = isElite ? 1.5 : 1;

  return {
    ...template,
    key: enemyKey,
    maxHp: Math.round(template.hp * hpScale * eliteMult),
    currentHp: Math.round(template.hp * hpScale * eliteMult),
    atk: Math.round(template.atk * atkScale * eliteMult),
    def: Math.round(template.def * defScale * eliteMult),
    isBoss: false,
    isElite,
  };
}

export function createBoss(bossKey) {
  const template = BOSSES[bossKey];
  if (!template) return null;

  return {
    ...template,
    key: bossKey,
    maxHp: template.hp,
    currentHp: template.hp,
    isBoss: true,
    enraged: false,
    blockedColumn: -1,
    turnsSinceBlock: 0,
    burnedGems: [],
  };
}

export function calculateEnemyDamage(enemy, heroDef, heroArmor) {
  let damage = enemy.atk;

  // Check enrage
  if (enemy.mechanic === 'enrage' && enemy.enraged) {
    damage = Math.round(damage * (enemy.enrageMultiplier || 1.5));
  }

  // Absorb with armor first
  let armorAbsorbed = 0;
  if (heroArmor > 0) {
    armorAbsorbed = Math.min(heroArmor, damage);
    damage -= armorAbsorbed;
  }

  // Defense reduction
  const defReduction = heroDef / (heroDef + FORMULAS.ARMOR_CONSTANT);
  damage = Math.max(1, Math.round(damage * (1 - defReduction)));

  return { damage, armorAbsorbed };
}
