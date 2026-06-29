---
title: "codebase-memory-mcp 安装与接入计划"
doc_type: install_plan
module: scm
topic: "aip-scm-node-deepdive-08-codebase-memory-mcp-install-plan"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
boundary: "在用户 macOS 本机执行；只读结构索引、离线、本地 SQLite；不写生产、不联网回传"
verify_note: "GitHub README/官网被 Cloudflare 挡，无法在沙箱内抓取原文；以下命令来自官方仓库说明与多篇教程的交叉验证，执行前请对照 github.com/DeusData/codebase-memory-mcp 最新 README 复核一次"
---

# codebase-memory-mcp 安装与接入计划

> 节点深化系列第 08 篇。回应"把安装计划也补充进去"。本篇是**可照做的安装运行手册**——在用户 macOS 本机执行（沙箱为 Linux，无法改本机配置）。直接服务于审计篇 D-P1-01/02（`main.tsx` 7026 行 / `server/index.mjs` 4596 行的单文件巨石）的拆分需求。

## 1. 为什么是这个工具（定位）

| 维度 | 说明 |
|---|---|
| 它解决的债务 | D-P1-01/02 巨石单文件 + AI 反复读同一大文件 + 跨模块依赖难查（审计篇第 4 节）|
| 它是什么 | 高性能代码情报 MCP：把代码库索引成持久知识图谱（函数/类/调用链/HTTP 路由/跨服务链接），158 语言、毫秒级索引、亚毫秒查询、显著降低 token |
| 形态 | 单静态二进制、零依赖、stdio MCP 服务、本地 SQLite 图存储、可选 3D 图可视化 |
| 边界契合 | **只读结构索引 + 离线 + 本地存储**，与本项目"只读、不写生产"的治理边界天然一致 |
| 暴露能力 | 14 个 MCP 工具：索引仓库、查询知识图谱、分析架构、带结构上下文取源码（支持 Cypher 查询）|

价值落点：拆 `main.tsx` 时，先让它索引出"哪个 Panel 调用哪些函数 / 依赖哪些类型 / 谁引用谁"，把"凭记忆拆"变成"按依赖图拆"，直接喂给审计篇 D-P1-01/02 的拆分蓝图。

## 2. 安装前置检查（务必先做）

| 检查项 | 动作 | 关联 |
|---|---|---|
| 🔴 **先清密钥再索引** | **先执行审计 D-P0-01：移走 `ai_video.pem` 私钥**，否则它会被读入代码图谱/索引 | 审计 D-P0-01 |
| 准备 `.cbmignore` | 在仓库根准备忽略清单，排除 `node_modules/`、`dist/`、`tmp/`、`.playwright-*`、`*.xlsx`、`*.pem` 等大/敏感目录 | 审计 D-P2-02 杂物 |
| PATH | 确认 `~/.local/bin` 在 `PATH`（安装脚本默认落点）| — |
| 目标 agent | 明确接入对象：Claude Code CLI / Cowork(Claude Desktop) / 二者皆要 | 见第 4 节 |
| 架构 | macOS Apple Silicon / Intel，安装脚本自动识别；如手动下载 release 需选对架构 | — |
| 备份 | 接入前备份现有 `~/.claude/.mcp.json` 或 `claude_desktop_config.json` | — |

`.cbmignore` 建议内容（放仓库根，与 `.gitignore` 同级）：
```gitignore
node_modules/
dist/
build/
tmp/
.playwright-cli/
.playwright-mcp/
.codegraph/
*.xlsx
*.pem
*.sqlite
```

## 3. 安装方式（三选一，推荐 A）

### A. 一行脚本（推荐，自动接入多数 agent）
```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```
脚本行为：把二进制装到 `~/.local/bin`，随后运行 `codebase-memory-mcp install` 自动探测并接入已安装的 agent（官方列出 11 种：Claude Code、Codex CLI、Gemini CLI、Zed、OpenCode、Antigravity、Aider、KiloCode、VS Code、OpenClaw、Kiro），为各 agent 写入 MCP 条目、说明文件与 pre-tool hook。

> 安全提醒：`curl | bash` 会执行远程脚本。可先 `curl -fsSL <url> -o install.sh` 下载、`less install.sh` 审阅后再 `bash install.sh`。

### B. 包管理器（按官方说明，择一）
官方支持 npm / pip / Homebrew / Scoop / Winget / Chocolatey / AUR / `go install`。macOS 优先 Homebrew 或 npm（具体 tap/包名以仓库 README 为准）。

### C. 源码构建（需要 3D 可视化时）
```bash
git clone https://github.com/DeusData/codebase-memory-mcp.git
cd codebase-memory-mcp
scripts/build.sh            # 标准二进制
# 或 scripts/build.sh --with-ui   # 带 3D 图可视化
# 产物：build/c/codebase-memory-mcp
```

## 4. 接入 Claude（按你的客户端选）

### 4.1 Claude Code CLI（方式 A 已自动接入；如需手动）
```bash
claude mcp add codebase-memory-mcp -- ~/.local/bin/codebase-memory-mcp
```
或编辑全局 `~/.claude/.mcp.json` / 项目级 `.mcp.json`：
```json
{
  "mcpServers": {
    "codebase-memory-mcp": {
      "command": "/Users/pray/.local/bin/codebase-memory-mcp",
      "args": []
    }
  }
}
```
> 该二进制无参数运行即为 stdio MCP 服务；其 `install/update/config` 等为 CLI 子命令。

### 4.2 Cowork / Claude Desktop
Cowork 构建于 Claude Code 之上，但 **MCP 连接是否自动复用 Claude Code 配置需在应用内确认**。稳妥做法：
1. 先在 Cowork/Claude 的设置（Connectors / MCP）里查看是否已出现 `codebase-memory-mcp`；
2. 若未出现，按 Desktop 的 `claude_desktop_config.json` 增加同样的 `mcpServers` 段（`command` 指向 `~/.local/bin/codebase-memory-mcp`，`args: []`）；
3. 完全退出并重启应用。

## 5. 索引本项目

接入并重启后，在 agent 里直接说：
```
Index this project
```
（即调用 `index_repository`，对当前目录首次全量解析、之后按文件内容哈希增量；内置 watcher 会用 git 轮询自适应增量同步。）

- 索引目标优先：`drafts/prototypes/scm-data-governance-workbench-v0`（巨石所在）。
- 确认 `.cbmignore` 生效，避免把 `tmp/`、`node_modules/`、`*.xlsx` 卷进图谱。
- 首次索引完成后，可让 agent 做结构查询验证（见下）。

## 6. 验证清单

| 步骤 | 期望 |
|---|---|
| `/mcp` | 列表出现 `codebase-memory-mcp`，含 **14 个工具** |
| 结构查询 | 询问"`FulfillmentDashboardPanel` 依赖哪些函数/类型/被谁引用"能基于图谱回答 |
| 增量 | 改一个文件后再次索引，仅该文件重解析 |
| token 体感 | 结构性问题不再整文件灌入上下文 |
| 边界 | 仅本地 SQLite 图、无生产写入、密钥已不在索引范围 |

## 7. 与本系列的配合用法

| 用途 | 怎么用 |
|---|---|
| 巨石拆分（D-P1-01/02）| 用图谱导出 Panel↔函数↔类型依赖，作为"按依赖边界切组件/路由/SQL 三层"的事实依据 |
| 节点接口核对 | 交叉审计（07）里各节点"接口与依赖"可用调用图复核是否与代码一致 |
| 影响分析 | 改某指标取数函数前，先查"谁调用它"，避免回归 |

## 8. 安全、边界与回滚

| 项 | 说明 |
|---|---|
| 第三方二进制读全库 | 索引前务必移除密钥（D-P0-01）、用 `.cbmignore` 排除敏感文件 |
| 离线本地 | 索引与查询为本地 SQLite、离线；不向外回传源码（以 README 声明为准，企业环境可抓包确认）|
| 不改业务代码 | 该工具只读索引，不修改仓库源码，符合本轮"不动代码"边界 |
| 回滚/卸载 | 删除 `~/.local/bin/codebase-memory-mcp` 与各 agent 配置中的 `codebase-memory-mcp` 段、删除本地索引库即可；恢复第 2 节备份 |

## 9. 验收标准

| 维度 | 目标 |
|---|---|
| 接入 | 目标客户端 `/mcp` 可见且 14 工具可用 |
| 索引 | `scm-data-governance-workbench-v0` 索引成功，敏感目录已排除 |
| 安全 | 索引范围内无 `*.pem`/密钥 |
| 产出 | 至少导出 1 份巨石依赖关系，供 D-P1-01/02 拆分蓝图使用 |

---
*本篇为系列第 08 篇（安装运行手册）。总入口见 `00-index`。命令请对照仓库最新 README 复核：github.com/DeusData/codebase-memory-mcp。*
