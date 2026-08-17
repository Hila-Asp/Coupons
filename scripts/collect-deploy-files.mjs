import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const LOCKFILE_MAX = 400 * 1024;
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "docs", ".git", "tests"]);

const files = [];

function toPosix(path) {
  return path.split(sep).join("/");
}

async function addText(relPath) {
  const abs = join(root, relPath);
  try {
    const data = await readFile(abs, "utf8");
    files.push({ file: toPosix(relPath), data });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

async function addBase64(relPath) {
  const abs = join(root, relPath);
  try {
    const data = await readFile(abs);
    files.push({
      file: toPosix(relPath),
      data: data.toString("base64"),
      encoding: "base64",
    });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

async function walkSrc(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    const rel = relative(root, abs);
    if (entry.isDirectory()) {
      const top = rel.split(sep)[0];
      if (EXCLUDE_DIRS.has(entry.name) || EXCLUDE_DIRS.has(top)) continue;
      await walkSrc(abs);
      continue;
    }
    if (entry.name.endsWith(".test.ts")) continue;
    await addText(rel);
  }
}

const rootFiles = [
  "package.json",
  "index.html",
  "vite.config.ts",
  "vercel.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "tsconfig.api.json",
];

for (const file of rootFiles) {
  await addText(file);
}

try {
  const lockStat = await stat(join(root, "package-lock.json"));
  if (lockStat.size <= LOCKFILE_MAX) {
    await addText("package-lock.json");
  }
} catch (error) {
  if (!error || error.code !== "ENOENT") throw error;
}

await walkSrc(join(root, "src"));
await addText("api/voucher-code.ts");
await addText("public/favicon.svg");
await addText("public/sw-expiry.js");

try {
  const iconDir = join(root, "public", "icons");
  const icons = await readdir(iconDir);
  for (const name of icons) {
    if (name.endsWith(".png")) {
      await addBase64(join("public", "icons", name));
    }
  }
} catch (error) {
  if (!error || error.code !== "ENOENT") throw error;
}

const outPath = process.argv.includes("--no-lock")
  ? join(root, "deploy-files-nolock.json")
  : join(root, "deploy-files.json");

if (process.argv.includes("--no-lock")) {
  const filtered = files.filter((item) => item.file !== "package-lock.json");
  files.length = 0;
  files.push(...filtered);
}

const payload = JSON.stringify({ files });
await writeFile(outPath, payload);
console.log(
  JSON.stringify({
    outPath: toPosix(relative(root, outPath)),
    fileCount: files.length,
    jsonBytes: Buffer.byteLength(payload),
    files: files.map((item) => ({
      file: item.file,
      bytes: Buffer.byteLength(item.data),
      encoding: item.encoding ?? "utf-8",
    })),
  }),
);
