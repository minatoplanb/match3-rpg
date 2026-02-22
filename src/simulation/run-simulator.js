/**
 * Run Simulator — Simulate full 20-floor runs
 *
 * Runs N games per hero, reports win rates and stats.
 */
import {
  HEROES, FLOOR_ENCOUNTERS, MAP, ECONOMY, FORMULAS, SIM_TARGETS
} from '../config/balance.js';
import { HeadlessCombatEngine } from './combat-engine.js';

export function simulateRun(heroKey) {
  const template = HEROES[heroKey];
  const hero = {
    ...template,
    key: heroKey,
    maxHp: template.hp,
    currentHp: template.hp,
    armor: 0,
    skillCharge: 0,
    equipment: {},
  };

  let gold = ECONOMY.startingGold;
  let potions = ECONOMY.startingPotions;
  let floorsCleared = 0;
  let totalTurns = 0;

  for (let floor = 1; floor <= 20; floor++) {
    const encounter = FLOOR_ENCOUNTERS[floor];
    if (!encounter) continue;

    const isBoss = MAP.bossFloors.includes(floor);
    const encounterType = isBoss ? 'boss' : 'combat';

    // Run combat
    const engine = new HeadlessCombatEngine(hero, floor, encounterType);
    const result = engine.runCombat();

    totalTurns += result.turnsPlayed;
    hero.currentHp = result.heroHpRemaining;

    if (!result.won) {
      return { heroKey, floorsCleared, totalTurns, won: false };
    }

    floorsCleared = floor;

    // Post-combat heal
    if (!isBoss) {
      const heal = Math.round(hero.maxHp * FORMULAS.BETWEEN_ROOM_HEAL);
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + heal);
    }

    // Simulate simple stat growth (approximate reward effect)
    if (floor % 2 === 0) {
      hero.atk += 1;
      hero.matk += 1;
    }
    if (floor % 3 === 0) {
      hero.def += 1;
      hero.maxHp += 15;
      hero.currentHp += 15;
    }

    // Gold + potions
    gold += Math.floor(Math.random() * 11 + 10);
    if (Math.random() < ECONOMY.potionDropChance) potions++;

    // Use potion if low
    if (hero.currentHp < hero.maxHp * 0.4 && potions > 0) {
      potions--;
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + Math.round(hero.maxHp * ECONOMY.smallPotionHeal));
    }
  }

  return { heroKey, floorsCleared, totalTurns, won: true };
}

export function runSimulation(runsPerHero = 100) {
  const results = {};

  for (const heroKey of Object.keys(HEROES)) {
    const runs = [];
    for (let i = 0; i < runsPerHero; i++) {
      runs.push(simulateRun(heroKey));
    }

    const wins = runs.filter(r => r.won).length;
    const avgFloors = runs.reduce((s, r) => s + r.floorsCleared, 0) / runs.length;
    const avgTurns = runs.reduce((s, r) => s + r.totalTurns, 0) / runs.length;

    results[heroKey] = {
      runs: runsPerHero,
      wins,
      winRate: (wins / runsPerHero * 100).toFixed(1) + '%',
      avgFloors: avgFloors.toFixed(1),
      avgTurnsPerRun: avgTurns.toFixed(1),
    };
  }

  return results;
}
