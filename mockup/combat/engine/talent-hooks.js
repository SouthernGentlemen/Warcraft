export function validateTalentShape(specData) {
  const talents = specData?.talents || {};
  const expected = { tier_1:2, tier_2:2, capstones:1 };
  for (const [tier,count] of Object.entries(expected)) {
    if (!Array.isArray(talents[tier]) || talents[tier].length !== count) {
      throw new Error((specData?.specialization || "Specialization") + " talents must use exact 2 / 2 / 1 shape.");
    }
  }
  const records = [...talents.tier_1, ...talents.tier_2, ...talents.capstones];
  const names = records.map(record => String(record?.name || "").trim());
  if (names.some(name => !name) || new Set(names).size !== records.length) {
    throw new Error((specData?.specialization || "Specialization") + " talents require five unique named records.");
  }
  for (const record of records) {
    if (!record.icon_slug || !record.canonical_tree || !record.canonical_source) {
      throw new Error((specData?.specialization || "Specialization") + " talent metadata is incomplete.");
    }
  }
  if (!talents.capstones[0].ultimate_id) {
    throw new Error((specData?.specialization || "Specialization") + " capstone must define an Ultimate action ID.");
  }
  return specData;
}

export function allTalentRecords(specData) {
  validateTalentShape(specData);
  return [
    ...specData.talents.tier_1,
    ...specData.talents.tier_2,
    ...specData.talents.capstones
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
}

export function defaultTalentNames(specData, level = 5) {
  validateTalentShape(specData);
  const out = [];
  if (level >= 1 && specData.talents?.tier_1?.[0]) out.push(specData.talents.tier_1[0].name);
  if (level >= 2 && specData.talents?.tier_2?.[0]) out.push(specData.talents.tier_2[0].name);
  if (level >= 3 && specData.talents?.capstones?.[0]) out.push(specData.talents.capstones[0].name);
  return out;
}

export function compileTalentHooks(specData, selectedNames = []) {
  const selected = new Set(selectedNames);
  const hooks = {
    autoOutputBp: 0,
    autoHasteBp: 0,
    autoCritBp: 0,
    maxManaBp: 0,
    resourceCostReductionBp: 0,
    implemented: [],
    unimplemented: []
  };

  const autoName = String(specData.identity?.auto_attack || "").split(" — ")[0].trim();
  const autoPattern = autoName ? new RegExp(escapeRegExp(autoName), "i") : null;

  for (const talent of allTalentRecords(specData)) {
    if (!selected.has(talent.name)) continue;

    const effect = String(talent.effect || "");
    let matched = false;
    let match;

    match = effect.match(/Increase maximum Mana by (\d+)%/i);
    if (match) {
      hooks.maxManaBp += Number(match[1]) * 100;
      matched = true;
    }

    match = effect.match(/auto-attack bar fills (\d+)% faster/i)
      || effect.match(/auto-attack bars fill (\d+)% faster/i);
    if (match) {
      hooks.autoHasteBp += Number(match[1]) * 100;
      matched = true;
    }

    match = effect.match(/gains? (\d+)% Critical Strike chance/i);
    if (match && (effect.toLowerCase().includes("auto") || (autoPattern && autoPattern.test(effect)))) {
      hooks.autoCritBp += Number(match[1]) * 100;
      matched = true;
    }

    match = effect.match(/(?:Mana|Energy|Rage) costs?.*reduced by (\d+)%/i);
    if (match) {
      hooks.resourceCostReductionBp += Number(match[1]) * 100;
      matched = true;
    }

    match = effect.match(/deals (\d+)% more damage/i);
    if (match && autoPattern && autoPattern.test(effect)) {
      hooks.autoOutputBp += Number(match[1]) * 100;
      matched = true;
    }

    match = effect.match(/healing is increased by (\d+)%/i);
    if (match && autoPattern && autoPattern.test(effect)) {
      hooks.autoOutputBp += Number(match[1]) * 100;
      matched = true;
    }

    const record = { name: talent.name, effect };
    if (matched) hooks.implemented.push(record);
    else hooks.unimplemented.push(record);
  }

  return hooks;
}
