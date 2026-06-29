---
title: "B20 Worktree Ownership Cleanup Register Draft"
date: "2026-06-28"
status: "classification_started"
scope: "dirty worktree ownership classification for SCM prototype batches"
debt_ids:
  - "T8"
depends_on:
  - "30-b20-t8-13-decision-inbox-panels-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B20 Worktree 归属清理登记

## 1. 清理目标

用户要求从本批开始逐步解决 worktree 待定项。本登记只做归属分层和安全处理起点：明确哪些文件属于当前 T8 原型拆分链，哪些文件属于更早的父仓库状态，哪些文件只适合后续确认后处理。

## 2. 已安全处理

| 项目 | 处理 |
|---|---|
| `.pem` 扫描 | `find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print` 输出为空。 |
| prototype 临时目录 | `drafts/prototypes/scm-data-governance-workbench-v0/tmp` 当前无文件。 |
| B20 UI smoke 产物 | 直接输出到 `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T112000-b20-t8-13-decision-inbox-panels/ui-smoke-artifacts/`，未留在 repo 内。 |
| API 服务 | smoke 完成后已停止，后续最终核对继续确认 5174 无监听。 |

## 3. 可归属当前原型链

| 类别 | 路径 | 归属判断 | 下一步 |
|---|---|---|---|
| T8 拆分文档 | `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/18-30*.md` | B8-B20 执行证据链。 | 后续按批次提交或归档为 T8 交付证据。 |
| T8 panel/shared 文件 | `drafts/prototypes/scm-data-governance-workbench-v0/src/panels/*.tsx`、`src/shared/ui.tsx` | B8-B20 拆分产物。 | 继续随 T8 原型链验证，不与父仓库旧状态混合处理。 |
| B20 代码范围 | `src/main.tsx`、`src/panels/decisionLoopPanels.tsx`、`src/shared/ui.tsx` | 本批可验证变更。 | 保留在 B20 scope，等待后续 commit/PR 计划。 |
| 本地 SQLite | `data/governance_workbench.sqlite` | 本地治理记录与验收态。 | 每批 smoke 后恢复到最终只读通过态。 |

## 4. 需确认后处理

| 类别 | 当前状态 | 不直接处理原因 | 建议动作 |
|---|---|---|---|
| 父仓库 `.baiduyun.uploading.cfg` 删除态 | 多个 tracked delete | 可能由同步工具或用户清理产生，非 B20 产物。 | 单独确认是否恢复、归档或提交删除。 |
| `knowledge_base/data_ability` 资料删除态 | 多个 PPT/PDF/DOCX tracked delete | 属于业务资料，不可由 T8 原型批次代处理。 | 单独确认资料是否仍需保留。 |
| `system_data` 删除态与说明文件修改 | 多个 tracked delete / modify | 属于源数据与业务说明层。 | 单独开数据文件治理批次。 |
| `tmp/outputs` 旧草稿删除态 | tracked delete | 早期一次性产物，来源早于当前批次。 | 后续按 tmp 治理规则统一处理。 |
| prototype 部署/脚本/样式修改 | `.gitignore`、`Dockerfile`、`README.md`、`server/index.mjs`、`src/styles.css` 等 | 跨越多批功能与部署历史。 | 单独按 concern 拆分提交或回看历史意图。 |

## 5. 当前结论

B20 已把待定项从“混合 dirty 状态”拆成两层：

1. 当前 T8 原型拆分链：可以继续按 B8-B20 证据链推进。
2. 父仓库旧状态：先保留，不回滚、不删除、不提交，等待明确归属。

下一步清理建议：B21 之后创建一份 atomic staging plan，把 `T8 prototype refactor + SQLite evidence + analysis docs` 作为第一组候选，把部署文件、系统数据、知识库资料删除态留给后续确认。
