/*
 * Shared semantic WoW icon resolver for the static mockups.
 * Icon art remains remote on the existing Wowhead CDN; no Blizzard textures are stored here.
 */
(function(global) {
  "use strict";

  const ICON_ROOT = "https://wow.zamimg.com/images/wow/icons/large/";
  const FALLBACK_SLUG = "inv_misc_questionmark";
  const FALLBACK_URL = ICON_ROOT + FALLBACK_SLUG + ".jpg";
  const INLINE_FALLBACK = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#0b0e11"/>' +
    '<rect x="2" y="2" width="60" height="60" fill="none" stroke="#655838" stroke-width="3"/>' +
    '<path d="M22 23c1-9 19-11 22-1 3 9-10 10-10 18" fill="none" stroke="#d6b65f" stroke-width="6" stroke-linecap="square"/>' +
    '<rect x="30" y="48" width="6" height="6" fill="#d6b65f"/>' +
    '</svg>'
  );

  const ICONS = {
    class: {
      druid:"classicon_druid",
      hunter:"classicon_hunter",
      mage:"classicon_mage",
      paladin:"classicon_paladin",
      priest:"classicon_priest",
      rogue:"classicon_rogue",
      shaman:"classicon_shaman",
      warlock:"classicon_warlock",
      warrior:"classicon_warrior"
    },
    spec: {
      "druid:balance":"spell_nature_starfall",
      "druid:feral":"ability_druid_catform",
      "druid:restoration":"spell_nature_rejuvenation",
      "hunter:beast-mastery":"ability_hunter_beastcall",
      "hunter:marksmanship":"ability_marksmanship",
      "hunter:survival":"ability_hunter_survivalinstincts",
      "mage:arcane":"spell_arcane_blast",
      "mage:fire":"spell_fire_fireball02",
      "mage:frost":"spell_frost_frostbolt02",
      "paladin:holy":"spell_holy_holybolt",
      "paladin:protection":"spell_holy_devotionaura",
      "paladin:retribution":"spell_holy_sealofmight",
      "priest:discipline":"spell_holy_powerwordshield",
      "priest:holy":"spell_holy_greaterheal",
      "priest:shadow":"spell_shadow_shadowwordpain",
      "rogue:assassination":"ability_rogue_eviscerate",
      "rogue:combat":"ability_backstab",
      "rogue:subtlety":"ability_rogue_ambush",
      "shaman:elemental":"spell_nature_lightning",
      "shaman:enhancement":"ability_shaman_stormstrike",
      "shaman:restoration":"spell_nature_healingwavegreater",
      "warlock:affliction":"spell_shadow_corruption",
      "warlock:demonology":"spell_shadow_summonvoidwalker",
      "warlock:destruction":"spell_fire_flamebolt",
      "warrior:arms":"ability_warrior_savageblow",
      "warrior:fury":"ability_warrior_innerrage",
      "warrior:protection":"ability_warrior_defensivestance",
      balance:"spell_nature_starfall",
      feral:"ability_druid_catform",
      "beast-mastery":"ability_hunter_beastcall",
      marksmanship:"ability_marksmanship",
      survival:"ability_hunter_survivalinstincts",
      arcane:"spell_arcane_blast",
      fire:"spell_fire_fireball02",
      frost:"spell_frost_frostbolt02",
      retribution:"spell_holy_sealofmight",
      discipline:"spell_holy_powerwordshield",
      shadow:"spell_shadow_shadowwordpain",
      assassination:"ability_rogue_eviscerate",
      combat:"ability_backstab",
      subtlety:"ability_rogue_ambush",
      elemental:"spell_nature_lightning",
      enhancement:"ability_shaman_stormstrike",
      affliction:"spell_shadow_corruption",
      demonology:"spell_shadow_summonvoidwalker",
      destruction:"spell_fire_flamebolt",
      arms:"ability_warrior_savageblow",
      fury:"ability_warrior_innerrage"
    },
    race: {
      human:"achievement_character_human_male",
      dwarf:"achievement_character_dwarf_male",
      gnome:"achievement_character_gnome_male",
      "night-elf":"achievement_character_nightelf_male",
      orc:"achievement_character_orc_male",
      undead:"achievement_character_undead_male",
      tauren:"achievement_character_tauren_male",
      troll:"achievement_character_troll_male",
      "human:body-1":"achievement_character_human_male",
      "human:body-2":"achievement_character_human_female",
      "dwarf:body-1":"achievement_character_dwarf_male",
      "dwarf:body-2":"achievement_character_dwarf_female",
      "gnome:body-1":"achievement_character_gnome_male",
      "gnome:body-2":"achievement_character_gnome_female",
      "night-elf:body-1":"achievement_character_nightelf_male",
      "night-elf:body-2":"achievement_character_nightelf_female",
      "orc:body-1":"achievement_character_orc_male",
      "orc:body-2":"achievement_character_orc_female",
      "undead:body-1":"achievement_character_undead_male",
      "undead:body-2":"achievement_character_undead_female",
      "tauren:body-1":"achievement_character_tauren_male",
      "tauren:body-2":"achievement_character_tauren_female",
      "troll:body-1":"achievement_character_troll_male",
      "troll:body-2":"achievement_character_troll_female"
    },
    racial: {
      human:"spell_holy_powerwordshield",
      gnome:"inv_enchant_essenceastrallarge",
      dwarf:"inv_misc_coin_01",
      "night-elf":"ability_stealth",
      orc:"ability_warrior_innerrage",
      undead:"spell_holy_heal",
      tauren:"ability_warstomp",
      troll:"ability_rogue_sprint"
    },
    faction: {
      alliance:"inv_bannerpvp_02",
      horde:"inv_bannerpvp_01"
    },
    "equipment-slot": {
      head:"inv_helmet_08",
      chest:"inv_chest_cloth_17",
      pants:"inv_pants_cloth_14",
      feet:"inv_boots_08",
      gloves:"inv_gauntlets_05",
      weapon:"inv_sword_04"
    },
    "item-family": {
      cloth:"inv_fabric_wool_01",
      leather:"inv_misc_leatherscrap_02",
      mail:"inv_chest_chain_11",
      plate:"inv_chest_plate04",
      staff:"inv_staff_13",
      dagger:"inv_weapon_shortblade_05",
      sword:"inv_sword_04",
      "head:cloth":"inv_helmet_08",
      "head:leather":"inv_helmet_04",
      "head:mail":"inv_helmet_05",
      "head:plate":"inv_helmet_06",
      "chest:cloth":"inv_chest_cloth_17",
      "chest:leather":"inv_chest_leather_07",
      "chest:mail":"inv_chest_chain_11",
      "chest:plate":"inv_chest_plate04",
      "pants:cloth":"inv_pants_cloth_14",
      "pants:leather":"inv_pants_leather_05",
      "pants:mail":"inv_pants_mail_14",
      "pants:plate":"inv_pants_plate_04",
      "feet:cloth":"inv_boots_cloth_03",
      "feet:leather":"inv_boots_07",
      "feet:mail":"inv_boots_chain_05",
      "feet:plate":"inv_boots_plate_03",
      "gloves:cloth":"inv_gauntlets_05",
      "gloves:leather":"inv_gauntlets_15",
      "gloves:mail":"inv_gauntlets_10",
      "gloves:plate":"inv_gauntlets_04",
      "weapon:staff":"inv_staff_13",
      "weapon:dagger":"inv_weapon_shortblade_05",
      "weapon:sword":"inv_sword_04"
    },
    ability: {
      attack:"ability_meleedamage",
      damage:"ability_dualwield",
      heal:"spell_holy_heal",
      defensive:"spell_holy_powerwordshield",
      ultimate:"spell_nature_lightningoverload",
      movement:"ability_rogue_sprint"
    },
    talent: {
      active:"spell_nature_lightning",
      passive:"spell_nature_naturesblessing",
      capstone:"spell_holy_divineshield",
      locked:"inv_misc_lockbox_1"
    },
    profession: {
      blacksmith:"trade_blacksmithing",
      blacksmithing:"trade_blacksmithing",
      alchemist:"trade_alchemy",
      alchemy:"trade_alchemy",
      enchanter:"trade_engraving",
      enchanting:"trade_engraving",
      tailor:"trade_tailoring",
      tailoring:"trade_tailoring",
      leatherworker:"trade_leatherworking",
      leatherworking:"trade_leatherworking",
      engineer:"trade_engineering",
      engineering:"trade_engineering"
    },
    building: {
      keep:"inv_misc_tournaments_symbol_human",
      "keep-alliance":"inv_misc_tournaments_symbol_human",
      "keep-horde":"inv_misc_tournaments_symbol_orc",
      "quest-board":"inv_misc_note_01",
      "recruitment-hall":"achievement_guildperk_everybodysfriend",
      "training-grounds":"ability_dualwield",
      storehouse:"inv_crate_03"
    },
    quest: {
      journal:"inv_misc_note_01",
      available:"inv_misc_note_01",
      active:"inv_misc_map_01",
      completed:"achievement_quests_completed_08",
      marks:"inv_misc_rune_01"
    },
    currency: {
      gold:"inv_misc_coin_01",
      renown:"achievement_reputation_01",
      valor:"pvecurrency-valor",
      badges:"inv_misc_rune_01",
      deeds:"inv_misc_note_01"
    },
    resource: {
      health:"spell_holy_wordfortitude",
      mana:"inv_enchant_essenceastrallarge",
      rage:"ability_warrior_innerrage",
      energy:"ability_rogue_sprint",
      lumber:"inv_misc_1h_lumberaxe_a_01",
      stone:"inv_stone_16",
      population:"inv_misc_groupneedmore"
    },
    battle: {
      pause:"spell_nature_timestop",
      resume:"ability_hunter_readiness",
      speed:"ability_rogue_sprint",
      reset:"ability_hunter_readiness",
      combat:"ability_dualwield",
      damage:"ability_warrior_savageblow",
      heal:"spell_holy_heal",
      critical:"ability_rogue_eviscerate",
      death:"spell_shadow_soulleech_3",
      victory:"achievement_bg_winwsg"
    }
  };

  const CATEGORY_ALIASES = {
    classes:"class",
    specs:"spec",
    races:"race",
    racial:"racial",
    racials:"racial",
    factions:"faction",
    slot:"equipment-slot",
    slots:"equipment-slot",
    equipment:"equipment-slot",
    item:"item-family",
    items:"item-family",
    abilities:"ability",
    talents:"talent",
    professions:"profession",
    buildings:"building",
    currencies:"currency",
    quests:"quest",
    resources:"resource",
    controls:"battle",
    status:"battle"
  };

  function keyify(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function categoryKey(category) {
    const key = keyify(category);
    return CATEGORY_ALIASES[key] || key;
  }

  function iconUrl(slug) {
    const safeSlug = String(slug || FALLBACK_SLUG).trim().toLowerCase();
    return ICON_ROOT + safeSlug + ".jpg";
  }

  function resolveSlug(category, key, context) {
    const normalizedCategory = categoryKey(category);
    const map = ICONS[normalizedCategory];
    if (!map) return FALLBACK_SLUG;

    const normalizedKey = keyify(key);
    const meta = context || {};

    if (normalizedCategory === "race" && meta.body) {
      const contextualRace = normalizedKey + ":" + keyify(meta.body);
      if (map[contextualRace]) return map[contextualRace];
    }

    if (normalizedCategory === "spec" && meta.classId) {
      const contextual = keyify(meta.classId) + ":" + normalizedKey;
      if (map[contextual]) return map[contextual];
    }

    if (normalizedCategory === "item-family" && meta.slot) {
      const contextual = keyify(meta.slot) + ":" + normalizedKey;
      if (map[contextual]) return map[contextual];
    }

    return map[normalizedKey] || FALLBACK_SLUG;
  }

  function resolve(category, key, context) {
    return iconUrl(resolveSlug(category, key, context));
  }

  function bindFallback(img) {
    if (!img || img.dataset.wowIconFallbackBound === "true") return img;
    img.dataset.wowIconFallbackBound = "true";
    let stage = 0;

    function onError() {
      if (stage === 0 && img.src !== FALLBACK_URL) {
        stage = 1;
        img.src = FALLBACK_URL;
        return;
      }

      stage = 2;
      img.removeEventListener("error", onError);
      img.src = INLINE_FALLBACK;
      img.classList.add("wow-icon-fallback");
    }

    img.addEventListener("error", onError);
    return img;
  }

  function hydrate(root) {
    const scope = root || document;
    scope.querySelectorAll("img[data-wow-icon]").forEach(function(img) {
      const context = {
        classId:img.dataset.wowClass || "",
        slot:img.dataset.wowSlot || ""
      };
      img.src = resolve(img.dataset.wowIcon, img.dataset.wowKey, context);
      bindFallback(img);
    });
  }

  global.WowUIIcons = Object.freeze({
    fallbackUrl:FALLBACK_URL,
    iconUrl:iconUrl,
    resolve:resolve,
    resolveSlug:resolveSlug,
    bindFallback:bindFallback,
    hydrate:hydrate
  });
})(window);
