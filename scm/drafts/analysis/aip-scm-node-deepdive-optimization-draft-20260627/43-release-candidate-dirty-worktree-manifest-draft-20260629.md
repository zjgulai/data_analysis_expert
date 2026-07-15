---
title: "Release Candidate Dirty Worktree Manifest Draft"
date: "2026-06-29"
status: "executed_local_manifest"
batch: "B42-1"
scope: "Dirty worktree classification for SCM read-only prototype release candidate"
depends_on:
  - "42-release-candidate-governance-plan-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42-1 Dirty Worktree Manifest

## 1. 执行结论

事实：本轮在当前 worktree 执行 `git status --short -uall`，当前状态为 `94` 个 untracked、`16` 个 deleted、`15` 个 modified。`.pem` 扫描为空。

推断：当前 dirty worktree 不能直接用于 release tag，也不能用 `git add .`。必须按 release candidate 白名单做 atomic staging。

不确定项：`skills-lock.json`、`system_data/库存指标说明.md`、旧知识库二进制删除、旧 tmp 删除是否属于其它并行工作，当前没有足够证据纳入 SCM read-only prototype RC。

## 2. 原始检查

```bash
git status --short -uall
git status --short -uall | awk '{s=$1; count[s]++} END {for (s in count) print s, count[s]}' | sort
find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print
```

结果摘要：

| status | count | 说明 |
|---|---:|---|
| `??` | 94 | 主要为深度分析文档、prototype 新脚本、新 panels、public fulfillment dashboard、migration、preprod evidence。 |
| `M` | 15 | 主要为 prototype runtime/config/source/SQLite，以及 `skills-lock.json`、`system_data/库存指标说明.md`。 |
| `D` | 16 | 主要为旧 `.baiduyun.uploading.cfg`、旧知识库二进制、旧 tmp extraction/script。 |
| `.pem` | 0 | 本轮未发现仓库内 `*.pem`。 |

## 3. Release-critical 候选

这些路径直接服务于 read-only prototype production readiness，可进入 RC 文件集合候选；是否最终 stage 仍需按 B42-13 白名单执行。

| 分类 | 路径 | 原因 | 风险 |
|---|---|---|---|
| prototype runtime | `drafts/prototypes/scm-data-governance-workbench-v0/package.json`、`package-lock.json` | 新增 check/build/smoke/preprod 入口与依赖锁定。 | 需要跑 `npm run check/build/preprod:check`。 |
| prototype runtime | `drafts/prototypes/scm-data-governance-workbench-v0/server/index.mjs` | API、trace review、readonly governance surface 的运行面。 | 代码体量大，必须用 smoke 覆盖。 |
| prototype runtime | `drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`、`src/styles.css`、`src/panels/`、`src/shared/` | T8 分块后的 UI/模型面。 | 发布前 freeze，不继续新增行为。 |
| prototype validation | `drafts/prototypes/scm-data-governance-workbench-v0/scripts/preprod-check.mjs`、`scripts/smoke-api.mjs`、`scripts/smoke-readonly.mjs`、`scripts/smoke-ui.mjs` | 上线前本地 gate 与只读 smoke。 | 不运行 live provider smoke。 |
| deployment | `drafts/prototypes/scm-data-governance-workbench-v0/Dockerfile`、`docker-compose.yml`、`docker-compose.production.yml` | 生产只读原型部署边界、外部 SQLite volume、edge network。 | 生产执行需人工授权。 |
| data | `drafts/prototypes/scm-data-governance-workbench-v0/data/governance_workbench.sqlite`、`data/import-summary.json`、`data/runtime-metadata-projection.json` | 本地 SQLite 可信证据与 runtime 投影。 | 只允许本地 SQLite，禁止生产库连接。 |
| migration | `drafts/prototypes/scm-data-governance-workbench-v0/migrations/*.sql` | T7/RBAC additive migration 与 rollback。 | 需要确认只在本地 SQLite 执行。 |
| static dashboard | `drafts/prototypes/scm-data-governance-workbench-v0/public/fulfillment-dashboard/` | fulfillment dashboard 只读 CSV 契约与展示。 | CSV/文档不能被叙述成生产数据接入。 |
| docs | `drafts/prototypes/scm-data-governance-workbench-v0/README.md`、`docs/*.md` | 本地验收、腾讯云部署、fulfillment integration 说明。 | 文档必须保持 local/read-only 边界。 |
| evidence | `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/preprod-readiness-check-20260629.json` | preprod hard blockers 0 的 JSON 证据。 | 只能证明本地 preprod gate。 |

## 4. Support-evidence 候选

| 路径 | 用途 | RC 处理 |
|---|---|---|
| `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/00-*.md` 到 `42-*.md` | 交叉审计、T1-T8 计划/执行、preprod/B42 上下文。 | 作为 evidence pack 纳入 docs-only PR。 |
| `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/43-*.md` 及后续 B42 文档 | 本轮 release governance pack。 | 纳入 RC governance pack。 |
| `tmp/outputs/t2-*.json`、`tmp/outputs/t3-*.json`、`tmp/outputs/t4-*.json`、`tmp/outputs/t5-t6-*.json`、`tmp/outputs/ai-knowledge-evidence-quality-review-20260622.json` | 历史证据 JSON。 | 可纳入 evidence-only PR；不作为 runtime 必需文件。 |
| `.cbmignore`、`drafts/prototypes/scm-data-governance-workbench-v0/.cbmignore` | codebase-memory/indexing 边界。 | 可纳入 infra-support PR，不和 runtime 改动混 staging。 |

## 5. Excluded / hold-out

这些路径当前不应进入 RC staging，除非人工提供独立说明。

| 路径 | 当前状态 | 处理 |
|---|---|---|
| `../drafts/analysis/*.baiduyun.uploading.cfg` | deleted | SCM prototype RC 无关，排除。 |
| `../knowledge_base/data_ability/...` | deleted binary docs | 高风险删除，排除；不得跟 RC 混 staging。 |
| `drafts/docs/.session-summary-jijia-scm-and-stocking-inventory-context-draft-20260605.md.baiduyun.uploading.cfg` | deleted | 旧上传中间件，排除。 |
| `system_data/.*.xlsx.baiduyun.uploading.cfg` | deleted | 旧上传中间件，排除。 |
| `system_data/库存指标说明.md` | modified | 与 RC 关系不明，hold。 |
| `tmp/outputs/alidocs-stocking-inventory-*`、`tmp/outputs/jijia-warehouse-live-extraction-20260604.json` | deleted | 旧 extraction 产物，排除。 |
| `tmp/scripts/*20260604.mjs` | deleted | 旧一次性脚本，排除。 |
| `skills-lock.json` | modified | 可能属于 skill/index 治理，但与 RC runtime 无直接证据，hold。 |

## 6. Atomic Staging 原则

1. 不使用 `git add .`。
2. 先 stage B42 governance docs，再 stage prototype runtime，再 stage evidence JSON。
3. `D` 删除项默认不 stage。
4. `system_data/`、`knowledge_base/`、`../drafts/analysis/` 默认不纳入本 RC。
5. SQLite 只作为本地 prototype 数据包纳入；不得外联生产库。

## 7. B42-1 Done Criteria

| criteria | status |
|---|---|
| dirty worktree 已按 release-critical / support-evidence / excluded / hold-out 分类 | done |
| `.pem` scan 已执行 | done, 0 hits |
| 未 stage / 未 commit | done |
| production/provider/ERP 边界保持 false | done |
