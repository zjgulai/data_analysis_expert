#!/usr/bin/env python3
"""
知识库快速探测脚本 - 使用非深度搜索模式
"""
import json
import urllib.request
import os
import sys
from datetime import datetime

API_KEY = os.environ.get('BIJI_API_KEY')
TOPIC_ID = 'Q0GzOMDY'
URL = 'https://open-api.biji.com/getnote/openapi/knowledge/search'

def search(question, timeout=30):
    """搜索知识库"""
    payload = {
        'question': question,
        'topic_ids': [TOPIC_ID],
        'deep_seek': False,
        'refs': False
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        URL, data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}',
            'X-OAuth-Version': '1',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

# 探测查询
QUERIES = {
    "数据分析框架": [
        "跨境电商数据分析方法论",
        "电商数据分析框架",
        "电商指标体系设计",
    ],
    "流量与渠道": [
        "流量分析方法",
        "渠道效果分析",
        "广告投放分析",
        "ROI计算方法",
    ],
    "用户与行为": [
        "用户行为分析",
        "用户分层方法",
        "转化漏斗分析",
        "用户生命周期",
    ],
    "商品与供应链": [
        "商品分析",
        "SKU管理",
        "库存分析",
        "供应链优化",
        "供应商评估",
    ],
    "营销与内容": [
        "营销效果分析",
        "内容营销",
        "社交媒体分析",
        "活动效果评估",
    ],
    "风险与监控": [
        "风险预警",
        "异常监控",
        "数据质量管理",
        "合规检查",
    ],
    "报告与可视化": [
        "数据报告",
        "仪表盘设计",
        "数据可视化",
    ],
}

def main():
    results = {}
    all_topics = []

    print("=" * 60)
    print("知识库探测开始")
    print("=" * 60)

    for category, queries in QUERIES.items():
        print(f"\n[{category}]")
        results[category] = {}

        for query in queries:
            try:
                r = search(query)
                answer = r.get('c', {}).get('answers', '')
                length = len(answer)
                has_content = length > 200

                results[category][query] = {
                    'length': length,
                    'has_content': has_content,
                    'preview': answer[:400] if answer else ''
                }

                all_topics.append({
                    'category': category,
                    'query': query,
                    'length': length,
                    'has_content': has_content
                })

                status = "✓" if has_content else "○"
                print(f"  {status} {query}: {length}字")

            except Exception as e:
                print(f"  ✗ {query}: 错误 - {str(e)[:50]}")
                results[category][query] = {'error': str(e), 'length': 0}

    # 分析结果
    print("\n" + "=" * 60)
    print("探测结果分析")
    print("=" * 60)

    # 按类别统计
    print("\n## 类别统计")
    print("| 类别 | 查询数 | 有内容 | 平均长度 |")
    print("|------|--------|--------|----------|")

    for category, queries in results.items():
        total = len(queries)
        with_content = sum(1 for q in queries.values() if q.get('has_content'))
        avg_len = sum(q.get('length', 0) for q in queries.values()) / total if total > 0 else 0
        print(f"| {category} | {total} | {with_content} | {avg_len:.0f} |")

    # 高价值主题
    print("\n## 高价值主题 TOP 10")
    all_topics.sort(key=lambda x: x['length'], reverse=True)
    for i, t in enumerate(all_topics[:10], 1):
        print(f"{i}. {t['query']} ({t['category']}): {t['length']}字")

    # 保存详细结果
    output = {
        'timestamp': datetime.now().isoformat(),
        'results': results,
        'analysis': {
            'total_queries': len(all_topics),
            'with_content': sum(1 for t in all_topics if t['has_content']),
            'by_category': {},
            'top_topics': all_topics[:15]
        }
    }

    for cat, queries in results.items():
        lengths = [q.get('length', 0) for q in queries.values()]
        output['analysis']['by_category'][cat] = {
            'total': len(queries),
            'with_content': sum(1 for l in lengths if l > 200),
            'avg_length': sum(lengths) / len(lengths) if lengths else 0
        }

    os.makedirs('insights', exist_ok=True)
    with open('insights/exploration_results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n结果已保存到: insights/exploration_results.json")

if __name__ == '__main__':
    if not API_KEY:
        print("错误: 请设置环境变量 BIJI_API_KEY")
        sys.exit(1)
    main()
