import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { readBoolEnv, readIntEnv, readRuntimeConfig } from "../src/config.mjs";

describe("readIntEnv", () => {
  it("uses defaults for missing or invalid values", () => {
    assert.equal(readIntEnv("X", 3, {}, {}), 3);
    assert.equal(readIntEnv("X", 3, {}, { X: "abc" }), 3);
  });

  it("clamps numeric values", () => {
    assert.equal(readIntEnv("X", 3, { min: 1, max: 5 }, { X: "10" }), 5);
    assert.equal(readIntEnv("X", 3, { min: 1, max: 5 }, { X: "0" }), 1);
  });
});

describe("readBoolEnv", () => {
  it("parses common boolean strings", () => {
    assert.equal(readBoolEnv("X", false, { X: "true" }), true);
    assert.equal(readBoolEnv("X", false, { X: "1" }), true);
    assert.equal(readBoolEnv("X", true, { X: "off" }), false);
    assert.equal(readBoolEnv("X", true, { X: "no" }), false);
  });

  it("falls back for unknown values", () => {
    assert.equal(readBoolEnv("X", true, { X: "maybe" }), true);
  });
});

describe("readRuntimeConfig", () => {
  it("keeps MCP-compatible environment defaults", () => {
    const config = readRuntimeConfig({
      FC_MAX_TURNS: "4",
      FC_MAX_COMMANDS: "12",
      FC_TIMEOUT_MS: "45000",
      FC_INCLUDE_SNIPPETS: "true",
      FC_REPO_MAP_MODE: "classic",
    });

    assert.equal(config.maxTurns, 4);
    assert.equal(config.maxCommands, 12);
    assert.equal(config.timeoutMs, 45000);
    assert.equal(config.includeSnippets, true);
    assert.equal(config.repoMapMode, "classic");
  });
});
