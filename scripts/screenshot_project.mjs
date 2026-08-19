import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import process from "node:process";

const args = process.argv.slice(2);
const value = (name, fallback) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] ?? fallback : fallback; };
const startUrl = value("--url", "http://localhost:3001");
const output = value("--output", "screenshots/project");
const maxPages = Number(value("--max-pages", "100"));
const email = value("--email", "");
const password = value("--password", "");
const apiUrl = value("--api-url", "").replace(/\/$/, "");
const explicitRoutes = value("--routes", "").split(",").map((route) => route.trim()).filter(Boolean);
const headed = args.includes("--headed");
const slowMo = Number(value("--slow-mo", "0"));
const waitMs = Number(value("--wait", "800"));
const [viewportWidth, viewportHeight] = value("--viewport", "1440x1000").split("x").map(Number);
const projectDir = resolve(value("--project-dir", process.cwd()));
const { chromium } = createRequire(join(projectDir, "package.json"))("playwright");

const origin = new URL(startUrl).origin;
const queue = [new URL(startUrl)];
const visited = new Set();
await mkdir(output, { recursive: true });

async function discoverNextRoutes(directory, prefix = "") {
  const routes = [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return routes; }
  for (const entry of entries) {
    if (entry.name.startsWith("(") || entry.name.startsWith("_") || entry.name.startsWith("[")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...await discoverNextRoutes(path, `${prefix}/${entry.name}`));
    else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) routes.push(prefix || "/");
  }
  return routes;
}

for (const route of explicitRoutes) queue.push(new URL(route, origin));
for (const route of await discoverNextRoutes(join(projectDir, "src/app"))) queue.push(new URL(route, origin));

const safeName = (url) => {
  const path = new URL(url).pathname.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "_") || "home";
  return `${path.slice(0, 120)}.png`;
};

const browser = await chromium.launch({ headless: !headed, slowMo });
const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 });
try {
  if (email && password) {
    if (apiUrl) {
      const response = await fetch(`${apiUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error(`login da API falhou (${response.status}): ${await response.text()}`);
      const data = await response.json();
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.evaluate((token) => localStorage.setItem("project_token", token), data.token);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(waitMs);
    } else {
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(waitMs);
      await page.locator('input[aria-label="e-mail"], input[type="email"], input[placeholder*="mail" i]').first().fill(email);
      await page.locator('input[aria-label="senha"], input[type="password"]').first().fill(password);
      await page.getByRole("button", { name: /entrar|login/i }).first().click();
      await page.waitForTimeout(waitMs);
      if (await page.locator('input[aria-label="senha"], input[type="password"]').count()) throw new Error("login não confirmado; verifique API, NEXT_PUBLIC_API_URL, e-mail e senha");
    }
    console.log(`sessão iniciada para ${email}`);
  }
  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    url.hash = "";
    const key = url.href;
    if (visited.has(key) || url.origin !== origin) continue;
    visited.add(key);
    try {
      await page.goto(key, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(waitMs);
      await page.screenshot({ path: join(output, safeName(key)), fullPage: true });
      console.log(`capturada: ${key} -> ${join(output, safeName(key))}`);
      const links = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.href));
      for (const href of links) { const next = new URL(href); if (next.origin === origin && !visited.has(next.href)) queue.push(next); }
    } catch (error) {
      console.error(`falha: ${key}: ${error instanceof Error ? error.message : error}`);
    }
  }
} finally {
  await browser.close();
}
console.log(`total: ${visited.size} página(s), saída: ${output}`);
