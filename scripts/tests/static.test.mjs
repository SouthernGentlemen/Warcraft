// Static integrity: every page's assets exist, every script parses, every data file is JSON,
// and every data path the runtime fetches resolves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import vm from "node:vm";
import { PAGES, ROOT, exists, listFiles, readText } from "./harness.mjs";

const html = Object.fromEntries(PAGES.map(page => [page, readText(`mockup/${page}.html`)]));
const scripts = listFiles("mockup", name => name.endsWith(".js"));
const isModule = source => /^\s*(import|export)\s/m.test(source);

test("every page's local scripts and stylesheets exist", () => {
  for (const [page, source] of Object.entries(html)) {
    const refs = [...source.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(\.\/[^"#?]+)"/g)];
    for (const [, ref] of refs) assert.ok(exists(join("mockup", ref)), `${page}.html -> ${ref}`);
  }
});

test("every mockup script parses", () => {
  for (const rel of scripts) {
    const source = readText(rel);
    if (!isModule(source)) {
      new vm.Script(source, { filename: rel });
      continue;
    }
    const check = spawnSync(process.execPath, ["--check", join(ROOT, rel)], { encoding: "utf8" });
    assert.equal(check.status, 0, `${rel}: ${check.stderr}`);
  }
});

test("every data file is valid JSON", () => {
  for (const rel of listFiles("data", name => name.endsWith(".json"))) {
    assert.doesNotThrow(() => JSON.parse(readText(rel)), rel);
  }
});

test("every data path literal in mockup code resolves", () => {
  for (const rel of scripts) {
    for (const [, ref] of readText(rel).matchAll(/["'`]((?:\.\.\/)+data\/[\w./-]+\.json)["'`]/g)) {
      assert.ok(exists(ref.replace(/^(\.\.\/)+/, "")), `${rel} -> ${ref}`);
    }
  }
});

test("pages render no stray escaped-newline text", () => {
  for (const [page, source] of Object.entries(html)) {
    const text = source.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "");
    assert.ok(!/\\[nt]/.test(text), `${page}.html contains literal \\n or \\t text`);
  }
});

test("every CSS custom property used without a fallback is defined", () => {
  const sheets = listFiles("mockup", name => name.endsWith(".css")).map(readText);
  const all = sheets.join("\n") + scripts.map(readText).join("\n") + Object.values(html).join("\n");
  const defined = new Set(
    [...all.matchAll(/(--[\w-]+)\s*:|setProperty\(\s*["'`](--[\w-]+)/g)].map(m => m[1] || m[2])
  );
  const missing = new Set();
  for (const sheet of sheets) {
    for (const [, name] of sheet.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
      if (!defined.has(name)) missing.add(name);
    }
  }
  assert.deepEqual([...missing], []);
});

test("every page's top navigation reaches every player destination", () => {
  const destinations = ["base", "heroes", "endgame"];
  for (const [page, source] of Object.entries(html)) {
    const nav = source.match(/<nav class="wow-game-nav"[\s\S]*?<\/nav>/);
    if (!nav) continue;
    const keys = [...nav[0].matchAll(/data-wow-nav-key="([a-z]+)"/g)].map(match => match[1]);
    assert.deepEqual(keys, destinations, page + ".html");
  }
});

test("the Base map has one plot per building", () => {
  const plots = [...html.base.matchAll(/data-building="([\w-]+)"/g)].map(match => match[1]);
  const buildings = JSON.parse(readText("data/base/buildings.json")).buildings.map(b => b.id);
  assert.deepEqual([...new Set(plots)].sort(), buildings.slice().sort());
});
