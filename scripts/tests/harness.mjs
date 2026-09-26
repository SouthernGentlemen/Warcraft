// Shared test harness: repo file helpers plus a minimal browser-like VM that loads the
// mockup's classic scripts exactly as the HTML pages do (window globals, localStorage,
// CustomEvent dispatch, fetch served from the repo filesystem).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const STORAGE_KEY = "warcraft.mockup.campaigns.v2";
const ORIGIN = "http://mockup.test";

export const readText = rel => readFileSync(join(ROOT, rel), "utf8");
export const readJson = rel => JSON.parse(readText(rel));
export const exists = rel => existsSync(join(ROOT, rel));
/** Cross-realm values (VM arrays/objects) -> plain JSON values for deepStrictEqual. */
export const plain = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

export function listFiles(dir, test = () => true) {
  const out = [];
  const walk = abs => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const next = join(abs, entry.name);
      if (entry.isDirectory()) walk(next);
      else if (test(entry.name)) out.push(relative(ROOT, next).split("\\").join("/"));
    }
  };
  walk(join(ROOT, dir));
  return out.sort();
}

/** Page names under mockup/ (without .html). */
export const PAGES = listFiles("mockup", name => name.endsWith(".html"))
  .filter(rel => rel.split("/").length === 2)
  .map(rel => rel.slice("mockup/".length, -".html".length));

/** Local <script src> paths of a page, in document order, as repo-relative paths. */
export function pageScripts(page) {
  const html = readText("mockup/" + page + ".html");
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match =>
    join("mockup", match[1]).split("\\").join("/")
  );
}

/** Resolves a URL the way the browser would for a page served at /mockup/<page>.html. */
export function repoPathForUrl(url, page = "base") {
  const target = new URL(String(url), ORIGIN + "/mockup/" + page + ".html");
  return decodeURIComponent(target.pathname).replace(/^\//, "");
}

export function createFetch(page = "base", log = []) {
  return async function fetch(url) {
    const rel = repoPathForUrl(url, page);
    const found = rel && exists(rel) && !rel.endsWith("/");
    log.push({ url: String(url), path: rel, ok: Boolean(found) });
    const body = found ? readText(rel) : "";
    return {
      ok: Boolean(found),
      status: found ? 200 : 404,
      url: ORIGIN + "/" + rel,
      json: async () => JSON.parse(body),
      text: async () => body
    };
  };
}

export class MemoryStorage {
  constructor(entries) {
    this.map = new Map(entries instanceof Map ? entries : Object.entries(entries || {}));
  }
  get length() {
    return this.map.size;
  }
  key(index) {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  clear() {
    this.map.clear();
  }
  snapshot(key = STORAGE_KEY) {
    const raw = this.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  }
}

// ---------------------------------------------------------------------------------------
// DOM stub: every element accepts any property write/method call so page scripts can
// render into it; ids are memoized so text written by a page can be read back.
function classList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach(name => set.add(name)),
    remove: (...names) => names.forEach(name => set.delete(name)),
    toggle: (name, force) => {
      const on = force === undefined ? !set.has(name) : Boolean(force);
      if (on) set.add(name);
      else set.delete(name);
      return on;
    },
    contains: name => set.has(name),
    replace: (from, to) => set.delete(from) && set.add(to),
    get value() {
      return [...set].join(" ");
    }
  };
}

function createElement(tagName = "div", id = "") {
  const attributes = new Map();
  const target = {
    tagName: String(tagName).toUpperCase(),
    nodeType: 1,
    id,
    isConnected: false,
    textContent: "",
    innerHTML: "",
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    children: [],
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: classList(),
    parentElement: null,
    appendChild(child) {
      this.children.push(child);
      if (child && typeof child === "object") child.isConnected = true;
      return child;
    },
    // <dialog> behavior for WowUIModal; like browsers, `close` fires in a later task.
    open: false,
    show() {
      this.open = true;
    },
    showModal() {
      this.open = true;
    },
    close() {
      if (!this.open) return;
      this.open = false;
      setImmediate(() => this.dispatchEvent({ type: "close" }));
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    replaceChildren(...nodes) {
      this.children = [];
      nodes.forEach(node => this.appendChild(node));
    },
    prepend(...nodes) {
      this.children.unshift(...nodes);
    },
    setAttribute: (key, value) => attributes.set(key, String(value)),
    getAttribute: key => (attributes.has(key) ? attributes.get(key) : null),
    hasAttribute: key => attributes.has(key),
    removeAttribute: key => attributes.delete(key),
    querySelector: () => createElement(),
    querySelectorAll: () => [],
    closest: () => createElement(),
    contains: () => false,
    getBoundingClientRect: () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0
    }),
    listeners: {},
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      (this.listeners[event.type] || []).forEach(fn => fn.call(this, event));
      return true;
    }
  };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj || typeof prop === "symbol") return obj[prop];
      if (prop === "then") return undefined;
      return () => undefined; // focus(), scrollIntoView(), remove(), replaceChildren(), ...
    }
  });
}

function createDocument() {
  const byId = new Map();
  const doc = createElement("#document");
  Object.assign(doc, {
    readyState: "complete",
    title: "",
    body: createElement("body"),
    documentElement: createElement("html"),
    createElement: tag => createElement(tag),
    createDocumentFragment: () => createElement("#fragment"),
    createTextNode: text => ({ nodeType: 3, textContent: String(text) }),
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, createElement("div", id));
      return byId.get(id);
    },
    querySelector(selector) {
      return /^#[\w-]+$/.test(selector) ? doc.getElementById(selector.slice(1)) : createElement();
    },
    elementsById: byId
  });
  return doc;
}

// ---------------------------------------------------------------------------------------
/**
 * A fresh browser-like realm. `load()` evaluates classic scripts in order (sharing one
 * global, like <script> tags); `boot()` also awaits the page's async init.
 */
export function createBrowser({ storage = new MemoryStorage(), page = "base", search = "" } = {}) {
  const context = vm.createContext({});
  const win = vm.runInContext("globalThis", context);
  const listeners = new Map();
  const events = [];
  const errors = [];
  const fetchLog = [];
  const timers = [];
  win.window = win;
  win.self = win;
  win.console = {
    log() {},
    info() {},
    debug() {},
    warn() {},
    error: (...args) => errors.push(args.map(arg => (arg && arg.stack) || String(arg)).join(" "))
  };
  win.localStorage = storage;
  win.queueMicrotask = queueMicrotask;
  win.setTimeout = (fn, ms = 0) => timers.push({ fn, ms }) && timers.length;
  win.clearTimeout = () => {};
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestAnimationFrame = fn => timers.push({ fn, ms: 16 }) && timers.length;
  win.cancelAnimationFrame = () => {};
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  win.innerWidth = 1440;
  win.innerHeight = 900;
  win.URL = URL;
  win.URLSearchParams = URLSearchParams;
  win.location = {
    href: ORIGIN + "/mockup/" + page + ".html" + search,
    pathname: "/mockup/" + page + ".html",
    search,
    hash: "",
    replace() {},
    assign() {},
    reload() {}
  };
  win.history = { replaceState() {}, pushState() {} };
  win.document = createDocument();
  win.fetch = createFetch(page, fetchLog);
  // battle.js dynamic-imports the combat engine, which runs in Node's own realm and uses
  // its global fetch; route that through the repo as well.
  globalThis.fetch = win.fetch;
  win.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail ?? null;
    }
  };
  win.Event = win.CustomEvent;
  win.addEventListener = (type, fn) => listeners.set(type, [...(listeners.get(type) || []), fn]);
  win.removeEventListener = (type, fn) =>
    listeners.set(
      type,
      (listeners.get(type) || []).filter(entry => entry !== fn)
    );
  win.dispatchEvent = event => {
    events.push({ type: event.type, reason: event.detail && event.detail.reason });
    for (const fn of listeners.get(event.type) || []) fn.call(win, event);
    return true;
  };

  const browser = {
    window: win,
    storage,
    events,
    errors,
    fetchLog,
    load(...files) {
      for (const rel of files.flat()) {
        new vm.Script(readText(rel), {
          filename: join(ROOT, rel),
          importModuleDynamically: vm.constants?.USE_MAIN_CONTEXT_DEFAULT_LOADER
        }).runInContext(context);
      }
      return browser;
    },
    /** Loads the shared ui/*.js scripts a page includes, in that page's order. */
    loadShared(fromPage = page) {
      return browser.load(pageScripts(fromPage).filter(rel => rel.startsWith("mockup/ui/")));
    },
    /** Loads every script of the page (shared + page script) and lets async init settle. */
    async boot(fromPage = page) {
      const unhandled = [];
      const onRejection = reason => unhandled.push(reason);
      process.on("unhandledRejection", onRejection);
      try {
        browser.load(pageScripts(fromPage));
        await settle();
      } finally {
        process.off("unhandledRejection", onRejection);
      }
      errors.push(...unhandled.map(reason => (reason && reason.stack) || String(reason)));
      return browser;
    },
    /** Runs queued setTimeout/requestAnimationFrame callbacks (e.g. battle pulses). */
    async runTimers(limit = 10_000) {
      let count = 0;
      while (timers.length && count < limit) {
        timers.shift().fn();
        count += 1;
        if (count % 50 === 0) await settle();
      }
      await settle();
      return count;
    },
    element: id => win.document.getElementById(id)
  };
  return browser;
}

/** Lets pending promise chains (fetch -> json -> render) finish. */
export async function settle(rounds = 20) {
  for (let i = 0; i < rounds; i += 1) await new Promise(resolve => setImmediate(resolve));
}

/** A browser with a page's shared state modules loaded (no page script). */
export function sharedModules(options = {}) {
  return createBrowser(options).loadShared(options.page || "base").window;
}

/** Reload: a new realm over the same storage, like refreshing the page. */
export function reload(storage, options = {}) {
  return sharedModules(Object.assign({}, options, { storage }));
}
