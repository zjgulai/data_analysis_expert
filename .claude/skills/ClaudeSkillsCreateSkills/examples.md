# Skill 示例（完整 frontmatter + 简短正文）

以下为符合 Agent Skills 规范、适用于 Claude Code / Cursor 的示例，可直接作为新 Skill 的起点。

---

## 示例 0：从原始内容创建 Skill（完整转换演示）

**原始内容**（假设用户提供）：
```
Git 提交规范

我们团队使用约定式提交格式：
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- refactor: 重构
- test: 测试相关

提交信息格式：<type>(<scope>): <subject>

示例：
- feat(auth): add OAuth2 login
- fix(api): resolve timeout issue

不要使用：
- 模糊的提交信息如 "fix bug" 或 "update"
- 不带类型前缀的提交
```

**转换后的 SKILL.md**：

```yaml
---
name: git-commit-conventions
description: Enforce conventional commit format for git commits. Use when committing changes, writing commit messages, or when the user mentions commit format, conventional commits, or commit conventions. 涵盖约定式提交、提交规范.
---
```

```markdown
# Git Commit Conventions

本 Skill 定义团队的 Git 提交信息规范。

## 何时使用

- 执行 git commit 时
- 用户询问提交格式或规范时
- 审查提交信息时

## 提交类型

| 类型 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `refactor` | 重构（不修复 bug 也不添加功能） |
| `test` | 测试相关 |

## 格式规范

```
<type>(<scope>): <subject>
```

- `type`：必填，从上表选择
- `scope`：可选，影响范围（如 auth, api, ui）
- `subject`：必填，简短描述（ imperative, lowercase, no period）

## 示例

```
feat(auth): add OAuth2 login support
fix(api): resolve timeout issue on large requests
docs(readme): update installation instructions
```

## 模式与反模式

- **推荐**：`feat(auth): add OAuth2 login`、`fix: resolve null pointer`
- **避免**：`fix bug`、`update`、`WIP`、无类型前缀的提交
```

**转换要点说明**：
1. **内容分类**：编码规范 → 参考型 Skill
2. **触发词提取**：commit, conventional commits, 提交规范
3. **表格化**：将列表转为表格，更清晰
4. **格式模板**：用代码块展示格式
5. **反模式**：从"不要使用"部分提取

---

## 示例 1：参考型 Skill（自动发现 + 手动调用）

```yaml
---
name: api-conventions
description: Apply REST API design conventions for this codebase. Use when writing or reviewing API endpoints, routes, or when the user mentions API style, error format, or request validation.
---

# API Conventions

When writing API endpoints:

1. Use RESTful naming: plural nouns, HTTP verbs for actions.
2. Return consistent error format: `{ "error": { "code": "...", "message": "..." } }`.
3. Validate request body with schema; return 400 with validation details on failure.
4. Document in OpenAPI/Swagger where available.

See [reference.md](reference.md) for full endpoint checklist.
```

---

## 示例 2：任务型 Skill（仅手动调用）

```yaml
---
name: deploy-staging
description: Deploy the application to staging. Use when the user explicitly asks to deploy to staging or run staging deployment.
disable-model-invocation: true
---

# Deploy to Staging

1. Run the test suite: `npm test`
2. Build: `npm run build`
3. Deploy to staging target: `./scripts/deploy.sh staging`
4. Verify health: `curl https://staging.example.com/health`

Do not proceed if tests or build fail.
```

---

## 示例 3：带参数的 Skill

```yaml
---
name: migrate-component
description: Migrate a UI component from one framework to another while preserving behavior and tests. Use when the user asks to migrate a component, convert React to Vue, or port a component.
argument-hint: [ComponentName] [SourceFramework] [TargetFramework]
---

# Component Migration

Migrate the **$0** component from **$1** to **$2**.

1. List existing props, events, and slots (or equivalent).
2. Recreate the same API in the target framework.
3. Port or rewrite tests; keep coverage equivalent.
4. Update any parent imports and docs.

Preserve accessibility and responsive behavior. Prefer framework idioms for the target.
```

调用示例：`/migrate-component Button React Vue` → $0=Button, $1=React, $2=Vue。

---

## 使用建议

- **参考型**：不加 `disable-model-invocation`，description 写清 WHEN，便于 agent 自动匹配。
- **任务型（有副作用）**：加 `disable-model-invocation: true`，避免 agent 自动执行部署、发送等操作。
- **参数**：在正文中用 `$0`、`$1` 或 `$ARGUMENTS[0]` 等引用；`argument-hint` 帮助用户知道如何传参。
