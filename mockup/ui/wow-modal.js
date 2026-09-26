/*
 * Shared modal: one <dialog> per page. `modal: true` blocks the page (focused tasks);
 * `modal: false` floats over the page so the roster sidecar and Embark bar stay usable
 * (building panels that accept dragged heroes).
 */
(function (global) {
  "use strict";

  let dialog = null;
  let lastFocus = null;
  let onCloseHandler = null;

  function ensureDialog() {
    if (dialog && dialog.isConnected) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "wow-modal";
    dialog.innerHTML =
      '<header class="wow-modal__head"><h2 class="wow-title wow-modal__title"></h2>' +
      '<button type="button" class="wow-button wow-modal__close" aria-label="Close">×</button>' +
      '</header><div class="wow-modal__body"></div>';
    dialog.querySelector(".wow-modal__close").addEventListener("click", close);
    dialog.addEventListener("click", event => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape" && !dialog.classList.contains("is-blocking")) close();
    });
    dialog.addEventListener("close", finish);
    document.body.appendChild(dialog);
    return dialog;
  }

  function open({ title = "", render, modal = true, onClose } = {}) {
    const node = ensureDialog();
    if (node.open) node.close();
    lastFocus = document.activeElement;
    onCloseHandler = typeof onClose === "function" ? onClose : null;
    node.classList.toggle("is-blocking", modal);
    node.querySelector(".wow-modal__title").textContent = title;
    const body = node.querySelector(".wow-modal__body");
    body.innerHTML = "";
    if (typeof render === "function") render(body);
    if (modal) node.showModal();
    else node.show();
    return body;
  }

  function close() {
    if (dialog && dialog.open) dialog.close();
  }

  function finish() {
    const handler = onCloseHandler;
    onCloseHandler = null;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
    if (handler) handler();
  }

  function isOpen() {
    return Boolean(dialog && dialog.open);
  }

  global.WowUIModal = Object.freeze({ open, close, isOpen });
})(window);
