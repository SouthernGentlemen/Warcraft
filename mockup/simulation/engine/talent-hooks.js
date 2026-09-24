function allTalentRecords(specData) {
  return [
    ...(specData.talents?.tier_1 || []),
    ...(specData.talents?.tier_2 || []),
    ...(specData.talents?.capstones || [])
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
}

export function defaultTalentNames(specData, level = 5) {
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
