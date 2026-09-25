import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import {
  readFile,
  rm,
  writeFile,
  stat
} from "node:fs/promises";
import {
  extname,
  join,
  normalize,
  resolve,
} from "node:path";

const ROOT = process.cwd();
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
    console.log("Run npm run dev again at any time; it will tear this instance down and restart.");
    console.log("Press Ctrl+C to stop.");
  });
}

main().catch(async error => {
  console.error(error);
  await removeOwnState();
  process.exit(1);
});
