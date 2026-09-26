/*
 * Shared persistent navigation enhancer for Warcraft mockups.
 * Links remain ordinary static HTML anchors; this layer adds semantic icons,
 * shared tooltips, and active-screen state.
 */
(function (global) {
  "use strict";
  const DESTINATIONS = Object.freeze({
    heroes: Object.freeze({
      label: "Heroes",
      title: "Heroes / Race Selector",
      description:
        "Review factions, races, body presentation, racial talents, and class availability.",
      icon: Object.freeze({ category: "race", key: "human" })
    }),
    profession: Object.freeze({
      label: "Professions",
      title: "Artisans Guild Professions",
      description: "Open any profession; every profession mirrors the shared Artisans Guild level.",
      icon: Object.freeze({ category: "building", key: "artisans-guild" })
    }),
    inventory: Object.freeze({
      label: "Inventory",
      title: "Global Inventory",
      description:
        "Browse owned equipment across the roster without duplicating hero equipment state.",
      icon: Object.freeze({ category: "equipment-slot", key: "chest" })
    }),
    journal: Object.freeze({
      label: "Quest Journal",
      title: "Quest Journal",
      description:
        "Review available, active, and completed Quest Board assignments from authoritative roster state.",
      icon: Object.freeze({ category: "quest", key: "journal" })
    }),
    endgame: Object.freeze({
      label: "Raids & Sieges",
      title: "Raids & Sieges",
      description: "Launch saved ten-player Raid and twenty-player Siege formations.",
      icon: Object.freeze({ category: "battle", key: "combat" })
    }),
    battle: Object.freeze({
      label: "Battle",
      title: "Battle Mockup",
      description:
        "Review the six-on-six battleground presentation and interactive combat controls.",
      icon: Object.freeze({ category: "battle", key: "combat" })
    }),
    base: Object.freeze({
      label: "Base",
      title: "Base Management",
      description:
        "Review the persistent stronghold, buildings, professions, resources, and upgrade hooks.",
      icon: Object.freeze({ category: "building", key: "keep" })
    })
  });

  function tooltipModel(destination) {
    return {
      variant: "control",
      title: destination.title,
      type: "Mockup destination",
      icon: destination.icon,
      description: destination.description
    };
  }

  function ensureIcon(element, destination, launcher) {
    const Icons = global.WowUIIcons;
    if (!Icons) return;

    let frame = element.querySelector(
      launcher ? ".wow-launcher-entry__icon" : ".wow-game-nav__icon"
    );
    if (!frame) {
      frame = document.createElement("span");
      frame.className = launcher
        ? "wow-launcher-entry__icon wow-icon-frame wow-icon-frame--md"
        : "wow-game-nav__icon wow-icon-frame wow-icon-frame--xs";
      element.prepend(frame);
    }

    let image = frame.querySelector("img");
    if (!image) {
      image = document.createElement("img");
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      frame.appendChild(image);
    }

    image.src = Icons.resolve(
      destination.icon.category,
      destination.icon.key,
      destination.icon.context || {}
    );
    Icons.bindFallback(image);
  }

  function enhanceDestination(element, key, launcher) {
    const destination = DESTINATIONS[key];
    if (!destination || element.dataset.wowNavEnhanced === "true") return;
    element.dataset.wowNavEnhanced = "true";

    ensureIcon(element, destination, launcher);

    if (!launcher) {
      let label = element.querySelector(".wow-game-nav__label");
      if (!label) {
        const existing = element.textContent.trim() || destination.label;
        Array.from(element.childNodes).forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        label = document.createElement("span");
        label.className = "wow-game-nav__label";
        label.textContent = existing;
        element.appendChild(label);
      }
    }

    if (global.WowUITooltips) {
      global.WowUITooltips.attach(
        element,
        function () {
          return tooltipModel(destination);
        },
        { anchor: "target" }
      );
    }
  }

  function ensureFactionSelector(shell) {
    const Campaign = global.WarcraftCampaign;
    if (!Campaign) return;
    let action = shell.querySelector(".wow-game-shell__action");
    if (!action) {
      action = document.createElement("div");
      action.className = "wow-game-shell__action";
      shell.appendChild(action);
    }
    let selector = action.querySelector(".wow-faction-switcher");
    if (!selector) {
      selector = document.createElement("div");
      selector.className = "wow-faction-switcher";
      selector.setAttribute("role", "group");
      selector.setAttribute("aria-label", "Active campaign faction");
      Campaign.FACTIONS.forEach(function (faction) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "wow-faction-switcher__button";
        button.dataset.faction = faction;
        button.setAttribute(
          "aria-label",
          "Switch to " + (faction === "horde" ? "Horde" : "Alliance") + " campaign"
        );
        const icon = global.WowUIIcons
          ? '<span class="wow-faction-switcher__crest wow-icon-frame wow-icon-frame--xs"><img src="' +
            global.WowUIIcons.resolve("faction", faction) +
            '" alt=""></span>'
          : "";
        button.innerHTML =
          icon +
          '<span class="wow-faction-switcher__label">' +
          (faction === "horde" ? "Horde" : "Alliance") +
          "</span>";
        const image = button.querySelector("img");
        if (image && global.WowUIIcons) global.WowUIIcons.bindFallback(image);
        button.addEventListener("click", function () {
          Campaign.setActiveFaction(faction);
        });
        selector.appendChild(button);
      });
      action.prepend(selector);
    }
    const active = Campaign.getActiveFaction();
    selector.querySelectorAll("[data-faction]").forEach(function (button) {
      const selected = button.dataset.faction === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    shell.dataset.activeFaction = active;
  }

  function hydrate(root) {
    const scope = root || document;

    scope.querySelectorAll(".wow-game-shell").forEach(function (shell) {
      const activeKey = shell.dataset.wowNavActive || "";
      const selectorSuppressed =
        activeKey === "battle" ||
        activeKey === "dev-inspection" ||
        document.body.classList.contains("race-page");
      if (!selectorSuppressed) ensureFactionSelector(shell);
      const brand = shell.querySelector(".wow-game-shell__brand");
      if (brand) {
        const activeHome = activeKey === "menu";
        brand.classList.toggle("is-active", activeHome);
        if (activeHome) brand.setAttribute("aria-current", "page");
        else brand.removeAttribute("aria-current");
      }

      shell.querySelectorAll(".wow-game-nav__link[data-wow-nav-key]").forEach(function (link) {
        const key = link.dataset.wowNavKey;
        const isActive = key === activeKey;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
        enhanceDestination(link, key, false);
      });
    });

    scope.querySelectorAll(".wow-launcher-entry[data-wow-nav-key]").forEach(function (entry) {
      enhanceDestination(entry, entry.dataset.wowNavKey, true);
    });
  }

  global.WowUINavigation = Object.freeze({
    destinations: DESTINATIONS,
    hydrate: hydrate
  });

  if (typeof global.addEventListener === "function") {
    global.addEventListener("warcraft:campaign-changed", function (event) {
      if (event && event.detail && event.detail.reason === "faction") hydrate(document);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        hydrate(document);
      },
      { once: true }
    );
  } else {
    hydrate(document);
  }
})(window);
