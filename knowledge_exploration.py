#!/usr/bin/env python3
"""
知识库探测脚本 - 批量查询Biji知识库以绘制主题地图
"""
import os
import json
import sys
from datetime import datetime

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from biji_knowledge import search_knowledge

# 探测性查询清单
EXPLORATORY_QUERIES = {
    "框架类": [
        "跨境电商数据分析有哪些核心方法论？",
        "电商数据分析的完整框架是什么？",
        "跨境电商有哪些关键指标体系？",
        "电商数据分析的标准化流程是什么？",
    ],
    "业务场景类": [
        "跨境电商运营分析包括哪些方面？",
        "电商业务分析的最佳实践有哪些？",
        "跨境电商常见的数据分析场景？",
        "电商数据分析的典型应用案例？",
    ],
    "技术方法类": [
        "电商数据分析常用哪些统计方法？",
        "跨境电商预测分析方法有哪些？",
        "电商数据可视化最佳实践？",
        "数据质量管理和数据清洗方法？",
    ],
    "细分领域类": [
        "跨境电商流量分析方法？",
        "电商客户分析方法？",
        "跨境电商供应链分析方法？",
        "电商营销效果分析方法？",
        "跨境电商风险分析方法？",
        "电商定价策略分析方法？",
        "跨境电商库存分析方法？",
        "电商用户行为分析方法？",
    ],
    "渠道与内容": [
        "如何分析跨境电商各渠道效果？",
        "流量来源分析方法有哪些？",
        "渠道ROI如何计算和优化？",
        "电商内容营销效果如何分析？",
        "广告创意测试方法有哪些？",
        "社交媒体分析方法？",
    ],
    "供应链与物流": [
        "物流时效分析方法？",
        "供应商绩效如何评估？",
        "SKU健康度分析方法？",
        "库存周转率分析方法？",
    ],
    "风险与合规": [
        "跨境电商风险预警体系？",
        "合规检查要点有哪些？",
        "电商反欺诈方法？",
        "数据安全与隐私保护？",
    ],
}

def explore_knowledge():
    """执行探测性查询并保存结果"""
    results = {}
    total_queries = sum(len(q) for q in EXPLORATORY_QUERIES.values())
    current = 0

    print(f"开始知识库探测，共 {total_queries} 个查询...")
    print("=" * 60)

    for category, queries in EXPLORATORY_QUERIES.items():
        print(f"\n[{category}]")
        results[category] = {}

        for query in queries:
            current += 1
            print(f"  [{current}/{total_queries}] {query[:30]}...")

            try:
                response = search_knowledge(query, deep_seek=True, refs=False)
                answer = response.get("c", {}).get("answers", "")

                # 评估内容丰富度
                content_score = len(answer) if answer else 0
                has_content = content_score > 100

                results[category][query] = {
                    "answer_preview": answer[:500] + "..." if len(answer) > 500 else answer,
                    "content_score": content_score,
                    "has_rich_content": has_content,
                }

                status = "✓" if has_content else "✗"
                print(f"    {status} 内容长度: {content_score}字")

            except Exception as e:
                print(f"    ✗ 错误: {e}")
                results[category][query] = {
                    "error": str(e),
                    "content_score": 0,
                    "has_rich_content": False,
                }

    return results

def analyze_results(results):
    """分析探测结果，生成主题地图"""
    analysis = {
        "总查询数": 0,
        "有丰富内容": 0,
        "类别统计": {},
        "高价值主题": [],
        "低价值主题": [],
    }

    for category, queries in results.items():
        category_stats = {
            "查询数": len(queries),
            "有内容数": 0,
            "平均内容长度": 0,
            "主题": []
        }

        total_length = 0
        for query, data in queries.items():
            analysis["总查询数"] += 1
            content_score = data.get("content_score", 0)
            total_length += content_score

            if data.get("has_rich_content"):
                analysis["有丰富内容"] += 1
                category_stats["有内容数"] += 1
                category_stats["主题"].append({
                    "问题": query,
                    "内容长度": content_score
                })

        if category_stats["查询数"] > 0:
            category_stats["平均内容长度"] = total_length / category_stats["查询数"]

        analysis["类别统计"][category] = category_stats

    # 识别高价值主题
    all_topics = []
    for category, stats in analysis["类别统计"].items():
        for topic in stats["主题"]:
            topic["类别"] = category
            all_topics.append(topic)

    # 按内容长度排序
    all_topics.sort(key=lambda x: x["内容长度"], reverse=True)
    analysis["高价值主题"] = all_topics[:15]

    # 识别低价值主题（内容长度<100）
    analysis["低价值主题"] = [t for t in all_topics if t["内容长度"] < 100]

    return analysis

def generate_report(results, analysis):
    """生成探测报告"""
    report = []
    report.append("# Biji知识库探测报告")
    report.append(f"\n生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\n## 探测概览\n")
    report.append(f"- 总查询数: {analysis['总查询数']}")
    report.append(f"- 有丰富内容: {analysis['有丰富内容']}")
    report.append(f"- 覆盖率: {analysis['有丰富内容']/analysis['总查询数']*100:.1f}%")

    report.append(f"\n## 类别内容统计\n")
    report.append("| 类别 | 查询数 | 有内容数 | 平均长度 | 覆盖率 |")
    report.append("|------|--------|----------|----------|--------|")

    for category, stats in sorted(analysis["类别统计"].items(),
                                   key=lambda x: x[1]["平均内容长度"], reverse=True):
        coverage = stats["有内容数"] / stats["查询数"] * 100 if stats["查询数"] > 0 else 0
        report.append(f"| {category} | {stats['查询数']} | {stats['有内容数']} | {stats['平均内容长度']:.0f} | {coverage:.0f}% |")

    report.append(f"\n## 高价值主题 TOP 15\n")
    for i, topic in enumerate(analysis["高价值主题"], 1):
        report.append(f"{i}. **{topic['问题'][:40]}...** ({topic['内容长度']}字)")
        report.append(f"   - 类别: {topic['类别']}")

    report.append(f"\n## 可萃取技能建议\n")
    report.append("基于探测结果，建议优先创建以下Skills:\n")

    # 基于内容丰富度推荐
    recommendations = []
    for topic in analysis["高价值主题"][:10]:
        recommendations.append(f"- {topic['问题'][:40]}... (内容长度: {topic['内容长度']}字)")

    report.extend(recommendations)

    return "\n".join(report)

def main():
    """主函数"""
    # 检查环境变量
    if not os.environ.get("BIJI_API_KEY"):
        print("错误: 请设置环境变量 BIJI_API_KEY")
        sys.exit(1)

    # 执行探测
    results = explore_knowledge()

    # 分析结果
    analysis = analyze_results(results)

    # 生成报告
    report = generate_report(results, analysis)

    # 保存结果
    output_dir = os.path.join(os.path.dirname(__file__), "insights")
    os.makedirs(output_dir, exist_ok=True)

    # 保存详细结果
    with open(os.path.join(output_dir, "exploration_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 保存分析报告
    with open(os.path.join(output_dir, "knowledge_map_report.md"), "w", encoding="utf-8") as f:
        f.write(report)

    print("\n" + "=" * 60)
    print("探测完成!")
    print(f"结果已保存到: {output_dir}")
    print("\n" + report)

if __name__ == "__main__":
    main()
