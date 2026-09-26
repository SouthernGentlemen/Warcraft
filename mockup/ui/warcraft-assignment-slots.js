(function (global) {
  "use strict";
  const Campaign = global.WarcraftCampaign;
  const Roster = global.WarcraftRoster;
  if (!Campaign || !Roster)
    throw new Error(
      "WarcraftCampaign and WarcraftRoster must load before WarcraftAssignmentSlots."
    );
  const BUILDING_IDS = Object.freeze(["artisans", "gathering-camp", "survival-lodge", "classhall"]);
  const SLOT_COUNT = 3;
  const DURATION_PHASES = 2;
  const completionHandlers = new Map();
  const processingBuildings = new Set();
  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function buildingId(value) {
    const id = String(value || "");
    if (!BUILDING_IDS.includes(id)) throw new Error("Unsupported assignment building " + id + ".");
    return id;
  }
  function slotIndex(value) {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT)
      throw new Error("Assignment slot must be 0, 1, or 2.");
    return index;
  }
  function blankState(id) {
    return { buildingId: id, slots: Array.from({ length: SLOT_COUNT }, () => null) };
  }
  function normalizeAssignment(id, index, value) {
    if (!value || !value.heroId) return null;
    const status = ["assigned", "training", "blocked"].includes(value.status)
      ? value.status
      : "assigned";
    return Object.assign(
      {
        buildingId: id,
        slotIndex: index,
        heroId: String(value.heroId),
        status,
        selectedAction: value.selectedAction ? String(value.selectedAction) : null,
        selectedTrainerId: value.selectedTrainerId || value.trainerId || null,
        selectedProfessionId: value.selectedProfessionId || value.professionId || null,
        startDay: value.startDay == null ? null : Math.max(1, Number(value.startDay) || 1),
        startPhase:
          value.startPhase === "night" ? "night" : value.startPhase === "day" ? "day" : null,
        startPhaseAdvance:
          value.startPhaseAdvance == null
            ? null
            : Math.max(0, Number(value.startPhaseAdvance) || 0),
        remainingCampaignPhases:
          value.remainingCampaignPhases == null
            ? null
            : Math.max(0, Number(value.remainingCampaignPhases) || 0)
      },
      clone(value),
      { buildingId: id, slotIndex: index, heroId: String(value.heroId), status }
    );
  }
  function normalizeState(id, raw) {
    const key = buildingId(id),
      source = raw && typeof raw === "object" ? raw : {},
      slots = Array.isArray(source.slots) ? source.slots : [];
    return {
      buildingId: key,
      slots: Array.from({ length: SLOT_COUNT }, (_, index) =>
        normalizeAssignment(key, index, slots[index])
      )
    };
  }
  function getBuildingState(id) {
    const key = buildingId(id);
    return normalizeState(key, Campaign.getBuildingAssignments()[key] || blankState(key));
  }
  function persist(id, state) {
    const key = buildingId(id),
      next = normalizeState(key, state);
    Campaign.setBuildingAssignment(key, next);
    emit("persist", { buildingId: key, state: next });
    return getBuildingState(key);
  }
  function emit(reason, detail) {
    if (typeof global.dispatchEvent !== "function" || typeof global.CustomEvent !== "function")
      return;
    global.dispatchEvent(
      new global.CustomEvent("warcraft:assignments-changed", {
        detail: Object.assign({ reason }, detail || {})
      })
    );
  }
  function allAssignments() {
    const out = [];
    BUILDING_IDS.forEach(id =>
      getBuildingState(id).slots.forEach(assignment => {
        if (assignment) out.push(assignment);
      })
    );
    return out;
  }
  function sanitizeAssignments() {
    const records = Campaign.getBuildingAssignments(),
      seen = new Set();
    BUILDING_IDS.forEach(id => {
      const raw = records[id];
      if (!raw || !Array.isArray(raw.slots)) return;
      const state = normalizeState(id, raw);
      let changed = false;
      state.slots.forEach((assignment, index) => {
        if (!assignment) return;
        if (seen.has(assignment.heroId)) {
          state.slots[index] = null;
          changed = true;
          return;
        }
        seen.add(assignment.heroId);
      });
      if (changed) Campaign.setBuildingAssignment(id, state);
    });
    return allAssignments();
  }
  function assignmentForHero(heroId) {
    const id = String(heroId);
    return allAssignments().find(assignment => assignment.heroId === id) || null;
  }
  function assignmentAt(id, index) {
    return getBuildingState(id).slots[slotIndex(index)] || null;
  }
  function assign(id, indexValue, heroId, details = {}) {
    const key = buildingId(id),
      index = slotIndex(indexValue),
      hero = Roster.hero(String(heroId));
    if (!hero) throw new Error("Unknown hero " + heroId + ".");
    Campaign.validateHeroIds([hero.id]);
    const existing = assignmentForHero(hero.id);
    if (existing && (existing.buildingId !== key || existing.slotIndex !== index))
      throw new Error(
        hero.name +
          " is already assigned to " +
          existing.buildingId +
          " slot " +
          (existing.slotIndex + 1) +
          "."
      );
    const state = getBuildingState(key),
      target = state.slots[index];
    if (target && target.status === "training")
      throw new Error("An active assignment cannot be replaced.");
    if (hero.availability !== "available" && !(target && target.heroId === hero.id))
      throw new Error(hero.name + " is not available for assignment.");
    state.slots[index] = normalizeAssignment(
      key,
      index,
      Object.assign({}, details, {
        heroId: hero.id,
        status: "assigned",
        startDay: null,
        startPhase: null,
        startPhaseAdvance: null,
        remainingCampaignPhases: null
      })
    );
    return persist(key, state).slots[index];
  }
  function updateSelection(id, indexValue, patch = {}) {
    const key = buildingId(id),
      index = slotIndex(indexValue),
      state = getBuildingState(key),
      current = state.slots[index];
    if (!current) throw new Error("Assign a hero before selecting an action.");
    if (current.status === "training") throw new Error("An active assignment cannot be edited.");
    state.slots[index] = normalizeAssignment(
      key,
      index,
      Object.assign({}, current, clone(patch), { status: "assigned" })
    );
    return persist(key, state).slots[index];
  }
  function remove(id, indexValue) {
    const key = buildingId(id),
      index = slotIndex(indexValue),
      state = getBuildingState(key),
      current = state.slots[index];
    if (current && current.status === "training")
      throw new Error("An active assignment cannot be removed.");
    state.slots[index] = null;
    persist(key, state);
    return null;
  }
  function start(id, indexValue, patch = {}) {
    const key = buildingId(id),
      index = slotIndex(indexValue),
      state = getBuildingState(key),
      current = state.slots[index];
    if (!current) throw new Error("Assign a hero before starting.");
    if (current.status === "training") throw new Error("Assignment is already in progress.");
    const hero = Roster.hero(current.heroId);
    if (!hero) throw new Error("Assigned hero is missing.");
    if (hero.availability !== "available")
      throw new Error(hero.name + " is not available to begin training.");
    const clock = Campaign.getClock();
    state.slots[index] = normalizeAssignment(
      key,
      index,
      Object.assign({}, current, clone(patch), {
        status: "training",
        startDay: clock.day,
        startPhase: clock.phase,
        startPhaseAdvance: clock.phaseAdvances,
        remainingCampaignPhases: DURATION_PHASES,
        error: null
      })
    );
    persist(key, state);
    Roster.updateHero(hero.id, { availability: "training" });
    emit("start", { buildingId: key, slotIndex: index, heroId: hero.id });
    return assignmentAt(key, index);
  }
  function remainingPhases(assignment) {
    if (!assignment || assignment.status !== "training") return null;
    const start = Math.max(0, Number(assignment.startPhaseAdvance) || 0),
      elapsed = Math.max(0, Campaign.getClock().phaseAdvances - start);
    return Math.max(0, DURATION_PHASES - elapsed);
  }
  function registerCompletionHandler(id, handler) {
    const key = buildingId(id);
    if (typeof handler !== "function") throw new Error("Completion handler must be a function.");
    completionHandlers.set(key, handler);
    return processBuilding(key);
  }
  function processBuilding(id) {
    const key = buildingId(id),
      handler = completionHandlers.get(key);
    if (!handler || processingBuildings.has(key)) return [];
    processingBuildings.add(key);
    try {
      const state = getBuildingState(key),
        events = [];
      let changed = false;
      state.slots.forEach((assignment, index) => {
        if (!assignment || assignment.status !== "training") return;
        const remaining = remainingPhases(assignment);
        if (assignment.remainingCampaignPhases !== remaining) {
          assignment.remainingCampaignPhases = remaining;
          changed = true;
        }
        if (remaining > 0) return;
        const hero = Roster.hero(assignment.heroId);
        if (!hero) {
          state.slots[index] = null;
          changed = true;
          return;
        }
        try {
          const result = handler(clone(assignment), hero) || {};
          if (hero.availability === "training")
            Roster.updateHero(hero.id, { availability: "available" });
          state.slots[index] = null;
          changed = true;
          events.push(
            Object.assign(
              {
                type: "building_assignment_complete",
                buildingId: key,
                slotIndex: index,
                heroId: hero.id,
                heroName: hero.name
              },
              result
            )
          );
        } catch (error) {
          assignment.status = "blocked";
          assignment.error = error.message;
          assignment.remainingCampaignPhases = 0;
          changed = true;
          if (hero.availability === "training")
            Roster.updateHero(hero.id, { availability: "available" });
        }
      });
      if (changed) persist(key, state);
      if (events.length) emit("complete", { buildingId: key, events: clone(events) });
      return events;
    } finally {
      processingBuildings.delete(key);
    }
  }
  function processAll() {
    return BUILDING_IDS.flatMap(processBuilding);
  }
  function element(tag, className, html) {
    const node = document.createElement(tag);
    node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }
  // Renders a building's three slots into `root`. Heroes arrive by drag from the roster sidecar
  // (warcraft-roster-sidecar.js loads after this module, so it is looked up at mount time).
  function mount(root, options = {}) {
    if (!root) throw new Error("Assignment slot root is required.");
    const id = buildingId(options.buildingId);
    const Sidecar = global.WarcraftRosterSidecar;
    function attempt(type, index, action) {
      try {
        const heroId = action();
        if (typeof options.onChange === "function")
          options.onChange({ type, buildingId: id, slotIndex: index, heroId });
      } catch (error) {
        if (typeof options.onError === "function") options.onError(error);
        else throw error;
      }
    }
    function button(label, className, onClick) {
      const node = element("button", className);
      node.type = "button";
      node.textContent = label;
      node.addEventListener("click", onClick);
      return node;
    }
    function dropHero(index, heroId) {
      const hero = Roster.hero(heroId);
      if (!hero) throw new Error("Unknown hero " + heroId + ".");
      const details =
        typeof options.assignmentData === "function" ? options.assignmentData(hero, index) : {};
      assign(id, index, hero.id, details);
      return hero.id;
    }
    function slotElement(assignment, index) {
      const hero = assignment ? Roster.hero(assignment.heroId) : null,
        training = Boolean(hero && assignment.status === "training");
      const slot = element(
        "article",
        "assignment-slot" + (hero ? " is-filled" : " is-empty") + (training ? " is-training" : ""),
        '<div class="assignment-slot__label"><span>SLOT ' +
          (index + 1) +
          "</span><small>" +
          (training ? "Training" : hero ? "Assigned" : "Drop hero") +
          "</small></div>"
      );
      slot.dataset.assignmentSlot = String(index);
      if (!training)
        Sidecar.dropTarget(slot, heroId => attempt("assign", index, () => dropHero(index, heroId)));
      const body = element("div", "assignment-slot__body");
      slot.appendChild(body);
      if (!hero) {
        body.innerHTML =
          '<div class="assignment-slot__empty"><strong>Empty assignment slot</strong><small>Drag a hero here from the roster.</small></div>';
        return slot;
      }
      if (typeof options.tooltip === "function")
        global.WowUITooltips.attach(slot, () => options.tooltip(hero, assignment));
      const config = element("div", "assignment-slot__config"),
        status = element("div", "assignment-slot__status"),
        actions = element("div", "assignment-slot__actions");
      body.append(
        element(
          "div",
          "assignment-slot__hero",
          typeof options.heroMarkup === "function"
            ? options.heroMarkup(hero, assignment)
            : "<strong>" + hero.name + "</strong><small>" + hero.classLabel + "</small>"
        ),
        config,
        status,
        actions
      );
      const actionOptions =
        typeof options.actionOptions === "function" ? options.actionOptions(hero, assignment) : [];
      if (!training && actionOptions.length) {
        const select = element("select", "wow-select assignment-slot__select");
        actionOptions.forEach(option => {
          const node = element("option", "");
          node.value = option.value;
          node.textContent = option.label;
          node.selected =
            String(option.value) ===
            String(assignment.selectedProfessionId || assignment.selectedAction || "");
          select.appendChild(node);
        });
        select.addEventListener("change", () =>
          attempt("selection", index, () => {
            updateSelection(
              id,
              index,
              typeof options.selectionPatch === "function"
                ? options.selectionPatch(select.value, hero, assignment)
                : { selectedAction: select.value }
            );
            return hero.id;
          })
        );
        config.appendChild(select);
      }
      const remaining = training ? remainingPhases(assignment) : null,
        descriptor =
          typeof options.describe === "function" ? options.describe(hero, assignment) : null;
      status.innerHTML =
        "<strong>" +
        (training ? "TRAINING" : (descriptor && descriptor.label) || "READY") +
        "</strong><small>" +
        (training
          ? remaining + " campaign phase" + (remaining === 1 ? "" : "s") + " remaining"
          : (descriptor && descriptor.detail) || "Ready to begin") +
        "</small>";
      if (training) {
        actions.innerHTML =
          '<span class="assignment-slot__duration">1 day assignment in progress</span>';
        return slot;
      }
      const startButton = button(
        options.startLabel || "Begin Assignment",
        "wow-button wow-button--primary",
        () =>
          attempt("start", index, () => {
            if (typeof options.start === "function") options.start(index, assignment);
            else start(id, index);
            return hero.id;
          })
      );
      const canStart =
        typeof options.canStart === "function"
          ? options.canStart(hero, assignment)
          : { enabled: true };
      startButton.disabled = canStart === false || Boolean(canStart && canStart.enabled === false);
      actions.append(
        startButton,
        button("Remove", "wow-button", () =>
          attempt("remove", index, () => {
            remove(id, index);
            return hero.id;
          })
        )
      );
      const href = typeof options.href === "function" ? options.href(hero, assignment) : null;
      if (href) {
        const link = element("a", "wow-button assignment-slot__link");
        link.href = href;
        link.textContent = options.hrefLabel || "Open";
        actions.prepend(link);
      }
      return slot;
    }
    root.setAttribute("aria-label", (options.label || id) + " assignment slots");
    root.replaceChildren(...getBuildingState(id).slots.map(slotElement));
    return root;
  }
  if (typeof global.addEventListener === "function")
    global.addEventListener("warcraft:campaign-changed", event => {
      const reason = event && event.detail && event.detail.reason;
      if (reason === "clock") processAll();
      else if (reason === "faction") sanitizeAssignments();
    });
  sanitizeAssignments();
  global.WarcraftAssignmentSlots = Object.freeze({
    SLOT_COUNT,
    DURATION_PHASES,
    getBuildingState,
    assignmentForHero,
    assignmentAt,
    assign,
    updateSelection,
    remove,
    start,
    remainingPhases,
    registerCompletionHandler,
    processBuilding,
    mount
  });
})(window);
