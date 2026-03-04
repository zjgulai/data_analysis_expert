# 每日简讯（日报）目录

本目录存放**每日 VOC 洞察报告**与**新闻风格 HTML 日报**，供团队每日学习使用。

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `YYYY-MM-DD-insight.md` | 当日洞察的 Markdown 版：反直觉洞察、淘金式/逆向思维、需求场景与痛点、策略优化点、未满足需求点。 |
| `YYYY-MM-DD-daily-brief.html` | 新闻风格日报（简约、专业、美观），用浏览器打开后可**截图或打印为 PDF**，作为「每日一图」发群/邮件供团队学习。 |

---

## 如何得到「精美图片」用于每日学习

1. **推荐**：用浏览器打开当日 `YYYY-MM-DD-daily-brief.html`，按需滚动后**截图**（整页或分块），或使用浏览器「打印 → 另存为 PDF」得到 PDF，再转为图片或直接分享 PDF。
2. **可选**：将 HTML 中的标题与 3–5 条核心洞察复制到 Canva/稿定等设计工具，做成一张简讯卡片图（建议尺寸 1080×1350 或 1200×630）后发布。

---

## 生成方式

在完成当日 VOC 采集（`logs/YYYY-MM-DD-daily-voc.md`）后，在项目根目录执行：

```bash
python3 books/maternal_social_voc/scripts/generate_daily_insight_report.py YYYY-MM-DD
```

不传日期则默认生成当天的报告（需已有当日 daily-voc 文件）。
