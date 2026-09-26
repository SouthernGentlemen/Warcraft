(function (global) {
  "use strict";
  const Campaign = global.WarcraftCampaign;
  if (!Campaign) throw new Error("WarcraftCampaign must load before WarcraftCampaignClock.");
  function model(faction) {
    const clock = Campaign.getClock(faction);
    const phase = clock.phase === "night" ? "night" : "day";
    return {
      day: Math.max(1, Number(clock.day) || 1),
      phase,
      phaseLabel: phase === "night" ? "Night" : "Day",
      nextPhase: Campaign.nextClockPhase(clock),
      phaseAdvances: Math.max(0, Number(clock.phaseAdvances) || 0),
      label:
        "Day " + Math.max(1, Number(clock.day) || 1) + " · " + (phase === "night" ? "Night" : "Day")
    };
  }
  function render(root, faction) {
    if (!root) return null;
    const value = model(faction);
    root.classList.remove("is-day", "is-night");
    root.classList.add(value.phase === "night" ? "is-night" : "is-day");
    root.dataset.campaignPhase = value.phase;
    root.setAttribute("aria-label", "Campaign time, day " + value.day + ", " + value.phaseLabel);
    root.innerHTML =
      '<span class="campaign-clock__orb" aria-hidden="true"></span><span class="campaign-clock__copy"><small>Campaign Time</small><strong>' +
      value.label +
      "</strong></span>";
    return value;
  }
  function hydrate(root) {
    const scope = root && typeof root.querySelectorAll === "function" ? root : global.document;
    if (!scope) return [];
    return Array.from(scope.querySelectorAll("[data-campaign-clock]")).map(node =>
      render(node, node.dataset.campaignFaction || undefined)
    );
  }
  if (typeof global.addEventListener === "function")
    global.addEventListener("warcraft:campaign-changed", event => {
      const reason = event && event.detail && event.detail.reason;
      if (["clock", "faction", "reset"].includes(reason)) hydrate(global.document);
    });
  global.WarcraftCampaignClock = Object.freeze({ render, hydrate });
})(window);
