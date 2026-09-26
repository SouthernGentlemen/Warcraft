import {
  BP,
  FPS,
  FNV_OFFSET_BASIS,
  FNV_PRIME,
  ULTIMATE_MAX,
  clampInt,
  mulBp
} from "./constants.js";
import { randomRange, rollBasisPoints } from "./rng.js";

function hashInt(hash, value) {
  let h = hash >>> 0;
  let v = value | 0;
  for (let i = 0; i < 4; i += 1) {
    h ^= v & 0xff;
    h = Math.imul(h, FNV_PRIME) >>> 0;
    v >>= 8;
  }
  return h >>> 0;
}

function hashTextFrom(hash, value) {
  let h = hash >>> 0;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h ^= code & 0xff;
    h = Math.imul(h, FNV_PRIME) >>> 0;
    h ^= (code >>> 8) & 0xff;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

export function hashText(value) {
  return hashTextFrom(FNV_OFFSET_BASIS, value);
}

export function hexHash(value) {
  return "0x" + (value >>> 0).toString(16).padStart(8, "0");
}

function initialActorState(def) {
  return {
    hp: def.derived.maxHealth,
    resource: def.resourceType === "rage" ? 0 : def.maxResource,
    resourceCarry: 0,
    autoProgress: 0,
    cooldowns: def.cooldowns.map(() => ({ remaining: 0, carry: 0 })),
    ultimate: 0,
    shield: 0,
    buffs: [],
    alive: 1
  };
}

function buffModifier(actorState, key) {
  let total = 0;
  for (const buff of actorState.buffs) {
    if (buff.key === key && buff.remaining > 0) total += buff.valueBp;
  }
  return total;
}

function parseEffect(effect) {
  const text = String(effect || "none");
  if (!text || text === "none") return null;
  const match = text.match(/^([a-z_]+):([+-]?\d+)@(\d+)$/i);
  if (!match) return null;
  return {
    key: match[1],
    valueBp: Math.trunc(Number(match[2])),
    duration: Math.max(1, Math.trunc(Number(match[3])))
  };
}

export class CombatSimulation {
  constructor({ actors, seed = 0x5eed }) {
    if (!Array.isArray(actors) || actors.length < 2) {
      throw new RangeError("CombatSimulation requires at least two actors");
    }
    this.defs = actors;
    this.state = {
      frame: 0,
      rng: seed | 0,
      roundOver: 0,
      winnerTeam: -1,
      actors: actors.map(initialActorState)
    };
  }

  getState() {
    return this.state;
  }

  step() {
    const report = { frame: this.state.frame, events: [], stateHash: 0 };
    if (this.state.roundOver) {
      report.stateHash = this.hashState();
      this.state.frame += 1;
      return report;
    }

    this.tickBuffs(report);
    this.regenerateResources(report);
    this.advanceCooldowns(report);
    this.advanceAutoProgress();

    const queue = [];
    for (let index = 0; index < this.defs.length; index += 1) {
      const actor = this.state.actors[index];
      if (!actor.alive) continue;
      const def = this.defs[index];

      if (
        def.ultimate &&
        actor.ultimate >= ULTIMATE_MAX &&
        this.hasUsefulTarget(index, def.ultimate)
      ) {
        queue.push({ actorIndex: index, source: "ultimate", slot: -1, action: def.ultimate });
      }

      const cooldownSlot = this.firstReadyCooldown(index);
      if (cooldownSlot >= 0) {
        queue.push({
          actorIndex: index,
          source: "cooldown",
          slot: cooldownSlot,
          action: def.cooldowns[cooldownSlot]
        });
      }

      if (this.autoReady(index) && this.hasUsefulTarget(index, def.auto)) {
        queue.push({ actorIndex: index, source: "auto", slot: -1, action: def.auto });
      }
    }

    for (const queued of queue) {
      if (this.state.roundOver) break;
      if (!this.state.actors[queued.actorIndex].alive) continue;
      this.resolveAction(queued, report);
      this.checkRoundEnd(report);
    }

    report.stateHash = this.hashState();
    this.state.frame += 1;
    return report;
  }

  run(maxFrames = FPS * 90) {
    const frames = [];
    while (!this.state.roundOver && this.state.frame < maxFrames) {
      frames.push(this.step());
    }

    if (!this.state.roundOver && this.state.frame >= maxFrames) {
      frames.push({
        frame: this.state.frame,
        events: [{ type: "timeout", frame: this.state.frame }],
        stateHash: this.hashState()
      });
    }

    const finalHash = this.hashState();
    const logHash = hashText(JSON.stringify(frames));
    return {
      state: this.state,
      frames,
      summary: {
        ticks: this.state.frame,
        winnerTeam: this.state.winnerTeam,
        roundOver: this.state.roundOver === 1,
        finalHash,
        logHash
      }
    };
  }

  tickBuffs(report) {
    for (let i = 0; i < this.state.actors.length; i += 1) {
      const actor = this.state.actors[i];
      if (!actor.alive) continue;
      const kept = [];
      for (const buff of actor.buffs) {
        const next = { ...buff, remaining: buff.remaining - 1 };
        if (next.remaining > 0) kept.push(next);
        else
          report.events.push({
            type: "buff_expire",
            actor: i,
            target: i,
            key: buff.key,
            source: buff.source,
            frame: this.state.frame
          });
      }
      actor.buffs = kept;
    }
  }

  regenerateResources(report) {
    for (let i = 0; i < this.defs.length; i += 1) {
      const def = this.defs[i];
      const actor = this.state.actors[i];
      if (!actor.alive || def.resourceRegenPerSecond <= 0 || actor.resource >= def.maxResource) {
        if (actor.resource >= def.maxResource) actor.resourceCarry = 0;
        continue;
      }

      actor.resourceCarry += def.resourceRegenPerSecond;
      const gain = Math.trunc(actor.resourceCarry / FPS);
      actor.resourceCarry %= FPS;
      if (gain <= 0) continue;

      const before = actor.resource;
      actor.resource = Math.min(def.maxResource, actor.resource + gain);
      const actual = actor.resource - before;
      if (actual > 0)
        report.events.push({
          type: "resource_regen",
          actor: i,
          target: i,
          resource: def.resourceType,
          amount: actual,
          value: actor.resource,
          frame: this.state.frame
        });
    }
  }

  effectiveHasteBp(index) {
    const def = this.defs[index];
    return def.derived.hasteBp + buffModifier(this.state.actors[index], "haste_bp");
  }

  advanceCooldowns(report) {
    for (let i = 0; i < this.defs.length; i += 1) {
      const actor = this.state.actors[i];
      if (!actor.alive) continue;
      const haste = this.effectiveHasteBp(i);

      for (let slot = 0; slot < actor.cooldowns.length; slot += 1) {
        const cooldown = actor.cooldowns[slot];
        if (cooldown.remaining <= 0) {
          cooldown.carry = 0;
          continue;
        }
        const before = cooldown.remaining;
        cooldown.carry += BP + haste;
        const ticks = Math.trunc(cooldown.carry / BP);
        cooldown.carry %= BP;
        cooldown.remaining = Math.max(0, cooldown.remaining - ticks);
        if (before > 0 && cooldown.remaining === 0) {
          report.events.push({
            type: "cooldown_ready",
            actor: i,
            action: this.defs[i].cooldowns[slot].name,
            frame: this.state.frame
          });
        }
      }
    }
  }

  advanceAutoProgress() {
    for (let i = 0; i < this.defs.length; i += 1) {
      const actor = this.state.actors[i];
      if (!actor.alive) continue;
      const def = this.defs[i];
      actor.autoProgress += BP + this.effectiveHasteBp(i) + def.talentHooks.autoHasteBp;
    }
  }

  autoThreshold(index) {
    return this.defs[index].auto.base_ticks * BP;
  }

  autoReady(index) {
    return this.state.actors[index].autoProgress >= this.autoThreshold(index);
  }

  autoTiming(index) {
    const def = this.defs[index];
    const actor = this.state.actors[index];
    if (!def || !actor) throw new RangeError("Unknown combat actor index.");

    const threshold = Math.max(1, this.autoThreshold(index));
    const rawProgress = Math.max(0, Math.trunc(actor.autoProgress || 0));
    const progress = Math.min(threshold, rawProgress);
    const increment = Math.max(1, BP + this.effectiveHasteBp(index) + def.talentHooks.autoHasteBp);
    const remaining = Math.max(0, threshold - progress);

    return {
      progress,
      threshold,
      progressBp: Math.min(BP, Math.trunc((progress * BP) / threshold)),
      increment,
      remainingTicks: Math.ceil(remaining / increment)
    };
  }

  effectiveCost(index, action) {
    if (!action || action.cost <= 0 || action.resource === "none" || action.resource === "ultimate")
      return 0;
    const reduction = clampInt(this.defs[index].talentHooks.resourceCostReductionBp, 0, 9_000);
    return mulBp(action.cost, BP - reduction);
  }

  canAfford(index, action) {
    const def = this.defs[index];
    if (!action || action.resource === "none") return true;
    if (action.resource === "ultimate") return this.state.actors[index].ultimate >= action.cost;
    if (action.resource !== def.resourceType) return false;
    return this.state.actors[index].resource >= this.effectiveCost(index, action);
  }

  actionState(index) {
    const def = this.defs[index];
    const actor = this.state.actors[index];
    if (!def || !actor) throw new RangeError("Unknown combat actor index.");

    const cooldowns = def.cooldowns.map((action, slot) => {
      const cooldown = actor.cooldowns[slot] || { remaining: 0 };
      const remaining = Math.max(0, Math.trunc(cooldown.remaining || 0));
      const effectiveCost = this.effectiveCost(index, action);
      const resourceBlocked = remaining === 0 && !this.canAfford(index, action);
      return {
        id: action.id,
        slot,
        remaining,
        effectiveCost,
        resourceBlocked,
        ready: Boolean(actor.alive) && remaining === 0 && !resourceBlocked
      };
    });

    const ultimateCost = def.ultimate
      ? Math.max(1, Math.trunc(def.ultimate.cost || ULTIMATE_MAX))
      : ULTIMATE_MAX;
    const ultimateCharge = Math.max(0, Math.min(ultimateCost, Math.trunc(actor.ultimate || 0)));
    const auto = this.autoTiming(index);
    return {
      auto: {
        id: def.auto.id,
        ready: Boolean(actor.alive) && auto.progress >= auto.threshold,
        progress: auto.progress,
        threshold: auto.threshold,
        progressBp: auto.progressBp,
        increment: auto.increment,
        remainingTicks: auto.remainingTicks
      },
      cooldowns,
      ultimate: def.ultimate
        ? {
            id: def.ultimate.id,
            charge: ultimateCharge,
            max: ultimateCost,
            ready: Boolean(actor.alive) && ultimateCharge >= ultimateCost
          }
        : null
    };
  }

  firstReadyCooldown(index) {
    const def = this.defs[index];
    const actor = this.state.actors[index];
    for (let slot = 0; slot < def.cooldowns.length; slot += 1) {
      const action = def.cooldowns[slot];
      if (actor.cooldowns[slot].remaining > 0) continue;
      if (!this.canAfford(index, action)) continue;
      if (!this.hasUsefulTarget(index, action)) continue;
      return slot;
    }
    return -1;
  }

  livingHostiles(index) {
    const team = this.defs[index].team;
    const out = [];
    for (let i = 0; i < this.defs.length; i += 1) {
      if (this.state.actors[i].alive && this.defs[i].team !== team) out.push(i);
    }
    return out;
  }

  livingAllies(index) {
    const team = this.defs[index].team;
    const out = [];
    for (let i = 0; i < this.defs.length; i += 1) {
      if (this.state.actors[i].alive && this.defs[i].team === team) out.push(i);
    }
    return out;
  }

  lowestHealthAlly(index) {
    const allies = this.livingAllies(index);
    let best = -1;
    for (const candidate of allies) {
      const c = this.state.actors[candidate];
      const d = this.defs[candidate];
      if (c.hp >= d.derived.maxHealth) continue;
      if (best < 0) {
        best = candidate;
        continue;
      }
      const b = this.state.actors[best];
      const bd = this.defs[best];
      const left = c.hp * bd.derived.maxHealth;
      const right = b.hp * d.derived.maxHealth;
      if (left < right || (left === right && candidate < best)) best = candidate;
    }
    return best;
  }

  weightedHostileTarget(index) {
    const hostiles = this.livingHostiles(index);
    if (!hostiles.length) return -1;
    const weights = hostiles.map(target =>
      Math.max(0, Math.trunc(this.defs[target].formationTargetWeight || 0))
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return hostiles[0];
    let roll = randomRange(this.state, 1, total);
    for (let i = 0; i < hostiles.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return hostiles[i];
    }
    return hostiles[hostiles.length - 1];
  }

  hasTargetCandidate(index, action) {
    if (action.target === "self") return this.state.actors[index].alive === 1;
    if (action.target === "enemy" || action.target === "all-enemies")
      return this.livingHostiles(index).length > 0;
    if (action.target === "lowest-ally") return this.lowestHealthAlly(index) >= 0;
    if (action.target === "all-allies") return this.livingAllies(index).length > 0;
    return false;
  }

  targetsFor(index, action) {
    if (action.target === "self") return [index];
    if (action.target === "enemy") {
      const target = this.weightedHostileTarget(index);
      return target >= 0 ? [target] : [];
    }
    if (action.target === "all-enemies") return this.livingHostiles(index);
    if (action.target === "lowest-ally") {
      const target = this.lowestHealthAlly(index);
      return target >= 0 ? [target] : [];
    }
    if (action.target === "all-allies") return this.livingAllies(index);
    return [];
  }

  hasUsefulTarget(index, action) {
    const targets = this.targetsFor(index, action);
    if (!targets.length) return false;
    if (action.kind === "heal") {
      return targets.some(
        target => this.state.actors[target].hp < this.defs[target].derived.maxHealth
      );
    }
    return true;
  }

  spendForAction(index, source, slot, action, report) {
    const actor = this.state.actors[index];
    const def = this.defs[index];

    if (source === "auto") {
      actor.autoProgress -= this.autoThreshold(index);
      return true;
    }

    if (source === "ultimate") {
      if (actor.ultimate < ULTIMATE_MAX) return false;
      actor.ultimate -= ULTIMATE_MAX;
      report.events.push({
        type: "ultimate_spend",
        actor: index,
        action: action.name,
        amount: ULTIMATE_MAX,
        value: actor.ultimate,
        frame: this.state.frame
      });
      return true;
    }

    if (source === "cooldown") {
      const cost = this.effectiveCost(index, action);
      if (action.resource !== "none") {
        if (action.resource !== def.resourceType || actor.resource < cost) return false;
        actor.resource -= cost;
        report.events.push({
          type: "resource_spend",
          actor: index,
          action: action.name,
          resource: def.resourceType,
          amount: cost,
          value: actor.resource,
          frame: this.state.frame
        });
      }
      actor.cooldowns[slot].remaining = action.cooldown_ticks;
      actor.cooldowns[slot].carry = 0;
      report.events.push({
        type: "cooldown_start",
        actor: index,
        action: action.name,
        ticks: action.cooldown_ticks,
        frame: this.state.frame
      });
      return true;
    }

    return false;
  }

  powerStat(index, school) {
    const def = this.defs[index];
    const actor = this.state.actors[index];
    let base = 0;
    let key = "";

    if (school === "physical") {
      base = def.derived.physicalPower;
      key = "physical_power_bp";
    } else if (school === "spell") {
      base = def.derived.spellPower;
      key = "spell_power_bp";
    } else if (school === "healing") {
      base = def.derived.healingPower;
      key = "healing_power_bp";
    }

    const bonus = buffModifier(actor, key) + buffModifier(actor, "all_power_bp");
    return mulBp(base, BP + bonus);
  }

  outputAmount(index, action, source) {
    let amount =
      Math.trunc(action.power) + mulBp(this.powerStat(index, action.school), action.coefficient_bp);
    amount = mulBp(amount, BP + this.defs[index].derived.masteryBp);
    if (source === "auto") amount = mulBp(amount, BP + this.defs[index].talentHooks.autoOutputBp);
    return Math.max(0, amount);
  }

  resolveAction(queued, report) {
    const { actorIndex, source, slot, action } = queued;
    const actor = this.state.actors[actorIndex];
    if (!actor.alive || !this.canAfford(actorIndex, action)) return;

    const targets = this.targetsFor(actorIndex, action);
    if (!targets.length || (action.kind === "heal" && !this.hasUsefulTarget(actorIndex, action)))
      return;
    if (!this.spendForAction(actorIndex, source, slot, action, report)) return;

    report.events.push({
      type: "action_start",
      actor: actorIndex,
      action: action.name,
      source,
      targets: [...targets],
      targetContext: targets.map(target => ({
        actor: target,
        group: this.defs[target].formationGroup || null,
        slot: this.defs[target].formationSlot || null,
        weight: Math.max(0, Math.trunc(this.defs[target].formationTargetWeight || 0))
      })),
      frame: this.state.frame
    });

    let successful = false;
    for (const targetIndex of targets) {
      if (!this.state.actors[targetIndex].alive) continue;
      const result = this.resolveAgainstTarget(actorIndex, targetIndex, action, source, report);
      successful = successful || result;
    }

    if (successful && source !== "ultimate") {
      this.addUltimate(actorIndex, source === "auto" ? 1_000 : 2_000, action.name, report);
      if (source === "auto" && this.defs[actorIndex].resourceType === "rage") {
        this.addResource(actorIndex, 10, "auto-rage", report);
      }
    }
  }

  resolveAgainstTarget(actorIndex, targetIndex, action, source, report) {
    if (action.canMiss) {
      const hit = rollBasisPoints(this.state, this.defs[actorIndex].derived.hitBp);
      if (!hit) {
        report.events.push({
          type: "miss",
          actor: actorIndex,
          target: targetIndex,
          action: action.name,
          frame: this.state.frame
        });
        return false;
      }
      report.events.push({
        type: "hit",
        actor: actorIndex,
        target: targetIndex,
        action: action.name,
        frame: this.state.frame
      });
    }

    let amount = this.outputAmount(actorIndex, action, source);
    let critical = false;
    if (action.canCrit) {
      const critChance = clampInt(
        this.defs[actorIndex].derived.critBp +
          (source === "auto" ? this.defs[actorIndex].talentHooks.autoCritBp : 0),
        0,
        10_000
      );
      critical = rollBasisPoints(this.state, critChance);
      if (critical) {
        amount = mulBp(amount, 15_000);
        report.events.push({
          type: "critical",
          actor: actorIndex,
          target: targetIndex,
          action: action.name,
          frame: this.state.frame
        });
      }
    }

    if (action.kind === "damage") {
      this.applyDamage(actorIndex, targetIndex, action, amount, critical, report);
      return true;
    }
    if (action.kind === "heal") {
      this.applyHeal(actorIndex, targetIndex, action, amount, critical, report);
      return true;
    }
    if (action.kind === "shield") {
      this.applyShield(actorIndex, targetIndex, action, amount, report);
      return true;
    }
    if (action.kind === "buff") {
      return this.applyBuff(actorIndex, targetIndex, action, report);
    }
    return false;
  }

  applyDamage(actorIndex, targetIndex, action, rawAmount, critical, report) {
    const target = this.state.actors[targetIndex];
    const reduction = clampInt(buffModifier(target, "damage_reduction_bp"), 0, 8_000);
    let amount = mulBp(rawAmount, BP - reduction);
    let absorbed = 0;

    if (target.shield > 0 && amount > 0) {
      absorbed = Math.min(target.shield, amount);
      target.shield -= absorbed;
      amount -= absorbed;
    }

    const hpBefore = target.hp;
    target.hp = Math.max(0, target.hp - amount);
    const hpDamage = hpBefore - target.hp;

    report.events.push({
      type: "damage",
      actor: actorIndex,
      target: targetIndex,
      action: action.name,
      amount: hpDamage,
      raw: rawAmount,
      absorbed,
      critical,
      hp: target.hp,
      frame: this.state.frame
    });

    if (hpDamage > 0) {
      this.addUltimate(targetIndex, 300, "damage-taken", report);
      if (this.defs[targetIndex].resourceType === "rage")
        this.addResource(targetIndex, 5, "damage-rage", report);
    }

    if (target.hp <= 0 && target.alive) {
      target.alive = 0;
      report.events.push({
        type: "death",
        actor: targetIndex,
        target: targetIndex,
        sourceActor: actorIndex,
        action: action.name,
        frame: this.state.frame
      });
    }
  }

  applyHeal(actorIndex, targetIndex, action, rawAmount, critical, report) {
    const target = this.state.actors[targetIndex];
    const maxHealth = this.defs[targetIndex].derived.maxHealth;
    const before = target.hp;
    target.hp = Math.min(maxHealth, target.hp + rawAmount);
    const actual = target.hp - before;
    const overheal = rawAmount - actual;

    report.events.push({
      type: "heal",
      actor: actorIndex,
      target: targetIndex,
      action: action.name,
      amount: actual,
      raw: rawAmount,
      overheal,
      critical,
      hp: target.hp,
      frame: this.state.frame
    });
  }

  applyShield(actorIndex, targetIndex, action, amount, report) {
    const target = this.state.actors[targetIndex];
    target.shield += amount;
    report.events.push({
      type: "shield",
      actor: actorIndex,
      target: targetIndex,
      action: action.name,
      amount,
      value: target.shield,
      frame: this.state.frame
    });
  }

  applyBuff(actorIndex, targetIndex, action, report) {
    const effect = parseEffect(action.effect);
    if (!effect) {
      report.events.push({
        type: "buff_unimplemented",
        actor: actorIndex,
        target: targetIndex,
        action: action.name,
        effect: action.effect,
        frame: this.state.frame
      });
      return true;
    }

    const target = this.state.actors[targetIndex];
    target.buffs = target.buffs.filter(
      buff => !(buff.key === effect.key && buff.source === actorIndex)
    );
    target.buffs.push({
      key: effect.key,
      valueBp: effect.valueBp,
      remaining: effect.duration,
      source: actorIndex
    });

    report.events.push({
      type: "buff_apply",
      actor: actorIndex,
      target: targetIndex,
      action: action.name,
      key: effect.key,
      valueBp: effect.valueBp,
      ticks: effect.duration,
      frame: this.state.frame
    });
    return true;
  }

  addUltimate(index, amount, reason, report) {
    if (!this.state.actors[index].alive || !this.defs[index].ultimate || amount <= 0) return;
    const actor = this.state.actors[index];
    const before = actor.ultimate;
    actor.ultimate = Math.min(ULTIMATE_MAX, actor.ultimate + amount);
    const actual = actor.ultimate - before;
    if (actual <= 0) return;
    report.events.push({
      type: "ultimate_gain",
      actor: index,
      target: index,
      reason,
      amount: actual,
      value: actor.ultimate,
      frame: this.state.frame
    });
    if (before < ULTIMATE_MAX && actor.ultimate >= ULTIMATE_MAX) {
      report.events.push({ type: "ultimate_ready", actor: index, frame: this.state.frame });
    }
  }

  addResource(index, amount, reason, report) {
    const def = this.defs[index];
    if (def.maxResource <= 0 || amount <= 0) return;
    const actor = this.state.actors[index];
    const before = actor.resource;
    actor.resource = Math.min(def.maxResource, actor.resource + amount);
    const actual = actor.resource - before;
    if (actual <= 0) return;
    report.events.push({
      type: "resource_gain",
      actor: index,
      target: index,
      resource: def.resourceType,
      reason,
      amount: actual,
      value: actor.resource,
      frame: this.state.frame
    });
  }

  checkRoundEnd(report) {
    const livingTeams = new Set();
    for (let i = 0; i < this.defs.length; i += 1) {
      if (this.state.actors[i].alive) livingTeams.add(this.defs[i].team);
    }
    if (livingTeams.size > 1) return;

    this.state.roundOver = 1;
    this.state.winnerTeam = livingTeams.size === 1 ? [...livingTeams][0] : -1;
    report.events.push({
      type: "round_end",
      winnerTeam: this.state.winnerTeam,
      frame: this.state.frame
    });
  }

  hashState() {
    let hash = FNV_OFFSET_BASIS;
    hash = hashInt(hash, this.state.frame);
    hash = hashInt(hash, this.state.rng);
    hash = hashInt(hash, this.state.roundOver);
    hash = hashInt(hash, this.state.winnerTeam);

    for (const actor of this.state.actors) {
      hash = hashInt(hash, actor.hp);
      hash = hashInt(hash, actor.resource);
      hash = hashInt(hash, actor.resourceCarry);
      hash = hashInt(hash, actor.autoProgress);
      hash = hashInt(hash, actor.ultimate);
      hash = hashInt(hash, actor.shield);
      hash = hashInt(hash, actor.alive);
      for (const cooldown of actor.cooldowns) {
        hash = hashInt(hash, cooldown.remaining);
        hash = hashInt(hash, cooldown.carry);
      }
      for (const buff of actor.buffs) {
        hash = hashTextFrom(hash, buff.key);
        hash = hashInt(hash, buff.valueBp);
        hash = hashInt(hash, buff.remaining);
        hash = hashInt(hash, buff.source);
      }
    }

    return hash >>> 0;
  }
}
