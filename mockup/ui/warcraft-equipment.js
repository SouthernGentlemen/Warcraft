(function (global) {
  "use strict";
  const Rules = global.WarcraftEquipmentRules;
  if (!Rules) throw new Error("WarcraftEquipmentRules must load before WarcraftEquipment.");
  function enrich(item) {
    return Object.assign({}, item, {
      icon: global.WowUIIcons.resolveSlug("item-family", item.family, { slot: item.slot })
    });
  }
  function build() {
    return Rules.buildDefinitions().map(enrich);
  }
  function owned() {
    return build();
  }
  global.WarcraftEquipment = Object.freeze({
    SLOTS: Rules.SLOTS,
    build,
    owned,
    canEquip: Rules.canEquip,
    modifiers: Rules.modifiers,
    ARMOR_ACCESS: Rules.ARMOR_ACCESS
  });
})(window);
