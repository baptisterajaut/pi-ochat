import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listPersonalities, loadPersonality, ensureBundledPersonalities } from "../src/personalities.js";

let tmp: string;
let dir: string;
let bundleDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "pi-ochat-p-"));
  dir = join(tmp, "personalities");
  bundleDir = join(tmp, "bundle");
  mkdirSync(bundleDir);
  writeFileSync(join(bundleDir, "default.md"), "You are helpful.");
  writeFileSync(join(bundleDir, "creative.md"), "You are creative.");
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("listPersonalities", () => {
  it("returns empty list when dir is missing", () => {
    expect(listPersonalities(dir)).toEqual([]);
  });

  it("returns names of .md files sorted alphabetically", () => {
    mkdirSync(dir);
    writeFileSync(join(dir, "creative.md"), "x");
    writeFileSync(join(dir, "default.md"), "y");
    writeFileSync(join(dir, "ignore.txt"), "z");
    expect(listPersonalities(dir)).toEqual(["creative", "default"]);
  });
});

describe("loadPersonality", () => {
  it("returns null for unknown names", () => {
    mkdirSync(dir);
    expect(loadPersonality(dir, "missing")).toBeNull();
  });

  it("returns file contents trimmed", () => {
    mkdirSync(dir);
    writeFileSync(join(dir, "p.md"), "  hello  \n");
    expect(loadPersonality(dir, "p")).toBe("hello");
  });
});

describe("ensureBundledPersonalities", () => {
  it("copies bundled .md files into target dir on first run", () => {
    ensureBundledPersonalities(bundleDir, dir);
    expect(readdirSync(dir).sort()).toEqual(["creative.md", "default.md"]);
  });

  it("does not overwrite existing files", () => {
    mkdirSync(dir);
    writeFileSync(join(dir, "default.md"), "user-edit");
    ensureBundledPersonalities(bundleDir, dir);
    expect(readdirSync(dir).sort()).toEqual(["creative.md", "default.md"]);
    const fs = require("node:fs") as typeof import("node:fs");
    expect(fs.readFileSync(join(dir, "default.md"), "utf8")).toBe("user-edit");
  });
});
