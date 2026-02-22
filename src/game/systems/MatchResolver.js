/**
 * MatchResolver — Convert gem match counts into combat effects
 *
 * Takes: { gemId: count } + cascadeLevel + hero state
 * Returns: { physicalDamage, magicDamage, heal, armor, gold, charge, lifestealHeal }
 */
import { GEM_TYPES, FORMULAS } from '../../config/balance.js';

export function resolveMatches(gemCounts, cascadeLevel, hero, runState) {
  const cascadeBonus = 1 + (cascadeLevel - 1) * FORMULAS.CASCADE_BONUS;
  const equip = hero.equipment || {};

  const effects = {
    physicalDamage: 0,
    magicDamage: 0,
    heal: 0,
    armor: 0,
    gold: 0,
    charge: 0,
    lifestealHeal: 0,
  };

  for (const [gemIdStr, count] of Object.entries(gemCounts)) {
    const gemId = Number(gemIdStr);
    const gem = Object.values(GEM_TYPES).find(g => g.id === gemId);
    if (!gem) continue;

    const base = count; // Each matched gem contributes

    switch (gem.effect) {
      case 'physical_damage': {
        let dmg = base * FORMULAS.BASE_SWORD_DMG * (1 + hero.atk * FORMULAS.ATK_SCALING);
        dmg *= cascadeBonus;
        dmg *= (1 + (equip.swordBonus || 0));
        effects.physicalDamage += dmg;

        // Flame Sword hybrid: sword matches also deal fire damage
        if (equip.fireSwordHybrid) {
          effects.magicDamage += dmg * equip.fireSwordHybrid;
        }
        break;
      }

      case 'magic_damage': {
        let dmg = base * FORMULAS.BASE_FIRE_DMG * (1 + hero.matk * FORMULAS.MATK_SCALING);
        dmg *= cascadeBonus;
        dmg *= (1 + (equip.fireBonus || 0));
        effects.magicDamage += dmg;
        break;
      }

      case 'armor': {
        let armor = base * FORMULAS.BASE_SHIELD;
        armor *= cascadeBonus;
        armor *= (1 + (equip.shieldBonus || 0));
        effects.armor += Math.round(armor);
        break;
      }

      case 'heal': {
        let heal = base * FORMULAS.BASE_HEAL;
        heal *= cascadeBonus;
        heal *= (1 + (equip.healBonus || 0));
        effects.heal += Math.round(heal);
        break;
      }

      case 'gold': {
        effects.gold += Math.round(base * FORMULAS.BASE_GOLD * cascadeBonus);
        break;
      }

      case 'charge': {
        effects.charge += Math.round(base * FORMULAS.BASE_CHARGE * cascadeBonus);
        break;
      }
    }
  }

  // Lifesteal from equipment
  if (equip.lifesteal) {
    const totalDamage = effects.physicalDamage + effects.magicDamage;
    effects.lifestealHeal = Math.round(totalDamage * equip.lifesteal);
  }

  // Round damage values
  effects.physicalDamage = Math.round(effects.physicalDamage);
  effects.magicDamage = Math.round(effects.magicDamage);

  return effects;
}
