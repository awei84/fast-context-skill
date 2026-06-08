import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatEmptySearchResult } from "../src/core.mjs";

describe("formatEmptySearchResult", () => {
  it("adds a narrowing hint when raw response is empty", () => {
    const output = formatEmptySearchResult("");

    assert.match(output, /No relevant files found\./);
    assert.match(output, /narrow --project/);
    assert.match(output, /backend, server, src/);
  });

  it("adds a stronger narrowing hint when raw response is truncated", () => {
    const output = formatEmptySearchResult("x".repeat(600));

    assert.match(output, /\.\.\.\[raw_response truncated\]\.\.\./);
    assert.match(output, /Raw response was truncated/);
    assert.match(output, /generated,ent/);
  });
});
