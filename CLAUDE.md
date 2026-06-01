# fast-context-skill

> 本文件会被 Claude 自动加载。开新会话请先读 `localdocs/2026-06-01_项目背景与决策.md` 获取完整背景。

## 这是什么项目

`fast-context-mcp`（纯 Node、MCP 形态）的 **Skill + CLI 形态版本**，服务 Claude / agent 生态。
**复用母项目核心代码，不推倒重来。** 用 Node，不用 Python。

- 母项目：`/Users/awei84/开源项目/fast-context-mcp`（继续维护，不弃）
- 本项目：加一层 CLI 入口 + 一个 SKILL.md

## 铁律（务必遵守）

1. ❌ **不做本地 Semble 兜底**。引入它会破坏「纯 Node、零系统依赖、npx 一键」的核心定位。详见背景文档「决策 1」。
2. ✅ **CLI 用 Node 复用母项目代码**（`core.mjs / executor.mjs / protobuf.mjs / extract-key.mjs` 等），不重写协议层。
3. ✅ **Skill 只做薄包装**：SKILL.md 是 markdown，命令走 `npx -y <包名> search ...`。
4. ✅ 可选做「多模型 fallback + 重试退避」（≠ 本地兜底，这个要做）。

## 当前进度

代码尚未开始。下一步待办见背景文档「五、下一步待办」。

## AI 代码搜索工具协作策略（沿用母项目规范）

**回答代码相关问题前，先调用搜索工具定位代码，禁止猜测。**

- 已知函数名/类名 → `Grep`
- 理解业务逻辑/探索代码 → `Fast-Context`（`max_results:8, max_turns:2, tree_depth:2`，不足时提高）
- Fast-Context 返回 grep keywords → 立即用 `Grep` 二次精确搜索

## 语言

简体中文回答，技术术语保持原文。
