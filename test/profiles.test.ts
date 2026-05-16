import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listProfiles, loadProfile, type ProfileFile } from "../src/profiles.js";

let tmp: string;
let dir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "pi-ochat-pr-"));
  dir = join(tmp, "profiles");
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("listProfiles", () => {
  it("returns empty when dir missing", () => {
    expect(listProfiles(dir)).toEqual([]);
  });

  it("returns sorted .json names without extension", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "creative.json"), "{}");
    writeFileSync(join(dir, "fast.json"), "{}");
    writeFileSync(join(dir, "readme.txt"), "x");
    expect(listProfiles(dir)).toEqual(["creative", "fast"]);
  });
});

describe("loadProfile", () => {
  it("returns null for unknown profile", () => {
    mkdirSync(dir, { recursive: true });
    expect(loadProfile(dir, "ghost")).toBeNull();
  });

  it("returns parsed profile", () => {
    mkdirSync(dir, { recursive: true });
    const data: ProfileFile = { model: "ollama/qwen3", personality: "creative", num_ctx: 32768 };
    writeFileSync(join(dir, "x.json"), JSON.stringify(data));
    expect(loadProfile(dir, "x")).toEqual(data);
  });

  it("returns null on malformed JSON", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), "not json");
    expect(loadProfile(dir, "bad")).toBeNull();
  });
});
