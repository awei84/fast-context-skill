# Fast Context CLI Contract

## 命令

推荐使用子命令形态：

```bash
npx -y fast-context-skill search \
  --project "/absolute/path/to/project" \
  --query "Where is <feature> implemented?"
```

为了兼容同类 Skill，也支持顶层参数形态：

```bash
npx -y fast-context-skill \
  --project "/absolute/path/to/project" \
  --query "Where is <feature> implemented?"
```

CLI 会调用 `searchWithContent()`，通过 Windsurf Devstral 做远程语义搜索，并在本地执行受限的 `rg`、文件读取和目录树命令。

大仓库或混合仓库不要默认扫整个 repo。优先把 `--project` 缩到最可能的源码子目录，例如 `backend`、`server`、`src`、`app`、`services`、`packages/<name>`，并配合 `--exclude node_modules,dist,build,coverage,vendor,generated,ent,out,target`。

## 常用参数

- `--query`, `-q`：自然语言搜索问题。
- `--project`, `--project-path`, `-p`：项目根目录。CLI 会解析为绝对路径并校验目录存在。
- `--max-results`：最大返回文件数。聚焦查找用 3-5，功能链路用 10-20，宽泛探索用 20-30。
- `--max-turns`：搜索轮数。快速定位用 1，默认 3，复杂跨模块链路可用 4-5。
- `--max-commands`：每轮允许远程搜索循环请求的本地命令数。
- `--tree-depth`：初始 repo map 深度。大仓库用 1-2，小仓库可用 4-6。
- `--timeout-ms`：Devstral 请求超时。
- `--exclude`：排除目录或文件模式，可重复，也可用逗号分隔。逗号会被当作分隔符，因此路径或 glob 本身不要包含逗号。
- `--include-code-snippets`：在候选文件下附带代码片段。
- `--progress`：将搜索进度输出到 stderr。
- `--json`：将 CLI 结果包装成 JSON。注意当前搜索结果本体仍是文本。

## Key 命令

- `extract-key`：输出脱敏 key、长度、来源路径和 export 命令。
- `--check-key`：只验证本机 Windsurf key 自动发现，输出脱敏 key。
- `--print-key`：输出完整 key，仅限本机排查使用。
- `--key-env`：输出 `export WINDSURF_API_KEY='...'`。
- `--db-path`：为 key 命令指定 Windsurf `state.vscdb` 路径。

## 响应预期

- 返回的文件和行号范围是候选上下文，不是最终事实。
- `grep keywords` 用于后续本地 `rg` 精确核验。
- `[config]` 行说明实际使用的 `tree_depth`、`max_turns`、`max_results`、超时和排除项。

## 完整性检查

在修改代码或给出项目特定结论前，至少确认相关的：

- 入口点和公开 API。
- 核心函数、类、hook、组件、命令或 handler。
- 类型、接口、schema、validator 和配置。
- 数据访问、副作用、外部调用和持久化边界。
- 调用方、消费者、路由，以及从用户可见行为到实现的链路。
- 现有测试、fixture、helper 和集成覆盖。

缺少关键上下文时，继续用更聚焦的问题查询 Fast Context，或回到本地 `rg` 和文件读取。

## 失败处理

- 依赖缺失：在包目录运行 `npm install`。
- 结果太浅：提高 `--max-turns` 或 `--max-results`，或换成更具体的问题。
- 仓库太大：降低 `--tree-depth`，增加 `--exclude`，或把 `--project` 缩小到子目录。
- 空结果但 raw response 被截断：优先按大仓库处理，缩小 `--project` 到源码子目录并增加 `--exclude` 后重跑；不要直接认定没有相关代码。
- 认证失败：先运行 `--check-key`，确认 Windsurf 已登录，或设置 `WINDSURF_API_KEY`。
- 不要引入本地语义搜索 fallback；失败时暴露真实错误和调参建议。
