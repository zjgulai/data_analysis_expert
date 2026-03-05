#!/usr/bin/env python3
"""
每日 VOC 洞察报告生成器
读取当日 VOC 采集结果（logs/YYYY-MM-DD-daily-voc.md），结合淘金式思维与逆向思维，
输出：反直觉洞察、需求场景与痛点、策略优化点、未满足需求点，
并生成新闻风格的 HTML 日报（logs/daily-briefs/YYYY-MM-DD-daily-brief.html）便于截图/打印为图供团队学习。
"""

import re
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
VOC_DIR = SCRIPT_DIR.parent
LOGS_DIR = VOC_DIR / "logs"
BRIEFS_DIR = LOGS_DIR / "daily-briefs"


def parse_daily_voc(md_path: Path):
    """从 daily-voc.md 解析元信息、粗分计数、简要洞察、表格行（可选）。"""
    text = md_path.read_text(encoding="utf-8")
    out = {"total": 0, "counts": {}, "insights": [], "rows": []}
    m = re.search(r"总条数\D*[：:]\s*(\d+)", text)
    if m:
        out["total"] = int(m.group(1))
    for label, key in [("功能痛点", "功能"), ("场景痛点", "场景"), ("情绪痛点", "情绪"), ("价格与交易", "价格")]:
        m = re.search(rf"{label}\s*\|\s*(\d+)", text)
        if m:
            out["counts"][key] = int(m.group(1))
    # 今日简要洞察：仅收集「## 今日简要洞察」小节下的 - 列表，避免混入元信息
    in_brief = False
    for line in text.split("\n"):
        s = line.strip()
        if s.startswith("## ") and "今日简要洞察" in s:
            in_brief = True
            continue
        if in_brief and s.startswith("## "):
            in_brief = False
            continue
        if not in_brief:
            continue
        if s.startswith("- **") and ("**：" in s or "**:" in s):
            out["insights"].append(s)
        elif s.startswith("- ") and len(s) > 20 and not s.startswith("- |"):
            out["insights"].append(s)
    return out


def build_counter_intuitive(data: dict) -> list:
    """基于 VOC 数据生成反直觉洞察（模板+启发式）。"""
    insights = []
    if data["counts"].get("功能", 0) >= 5:
        insights.append("用户一边抱怨「漏奶、盖子易裂」，一边仍称「AMAZING、出乎意料」——反直觉：真正留住用户的是舒适与解放双手，漏奶/耐用是「可忍的代价」；若优先修漏奶而牺牲舒适，可能适得其反。")
    if data["counts"].get("场景", 0) >= 3:
        insights.append("直觉认为「一台顶配泵走天下」；VOC 显示职场妈妈更常采用「家里 Spectra + 公司 wearable」双泵组合——反直觉：第二台设备的主因不是升级，而是场景分离与减少每日打包焦虑。")
    if data["total"] >= 10:
        insights.append("社区里「wearable 吸力不如医用泵」与「S12 吸出量比 Spectra S2 还多」并存——反直觉：个体差异与使用方式远大于品类标签；沟通上应强调「正确 flange + 模式」而非只打「医用级吸力」。")
    insights.append("保险只包基础款时，用户仍在纠结是否自费买 wearable——反直觉：决策瓶颈往往不是价格本身，而是「值不值」的不确定；FSA/HSA 与「返工首月试用」话术可降低心理门槛。")
    insights.append("专家建议 wearable 作「补充」、6 周后再用；用户却在孕期就囤货——反直觉：首购动机多为「备齐安心」与「怕到时候没时间研究」；产品与内容可区分「首购备货」与「稳定奶量后加购」两条路径。")
    return insights[:5]


def build_gold_panning(data: dict) -> list:
    """淘金式思维：关键问题与高价值信号。"""
    return [
        "关键问题：在大量「求推荐泵」的噪音中，哪些是已决策品牌、只差型号（淘金），哪些是尚未建立信任的新手（需先建立标准）？",
        "高价值信号：提到具体型号对比（如 M9 vs V2、S12 vs Spectra）、漏奶/盖子/静音等具体痛点、以及「开会/Zoom 时用」等场景的帖子，转化与产品改进价值更高。",
        "过滤噪音：单纯情绪宣泄（「累死了」）与明确设备/场景诉求要分开；后者优先进入策略与未满足需求分析。",
    ]


def build_reverse_thinking(data: dict) -> list:
    """逆向思维：被忽视的反面与对立假设。"""
    return [
        "逆向：若「不再强调性价比」而强调「与 Spectra/Elvie 同场景下的表现」，会吸引哪类用户？可能打开高端与保险报销人群。",
        "逆向：用户说「希望零件少」——反面是「愿意为少洗几次付多少溢价？」若配件包（耐用盖、备用瓶）单独售卖，可能比塞进套装更符合付费意愿。",
        "逆向：多数内容打「职场妈妈」——反面是「非职场但需要解放双手」的场景（全职妈妈做家务、夜间泵奶不吵家人）；该场景的沟通是否不足？",
    ]


def build_pain_and_scenario(data: dict) -> list:
    """需求场景与痛点归纳。"""
    return [
        "场景-职场背奶：会议间隙泵奶、Zoom 时不被发现、通勤与公司冰箱存放尴尬；痛点=时间碎片化、隐私与体面、设备便携与静音。",
        "场景-夜间/多场景：夜间泵奶不吵醒宝宝、家里一台公司一台减少打包；痛点=噪音、零件多难洗、第二台设备的决策（升级 vs 备份）。",
        "场景-首购/礼赠：孕期囤货、Baby Shower 送礼、保险只包基础款是否自费买 wearable；痛点=不知道买哪款、怕漏买、值不值的心理门槛。",
    ]


def build_strategy_optimization(data: dict) -> list:
    """对当前产品的策略优化点。"""
    return [
        "产品：M9 漏奶与储奶盖易裂已形成可检索负面；优先推出「防倾/满瓶防漏」设计迭代或配件（如加固盖、直立支架提示），并在 FAQ/评论回复中明确「正确佩戴与垂直放置」说明。",
        "组合：主打「家里 Spectra + 公司 Momcozy」或「首泵+备份泵」套装，话术从「升级」转为「多场景分离」与「减少每日打包焦虑」。",
        "沟通：落地页与客服明确 FSA/HSA 适用、保险基础款+自费升级 wearable 的引导；增加「返工首月」「6 周后加购」等阶段化话术，区分首购与复购心智。",
        "口碑：针对 S12 吸出量≥Spectra、M5 Zoom 静音等正面案例，做成可引用 UGC/专家背书，对冲「wearable 吸力弱」的刻板印象。",
    ]


def build_unmet_needs(data: dict) -> list:
    """未被满足的需求点。"""
    return [
        "「M9 舒适 + V2 无漏」合体：用户明确表达希望结合两者优点；可做产品线规划或「推荐组合」（主泵+备用瓶/盖方案）。",
        "flange 尺寸与奶量过大场景：专家与用户均提到 flange 对舒适与效率的关键作用；选型指引、多尺寸套装或适配器尚未在 VOC 中形成统一解决方案。",
        "非职场场景的解放双手：做家务、夜间泵奶等场景的专属话术与内容占比低；存在未被充分沟通的增量人群。",
        "两台泵的清洁与收纳：家里+公司各一台时，清洁流程、配件收纳与旅行场景的「一包搞定」方案在评论中偶现但无品牌系统回应。",
    ]


def _insight_to_html(line: str) -> str:
    """把 - **标题**：正文 转为 HTML，保留加粗与换行。"""
    s = line.strip()
    if not s.startswith("- "):
        return f"<li>{_escape(s)}</li>"
    s = s[2:].strip()
    if s.startswith("**") and ("**：" in s or "**:" in s):
        sep = "**：" if "**：" in s else "**:"
        idx = s.index(sep) + len(sep)
        title = s[2 : s.index("**", 2)]
        body = s[idx:].strip()
        return f"<li><strong>{_escape(title)}</strong>：{_escape(body)}</li>"
    if s.startswith("**") and "**：" not in s and "**:" not in s and "**" in s[2:]:
        end = s.index("**", 2)
        title = s[2:end]
        body = s[end + 2 :].strip().lstrip("：:")
        return f"<li><strong>{_escape(title)}</strong>：{_escape(body)}</li>"
    return f"<li>{_escape(s)}</li>"


def _escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def render_html(date_str: str, data: dict, counter_intuitive: list, gold_panning: list,
                reverse: list, pain: list, strategy: list, unmet: list) -> str:
    """生成新闻风格 HTML，简约专业美观。若 daily-voc 中有「今日简要洞察」，优先展示。"""
    title = f"母婴出海 VOC 每日简讯"
    subtitle = f"{date_str} | 社媒用户声音 · 反直觉洞察 · 策略建议"
    total = data["total"]
    counts = data["counts"]
    custom_insights = data.get("insights") or []

    def li(items):
        return "".join(f"<li>{_escape(x)}</li>" for x in items)

    # 当日数据驱动的简要洞察（来自 daily-voc 的 - ** 列表）
    data_driven_card = ""
    if custom_insights:
        data_driven_card = """
<div class="card card-primary">
<h2>当日数据洞察（基于本期 VOC）</h2>
<ul>""" + "".join(_insight_to_html(line) for line in custom_insights) + """</ul>
</div>
"""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} {date_str}</title>
<style>
:root {{ --accent: #1a5fb4; --bg: #fafafa; --card: #fff; --text: #1a1a1a; --muted: #666; }}
* {{ box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; margin: 0; padding: 24px; }}
.container {{ max-width: 720px; margin: 0 auto; }}
header {{ border-bottom: 2px solid var(--accent); padding-bottom: 12px; margin-bottom: 24px; }}
h1 {{ font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text); }}
.subtitle {{ font-size: 0.875rem; color: var(--muted); margin-top: 4px; }}
.card {{ background: var(--card); border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }}
.card.card-primary {{ border-left: 4px solid var(--accent); }}
.card h2 {{ font-size: 0.95rem; font-weight: 600; margin: 0 0 12px 0; color: var(--accent); }}
.card ul {{ margin: 0; padding-left: 1.2rem; }}
.card li {{ margin-bottom: 6px; font-size: 0.9rem; }}
.meta {{ font-size: 0.8rem; color: var(--muted); margin-bottom: 20px; }}
footer {{ font-size: 0.75rem; color: var(--muted); margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }}
</style>
</head>
<body>
<div class="container">
<header>
<h1>{title}</h1>
<p class="subtitle">{subtitle}</p>
</header>
<p class="meta">当日采集 {total} 条 VOC · 功能 {counts.get('功能', 0)} / 场景 {counts.get('场景', 0)} / 情绪 {counts.get('情绪', 0)} / 价格 {counts.get('价格', 0)}</p>
{data_driven_card}
<div class="card">
<h2>反直觉洞察</h2>
<ul>{li(counter_intuitive)}</ul>
</div>

<div class="card">
<h2>淘金式思维 · 关键问题与高价值信号</h2>
<ul>{li(gold_panning)}</ul>
</div>

<div class="card">
<h2>逆向思维 · 被忽视的反面</h2>
<ul>{li(reverse)}</ul>
</div>

<div class="card">
<h2>用户需求场景与痛点</h2>
<ul>{li(pain)}</ul>
</div>

<div class="card">
<h2>策略优化点（对当前产品）</h2>
<ul>{li(strategy)}</ul>
</div>

<div class="card">
<h2>未被满足的需求点</h2>
<ul>{li(unmet)}</ul>
</div>

<footer>
数据来源：Reddit / 母婴社区摘要。仅供内部学习，不作为对外宣传依据。建议截图或打印为 PDF 后分享。
</footer>
</div>
</body>
</html>
"""


def main():
    import sys
    if len(sys.argv) > 1:
        date_str = sys.argv[1]  # YYYY-MM-DD
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")
    voc_path = LOGS_DIR / f"{date_str}-daily-voc.md"
    if not voc_path.exists():
        print(f"未找到 {voc_path}，请先完成当日 VOC 采集。")
        return 1

    data = parse_daily_voc(voc_path)
    counter_intuitive = build_counter_intuitive(data)
    gold_panning = build_gold_panning(data)
    reverse = build_reverse_thinking(data)
    pain = build_pain_and_scenario(data)
    strategy = build_strategy_optimization(data)
    unmet = build_unmet_needs(data)

    BRIEFS_DIR.mkdir(parents=True, exist_ok=True)

    # 1) 写出 insight markdown
    insight_path = BRIEFS_DIR / f"{date_str}-insight.md"
    with open(insight_path, "w", encoding="utf-8") as f:
        f.write(f"# 每日洞察报告 {date_str}\n\n")
        if data.get("insights"):
            f.write("## 当日数据洞察（基于本期 VOC）\n\n")
            for i in data["insights"]:
                f.write(f"{i}\n")
            f.write("\n")
        f.write("## 反直觉洞察\n\n")
        for i in counter_intuitive:
            f.write(f"- {i}\n")
        f.write("\n## 淘金式思维\n\n")
        for i in gold_panning:
            f.write(f"- {i}\n")
        f.write("\n## 逆向思维\n\n")
        for i in reverse:
            f.write(f"- {i}\n")
        f.write("\n## 用户需求场景与痛点\n\n")
        for i in pain:
            f.write(f"- {i}\n")
        f.write("\n## 策略优化点\n\n")
        for i in strategy:
            f.write(f"- {i}\n")
        f.write("\n## 未被满足的需求点\n\n")
        for i in unmet:
            f.write(f"- {i}\n")
    print(f"已写入 {insight_path}")

    # 2) 写出 HTML 日报
    html_path = BRIEFS_DIR / f"{date_str}-daily-brief.html"
    html = render_html(date_str, data, counter_intuitive, gold_panning, reverse, pain, strategy, unmet)
    html_path.write_text(html, encoding="utf-8")
    print(f"已写入 {html_path}（用浏览器打开后可截图或打印为 PDF 供团队学习）")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
