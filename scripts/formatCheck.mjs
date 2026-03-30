import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHECK_DIRS = ["src", "test", ".github", "scripts"];
const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);
const ALLOWED_EXTS = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md"
]);

function rel(p) {
  return path.relative(ROOT, p);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTS.has(ext)) out.push(fullPath);
    }
  }
  return out;
}

let files = [];
for (const d of CHECK_DIRS) {
  const full = path.join(ROOT, d);
  try {
    const stat = await fs.stat(full);
    if (stat.isDirectory()) files = files.concat(await walk(full));
  } catch {
    // Directory doesn't exist in some setups.
  }
}

const errors = [];
for (const file of files) {
  let text;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch {
    continue;
  }

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/[ \t]+$/.test(lines[i])) {
      errors.push(`${rel(file)}:${i + 1}`);
      // Avoid spamming too much for very large files.
      if (errors.length > 1000) break;
    }
  }
}

if (errors.length > 0) {
  console.error("format:check failed (trailing whitespace found):");
  for (const e of errors.slice(0, 50)) console.error(`- ${e}`);
  if (errors.length > 50) console.error(`...and ${errors.length - 50} more`);
  process.exitCode = 1;
} else {
  console.log("format:check passed");
}

