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
    // Browsers fire `close` a task later; a dialog reopened by then has already finished.
    dialog.addEventListener("close", () => {
      if (!dialog.open) finish(true);
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  // Opening while open swaps the content: the previous onClose runs, and focus later returns
  // to whatever opened the new content (or the original opener if focus was inside).
  function open({ title = "", render, modal = true, onClose } = {}) {
    const node = ensureDialog();
    const active = document.activeElement;
    const opener = node.open && node.contains(active) ? lastFocus : active;
    if (node.open) {
      finish(false);
      node.close();
    }
    lastFocus = opener;
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

  function finish(restoreFocus) {
    const handler = onCloseHandler;
    onCloseHandler = null;
    if (restoreFocus && lastFocus && typeof lastFocus.focus === "function")
      lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    if (handler) handler();
  }

  function isOpen() {
    return Boolean(dialog && dialog.open);
  }

  // Blocking dialogs close on Escape natively; a floating one closes wherever focus is.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isOpen() && !dialog.classList.contains("is-blocking")) close();
  });

  global.WowUIModal = Object.freeze({ open, close, isOpen });
})(window);
