(function (global) {
  "use strict";
  const Campaign = global.WarcraftCampaign;
  const Roster = global.WarcraftRoster;
  const Assignments = global.WarcraftAssignmentSlots;
  if (!Campaign || !Roster || !Assignments)
    throw new Error(
      "WarcraftCampaign, WarcraftRoster, and WarcraftAssignmentSlots must load before WarcraftClassHall."
    );
  const BUILDING_ID = "classhall";
  let config = null;
  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function validateConfig(payload) {
    if (!payload || payload.kind !== "class_hall" || payload.owner_building !== BUILDING_ID)
      throw new Error("Class Hall data must target classhall.");
    if (Number(payload.assignment_slots) !== Assignments.SLOT_COUNT)
      throw new Error("Class Hall requires exactly three assignment slots.");
    if (
      !payload.training_duration ||
      Number(payload.training_duration.days) !== 1 ||
      Number(payload.training_duration.campaign_phases) !== Assignments.DURATION_PHASES
    )
      throw new Error("Class Hall training must last one full campaign day / two phases.");
    if (!Array.isArray(payload.trainers) || !payload.trainers.length)
      throw new Error("Class Hall trainer catalog is empty.");
    const trainerIds = payload.trainers.map(entry => String(entry.id)),
      classIds = payload.trainers.map(entry => String(entry.class_id));
    if (
      new Set(trainerIds).size !== trainerIds.length ||
      new Set(classIds).size !== classIds.length
    )
      throw new Error("Class Hall trainers must have unique IDs and classes.");
    payload.trainers.forEach(entry => {
      if (!entry.class_id || !Array.isArray(entry.factions) || !entry.factions.length)
        throw new Error("Class Hall trainer is missing faction metadata.");
    });
    return payload;
  }
  function completionHandler(assignment, hero) {
    const before = hero.level,
      progress = Roster.completeHeroLevelTraining(hero.id, { source: "classhall" });
    return {
      type: "class_hall_level_complete",
      fromLevel: before,
      toLevel: progress.level,
      selectedAction: assignment.selectedAction,
      selectedTrainerId: assignment.selectedTrainerId || assignment.trainerId || null
    };
  }
  function configure(payload) {
    config = validateConfig(clone(payload));
    Assignments.registerCompletionHandler(BUILDING_ID, completionHandler);
    return getState();
  }
  function trainers(faction) {
    if (!config) return [];
    const target = String(faction || Campaign.getActiveFaction()).toLowerCase();
    return config.trainers.filter(entry => entry.factions.includes(target)).map(clone);
  }
  function trainerForClass(classId, faction) {
    return trainers(faction).find(entry => entry.class_id === String(classId)) || null;
  }
  function getState() {
    return Assignments.getBuildingState(BUILDING_ID);
  }
  function startLevelTraining(indexValue) {
    if (!config) throw new Error("Class Hall is not configured.");
    const assignment = Assignments.assignmentAt(BUILDING_ID, indexValue);
    if (!assignment) throw new Error("Assign a hero before starting Class Hall training.");
    const hero = Roster.hero(assignment.heroId);
    if (!hero) throw new Error("Assigned Class Hall hero is missing.");
    const trainer = trainerForClass(hero.classId);
    if (!trainer)
      throw new Error(hero.classLabel + " does not match an active-faction Class Hall trainer.");
    const progress = Roster.getHeroProgress(hero.id);
    if (!progress || !progress.canTrain) {
      if (progress && progress.baseBlocked)
        throw new Error(
          "Base Level " +
            progress.baseLevel +
            " cannot train " +
            hero.name +
            " to level " +
            progress.nextLevel +
            "."
        );
      throw new Error(hero.name + " must be 20 / 20 XP before Class Hall level training.");
    }
    Assignments.updateSelection(BUILDING_ID, indexValue, {
      selectedAction: "level-up",
      selectedTrainerId: trainer.id,
      trainerId: trainer.id,
      trainerClassId: trainer.class_id
    });
    return Assignments.start(BUILDING_ID, indexValue, {
      selectedAction: "level-up",
      selectedTrainerId: trainer.id,
      trainerId: trainer.id,
      trainerClassId: trainer.class_id
    });
  }
  function processCompletions() {
    return Assignments.processBuilding(BUILDING_ID);
  }
  global.WarcraftClassHall = Object.freeze({
    configure,
    trainerForClass,
    startLevelTraining,
    processCompletions
  });
})(window);
