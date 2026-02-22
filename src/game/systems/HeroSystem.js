/**
 * HeroSystem — Hero initialization and stat management
 */
import { HEROES } from '../../config/balance.js';

export function createHero(heroKey) {
  const template = HEROES[heroKey];
  if (!template) throw new Error(`Unknown hero: ${heroKey}`);

  return {
    ...template,
    key: heroKey,
    maxHp: template.hp,
    currentHp: template.hp,
    armor: 0,
    skillCharge: 0,
    equipment: {},
  };
}

export function applyStatBoost(hero, stat, value) {
  if (stat === 'hp') {
    hero.maxHp += value;
    hero.currentHp += value;
  } else {
    hero[stat] = (hero[stat] || 0) + value;
  }
}

export function applyEquipment(hero, equipStat, equipValue) {
  if (!hero.equipment) hero.equipment = {};
  hero.equipment[equipStat] = (hero.equipment[equipStat] || 0) + equipValue;
}

export function healHero(hero, amount) {
  hero.currentHp = Math.min(hero.maxHp, hero.currentHp + amount);
}

export function healHeroPercent(hero, percent) {
  const amount = Math.round(hero.maxHp * percent);
  healHero(hero, amount);
}
