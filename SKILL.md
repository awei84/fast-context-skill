---
name: fast-context-skill
description: AI-driven semantic code search via Windsurf's Devstral SWE-grep protocol. Use to find where logic lives, how a flow works, which files matter for a bug or feature, or to orient in an unfamiliar repo before editing. 用于定位代码、理解业务链路与调用关系。已知精确标识符时先用 rg。
when_to_use: |
  Trigger on requests like "where is X implemented/handled", "how does this flow work", "which files relate to <feature/bug>", "理解一下这块逻辑", "这个功能在哪实现". Use when the exact symbol name is not yet known and you need a short list of candidate files before reading or editing. Skip it when the filename/symbol is already known (use rg) or for structural refactors (use ast-grep).
argument-hint: "[query]"
user-invocable: true
allowed-tools: Bash
---

# Fast Context

## 何时使用

当需要探索代码库上下文、定位功能实现、理解跨模块调用链，或先用自然语言缩小候选文件时使用本技能。

已知明确函数名、类名、变量名、路由、报错文本时，先用 `rg` 精确搜索；如果结果不足以理解上下文，再使用 Fast Context。

## 工作流

1. 使用 CLI 运行语义搜索。**优先用英文写 query**：底层模型的代码语料以英文为主，英文 query 与代码同语种，语义召回更准。中文也能用，但建议把关键名词换成英文（"用户登录鉴权" → "user login authentication"）。

```bash
npx -y fast-context-skill search --query "where is auth handled" --project /absolute/path/to/project
```

兼容形式：

```bash
npx -y fast-context-skill --query "where is auth handled" --project /absolute/path/to/project
```

2. 阅读输出中的文件路径、行号范围、`grep keywords` 和 `[config]`（见下方「输出示例」）。

3. 必须用 `rg` 或文件读取核验 Fast Context 返回的候选结果，再基于具体 `path:line` 给结论。

## 输出示例

```text
Found 3 relevant files.

--- [1/3] /project/src/auth/handler.mjs (L10-60, L120-180) ---
--- [2/3] /project/src/middleware/jwt.mjs (L1-40) ---
--- [3/3] /project/src/models/user.mjs (L20-80) ---

grep keywords: authenticate, jwt.*verify, session.*token

[config] project_path=/project, tree_depth=3, tree_size=12.5KB, max_turns=3, max_results=10, timeout_ms=30000
```

把文件 + 行号当作起点，用 `grep keywords` 做二次精确搜索，再读文件核验。失败时输出会带 `Error:` 和 `[hint]`，按提示调小 `--tree-depth`/`--max-turns` 或缩小 `--project`。

## 推荐参数

query 尽量用英文短句描述要找的功能或代码路径。默认轻量模式：

```bash
npx -y fast-context-skill search \
  --query "where is the user login session validated" \
  --project /absolute/path/to/project \
  --max-results 10 \
  --max-turns 3 \
  --tree-depth 3 \
  --exclude node_modules,dist,build,coverage
```

大仓库或超时：

```bash
npx -y fast-context-skill search \
  --query "where is the user login session validated" \
  --project /absolute/path/to/project \
  --max-results 8 \
  --max-turns 2 \
  --tree-depth 1 \
  --exclude node_modules,dist,build,coverage,vendor
```

需要一次性获取代码片段：

```bash
npx -y fast-context-skill search \
  --query "where is the user login session validated" \
  --project /absolute/path/to/project \
  --include-code-snippets
```

## API Key

CLI 会优先读取 `WINDSURF_API_KEY`。未设置时，会尝试从本机 Windsurf 数据库自动读取。

也可以手动提取：

```bash
npx -y fast-context-skill extract-key
```

常用 key 排查命令：

```bash
npx -y fast-context-skill --check-key
npx -y fast-context-skill --print-key
eval "$(npx -y fast-context-skill --key-env)"
```

`--print-key` 和 `--key-env` 会输出完整密钥，只能在用户本机排查时使用，不要写入日志或仓库文件。

## 参考

需要精确了解 CLI 参数契约和失败处理时，读取 `references/script-contract.md`。

## 约束

- 不要把 Fast Context 的结果直接当最终事实。
- 最终回答必须回指到经过核验的具体文件位置。
- 不要引入本地语义搜索 fallback；失败时返回真实错误，并按 `[hint]` 调小参数或缩小 `--project`。
