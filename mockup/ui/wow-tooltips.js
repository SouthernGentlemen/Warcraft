/*
 * Shared Warcraft-style tooltip controller.
 * Supports pointer and keyboard focus anchoring, structured content, comparison,
 * semantic icons, and viewport collision/clamping.
 */
(function (global) {
  "use strict";

  const TOOLTIP_ID = "wow-shared-tooltip";
  const PAD = 8;
  const GAP = 14;
  let layer = null;
  let group = null;
  let activeTarget = null;
  let activeBinding = null;
  let pointer = null;
  let uid = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;

    layer = document.createElement("div");
    layer.className = "wow-tooltip-layer";
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");

    group = document.createElement("div");
    group.className = "wow-tooltip-group";
    layer.appendChild(group);
    document.body.appendChild(layer);
    return layer;
  }

  function normalizeRows(value) {
    if (value == null || value === "") return [];
    if (Array.isArray(value))
      return value.filter(function (row) {
        return row != null && row !== "";
      });
    return [value];
  }

  function iconUrl(icon) {
    if (!icon) return "";
    if (icon.url) return icon.url;
    const Icons = global.WowUIIcons;
    if (!Icons) return "";
    if (icon.slug) return Icons.iconUrl(icon.slug);
    if (icon.category && icon.key)
      return Icons.resolve(icon.category, icon.key, icon.context || {});
    return "";
  }

  function iconClass(icon) {
    if (!icon) return "";
    const classes = ["wow-tooltip__icon", "wow-icon-frame", "wow-icon-frame--sm"];
    if (icon.classId) classes.push("wow-icon-frame--class-" + escapeHtml(icon.classId));
    if (icon.quality) classes.push("wow-icon-frame--quality-" + escapeHtml(icon.quality));
    if (icon.className) classes.push(escapeHtml(icon.className));
    return classes.join(" ");
  }

  function renderLineRows(rows, className) {
    return normalizeRows(rows)
      .map(function (row) {
        if (typeof row === "object") {
          const label = row.label ? "<span>" + escapeHtml(row.label) + "</span>" : "";
          const value = row.value != null ? "<strong>" + escapeHtml(row.value) + "</strong>" : "";
          const tone = row.tone ? " is-" + escapeHtml(row.tone) : "";
          return '<div class="' + className + tone + '">' + label + value + "</div>";
        }
        return '<div class="' + className + '">' + escapeHtml(row) + "</div>";
      })
      .join("");
  }

  function renderPanel(model, comparison) {
    model = model || {};
    const variant = String(model.variant || "generic")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    const quality = model.quality ? " wow-tooltip--quality-" + escapeHtml(model.quality) : "";
    const classId = model.classId ? " wow-tooltip--class-" + escapeHtml(model.classId) : "";
    const badge = model.badge || (comparison ? "Equipped" : "");
    const icon = model.icon;
    const source = iconUrl(icon);
    const headerIcon = source
      ? '<span class="' + iconClass(icon) + '"><img src="' + escapeHtml(source) + '" alt=""></span>'
      : "";

    const requirements = normalizeRows(model.requirements);
    const stats = normalizeRows(model.stats);
    const metadata = normalizeRows(model.meta || model.metadata);
    const locked = normalizeRows(model.locked || model.unmet);
    const description = model.description || model.primary || "";

    return (
      '<section class="wow-tooltip-card wow-tooltip--' +
      escapeHtml(variant) +
      quality +
      classId +
      '"' +
      (comparison ? ' data-wow-tooltip-comparison="true"' : ' data-wow-tooltip-primary="true"') +
      ">" +
      (badge ? '<div class="wow-tooltip__badge">' + escapeHtml(badge) + "</div>" : "") +
      '<header class="wow-tooltip__header">' +
      headerIcon +
      '<div class="wow-tooltip__heading">' +
      (model.title
        ? '<strong class="wow-tooltip__title">' + escapeHtml(model.title) + "</strong>"
        : "") +
      (model.type ? '<span class="wow-tooltip__type">' + escapeHtml(model.type) + "</span>" : "") +
      "</div>" +
      "</header>" +
      (requirements.length
        ? '<div class="wow-tooltip__requirements">' +
          renderLineRows(requirements, "wow-tooltip__requirement") +
          "</div>"
        : "") +
      (description
        ? '<div class="wow-tooltip__description">' + escapeHtml(description) + "</div>"
        : "") +
      (stats.length
        ? '<div class="wow-tooltip__stats">' + renderLineRows(stats, "wow-tooltip__stat") + "</div>"
        : "") +
      (metadata.length
        ? '<div class="wow-tooltip__meta">' +
          renderLineRows(metadata, "wow-tooltip__meta-row") +
          "</div>"
        : "") +
      (locked.length
        ? '<div class="wow-tooltip__locked">' +
          renderLineRows(locked, "wow-tooltip__locked-row") +
          "</div>"
        : "") +
      "</section>"
    );
  }

  function bindRenderedIcons() {
    if (!global.WowUIIcons || !group) return;
    group.querySelectorAll("img").forEach(global.WowUIIcons.bindFallback);
  }

  function position() {
    if (!layer || layer.hidden || !group || !activeTarget) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const groupRect = group.getBoundingClientRect();
    const targetRect = activeTarget.getBoundingClientRect();
    const cursorMode = activeBinding && activeBinding.anchor !== "target" && pointer;

    let left;
    let top;

    if (cursorMode) {
      left = pointer.x + GAP;
      top = pointer.y + GAP;
      if (left + groupRect.width > viewportWidth - PAD) left = pointer.x - groupRect.width - GAP;
      if (top + groupRect.height > viewportHeight - PAD) top = pointer.y - groupRect.height - GAP;
    } else {
      left = targetRect.right + GAP;
      top = targetRect.top;
      if (left + groupRect.width > viewportWidth - PAD)
        left = targetRect.left - groupRect.width - GAP;
      if (top + groupRect.height > viewportHeight - PAD)
        top = viewportHeight - groupRect.height - PAD;
    }

    const maxLeft = Math.max(PAD, viewportWidth - groupRect.width - PAD);
    const maxTop = Math.max(PAD, viewportHeight - groupRect.height - PAD);
    left = Math.min(Math.max(PAD, left), maxLeft);
    top = Math.min(Math.max(PAD, top), maxTop);

    group.style.left = Math.round(left) + "px";
    group.style.top = Math.round(top) + "px";
  }

  function clearDescription(target) {
    if (!target) return;
    const describedBy = target.getAttribute("aria-describedby");
    if (describedBy === TOOLTIP_ID) target.removeAttribute("aria-describedby");
  }

  function hide(target) {
    if (target && target !== activeTarget) return;
    ensureLayer();
    clearDescription(activeTarget);
    activeTarget = null;
    activeBinding = null;
    pointer = null;
    group.innerHTML = "";
    group.style.left = "";
    group.style.top = "";
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
  }

  function resolveModel(binding) {
    if (!binding) return null;
    const raw =
      typeof binding.provider === "function" ? binding.provider(binding.element) : binding.provider;
    if (!raw) return null;
    return raw;
  }

  function show(binding, event) {
    const model = resolveModel(binding);
    if (!model) {
      hide(binding.element);
      return;
    }

    ensureLayer();
    activeTarget = binding.element;
    activeBinding = binding;
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      pointer = { x: event.clientX, y: event.clientY };
    } else {
      pointer = null;
    }

    const comparison = model.comparison || null;
    group.innerHTML = renderPanel(model, false) + (comparison ? renderPanel(comparison, true) : "");
    group.id = TOOLTIP_ID;
    group.setAttribute("role", "tooltip");
    group.classList.toggle("has-comparison", Boolean(comparison));
    layer.hidden = false;
    layer.setAttribute("aria-hidden", "false");
    binding.element.setAttribute("aria-describedby", TOOLTIP_ID);
    bindRenderedIcons();
    position();
  }

  function attach(element, provider, options) {
    if (!element) return function () {};
    const binding = {
      id: ++uid,
      element: element,
      provider: provider,
      anchor: options && options.anchor === "target" ? "target" : "cursor",
      hovered: false,
      focused: false
    };

    function enter(event) {
      binding.hovered = true;
      show(binding, event);
    }

    function move(event) {
      if (!binding.hovered || activeTarget !== element) return;
      pointer = { x: event.clientX, y: event.clientY };
      position();
    }

    function leave() {
      binding.hovered = false;
      if (!binding.focused) hide(element);
    }

    function focus() {
      binding.focused = true;
      pointer = null;
      show(binding, null);
    }

    function blur() {
      binding.focused = false;
      if (!binding.hovered) hide(element);
    }

    element.addEventListener("mouseenter", enter);
    element.addEventListener("mousemove", move);
    element.addEventListener("mouseleave", leave);
    element.addEventListener("focus", focus);
    element.addEventListener("blur", blur);

    return function cleanup() {
      element.removeEventListener("mouseenter", enter);
      element.removeEventListener("mousemove", move);
      element.removeEventListener("mouseleave", leave);
      element.removeEventListener("focus", focus);
      element.removeEventListener("blur", blur);
      if (activeTarget === element) hide(element);
    };
  }

  function dataModel(element) {
    return {
      variant: element.dataset.wowTooltipVariant || "generic",
      title: element.dataset.wowTooltipTitle || element.dataset.wowTooltip || "",
      type: element.dataset.wowTooltipType || "",
      description: element.dataset.wowTooltipDescription || "",
      requirements: element.dataset.wowTooltipRequirements || "",
      meta: element.dataset.wowTooltipMeta || "",
      locked: element.dataset.wowTooltipLocked || "",
      icon:
        element.dataset.wowTooltipIconCategory && element.dataset.wowTooltipIconKey
          ? {
              category: element.dataset.wowTooltipIconCategory,
              key: element.dataset.wowTooltipIconKey
            }
          : null
    };
  }

  function hydrate(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-wow-tooltip]").forEach(function (element) {
      if (element.dataset.wowTooltipBound === "true") return;
      element.dataset.wowTooltipBound = "true";
      attach(
        element,
        function () {
          return dataModel(element);
        },
        {
          anchor: element.dataset.wowTooltipAnchor === "target" ? "target" : "cursor"
        }
      );
    });
  }

  function refresh() {
    if (!activeBinding) return;
    show(activeBinding, null);
  }

  window.addEventListener("resize", position, { passive: true });
  window.addEventListener("scroll", position, { passive: true, capture: true });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hide();
  });

  global.WowUITooltips = Object.freeze({
    attach: attach,
    hydrate: hydrate,
    show: function (element, model, event, options) {
      show(
        {
          element: element,
          provider: model,
          anchor: options && options.anchor === "target" ? "target" : "cursor"
        },
        event || null
      );
    },
    hide: hide,
    refresh: refresh,
    position: position
  });
})(window);
