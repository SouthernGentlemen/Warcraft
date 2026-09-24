import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import {
  readFile,
  readdir,
  rm,
  mkdir,
  writeFile,
  stat
} from "node:fs/promises";
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep
} from "node:path";

const ROOT = process.cwd();
const DOCS_ROOT = join(ROOT, "docs");
const DATA_ROOT = join(ROOT, "data");
const STATE_FILE = join(ROOT, ".warcraft-dev.json");
const HOST = process.env.HOST || "127.0.0.1";
const BASE_PORT = Number(process.env.PORT || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const RACE_FACTIONS = {
  alliance: ["human", "gnome", "dwarf"],
  horde: ["orc", "undead", "troll"]
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function removeOwnState() {
  const state = await readJson(STATE_FILE);
  if (state?.pid === process.pid) {
    await rm(STATE_FILE, { force: true });
  }
}

async function teardownPreviousServer() {
  const state = await readJson(STATE_FILE);
  if (!state?.pid || state.pid === process.pid || state.root !== ROOT) {
    await rm(STATE_FILE, { force: true });
    return;
  }

  try {
    process.kill(state.pid, 0);
  } catch {
    await rm(STATE_FILE, { force: true });
    return;
  }

  console.log(`[reset] stopping previous dev server (pid ${state.pid}, port ${state.port})`);

  try {
    process.kill(state.pid, "SIGTERM");
  } catch {
    await rm(STATE_FILE, { force: true });
    return;
  }

  for (let i = 0; i < 30; i += 1) {
    await sleep(100);
    try {
      process.kill(state.pid, 0);
    } catch {
      await rm(STATE_FILE, { force: true });
      return;
    }
  }

  console.log("[reset] previous process did not exit cleanly; forcing shutdown");
  try {
    process.kill(state.pid, "SIGKILL");
  } catch {
    // Process already exited.
  }
  await rm(STATE_FILE, { force: true });
}

async function walkMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }

  return out.sort();
}

function heading(md) {
  return md.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function section(md, name) {
  const marker = `## ${name}`;
  const startMarker = md.indexOf(marker);
  if (startMarker < 0) return "";

  const start = md.indexOf("\n", startMarker);
  if (start < 0) return "";

  const end = md.indexOf("\n## ", start + 1);
  return md.slice(start + 1, end < 0 ? md.length : end).trim();
}

function markdownTable(block) {
  return block
    .split("\n")
    .filter(line => line.startsWith("|") && !/^\|\s*---/.test(line))
    .slice(1)
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, "")))
    .filter(row => row.length >= 2);
}

function talentTier(md, startMarker, endMarker) {
  const start = md.indexOf(startMarker);
  if (start < 0) return [];

  const end = endMarker
    ? md.indexOf(endMarker, start + startMarker.length)
    : md.indexOf("## Combat Loadout", start + startMarker.length);

  return markdownTable(md.slice(start, end < 0 ? md.length : end))
    .map(([name, effect]) => ({ name, effect }));
}

function actionTable(block) {
  return markdownTable(block).map(row => ({
    id: row[0] || "",
    name: row[1] || "",
    kind: row[2] || "",
    school: row[3] || "",
    target: row[4] || "",
    power: Number(row[5] || 0),
    coefficient_bp: Number(row[6] || 0),
    cooldown_ticks: Number(row[7] || 0),
    resource: row[8] || "none",
    cost: Number(row[9] || 0),
    effect: row[10] || "none"
  }));
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function mirrorObject(sourcePath, md) {
  const posixPath = toPosix(sourcePath);
  const base = {
    schema_version: 1,
    source_path: posixPath,
    kind: "document",
    title: heading(md),
    source_markdown: md
  };

  if (/^docs\/heroes\/races\/[^/]+\/README\.md$/.test(posixPath)) {
    const racialMatch = md.match(/^## Racial Bonus — (.+)$/m);
    return {
      ...base,
      kind: "race",
      race: heading(md),
      racial: {
        name: racialMatch?.[1]?.trim() || "",
        mechanic: racialMatch
          ? md.slice(md.indexOf(racialMatch[0]) + racialMatch[0].length)
              .split(/^## Balance Role/m)[0]
              .trim()
          : ""
      },
      balance_role: section(md, "Balance Role")
    };
  }

  if (/^docs\/heroes\/classes\/[^/]+\/abilities\/README\.md$/.test(posixPath)) {
    return {
      ...base,
      kind: "abilities",
      class: heading(md).replace(/ Abilities$/, ""),
      cooldowns: actionTable(section(md, "Cooldowns")),
      ultimates: actionTable(section(md, "Ultimates"))
    };
  }

  if (/^docs\/heroes\/classes\/[^/]+\/specs\/[^/]+\.md$/.test(posixPath)) {
    const [className = "", specialization = ""] = heading(md).split(" — ");
    const identity = section(md, "Identity");
    const getIdentity = label =>
      identity.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";

    return {
      ...base,
      kind: "specialization",
      class: className,
      specialization,
      identity: {
        role: getIdentity("Role"),
        resource: getIdentity("Resource"),
        primary_stat: getIdentity("Primary stat"),
        auto_attack: getIdentity("Auto-attack")
      },
      talents: {
        tier_1: talentTier(md, "### Tier 1", "### Tier 2"),
        tier_2: talentTier(md, "### Tier 2", "### Tier 3"),
        capstones: talentTier(md, "### Tier 3", null)
      }
    };
  }

  if (/^docs\/heroes\/classes\/[^/]+\/README\.md$/.test(posixPath)) {
    const equipment = section(md, "Equipment");
    const faction = section(md, "Faction").split("\n")[0].trim();

    const result = {
      ...base,
      kind: "class",
      class: heading(md),
      resource: section(md, "Resource").split("\n")[0].trim(),
      equipment: {
        armor: equipment.match(/^- Armor access:\s*(.+)$/m)?.[1]?.trim() || "",
        primary_stat: equipment.match(/^- Primary stat:\s*(.+)$/m)?.[1]?.trim() || ""
      },
      specializations: markdownTable(section(md, "Specializations")).map(row => ({
        name: row[0].match(/\[([^\]]+)\]/)?.[1] || row[0],
        role: row[1] || "",
        auto_attack: row[2] || ""
      }))
    };

    if (faction) result.faction = faction;
    return result;
  }

  return base;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function rebuildData() {
  console.log("[rebuild] resetting /data");
  await rm(DATA_ROOT, { recursive: true, force: true });
  await mkdir(DATA_ROOT, { recursive: true });

  const docs = await walkMarkdown(DOCS_ROOT);
  const generated = [];

  for (const fullPath of docs) {
    const rel = toPosix(relative(ROOT, fullPath));
    const md = await readFile(fullPath, "utf8");
    const jsonRel = rel.replace(/^docs\//, "data/").replace(/\.md$/, ".json");
    const outPath = join(ROOT, ...jsonRel.split("/"));
    const value = mirrorObject(rel, md);
    await writeJson(outPath, value);
    generated.push({ rel: jsonRel, value });
  }

  const classRecords = generated
    .filter(entry => entry.value.kind === "class")
    .map(entry => entry.value)
    .sort((a, b) => a.class.localeCompare(b.class));

  const classIndex = {
    schema_version: 1,
    classes: classRecords.map(record => {
      const id = slugify(record.class);
      const out = {
        id,
        label: record.class,
        resource: record.resource,
        abilities_path: `./${id}/abilities/README.json`,
        specs: record.specializations.map(spec => {
          const specId = slugify(spec.name);
          return {
            id: specId,
            label: spec.name,
            data_path: `./${id}/specs/${specId}.json`
          };
        })
      };

      if (record.faction) out.faction = record.faction.replace(/ only$/i, "");
      return out;
    })
  };

  await writeJson(join(DATA_ROOT, "heroes", "classes", "index.json"), classIndex);

  const classNames = classIndex.classes;
  const sharedClasses = classNames.filter(c => !c.faction).map(c => c.label);
  const allianceExclusive = classNames.find(c => c.faction === "Alliance")?.label || "Paladin";
  const hordeExclusive = classNames.find(c => c.faction === "Horde")?.label || "Shaman";

  const raceIndex = {
    schema_version: 1,
    availability_rule: "Until race-specific class restrictions are defined, each race can use every shared class plus its faction-exclusive class.",
    body_types: [
      { id: "body-1", label: "Body 1", presentation: "Male" },
      { id: "body-2", label: "Body 2", presentation: "Female" }
    ],
    factions: {
      alliance: {
        label: "Alliance",
        exclusive_class: allianceExclusive,
        races: RACE_FACTIONS.alliance.map(id => ({
          id,
          label: id[0].toUpperCase() + id.slice(1),
          data_path: `./${id}/README.json`
        })),
        available_classes: [...sharedClasses, allianceExclusive]
      },
      horde: {
        label: "Horde",
        exclusive_class: hordeExclusive,
        races: RACE_FACTIONS.horde.map(id => ({
          id,
          label: id[0].toUpperCase() + id.slice(1),
          data_path: `./${id}/README.json`
        })),
        available_classes: [...sharedClasses, hordeExclusive]
      }
    }
  };

  await writeJson(join(DATA_ROOT, "heroes", "races", "index.json"), raceIndex);
  console.log(`[rebuild] generated ${docs.length} mirrored JSON files + 2 indexes`);
}

async function portAvailable(port) {
  return new Promise(resolvePort => {
    const probe = createNetServer();

    probe.once("error", () => resolvePort(false));
    probe.listen(port, HOST, () => {
      probe.close(() => resolvePort(true));
    });
  });
}

async function choosePort() {
  for (let port = BASE_PORT; port < BASE_PORT + 50; port += 1) {
    if (await portAvailable(port)) return port;
  }

  return new Promise((resolvePort, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, HOST, () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : BASE_PORT;
      probe.close(() => resolvePort(port));
    });
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = resolve(ROOT, "." + normalized);
  return target.startsWith(resolve(ROOT)) ? target : null;
}

async function resolveFile(urlPath) {
  const target = safePath(urlPath);
  if (!target) return null;

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const indexFile = join(target, "index.html");
      const indexInfo = await stat(indexFile);
      return indexInfo.isFile() ? indexFile : null;
    }
    return info.isFile() ? target : null;
  } catch {
    return null;
  }
}

function browserUrl(port) {
  const browserHost = HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;
  return `http://${browserHost}:${port}/mockup/`;
}

function openBrowser(url) {
  if (process.env.NO_OPEN === "1" || process.env.NO_OPEN === "true") {
    console.log("[open] skipped because NO_OPEN is enabled");
    return;
  }

  let command;
  let args;

  if (process.env.BROWSER) {
    command = process.env.BROWSER;
    args = [url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore"
    });

    child.on("error", error => {
      console.warn(`[open] could not open browser automatically: ${error.message}`);
      console.warn(`[open] open manually: ${url}`);
    });

    child.unref();
    console.log(`[open] browser: ${url}`);
  } catch (error) {
    console.warn(`[open] could not open browser automatically: ${error.message}`);
    console.warn(`[open] open manually: ${url}`);
  }
}

function buildHttpServer() {
  return createServer(async (req, res) => {
    const method = req.method || "GET";

    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/") {
      res.writeHead(302, { Location: "/mockup/" });
      res.end();
      return;
    }

    const file = await resolveFile(url.pathname);

    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });

      if (method === "HEAD") res.end();
      else res.end(body);
    } catch (error) {
      console.error(error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  });
}

async function main() {
  console.log("");
  console.log("Warcraft prototype dev reset");

  await teardownPreviousServer();
  await rebuildData();

  const port = await choosePort();
  const server = buildHttpServer();

  const shutdown = async signal => {
    console.log(`\n[teardown] ${signal} received; shutting down`);
    server.close(async () => {
      await removeOwnState();
      process.exit(0);
    });

    setTimeout(async () => {
      await removeOwnState();
      process.exit(0);
    }, 1000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  server.listen(port, HOST, async () => {
    await writeFile(
      STATE_FILE,
      JSON.stringify({ pid: process.pid, port, host: HOST, root: ROOT }, null, 2) + "\n",
      "utf8"
    );

    const url = browserUrl(port);

    console.log("[serve] ready");
    console.log(`  Mockups: ${url}`);
    console.log(`  Data:    http://${HOST}:${port}/data/`);
    openBrowser(url);
    console.log("");
    console.log("Run npm run dev again at any time; it will tear this instance down and rebuild.");
    console.log("Press Ctrl+C to stop.");
  });
}

main().catch(async error => {
  console.error(error);
  await removeOwnState();
  process.exit(1);
});
