(function (global) {
  "use strict";
  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function actorHealth(actor) {
    const max = Math.max(
      0,
      finite(
        actor && actor.definition && actor.definition.derived && actor.definition.derived.maxHealth
      )
    );
    const alive = Boolean(actor && actor.state && actor.state.alive);
    const raw = finite(actor && actor.state && actor.state.hp);
    const current = alive ? clamp(raw, 0, max) : 0;
    const percent = max > 0 ? clamp((current / max) * 100, 0, 100) : 0;
    return { current, max, percent, alive };
  }
  function widthPercent(percent) {
    const value = clamp(finite(percent), 0, 100);
    return Math.round(value * 1000) / 1000 + "%";
  }
  function actorWidth(actor) {
    return widthPercent(actorHealth(actor).percent);
  }
  function teamTotals(snapshot, team) {
    return (snapshot && Array.isArray(snapshot.actors) ? snapshot.actors : [])
      .filter(actor => actor && actor.definition && actor.definition.team === team)
      .reduce(
        (sum, actor) => {
          const health = actorHealth(actor);
          sum.current += health.current;
          sum.max += health.max;
          sum.total += 1;
          if (health.alive) sum.alive += 1;
          return sum;
        },
        { current: 0, max: 0, alive: 0, total: 0 }
      );
  }
  function teamPercent(totals) {
    const max = Math.max(0, finite(totals && totals.max));
    const current = clamp(finite(totals && totals.current), 0, max);
    return max > 0 ? clamp((current / max) * 100, 0, 100) : 0;
  }
  function teamWidth(totals) {
    return widthPercent(teamPercent(totals));
  }
  global.BattleHealthBars = Object.freeze({
    actorHealth,
    widthPercent,
    actorWidth,
    teamTotals,
    teamPercent,
    teamWidth
  });
})(window);
