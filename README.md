# fast-context-skill

Fast Context 的 Skill + CLI 形态：面向 Claude / agent 工作流的 AI 驱动语义代码搜索工具。

已发布到 npm：[`fast-context-skill`](https://www.npmjs.com/package/fast-context-skill)。两个 bin 等价：`fast-context-skill`、`fast-cxt-skill`。

本项目复用 [`fast-context-mcp`](https://github.com/awei84/fast-context-mcp) 的 Node.js 核心代码，只新增一层 CLI 和 `SKILL.md`。它不是 Python 重写版，也不会引入本地语义搜索兜底。

## 什么时候用

- 需要给 Claude Desktop、Cursor 或其他 MCP 客户端接入 MCP server 时，用 [`fast-context-mcp`](https://github.com/awei84/fast-context-mcp)。
- 需要一个 Skill 友好的 CLI，让 Claude / agent 通过 `npx` 调用时，用本项目 `fast-context-skill`。

两种形态复用同一套 Windsurf SWE-grep 协议和内置本地工具。

## 环境要求

- Node.js >= 18
- Windsurf 账号 / 本机 Windsurf 登录状态，或手动设置 `WINDSURF_API_KEY`

不需要系统安装 `rg` 或 `tree`。`ripgrep` 通过 `@vscode/ripgrep` 内置，目录树输出使用 `tree-node-cli`。

## 快速开始

无需全局安装，`npx` 会自动拉取最新版：

```bash
npx -y fast-context-skill search \
  --query "where is authentication handled" \
  --project /absolute/path/to/project
```

也兼容同类 Skill 的顶层参数形式（省略 `search` 子命令）：

```bash
npx -y fast-context-skill \
  --query "where is authentication handled" \
  --project /absolute/path/to/project
```

> 提示：query 优先用英文。底层模型的代码语料以英文为主，英文 query 与代码同语种，语义召回更准。

从本机 Windsurf 安装中提取 API Key：

```bash
npx -y fast-context-skill extract-key
```

本仓库本地开发时：

```bash
node src/cli.mjs search \
  --query "where is authentication handled" \
  --project /absolute/path/to/project
```

## 安装为 Claude Skill

把 `SKILL.md` 放到 Claude 的 skills 目录即可（命令通过 `npx` 拉取 CLI，无需把整个包放进去）：

```bash
mkdir -p ~/.claude/skills/fast-context-skill
npm pack fast-context-skill            # 下载发布包 tarball
tar -xzf fast-context-skill-*.tgz
cp package/SKILL.md ~/.claude/skills/fast-context-skill/SKILL.md
rm -rf package fast-context-skill-*.tgz
```

之后在 Claude Code 里可用 `/fast-context-skill` 调用，或让 Claude 在需要定位代码时自动触发。

## 设置 API Key

CLI 优先读取环境变量 `WINDSURF_API_KEY`，未设置时再从本机 Windsurf 数据库自动提取。显式设置后即使卸载 Windsurf 也能继续用。

**重要：Windsurf 当前的 key 形如 `devin-session-token$<JWT>`，其中含 `$`。写进 shell 配置时必须用单引号，否则 `$<JWT>` 会被 shell 当变量展开导致 key 截断、认证返回 401。**

```bash
# 写入 ~/.zshrc（bash 用户写 ~/.bashrc）——注意是单引号
echo "export WINDSURF_API_KEY='$(npx -y fast-context-skill --print-key)'" >> ~/.zshrc
source ~/.zshrc
```

或手动粘贴（同样必须单引号）：

```bash
export WINDSURF_API_KEY='devin-session-token$eyJhbGci...'
```

`--key-env` 会输出已正确加好单引号的 export 命令：

```bash
eval "$(npx -y fast-context-skill --key-env)"
```

## CLI

### `search`

```bash
fast-context-skill search --query <text> --project <absolute-path> [options]
```

参数：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--query`, `-q` | 必填 | 自然语言搜索问题 |
| `--project`, `-p` | 必填 | 项目根目录；相对路径会先转成绝对路径再校验 |
| `--tree-depth` | `3` | repo map 深度，`0-6`；大仓库建议调低 |
| `--max-turns` | `FC_MAX_TURNS` 或 `3` | 搜索轮数，`1-5` |
| `--max-results` | `10` | 最大返回文件数，`1-30` |
| `--max-commands` | `FC_MAX_COMMANDS` 或 `8` | 每轮最大本地命令数 |
| `--timeout-ms` | `FC_TIMEOUT_MS` 或 `30000` | 请求超时时间，单位毫秒 |
| `--exclude` | 无 | 排除路径或 glob；可重复，也支持逗号分隔；逗号会被当作分隔符 |
| `--include-code-snippets` | `FC_INCLUDE_SNIPPETS` 或 `false` | 输出中附带代码片段 |
| `--json` | `false` | 用 JSON 包装输出 |
| `--progress` | `false` | 将进度日志输出到 stderr |
| `--check-key` | `false` | 验证 Windsurf API Key 自动发现，只输出脱敏值 |
| `--print-key` | `false` | 输出完整 Windsurf API Key，仅限本机排查使用 |
| `--key-env` | `false` | 输出 `export WINDSURF_API_KEY=...` 命令 |
| `--db-path` | 无 | 指定 Windsurf `state.vscdb` 路径，仅用于 key 命令 |

输出包含相关文件路径、行号范围、供后续 `rg` 使用的 grep keywords，以及描述实际搜索配置的 `[config]` 行。

### `extract-key`

```bash
fast-context-skill extract-key
```

读取本机 Windsurf SQLite 数据库，并打印可直接使用的 `WINDSURF_API_KEY` export 命令。

也可以使用快捷 key 命令：

```bash
npx -y fast-context-skill --check-key
npx -y fast-context-skill --print-key
eval "$(npx -y fast-context-skill --key-env)"
```

`--print-key` 和 `--key-env` 会输出完整密钥，只应在用户本机排查时使用，不要写入日志、issue 或仓库文件。

## Skill

`SKILL.md` 会指导 agent 调用：

```bash
npx -y fast-context-skill search --query "..." --project /absolute/path/to/project
```

预期工作流：

1. 用 Fast Context 找候选文件和 grep keywords。
2. 用 `rg` 或直接读取文件核验候选结果。
3. 基于具体 `path:line` 证据回答。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `WINDSURF_API_KEY` | auto-discover | Windsurf API key |
| `FC_MAX_TURNS` | `3` | 每次查询的搜索轮数 |
| `FC_MAX_COMMANDS` | `8` | 每轮最大并行本地命令数 |
| `FC_TIMEOUT_MS` | `30000` | Connect 请求超时毫秒数 |
| `FC_RESULT_MAX_LINES` | `50` | 单条命令输出最大行数 |
| `FC_LINE_MAX_CHARS` | `250` | 单行输出最大字符数 |
| `FC_INCLUDE_SNIPPETS` | `false` | 默认是否输出代码片段 |
| `FC_REPO_MAP_MODE` | `bootstrap_hotspot` | repo map 策略：`bootstrap_hotspot` 或 `classic` |
| `FC_BOOTSTRAP_ENABLED` | `true` | 是否启用 bootstrap hotspot 发现 |
| `FC_BOOTSTRAP_TREE_DEPTH` | `1` | bootstrap 阶段目录树深度 |
| `FC_BOOTSTRAP_MAX_TURNS` | `2` | bootstrap 阶段搜索轮数 |
| `FC_BOOTSTRAP_MAX_COMMANDS` | `6` | bootstrap 阶段最大命令数 |
| `FC_HOTSPOT_TOP_K` | `4` | 追加的热点目录数量 |
| `FC_HOTSPOT_TREE_DEPTH` | `2` | 热点子树深度 |
| `FC_HOTSPOT_MAX_BYTES` | `122880` | repo map 字节预算 |
| `WS_MODEL` | `MODEL_SWE_1_6_FAST` | Windsurf model |
| `WS_APP_VER` | `1.48.2` | Windsurf app version 元数据 |
| `WS_LS_VER` | `1.9544.35` | Windsurf language server version 元数据 |

## 项目结构

```text
fast-context-skill/
├── src/
│   ├── cli.mjs              # CLI 入口
│   ├── config.mjs           # 运行时环境变量配置
│   ├── core.mjs             # 从 fast-context-mcp 复用的协议/搜索核心
│   ├── executor.mjs         # 本地 rg/readfile/tree/ls/glob 执行器
│   ├── extract-key.mjs      # Windsurf API Key 提取
│   ├── protobuf.mjs         # Connect-RPC/Protobuf 辅助函数
│   ├── directory-scorer.mjs # repo map 热点目录评分
│   └── project-path.mjs     # 项目路径校验
├── SKILL.md
├── NOTICE.md
├── references/
│   └── script-contract.md
├── package.json
└── README.md
```

## 开发

```bash
npm install
npm test
node src/cli.mjs --help
```

## 不做什么

- 不做本地 `semble` 兜底（会破坏纯 Node、零系统依赖、`npx` 一键的定位）。
- 不走 Python 依赖路线。
- 不替代 MCP 包；本项目只提供独立的 CLI + Skill 形态。
- 不做多模型 fallback / 重试退避：交互式工具失败时人会重看，限流时自动重试反添乱，且本项目认定主模型 `WS_MODEL` 最优，切备用 = 主动降级。保留单模型配置和已有 HTTP 重试即可。
