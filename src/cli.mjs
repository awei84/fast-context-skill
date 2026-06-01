#!/usr/bin/env node

import { realpathSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractKeyInfo, searchWithContent } from "./core.mjs";
import { readRuntimeConfig } from "./config.mjs";
import { validateProjectPath } from "./project-path.mjs";

const PACKAGE_JSON = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const GLOBAL_FLAGS = new Set(["--help", "-h", "--version", "-v"]);

export function isDirectRun(argvPath = process.argv[1], moduleUrl = import.meta.url) {
  if (!argvPath) return false;
  try {
    return realpathSync(argvPath) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

function usage() {
  return `fast-context-skill ${PACKAGE_JSON.version}

Usage:
  fast-context-skill search --query <text> --project <absolute-path> [options]
  fast-context-skill --query <text> --project <absolute-path> [options]
  fast-context-skill extract-key
  fast-context-skill --check-key | --print-key | --key-env

Commands:
  search        运行 AI 语义代码搜索，输出文件路径、行号范围和 grep keywords
  extract-key   从本机 Windsurf 安装中提取 API Key

Search options:
  -q, --query <text>              自然语言查询，必填
  -p, --project <path>            项目根目录，必填，建议传绝对路径
      --project-path <path>       --project 的别名
      --tree-depth <n>            repo map 深度，默认 3，允许 0-6
      --max-turns <n>             搜索轮数，默认来自 FC_MAX_TURNS 或 3，允许 1-5
      --max-results <n>           返回文件数，默认 10，允许 1-30
      --max-commands <n>          每轮最大本地命令数，默认来自 FC_MAX_COMMANDS 或 8
      --timeout-ms <n>            请求超时毫秒数，默认来自 FC_TIMEOUT_MS 或 30000
      --exclude <pattern>         排除路径/文件模式，可重复；逗号分隔也可
      --include-code-snippets     附带代码片段，默认 false
      --json                      输出 JSON 包装，便于脚本消费
      --progress                  将进度日志输出到 stderr
      --check-key                 验证 Windsurf API Key 自动发现，只输出脱敏值
      --print-key                 输出完整 Windsurf API Key，仅限本机排查使用
      --key-env                   输出 export WINDSURF_API_KEY=... 命令
      --db-path <path>            指定 Windsurf state.vscdb 路径，仅用于 key 命令

Environment:
  WINDSURF_API_KEY                Windsurf API Key；未设置时自动读取本机 Windsurf 数据库
  FC_MAX_TURNS / FC_MAX_COMMANDS / FC_TIMEOUT_MS / FC_INCLUDE_SNIPPETS
  FC_REPO_MAP_MODE / FC_BOOTSTRAP_* / FC_HOTSPOT_*
`;
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("-")) {
      args._.push(token);
      continue;
    }

    const eq = token.indexOf("=");
    const flag = eq === -1 ? token : token.slice(0, eq);
    const inlineValue = eq === -1 ? null : token.slice(eq + 1);

    if ([
      "--help",
      "-h",
      "--version",
      "-v",
      "--json",
      "--progress",
      "--include-code-snippets",
      "--check-key",
      "--print-key",
      "--key-env",
    ].includes(flag)) {
      args[flag] = true;
      continue;
    }

    if (flag === "--no-include-code-snippets") {
      args["--include-code-snippets"] = false;
      continue;
    }

    const value = inlineValue ?? argv[++i];
    if (value == null || value.startsWith("-")) {
      throw new Error(`Missing value for ${flag}`);
    }

    if (flag === "--exclude") {
      args[flag] ??= [];
      args[flag].push(value);
    } else {
      args[flag] = value;
    }
  }

  return args;
}

function pick(args, ...names) {
  for (const name of names) {
    if (args[name] !== undefined) return args[name];
  }
  return undefined;
}

function parseIntOption(value, name, { min, max }) {
  if (value === undefined) return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || String(value).trim() === "") {
    throw new Error(`${name} must be an integer`);
  }
  if (n < min || n > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return n;
}

function parseExclude(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 12) return `${key.slice(0, 2)}...${key.slice(-2)}`;
  return `${key.slice(0, 8)}...${key.slice(-6)}`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function toAbsoluteProjectPath(projectPath) {
  if (!projectPath) return projectPath;
  return resolve(projectPath);
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function runSearch(args, deps = {}) {
  const config = readRuntimeConfig();
  const query = pick(args, "--query", "-q");
  const rawProjectPath = pick(args, "--project", "--project-path", "-p");
  const projectRoot = toAbsoluteProjectPath(rawProjectPath);
  const validationError = validateProjectPath(projectRoot);

  if (!query || !String(query).trim()) {
    throw new Error("search requires --query <text>");
  }
  if (validationError) {
    throw new Error(validationError.replace(/^Error:\s*/, ""));
  }

  const maxTurns = parseIntOption(args["--max-turns"], "--max-turns", { min: 1, max: 5 }) ?? config.maxTurns;
  const maxCommands = parseIntOption(args["--max-commands"], "--max-commands", { min: 1, max: 20 }) ?? config.maxCommands;
  const maxResults = parseIntOption(args["--max-results"], "--max-results", { min: 1, max: 30 }) ?? 10;
  const treeDepth = parseIntOption(args["--tree-depth"], "--tree-depth", { min: 0, max: 6 }) ?? 3;
  const timeoutMs = parseIntOption(args["--timeout-ms"], "--timeout-ms", { min: 1000, max: 300000 }) ?? config.timeoutMs;
  const includeSnippets = args["--include-code-snippets"] ?? config.includeSnippets;
  const excludePaths = parseExclude(args["--exclude"]);
  const showProgress = Boolean(args["--progress"]);
  const searchFn = deps.searchWithContent || searchWithContent;

  const text = await searchFn({
    query: String(query).trim(),
    projectRoot,
    maxTurns,
    maxCommands,
    maxResults,
    treeDepth,
    timeoutMs,
    excludePaths,
    repoMapMode: config.repoMapMode,
    bootstrapTreeDepth: config.bootstrapTreeDepth,
    hotspotTopK: config.hotspotTopK,
    hotspotTreeDepth: config.hotspotTreeDepth,
    hotspotMaxBytes: config.hotspotMaxBytes,
    bootstrapEnabled: config.bootstrapEnabled,
    bootstrapMaxTurns: config.bootstrapMaxTurns,
    bootstrapMaxCommands: config.bootstrapMaxCommands,
    includeSnippets,
    onProgress: showProgress ? (message) => process.stderr.write(`[fast-context] ${message}\n`) : null,
  });

  if (args["--json"]) {
    printJson({ ok: !text.startsWith("Error:"), command: "search", result: text });
  } else {
    process.stdout.write(`${text}\n`);
  }
}

async function getKeyResult(args, deps = {}) {
  const extractFn = deps.extractKeyInfo || extractKeyInfo;
  const dbPath = args["--db-path"] ? resolve(args["--db-path"]) : undefined;
  return extractFn(dbPath);
}

function formatExtractKeyResult(result) {
  if (result.error) {
    return `Error: ${result.error}\n${result.hint || ""}\nDB path: ${result.db_path || "N/A"}`;
  }

  const key = result.api_key;
  return [
    "Windsurf API Key extracted successfully",
    "",
    `  Key: ${key.slice(0, 30)}...${key.slice(-10)}`,
    `  Length: ${key.length}`,
    `  Source: ${result.db_path}`,
    "",
    "Usage:",
    `  export WINDSURF_API_KEY=${shellQuote(key)}`,
  ].join("\n");
}

async function runExtractKey(args, deps = {}) {
  const result = await getKeyResult(args, deps);
  const ok = !result.error;
  if (args["--json"]) {
    printJson({ ok, command: "extract-key", result });
  } else {
    process.stdout.write(`${formatExtractKeyResult(result)}\n`);
  }
  if (!ok) process.exitCode = 1;
}

async function runKeyCommand(args, deps = {}) {
  const keyFlags = ["--check-key", "--print-key", "--key-env"].filter((flag) => args[flag]);
  if (keyFlags.length > 1) {
    throw new Error("Choose only one key command: --check-key, --print-key, or --key-env");
  }

  const result = await getKeyResult(args, deps);
  if (result.error) {
    const text = `Error: ${result.error}\n${result.hint || ""}\nDB path: ${result.db_path || "N/A"}`;
    if (args["--json"]) {
      printJson({ ok: false, command: keyFlags[0].slice(2), result });
    } else {
      process.stdout.write(`${text}\n`);
    }
    process.exitCode = 1;
    return;
  }

  if (args["--print-key"]) {
    process.stderr.write(
      "[fast-context] WARNING: printing the full Windsurf API key to stdout. " +
      "Do not paste it into logs, issues, or repository files.\n"
    );
    process.stdout.write(`${result.api_key}\n`);
    return;
  }

  if (args["--key-env"]) {
    process.stdout.write(`export WINDSURF_API_KEY=${shellQuote(result.api_key)}\n`);
    return;
  }

  if (args["--json"]) {
    printJson({
      ok: true,
      command: "check-key",
      result: {
        api_key_masked: maskKey(result.api_key),
        db_path: result.db_path,
      },
    });
    return;
  }

  process.stdout.write("Windsurf API Key discovered.\n");
  process.stdout.write(`  Key: ${maskKey(result.api_key)}\n`);
  process.stdout.write(`  Source: ${result.db_path}\n`);
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const args = parseArgs(argv);
  let command = args._[0];

  if (args["--version"] || args["-v"]) {
    process.stdout.write(`${PACKAGE_JSON.version}\n`);
    return;
  }

  if (args["--help"] || args["-h"]) {
    process.stdout.write(usage());
    return;
  }

  if (args["--check-key"] || args["--print-key"] || args["--key-env"]) {
    await runKeyCommand(args, deps);
    return;
  }

  if (!command && (args["--query"] || args["-q"])) {
    command = "search";
  }

  if (!command) {
    process.stdout.write(usage());
    return;
  }

  if (GLOBAL_FLAGS.has(command)) {
    process.stdout.write(command === "--version" || command === "-v" ? `${PACKAGE_JSON.version}\n` : usage());
    return;
  }

  if (command === "search") {
    await runSearch(args, deps);
    return;
  }

  if (command === "extract-key" || command === "extract_windsurf_key") {
    await runExtractKey(args, deps);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (isDirectRun()) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n\n`);
    process.stderr.write(usage());
    process.exit(1);
  });
}
