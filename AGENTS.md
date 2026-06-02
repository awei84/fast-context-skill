# fast-context-skill

> 本文件会被 Codex 自动加载。开新会话请先读 `localdocs/2026-06-01_项目背景与决策.md` 获取完整背景。

## 这是什么项目

`fast-context-mcp`（纯 Node、MCP 形态）的 **Skill + CLI 形态版本**，服务 Codex / agent 生态。
**复用母项目核心代码，不推倒重来。** 用 Node，不用 Python。

- 母项目：`/Users/awei84/开源项目/fast-context-mcp`（继续维护，不弃）
- 本项目：加一层 CLI 入口 + 一个 SKILL.md

## 铁律（务必遵守）

1. ❌ **不做本地 Semble 兜底**。引入它会破坏「纯 Node、零系统依赖、npx 一键」的核心定位。详见背景文档「决策 1」。
2. ✅ **CLI 用 Node 复用母项目代码**（`core.mjs / executor.mjs / protobuf.mjs / extract-key.mjs` 等），不重写协议层。
3. ✅ **Skill 只做薄包装**：SKILL.md 是 markdown，命令走 `npx -y <包名> search ...`。
4. ❌ **不做多模型 fallback + 重试退避**。交互式工具失败时人会重看，限流时自动重试反添乱，且本项目认定主模型最优，切备用 = 主动降级。逻辑同决策 1，已否决。

## 当前进度

**首版实现已完成、未提交。** 工作区为完整实现待提交状态。

已落地：
- `src/cli.mjs`：`search` / `extract-key` / key 快捷命令（`--check-key` / `--print-key` / `--key-env` / `--db-path`），支持顶层 `--query` 调用、`--json`、`--progress`、`--include-code-snippets`、`--exclude`
- 复用母项目 6 个核心模块（core / executor / protobuf / directory-scorer / extract-key / project-path）
- `SKILL.md`（通用 agent/Codex 取向：简洁 frontmatter、英文 query 引导、输出示例）
- `references/script-contract.md`、`NOTICE.md`、README、LICENSE、38 个测试全绿

已修复的真 bug：`--progress` 空转、`--db-path` 被丢弃、mock 掩盖集成 bug（已补不打 mock 的透传测试）。

待决策事项（非阻塞）：
- 是否 `npm publish`（**SKILL.md 全靠 `npx -y fast-context-skill`，未发布则该命令对外不可用**）
- core 抽共享包以防与母项目漂移（NOTICE.md 已记，等真出现并行改协议时再做）
- 可选：CI 跑 npm test

## AI 代码搜索工具协作策略（沿用母项目规范）

**回答代码相关问题前，先调用搜索工具定位代码，禁止猜测。**

根据问题类型选择入口，避免机械地每次都先 `rg`：

- 已知关键词 / 路由 / 函数名 / 类名 / 文件名 / 报错原文 → 先用 `rg`，再读文件核验。
- 不知道代码在哪，只知道业务含义 / 流程 / 功能目的 → 直接用 `Fast-Context`（`max_results:8, max_turns:2, tree_depth:2`，不足时提高）。
- Fast-Context 返回候选后 → 读候选文件核验；必要时再用 `rg` 拉引用或用 `grep keywords` 做精确确认。

推荐工作流：

```text
不确定位置/业务语义问题 → Fast-Context → 读候选文件核验 → 必要时 rg 拉引用
明确字符串/符号/报错 → rg → 读文件核验
```

## 语言

简体中文回答，技术术语保持原文。
