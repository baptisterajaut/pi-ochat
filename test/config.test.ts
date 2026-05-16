import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, DEFAULT_CONFIG, type OchatConfig } from "../src/config.js";

let tmp: string;
let configPath: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "pi-ochat-test-"));
  configPath = join(tmp, "pi-ochat.json");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns defaults when file is missing", () => {
    expect(loadConfig(configPath)).toEqual(DEFAULT_CONFIG);
  });

  it("merges file contents over defaults", () => {
    writeFileSync(configPath, JSON.stringify({ personality: "creative", thinking: true }));
    const cfg = loadConfig(configPath);
    expect(cfg.personality).toBe("creative");
    expect(cfg.thinking).toBe(true);
    expect(cfg.streaming).toBe(DEFAULT_CONFIG.streaming);
  });

  it("ignores unknown keys", () => {
    writeFileSync(configPath, JSON.stringify({ foo: "bar", personality: "x" }));
    const cfg = loadConfig(configPath) as OchatConfig & { foo?: string };
    expect(cfg.foo).toBeUndefined();
    expect(cfg.personality).toBe("x");
  });

  it("returns defaults on malformed JSON", () => {
    writeFileSync(configPath, "not json");
    expect(loadConfig(configPath)).toEqual(DEFAULT_CONFIG);
  });
});

describe("saveConfig", () => {
  it("writes the config to disk", () => {
    const cfg: OchatConfig = { ...DEFAULT_CONFIG, personality: "storyteller" };
    saveConfig(configPath, cfg);
    expect(existsSync(configPath)).toBe(true);
    expect(JSON.parse(readFileSync(configPath, "utf8")).personality).toBe("storyteller");
  });
});
