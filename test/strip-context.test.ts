import { describe, it, expect } from "vitest";
import { filterContextFiles } from "../src/strip-context.js";

describe("filterContextFiles", () => {
  it("keeps files inside the global agent dir", () => {
    const files = [
      { path: "/home/me/.pi/agent/AGENTS.md", content: "global" },
      { path: "/home/me/project/AGENTS.md", content: "local" },
    ];
    expect(filterContextFiles(files, "/home/me/.pi/agent/")).toEqual([
      { path: "/home/me/.pi/agent/AGENTS.md", content: "global" },
    ]);
  });

  it("returns input unchanged when undefined", () => {
    expect(filterContextFiles(undefined, "/home/me/.pi/agent/")).toEqual([]);
  });

  it("handles trailing-slash variants in the marker", () => {
    const files = [{ path: "/home/me/.pi/agent/AGENTS.md", content: "x" }];
    expect(filterContextFiles(files, "/home/me/.pi/agent")).toHaveLength(1);
  });
});
