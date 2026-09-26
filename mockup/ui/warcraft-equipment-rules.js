(function (global) {
  "use strict";
  const SLOTS = Object.freeze(["Head", "Chest", "Pants", "Feet", "Gloves", "Weapon", "Trinket"]);
  const QUALITY = Object.freeze({
    1: Object.freeze(["Common", "common"]),
    2: Object.freeze(["Uncommon", "uncommon"]),
    3: Object.freeze(["Rare", "rare"]),
    4: Object.freeze(["Epic", "epic"]),
    5: Object.freeze(["Epic", "epic"])
  });
  const PREFIX = Object.freeze({
    1: "Worn",
    2: "Fieldforged",
    3: "Veteran's",
    4: "Runed",
    5: "Ascendant"
  });
  const PATTERN = Object.freeze({
    1: Object.freeze(["Cloth", "Cloth", "Cloth", "Cloth", "Cloth"]),
    2: Object.freeze(["Cloth", "Leather", "Mail", "Plate", "Cloth"]),
    3: Object.freeze(["Leather", "Mail", "Plate", "Cloth", "Leather"]),
    4: Object.freeze(["Mail", "Plate", "Cloth", "Leather", "Mail"]),
    5: Object.freeze(["Plate", "Cloth", "Leather", "Mail", "Plate"])
  });
  const NOUN = Object.freeze({
    Head: Object.freeze({ Cloth: "Cowl", Leather: "Mask", Mail: "Coif", Plate: "Helm" }),
    Chest: Object.freeze({ Cloth: "Robe", Leather: "Jerkin", Mail: "Hauberk", Plate: "Cuirass" }),
    Pants: Object.freeze({
      Cloth: "Leggings",
      Leather: "Legguards",
      Mail: "Chausses",
      Plate: "Greaves"
    }),
    Feet: Object.freeze({
      Cloth: "Slippers",
      Leather: "Boots",
      Mail: "Sabatons",
      Plate: "Warboots"
    }),
    Gloves: Object.freeze({
      Cloth: "Gloves",
      Leather: "Grips",
      Mail: "Gauntlets",
      Plate: "Handguards"
    })
  });
  const WEAPONS = Object.freeze([
    Object.freeze(["Staff", "Spellstaff", "Intellect"]),
    Object.freeze(["Dagger", "Quickblade", "Agility"]),
    Object.freeze(["Sword", "Warblade", "Strength"])
  ]);
  const ARMOR_ACCESS = Object.freeze({
    mage: Object.freeze(["Cloth"]),
    priest: Object.freeze(["Cloth"]),
    warlock: Object.freeze(["Cloth"]),
    rogue: Object.freeze(["Cloth", "Leather"]),
    druid: Object.freeze(["Cloth", "Leather"]),
    hunter: Object.freeze(["Cloth", "Leather", "Mail"]),
    shaman: Object.freeze(["Cloth", "Leather", "Mail"]),
    paladin: Object.freeze(["Cloth", "Leather", "Mail", "Plate"]),
    warrior: Object.freeze(["Cloth", "Leather", "Mail", "Plate"])
  });
  const PREFERRED_ARMOR = Object.freeze({
    mage: "Cloth",
    priest: "Cloth",
    warlock: "Cloth",
    rogue: "Leather",
    druid: "Leather",
    hunter: "Mail",
    shaman: "Mail",
    paladin: "Plate",
    warrior: "Plate"
  });
  const STAT_KEYS = Object.freeze({
    Strength: "strength",
    Agility: "agility",
    Intellect: "intellect",
    Stamina: "stamina",
    Spirit: "spirit",
    Crit: "crit",
    Haste: "haste",
    "Hit Rating": "hitRating",
    Mastery: "mastery"
  });
  function focus(family) {
    return family === "Cloth"
      ? "Intellect"
      : family === "Leather" || family === "Mail"
        ? "Agility"
        : "Strength";
  }
  function statsFor(tier, statFocus) {
    const t = Number(tier) || 1;
    if (t === 1) return [];
    if (t === 2) return [{ stat: statFocus, value: 4 }];
    if (t === 3)
      return [
        { stat: statFocus, value: 6 },
        { stat: "Stamina", value: 5 }
      ];
    if (t === 4)
      return [
        { stat: statFocus, value: 9 },
        { stat: "Stamina", value: 8 },
        { stat: "Crit", value: 3 }
      ];
    return [
      { stat: statFocus, value: 13 },
      { stat: "Stamina", value: 12 },
      { stat: "Crit", value: 5 },
      { stat: "Haste", value: 4 }
    ];
  }
  function buildDefinitions() {
    const items = [];
    for (let tier = 1; tier <= 5; tier += 1) {
      SLOTS.slice(0, 5).forEach((slot, index) => {
        const family = PATTERN[tier][index],
          statFocus = focus(family);
        items.push({
          id: "t" + tier + "-" + slot.toLowerCase() + "-" + family.toLowerCase(),
          name: PREFIX[tier] + " " + NOUN[slot][family],
          tier,
          quality: QUALITY[tier][0],
          qualityKey: QUALITY[tier][1],
          slot,
          family,
          statFocus,
          stats: statsFor(tier, statFocus)
        });
      });
      const trinketFocus = ["Strength", "Agility", "Intellect", "Stamina", "Crit"][tier - 1];
      items.push({
        id: "t" + tier + "-trinket-relic",
        name: PREFIX[tier] + " Adventurer's Relic",
        tier,
        quality: QUALITY[tier][0],
        qualityKey: QUALITY[tier][1],
        slot: "Trinket",
        family: "Trinket",
        statFocus: trinketFocus,
        stats: statsFor(tier, trinketFocus)
      });
      WEAPONS.forEach(weapon =>
        items.push({
          id: "t" + tier + "-weapon-" + weapon[0].toLowerCase(),
          name: PREFIX[tier] + " " + weapon[1],
          tier,
          quality: QUALITY[tier][0],
          qualityKey: QUALITY[tier][1],
          slot: "Weapon",
          family: weapon[0],
          statFocus: weapon[2],
          stats: statsFor(tier, weapon[2])
        })
      );
    }
    return items;
  }
  function canEquip(hero, item) {
    if (!hero || !item) return { ok: false, reason: "Missing hero or item." };
    if (Number(item.tier) > Number(hero.level))
      return { ok: false, reason: "Requires hero level " + item.tier };
    if (item.slot === "Weapon" || item.slot === "Trinket") return { ok: true, reason: "" };
    const allowed = ARMOR_ACCESS[hero.classId] || ["Cloth"];
    if (!allowed.includes(item.family))
      return {
        ok: false,
        reason: String(hero.classLabel || hero.classId) + " cannot equip " + item.family
      };
    return { ok: true, reason: "" };
  }
  function aggregate(equipment, hero) {
    const totals = {};
    const byId = new Map(buildDefinitions().map(item => [item.id, item]));
    for (const slot of SLOTS) {
      const id = equipment && equipment[slot];
      if (!id) continue;
      const item = byId.get(String(id));
      if (!item || item.slot !== slot) continue;
      if (hero && !canEquip(hero, item).ok) continue;
      for (const line of item.stats || [])
        totals[line.stat] = (totals[line.stat] || 0) + Number(line.value || 0);
    }
    return totals;
  }
  function modifiers(equipment, hero) {
    const totals = aggregate(equipment, hero),
      out = {};
    for (const [label, key] of Object.entries(STAT_KEYS)) out[key] = Number(totals[label]) || 0;
    return out;
  }
  global.WarcraftEquipmentRules = Object.freeze({
    SLOTS,
    ARMOR_ACCESS,
    PREFERRED_ARMOR,
    buildDefinitions,
    canEquip,
    aggregate,
    modifiers
  });
})(globalThis);
