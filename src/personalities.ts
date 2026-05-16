import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function listPersonalities(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort();
}

export function loadPersonality(dir: string, name: string): string | null {
  const file = join(dir, `${name}.md`);
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").trim();
}

export function ensureBundledPersonalities(bundleDir: string, targetDir: string): void {
  if (!existsSync(bundleDir)) return;
  mkdirSync(targetDir, { recursive: true });
  for (const name of readdirSync(bundleDir)) {
    if (!name.endsWith(".md")) continue;
    const target = join(targetDir, name);
    if (existsSync(target)) continue;
    writeFileSync(target, readFileSync(join(bundleDir, name), "utf8"));
  }
}
