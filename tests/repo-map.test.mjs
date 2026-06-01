import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildOptimizedRepoMap } from "../src/core.mjs";

function makeProject() {
  const root = mkdtempSync(join(tmpdir(), "fc-repo-map-"));

  mkdirSync(join(root, "src", "node_modules"), { recursive: true });
  mkdirSync(join(root, "src", "dist"), { recursive: true });
  mkdirSync(join(root, "src", "feature"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });

  writeFileSync(join(root, "src", "feature", "auth.js"), "export function authenticate() {}\n");
  writeFileSync(join(root, "src", "node_modules", "ignored.js"), "ignored\n");
  writeFileSync(join(root, "src", "dist", "bundle.js"), "ignored\n");
  writeFileSync(join(root, "tests", "auth.test.js"), "authenticate();\n");

  return root;
}

describe("buildOptimizedRepoMap", () => {
  it("applies exclude paths inside hotspot subtrees", () => {
    const root = makeProject();
    const result = buildOptimizedRepoMap({
      query: "where is authentication handled",
      projectRoot: root,
      treeDepth: 1,
      excludePaths: ["node_modules", "dist"],
      optimizer: {
        mode: "bootstrap_hotspot",
        bootstrapTreeDepth: 1,
        hotspotTopK: 1,
        hotspotTreeDepth: 3,
        maxBytes: 64 * 1024,
      },
    });

    assert.match(result.tree, /# Hotspot Subtrees/);
    assert.doesNotMatch(result.tree, /node_modules/);
    assert.doesNotMatch(result.tree, /dist/);
  });

  it("preserves hotspotTopK=0 to disable hotspot subtree expansion", () => {
    const root = makeProject();
    const result = buildOptimizedRepoMap({
      query: "where is authentication handled",
      projectRoot: root,
      treeDepth: 1,
      excludePaths: ["node_modules", "dist"],
      optimizer: {
        mode: "bootstrap_hotspot",
        bootstrapTreeDepth: 1,
        hotspotTopK: 0,
        hotspotTreeDepth: 3,
        maxBytes: 64 * 1024,
      },
    });

    assert.deepEqual(result.hotDirs, []);
    assert.doesNotMatch(result.tree, /# Hotspot Subtrees/);
  });
});
