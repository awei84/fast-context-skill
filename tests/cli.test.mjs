import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { main } from "../src/cli.mjs";

async function captureStdout(fn) {
  let output = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    output += chunk;
    return true;
  };
  try {
    await fn();
  } finally {
    process.stdout.write = originalWrite;
  }
  return output;
}

async function captureStderr(fn) {
  let output = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    output += chunk;
    return true;
  };
  try {
    await fn();
  } finally {
    process.stderr.write = originalWrite;
  }
  return output;
}

async function captureOutput(fn) {
  let stdout = "";
  let stderr = "";
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  process.stdout.write = (chunk) => {
    stdout += chunk;
    return true;
  };
  process.stderr.write = (chunk) => {
    stderr += chunk;
    return true;
  };
  try {
    await fn();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
  return { stdout, stderr };
}

describe("CLI", () => {
  it("prints help", async () => {
    const output = await captureStdout(() => main(["--help"]));
    assert.match(output, /fast-context-skill/);
    assert.match(output, /search --query/);
  });

  it("prints version without requiring a command", async () => {
    const output = await captureStdout(() => main(["--version"]));
    assert.match(output, /^\d+\.\d+\.\d+\n$/);
  });

  it("passes parsed search options to searchWithContent", async () => {
    const projectDir = mkdtempSync(join(tmpdir(), "fc-cli-"));
    let captured = null;
    const output = await captureStdout(() => main([
      "search",
      "--query",
      "where is auth handled",
      "--project",
      projectDir,
      "--tree-depth",
      "2",
      "--max-turns",
      "4",
      "--max-results",
      "9",
      "--max-commands",
      "12",
      "--timeout-ms",
      "45000",
      "--exclude",
      "dist,node_modules",
      "--include-code-snippets",
    ], {
      searchWithContent: async (args) => {
        captured = args;
        return "ok";
      },
    }));

    assert.equal(output, "ok\n");
    assert.equal(captured.query, "where is auth handled");
    assert.equal(captured.projectRoot, resolve(projectDir));
    assert.equal(captured.treeDepth, 2);
    assert.equal(captured.maxTurns, 4);
    assert.equal(captured.maxResults, 9);
    assert.equal(captured.maxCommands, 12);
    assert.equal(captured.timeoutMs, 45000);
    assert.deepEqual(captured.excludePaths, ["dist", "node_modules"]);
    assert.equal(captured.includeSnippets, true);
  });

  it("supports top-level search flags for compatibility", async () => {
    const projectDir = mkdtempSync(join(tmpdir(), "fc-cli-"));
    let captured = null;
    const output = await captureStdout(() => main([
      "--query",
      "where is cli handled",
      "--project",
      projectDir,
    ], {
      searchWithContent: async (args) => {
        captured = args;
        return "ok";
      },
    }));

    assert.equal(output, "ok\n");
    assert.equal(captured.query, "where is cli handled");
    assert.equal(captured.projectRoot, resolve(projectDir));
  });

  it("wires --progress to searchWithContent onProgress", async () => {
    const projectDir = mkdtempSync(join(tmpdir(), "fc-cli-"));
    const stderr = await captureStderr(() => main([
      "search",
      "--query",
      "where is progress handled",
      "--project",
      projectDir,
      "--progress",
    ], {
      searchWithContent: async (args) => {
        args.onProgress("Repo map ready");
        return "ok";
      },
    }));

    assert.match(stderr, /\[fast-context\] Repo map ready/);
  });

  it("formats extract-key output", async () => {
    const output = await captureStdout(() => main(["extract-key"], {
      extractKeyInfo: async () => ({
        api_key: "devin-session-token$eyJhbGciOiJ.payload.sig",
        db_path: "/tmp/state.vscdb",
      }),
    }));

    assert.match(output, /Windsurf API Key extracted successfully/);
    assert.match(output, /Source: \/tmp\/state\.vscdb/);
    assert.match(output, /export WINDSURF_API_KEY='devin-session-token\$eyJhbGciOiJ\.payload\.sig'/);
  });

  it("supports --check-key with masked output", async () => {
    const output = await captureStdout(() => main(["--check-key"], {
      extractKeyInfo: async () => ({
        api_key: "devin-session-token$eyJhbGciOiJ.payload.sig",
        db_path: "/tmp/state.vscdb",
      }),
    }));

    assert.match(output, /Windsurf API Key discovered/);
    assert.match(output, /devin-se\.\.\.ad\.sig/);
    assert.doesNotMatch(output, /payload\.sig$/);
  });

  it("supports --print-key", async () => {
    const key = "devin-session-token$eyJhbGciOiJ.payload.sig";
    const output = await captureOutput(() => main(["--print-key"], {
      extractKeyInfo: async () => ({
        api_key: key,
        db_path: "/tmp/state.vscdb",
      }),
    }));

    assert.equal(output.stdout, `${key}\n`);
    assert.match(output.stderr, /WARNING: printing the full Windsurf API key/);
  });

  it("supports --key-env with shell quoting", async () => {
    const key = "token'with-quote";
    const output = await captureStdout(() => main(["--key-env"], {
      extractKeyInfo: async () => ({
        api_key: key,
        db_path: "/tmp/state.vscdb",
      }),
    }));

    assert.equal(output, "export WINDSURF_API_KEY='token'\\''with-quote'\n");
  });
});
