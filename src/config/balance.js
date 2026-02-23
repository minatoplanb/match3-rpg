/**
 * BALANCE CONFIG — 所有遊戲數值集中在這裡
 *
 * Every number has a comment explaining WHY.
 * Reference: dungeon-crawler balance.js (438 lines, v9d)
 */

// ============================================================
// GEM TYPES
// ============================================================

export const GEM_TYPES = {
  sword:  { id: 0, name: 'Sword',  color: 0xe74c3c, hex: '#e74c3c', symbol: '⚔️', effect: 'physical_damage' },
  fire:   { id: 1, name: 'Fire',   color: 0xe67e22, hex: '#e67e22', symbol: '🔥', effect: 'magic_damage' },
  shield: { id: 2, name: 'Shield', color: 0x3498db, hex: '#3498db', symbol: '🛡️', effect: 'armor' },
  heart:  { id: 3, name: 'Heart',  color: 0x2ecc71, hex: '#2ecc71', symbol: '💚', effect: 'heal' },
  coin:   { id: 4, name: 'Coin',   color: 0xf1c40f, hex: '#f1c40f', symbol: '💰', effect: 'gold' },
  star:   { id: 5, name: 'Star',   color: 0x9b59b6, hex: '#9b59b6', symbol: '⭐', effect: 'charge' },
};

export const GEM_LIST = Object.values(GEM_TYPES);
export const GEM_COUNT = GEM_LIST.length;

// ============================================================
// BOARD
// ============================================================

export const BOARD = {
  cols: 7,
  rows: 7,
  cellSize: 82,        // 7 * 82 = 574px wide — bigger gems for better feel
  reservoirRows: 7,
  originX: 113,        // (800 - 574) / 2 = 113 → centered
  originY: 400,        // Below hero status + gem legend strip
  gemRadius: 34,       // Visual radius of gem circles (bigger)
};

// ============================================================
// COMBAT FORMULAS
// ============================================================

export const FORMULAS = {
  // Physical: swordMatches * BASE_SWORD_DMG * (1 + hero.atk * ATK_SCALING)
  // V4: sweet spot — fights last 5-8 turns (not 2-3, not 15+).
  // 3-gem sword match at ATK 12: 3 * 7 * (1 + 12*0.08) = 41 dmg
  // vs Slime 80 HP → ~2 sword matches + some other matches = 5-6 turns
  BASE_SWORD_DMG: 8,
  // Magic: fireMatches * BASE_FIRE_DMG * (1 + hero.matk * MATK_SCALING)
  BASE_FIRE_DMG: 9,
  ATK_SCALING: 0.08,
  MATK_SCALING: 0.10,

  // Armor: shieldMatches * BASE_SHIELD
  BASE_SHIELD: 5,

  // Heal: heartMatches * BASE_HEAL
  BASE_HEAL: 8,

  // Gold: coinMatches * BASE_GOLD
  BASE_GOLD: 2,

  // Skill charge: starMatches * BASE_CHARGE
  BASE_CHARGE: 10,     // Skill costs ~100 charge, so ~10 star gems to fill

  // Cascade bonus: each cascade level adds this % to all effects
  CASCADE_BONUS: 0.25, // 25% per cascade level (level 0 = first match, no bonus)

  // Enemy damage reduction from armor: dmg * (1 - armor/(armor + ARMOR_CONSTANT))
  ARMOR_CONSTANT: 50,

  // Armor decays 50% per turn (prevents infinite stacking)
  ARMOR_DECAY: 0.5,

  // Damage variance
  DAMAGE_VARIANCE: 0.1, // ±10%

  // Between-room heal (% of max HP) — prevents cumulative damage death spiral
  BETWEEN_ROOM_HEAL: 0.35,  // V4b: 30→35%. Longer fights = more cumulative damage.
};

// ============================================================
// HEROES
// ============================================================

export const HEROES = {
  warrior: {
    name: 'Warrior',
    nameZh: '戰士',
    hp: 250,
    atk: 12,
    matk: 5,
    def: 12,
    color: '#e74c3c',
    skill: {
      name: 'Blade Storm',
      nameZh: '劍刃風暴',
      cost: 100,
      description: '2x sword damage + convert 5 random gems to sword',
      // Applied in MatchResolver when activated
    },
    // Warrior favors sword matches. Tanky, straightforward.
  },

  mage: {
    name: 'Mage',
    nameZh: '法師',
    hp: 200,
    atk: 5,
    matk: 14,
    def: 8,
    color: '#9b59b6',
    skill: {
      name: 'Meteor',
      nameZh: '隕石術',
      cost: 100,
      description: '3x fire damage, ignores enemy armor',
      // Ignores armor = bypasses ARMOR_CONSTANT calc
    },
    // Mage favors fire matches. Glass cannon.
  },

  paladin: {
    name: 'Paladin',
    nameZh: '聖騎士',
    hp: 270,
    atk: 8,
    matk: 8,
    def: 12,
    color: '#3498db',
    skill: {
      name: 'Holy Shield',
      nameZh: '聖盾',
      cost: 120,   // Slightly more expensive — very powerful
      description: 'Full heal + 50% max HP as armor for 2 turns',
    },
    // Paladin is balanced, tanky. Skill is defensive powerhouse.
  },
};

// ============================================================
// ENEMIES
// ============================================================

export const ENEMY_SCALING = {
  // enemy_stat = base * (1 + floor * factor)
  hp: 0.06,    // V4: 0.08→0.06. Slower HP scaling so late-game fights stay fun, not grindy.
  atk: 0.05,   // V4: 0.06→0.05. Cumulative damage over longer fights was too punishing.
  def: 0.03,   // V4: 0.04→0.03. Match-3 players can't control burst like auto-battler.
};

export const ENEMIES = {
  // V4: High HP (longer fights = more fun matching), moderate ATK (survivable).
  // --- GRASSLAND (Floor 1-4) ---
  slime:          { name: 'Slime',         hp: 80,  atk: 5,  def: 2,  color: '#2ecc71' },
  goblin:         { name: 'Goblin',        hp: 70,  atk: 6,  def: 3,  color: '#e67e22' },
  wolf:           { name: 'Wolf',          hp: 100, atk: 7,  def: 3,  color: '#95a5a6' },
  goblin_archer:  { name: 'Goblin Archer', hp: 60,  atk: 9,  def: 2,  color: '#d35400' },

  // --- DESERT (Floor 6-9) ---
  scorpion:       { name: 'Scorpion',      hp: 110, atk: 8,  def: 5,  color: '#c0392b' },
  mummy:          { name: 'Mummy',         hp: 140, atk: 7,  def: 10, color: '#bdc3c7' },
  sand_mage:      { name: 'Sand Mage',     hp: 70,  atk: 11, def: 3,  color: '#f39c12' },

  // --- FROSTLANDS (Floor 11-14) ---
  ice_golem:      { name: 'Ice Golem',     hp: 180, atk: 9,  def: 14, color: '#74b9ff' },
  frost_witch:    { name: 'Frost Witch',   hp: 80,  atk: 14, def: 3,  color: '#a29bfe' },
  skeleton:       { name: 'Skeleton',      hp: 120, atk: 10, def: 5,  color: '#dfe6e9' },

  // --- INFERNAL (Floor 16-19) ---
  imp:            { name: 'Imp',           hp: 110, atk: 11, def: 4,  color: '#fd79a8' },
  fire_elemental: { name: 'Fire Elemental',hp: 150, atk: 14, def: 7,  color: '#e17055' },
  demon_knight:   { name: 'Demon Knight',  hp: 200, atk: 12, def: 12, color: '#636e72' },
};

// ============================================================
// BOSSES
// ============================================================

export const BOSSES = {
  ogre_king: {
    name: 'Ogre King', nameZh: '食人魔王',
    floor: 5,
    hp: 350, atk: 12, def: 6, color: '#d63031',
    mechanic: 'enrage',
    // Enrages at 30% HP → 1.5x ATK
    enrageThreshold: 0.3,
    enrageMultiplier: 1.5,
  },
  sand_wyrm: {
    name: 'Sand Wyrm', nameZh: '沙漠巨蟲',
    floor: 10,
    hp: 500, atk: 16, def: 8, color: '#e17055',
    mechanic: 'column_block',
    // Blocks 1 random column every 3 turns
    blockInterval: 3,
  },
  lich_lord: {
    name: 'Lich Lord', nameZh: '巫妖王',
    floor: 15,
    hp: 580, atk: 16, def: 8, color: '#6c5ce7',
    mechanic: 'lifesteal',
    // 30% lifesteal + 5% poison per turn
    lifesteal: 0.3,
    poisonPercent: 0.05,
  },
  dragon_emperor: {
    name: 'Dragon Emperor', nameZh: '龍帝',
    floor: 20,
    hp: 750, atk: 20, def: 10, color: '#fdcb6e',
    mechanic: 'burn_gems',
    // Burns 3 random gems per turn. Matching burned gems hurts hero.
    burnCount: 3,
    burnDamage: 15,
  },
};

// ============================================================
// FLOOR ENCOUNTERS
// ============================================================

export const FLOOR_ENCOUNTERS = {
  1:  { enemies: ['slime'],          theme: 'grassland' },
  2:  { enemies: ['goblin'],         theme: 'grassland' },
  3:  { enemies: ['wolf'],           theme: 'grassland' },
  4:  { enemies: ['goblin_archer'],  theme: 'grassland' },
  5:  { boss: 'ogre_king',          theme: 'grassland' },
  6:  { enemies: ['scorpion'],       theme: 'desert' },
  7:  { enemies: ['scorpion'],       theme: 'desert' },
  8:  { enemies: ['mummy'],          theme: 'desert' },
  9:  { enemies: ['sand_mage'],      theme: 'desert' },
  10: { boss: 'sand_wyrm',          theme: 'desert' },
  11: { enemies: ['skeleton'],       theme: 'frostlands' },
  12: { enemies: ['ice_golem'],      theme: 'frostlands' },
  13: { enemies: ['frost_witch'],    theme: 'frostlands' },
  14: { enemies: ['skeleton'],       theme: 'frostlands' },
  15: { boss: 'lich_lord',          theme: 'frostlands' },
  16: { enemies: ['imp'],            theme: 'infernal' },
  17: { enemies: ['fire_elemental'], theme: 'infernal' },
  18: { enemies: ['demon_knight'],   theme: 'infernal' },
  19: { enemies: ['imp'],            theme: 'infernal' },
  20: { boss: 'dragon_emperor',     theme: 'infernal' },
};

// ============================================================
// MAP / PROGRESSION
// ============================================================

export const MAP = {
  nodesPerFloor: 3,
  nodeWeights: {
    combat: 0.45,
    elite: 0.15,
    shop: 0.12,
    rest: 0.10,
    mystery: 0.10,
    treasure: 0.08,
  },
  bossFloors: [5, 10, 15, 20],
  guaranteeRestOrShopBy: 4,
};

// ============================================================
// REWARDS
// ============================================================

export const REWARDS = {
  statBoosts: {
    tier1: { atk: { min: 1, max: 3 }, matk: { min: 1, max: 3 }, def: { min: 1, max: 3 }, hp: { min: 10, max: 25 } },
    tier2: { atk: { min: 2, max: 5 }, matk: { min: 2, max: 5 }, def: { min: 2, max: 5 }, hp: { min: 20, max: 45 } },
    tier3: { atk: { min: 4, max: 8 }, matk: { min: 4, max: 8 }, def: { min: 4, max: 8 }, hp: { min: 35, max: 70 } },
    tier4: { atk: { min: 6, max: 12 }, matk: { min: 6, max: 12 }, def: { min: 6, max: 12 }, hp: { min: 50, max: 100 } },
  },
  equipment: {
    // Equipment gives gem-specific bonuses
    tier1: [
      { name: 'Iron Sword', stat: 'swordBonus', value: 0.15, desc: 'Sword matches +15% dmg' },
      { name: 'Flame Staff', stat: 'fireBonus', value: 0.15, desc: 'Fire matches +15% dmg' },
      { name: 'Oak Shield', stat: 'shieldBonus', value: 0.20, desc: 'Shield matches +20% armor' },
      { name: 'Healing Ring', stat: 'healBonus', value: 0.20, desc: 'Heart matches +20% heal' },
    ],
    tier2: [
      { name: 'Steel Blade', stat: 'swordBonus', value: 0.30, desc: 'Sword matches +30% dmg' },
      { name: 'Inferno Rod', stat: 'fireBonus', value: 0.30, desc: 'Fire matches +30% dmg' },
      { name: 'Tower Shield', stat: 'shieldBonus', value: 0.40, desc: 'Shield matches +40% armor' },
      { name: 'Life Amulet', stat: 'healBonus', value: 0.40, desc: 'Heart matches +40% heal' },
    ],
    tier3: [
      { name: 'Dragon Fang', stat: 'swordBonus', value: 0.50, desc: 'Sword matches +50% dmg' },
      { name: 'Arcane Orb', stat: 'fireBonus', value: 0.50, desc: 'Fire matches +50% dmg' },
      { name: 'Flame Sword', stat: 'fireSwordHybrid', value: 0.30, desc: 'Sword matches +30% fire dmg too' },
      { name: 'Vampiric Ring', stat: 'lifesteal', value: 0.10, desc: '10% of damage heals you' },
    ],
  },
};

// ============================================================
// ECONOMY
// ============================================================

export const ECONOMY = {
  goldPerCombat: { min: 10, max: 20 },
  goldPerElite: { min: 25, max: 40 },

  shopPrices: {
    smallPotion: 30,
    largePotion: 60,
    reroll: 25,
  },

  smallPotionHeal: 0.25,
  largePotionHeal: 0.50,
  restNodeHeal: 0.40,

  startingGold: 0,
  startingPotions: 2,
  potionDropChance: 0.20,
};

// ============================================================
// SIMULATION TARGETS
// ============================================================

export const SIM_TARGETS = {
  winRate: { min: 0.30, max: 0.55, ideal: 0.42 },
  avgTurnsPerCombat: { min: 5, max: 12, ideal: 8 },
  avgRunTimeMinutes: { min: 8, max: 18, ideal: 12 },
};
