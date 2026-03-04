# Claude Skills 规范与路径速查

本文档为 [SKILL.md](SKILL.md) 的补充，提供 frontmatter 与各 IDE 路径、安装命令的速查。

**规范来源**：
- [Agent Skills Specification](https://agentskills.io/specification)
- [Claude Code: 使用 skills 扩展 Claude](https://docs.claude.com/zh-CN/docs/claude-code/skills)
- [anthropics/skills GitHub](https://github.com/anthropics/skills)

## Frontmatter 速查

### 必需（Agent Skills 开放标准）

| 字段 | 约束 | 说明 |
|------|------|------|
| `name` | 1–64 字符，仅 a-z、0-9、`-`；与父目录名一致；不以 `-` 开头/结尾；无 `--` | 唯一标识，对应 `/slash-command` |
| `description` | 1–1024 字符，非空 | 做什么 + 何时用；含触发词，第三人称 |

### 可选（开放标准）

| 字段 | 约束 | 说明 |
|------|------|------|
| `license` | 建议简短 | 许可证名称或捆绑的 LICENSE 文件引用 |
| `compatibility` | 1–500 字符 | 环境要求（产品、系统依赖、网络等） |
| `metadata` | 键值对 | 任意扩展元数据 |
| `allowed-tools` | 空格分隔列表 | 实验性；预批准工具 |

### 可选（Claude Code 扩展，部分在 Cursor 中可用）

| 字段 | 说明 |
|------|------|
| `argument-hint` | 自动完成时显示的参数提示，如 `[filename] [format]` |
| `disable-model-invocation` | `true` 时仅用户可调用，不自动加载 |
| `user-invocable` | `false` 时从 `/` 菜单隐藏，仅模型可调用 |
| `allowed-tools` | 该 skill 激活时无需逐次批准的工具 |
| `context` | `fork` 时在 subagent 中运行 |
| `agent` | 与 `context: fork` 同用时指定 subagent 类型 |
| `hooks` | 限定于此 skill 生命周期的 hooks |

## 各 IDE 路径

| 环境 | 项目级 | 用户级 |
|------|--------|--------|
| **Claude Code** | `.claude/skills/<skill-name>/` | `~/.claude/skills/<skill-name>/` |
| **Cursor** | `.cursor/skills/<skill-name>/` | `~/.cursor/skills/<skill-name>/` |
| OpenCode | `.opencode/skill/` | `~/.config/opencode/skill/` |
| Codex | `.codex/skills/` | `~/.codex/skills/` |

注意：Cursor 内置 skill 目录 `~/.cursor/skills-cursor/` 仅供系统使用，不要将自定义 skill 放在该目录。

## 安装命令

- **add-skill**（推荐，多 agent 自动检测）  
  - 安装整个仓库：`npx add-skill <owner>/<repo>`  
  - 安装单个 skill：`npx add-skill <owner>/<repo> --skill <skill-name>`  
  - 全局：`npx add-skill <owner>/<repo> -g`  
  - 非交互（CI）：`npx add-skill <owner>/<repo> --skill <name> -g -y`

- **openskills**  
  - `npx openskills install <owner>/<repo>`  
  - 默认可能安装到 `./.agent/skills` 或 `./.claude/skills`；使用 `--global` 安装到用户目录时多为 `~/.claude/skills` 或 `~/.agent/skills`（以工具文档为准）。

安装后，在 Cursor 中 skill 会出现在 `.cursor/skills/` 或 `~/.cursor/skills/`，可通过 `/skill-name` 或由 agent 根据 description 自动匹配调用。

## 目录名与 name 一致说明

Agent Skills 规范要求 `name` 与**父目录名**一致。若使用 kebab-case 的 `name`（如 `claude-skills-create-skills`），建议父目录也命名为 `claude-skills-create-skills`，以便通过 [skills-ref validate](https://github.com/agentskills/agentskills/tree/main/skills-ref) 等校验。仓库展示名可仍用 `ClaudeSkillsCreateSkills`，安装时复制到的目录名以实际工具行为为准。
