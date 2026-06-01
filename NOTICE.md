# Notice

本项目是 `fast-context-mcp` 的 Skill + CLI 形态适配。

- 母项目本地路径：`/Users/awei84/开源项目/fast-context-mcp`
- 母项目 package 版本：`1.4.2`
- 本次搬运来源 commit：`e7af092c53ed92a77b47c4a88dd51ea471a0e081`
- 母项目 license：MIT

本包不使用 MCP server wrapper。运行时入口是 `src/cli.mjs`，它直接调用 `src/core.mjs` 暴露的 `searchWithContent()` 和 `extractKeyInfo()`。

当前仓库保留 vendored core 形态。后续若两个仓库继续并行演进，建议把协议和搜索核心抽成共享 npm 包，避免 `core.mjs`、`executor.mjs`、`directory-scorer.mjs` 长期漂移。
