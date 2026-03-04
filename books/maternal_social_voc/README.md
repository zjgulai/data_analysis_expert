# 母婴社媒 VOC 与爆品洞察

本目录用于沉淀**母婴品类出海品牌**（以吸奶器与母婴电器为核心）的社媒舆情监控、VOC 需求洞察与潜在爆品挖掘的框架、模板与周期性摘要。

---

## 目标与数据来源

- **目标**：通过 Reddit 母婴垂类社区的公开讨论，系统收集用户真实声音（VOC），识别需求趋势、痛点与潜在爆品机会，并反哺品牌洞察与组合策略。
- **数据来源**：首版覆盖 **Reddit**（r/breastfeeding、r/WorkingMoms、r/ExclusivelyPumping、r/BabyBumps 等）。推荐用 **Reddit API 脚本** 拉取大量原始帖子，再人工筛选与打标签。
- **使用方式**：
  1. **拉取原始帖（多轮采集）**：配置 Reddit 应用与环境变量后，运行 [scripts/reddit_voc_fetch.py](scripts/reddit_voc_fetch.py)。脚本会**循环多轮**（new + hot + 多组关键词 search）拉取最近半年帖子与评论，尽可能多抓数据，输出到 `logs/raw/YYYY-MM-DD-reddit-posts.md`。详见 [scripts/README.md](scripts/README.md)。
  2. **筛选与打标签**：从 raw 文件中挑出高价值帖/评论，按 [02-日常VOC采集模板与示例.md](02-日常VOC采集模板与示例.md) 填表，写入 `logs/YYYY-MM-DD-daily-voc.md`。
  3. **生成每日洞察与新闻风格日报**：运行 `python3 books/maternal_social_voc/scripts/generate_daily_insight_report.py YYYY-MM-DD`，会生成 **反直觉洞察、淘金式/逆向思维、需求场景与痛点、策略优化点、未满足需求点**，并输出 `logs/daily-briefs/YYYY-MM-DD-insight.md` 与 **`YYYY-MM-DD-daily-brief.html`**（新闻风格、简约专业，可截图或打印为 PDF 供团队每日学习）。
  4. **周汇总**：将当周每日 VOC 合并进 `logs/YYYY-MM-weekN-voc-summary.md`，更新 Top 5 主题与机会点。方法论与维度定义见 [01-Reddit生态与方法论.md](01-Reddit生态与方法论.md)。

---

## 边界与合规

- **不含隐私数据**：不记录用户 ID、不做个体画像；仅记录公开帖子/评论的链接、摘要与标签。
- **不作商业爬取**：不批量抓取、不绕过平台规则；所有内容为人工浏览与摘录。
- **标注与出处**：结论与机会点均标注来源（subreddit、时间范围、样本量），便于复核与更新。

---

## 目录结构

```
books/maternal_social_voc/
├── README.md                          # 本说明、目录结构、日志规范
├── 01-Reddit生态与方法论.md           # 成功案例、Reddit 生态地图、需求维度模型、机会点清单
├── 02-日常VOC采集模板与示例.md         # 采集表格、每日/每周任务流程、聚类方法
├── scripts/                           # 采集与日报脚本
│   ├── README.md                     # 凭证获取、环境变量、运行与定时说明
│   ├── reddit_voc_fetch.py           # 多轮循环拉取帖子+评论 → logs/raw/
│   ├── generate_daily_insight_report.py  # 生成反直觉洞察与新闻风格 HTML 日报
│   └── .env.example                  # 环境变量示例（勿提交 .env）
└── logs/                              # VOC 摘要、原始拉取与每日简讯
    ├── README.md                     # 日志命名与内容结构规范
    ├── raw/                          # 原始帖子+评论（YYYY-MM-DD-reddit-posts.md）
    ├── daily-briefs/                 # 每日洞察与新闻风格日报
    │   ├── README.md                 # 日报说明与「如何得到精美图片」
    │   ├── YYYY-MM-DD-insight.md     # 反直觉/淘金式/逆向/策略/未满足需求
    │   └── YYYY-MM-DD-daily-brief.html  # 新闻风格 HTML（可截图/打印为图）
    ├── YYYY-MM-DD-daily-voc.md       # 当日筛选并打标签后的 VOC
    └── YYYY-MM-weekN-voc-summary.md  # 当周汇总与 Top 5、机会点
```

---

## 日志文件规范（logs/）

### 命名规则

- **按周**：`YYYY-MM-weekN-voc-summary.md`，例如 `2026-03-week1-voc-summary.md`（当周为 3 月第 1 周）。
- **按日（可选）**：若单日采集量较大且希望单独留档，可用 `YYYY-MM-DD-daily-voc.md`。

### 单篇日志内容结构

1. **顶部元信息**
   - 时间范围（如 2026-03-01 ~ 2026-03-07）
   - 覆盖的 subreddits 列表
   - 总样本量（本周期内记录的 VOC 条数）

2. **当日/当周粗分计数**
   - 功能痛点 / 场景痛点 / 情绪痛点 / 价格与交易 四类条数

3. **Top 5 高频主题（当周必填）**
   - 每个主题：标题 + 1–2 句归纳 + 1–2 条代表原话 paraphrase

4. **单条 VOC 明细表（可选）**
   - 可直接粘贴 [02-日常VOC采集模板与示例.md](02-日常VOC采集模板与示例.md) 中的表格，或仅保留高价值条目

5. **本期潜在机会点与待验证假设**
   - 列出 3–5 条可转化为产品/组合/话术的假设，并标注对应 [01-Reddit生态与方法论.md](01-Reddit生态与方法论.md) 第四节中的机会方向（若有）

---

## 与项目内其他文档的联动

- **品牌与竞品洞察**：[insights/maternal_brand/](insights/maternal_brand/) 下的 Momcozy 与母婴出海竞品示例、研究框架与模板。
- **组合与场景洞察**：[books/母婴品牌出海-连带购买组合与场景洞察.md](母婴品牌出海-连带购买组合与场景洞察.md)：Reddit VOC 可用于验证或修正其中的反直觉假设与组合机会点。
- **战略与运营总结**：[books/母婴品牌出海-战略战术战斗与精细化运营总结.md](母婴品牌出海-战略战术战斗与精细化运营总结.md)：VOC 结论可补充「消费者洞察」与「运营/营销」章节的论据。
