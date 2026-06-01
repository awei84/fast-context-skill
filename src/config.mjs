/**
 * 读取 CLI 运行时配置。这里保留母项目的环境变量语义，但不依赖 MCP 层。
 */
export function readIntEnv(name, defaultValue, opts = {}, env = process.env) {
  const raw = env[name];
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  const min = typeof opts.min === "number" ? opts.min : null;
  const max = typeof opts.max === "number" ? opts.max : null;
  let value = parsed;
  if (min !== null) value = Math.max(min, value);
  if (max !== null) value = Math.min(max, value);
  return value;
}

export function readBoolEnv(name, defaultValue, env = process.env) {
  const raw = env[name];
  if (raw == null) return defaultValue;
  const v = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function readRuntimeConfig(env = process.env) {
  return {
    maxTurns: readIntEnv("FC_MAX_TURNS", 3, { min: 1, max: 5 }, env),
    maxCommands: readIntEnv("FC_MAX_COMMANDS", 8, { min: 1, max: 20 }, env),
    timeoutMs: readIntEnv("FC_TIMEOUT_MS", 30000, { min: 1000, max: 300000 }, env),
    repoMapMode: env.FC_REPO_MAP_MODE === "classic" ? "classic" : "bootstrap_hotspot",
    bootstrapTreeDepth: readIntEnv("FC_BOOTSTRAP_TREE_DEPTH", 1, { min: 1, max: 3 }, env),
    hotspotTopK: readIntEnv("FC_HOTSPOT_TOP_K", 4, { min: 0, max: 8 }, env),
    hotspotTreeDepth: readIntEnv("FC_HOTSPOT_TREE_DEPTH", 2, { min: 1, max: 4 }, env),
    hotspotMaxBytes: readIntEnv("FC_HOTSPOT_MAX_BYTES", 122880, { min: 16384, max: 262144 }, env),
    bootstrapEnabled: readBoolEnv("FC_BOOTSTRAP_ENABLED", true, env),
    bootstrapMaxTurns: readIntEnv("FC_BOOTSTRAP_MAX_TURNS", 2, { min: 1, max: 3 }, env),
    bootstrapMaxCommands: readIntEnv("FC_BOOTSTRAP_MAX_COMMANDS", 6, { min: 1, max: 8 }, env),
    includeSnippets: readBoolEnv("FC_INCLUDE_SNIPPETS", false, env),
  };
}
