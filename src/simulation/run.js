/**
 * CLI runner: npm run simulate
 * Runs balance simulation and prints results.
 */
import { runSimulation } from './run-simulator.js';
import { SIM_TARGETS } from '../config/balance.js';

const runsPerHero = parseInt(process.argv[2]) || 200;
const verbose = process.argv.includes('--verbose');

console.log(`\n🎲 Match-3 RPG Balance Simulator`);
console.log(`   Running ${runsPerHero} games per hero...\n`);

const start = Date.now();
const results = runSimulation(runsPerHero);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`✅ Simulation complete in ${elapsed}s\n`);
console.log('='.repeat(60));

for (const [hero, stats] of Object.entries(results)) {
  console.log(`\n📊 ${hero.toUpperCase()}`);
  console.log(`   Win Rate: ${stats.winRate} (${stats.wins}/${stats.runs})`);
  console.log(`   Avg Floors: ${stats.avgFloors}`);
  console.log(`   Avg Turns/Run: ${stats.avgTurnsPerRun}`);

  // Check against targets
  const wr = stats.wins / stats.runs;
  const wrOk = wr >= SIM_TARGETS.winRate.min && wr <= SIM_TARGETS.winRate.max;
  console.log(`   Win Rate Target [${Math.round(SIM_TARGETS.winRate.min * 100)}%-${Math.round(SIM_TARGETS.winRate.max * 100)}%]: ${wrOk ? '✅' : '❌'}`);
}

console.log('\n' + '='.repeat(60));
console.log(`\n🎯 Targets: Win Rate ${Math.round(SIM_TARGETS.winRate.min * 100)}-${Math.round(SIM_TARGETS.winRate.max * 100)}%, ~${SIM_TARGETS.avgTurnsPerCombat.ideal} turns/combat`);
console.log('');
