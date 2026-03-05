#!/usr/bin/env python3
"""
麦肯锡PPT Skills自动查找系统
============================

当用户提问时，自动搜索并返回相关的麦肯锡PPT制作Skills。

使用方法:
    from skills_index import McKinseySkillsIndex

    index = McKinseySkillsIndex()
    results = index.search("帮我制作条形图")
    for skill in results:
        print(skill['name'], skill['relevance'])
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class SkillInfo:
    """Skill信息数据类"""
    name: str
    path: str
    category: str
    description: str
    triggers: List[str]
    outputs: List[str]


class McKinseySkillsIndex:
    """麦肯锡PPT Skills索引和搜索系统"""

    def __init__(self, skills_dir: str = None):
        if skills_dir is None:
            skills_dir = Path(__file__).parent / "skills"
        self.skills_dir = Path(skills_dir)
        self.skills: Dict[str, SkillInfo] = {}
        self.keyword_index: Dict[str, List[str]] = {}
        self._build_index()

    def _parse_skill_file(self, file_path: Path) -> Optional[SkillInfo]:
        """解析SKILL.md文件，提取元数据"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if not content.startswith('---'):
                return None

            end_idx = content.find('---', 3)
            if end_idx == -1:
                return None

            frontmatter = content[3:end_idx].strip()

            name = ""
            description = ""
            triggers = []
            outputs = []

            for line in frontmatter.split('\n'):
                if line.startswith('name:'):
                    name = line.split(':', 1)[1].strip()
                    break

            desc_start = frontmatter.find('description:')
            if desc_start != -1:
                desc_content = frontmatter[desc_start + 12:].strip()
                if desc_content.startswith('|'):
                    desc_content = desc_content[1:].strip()
                description = desc_content

                trigger_match = re.search(r'触发条件[：:]\s*\n((?:\s*\d+\..*\n?)+)', description)
                if trigger_match:
                    trigger_text = trigger_match.group(1)
                    for line in trigger_text.split('\n'):
                        line = line.strip()
                        if line and re.match(r'^\d+\.', line):
                            trigger = re.sub(r'^\d+\.\s*', '', line)
                            triggers.append(trigger)

            rel_path = file_path.relative_to(self.skills_dir)
            category = str(rel_path.parts[0]) if len(rel_path.parts) > 1 else "other"

            return SkillInfo(
                name=name,
                path=str(file_path),
                category=category,
                description=description,
                triggers=triggers,
                outputs=outputs
            )

        except Exception as e:
            print(f"解析文件失败 {file_path}: {e}")
            return None

    def _build_index(self):
        """构建Skills索引"""
        for skill_file in self.skills_dir.rglob("SKILL.md"):
            skill_info = self._parse_skill_file(skill_file)
            if skill_info and skill_info.name:
                self.skills[skill_info.name] = skill_info
                self._index_keywords(skill_info)

        print(f"麦肯锡PPT Skills索引构建完成: {len(self.skills)} 个Skills")

    def _index_keywords(self, skill: SkillInfo):
        """为Skill建立关键词索引"""
        keywords = set()

        for trigger in skill.triggers:
            quoted = re.findall(r'["""]([^"""]+)["""]', trigger)
            for q in quoted:
                parts = re.split(r'[、，,]', q)
                keywords.update(p.strip() for p in parts if len(p.strip()) >= 2)
            words = re.findall(r'[\u4e00-\u9fff]+', trigger)
            keywords.update(words)

        desc_words = re.findall(r'[\u4e00-\u9fff]+', skill.description)
        keywords.update(desc_words)

        name_words = re.findall(r'[a-z-]+', skill.name.lower())
        keywords.update(name_words)

        for kw, skills in KEYWORD_SKILL_MAP.items():
            if skill.name in skills:
                keywords.add(kw)

        for keyword in keywords:
            if len(keyword) >= 2:
                if keyword not in self.keyword_index:
                    self.keyword_index[keyword] = []
                if skill.name not in self.keyword_index[keyword]:
                    self.keyword_index[keyword].append(skill.name)

    def search(self, query: str, top_n: int = 5) -> List[Dict]:
        """搜索与查询相关的Skills"""
        scores: Dict[str, int] = {}

        for keyword, skill_names in self.keyword_index.items():
            if len(keyword) >= 2 and keyword in query:
                for skill_name in skill_names:
                    scores[skill_name] = scores.get(skill_name, 0) + 1

        for keyword, skill_names in KEYWORD_SKILL_MAP.items():
            if keyword in query:
                for skill_name in skill_names:
                    scores[skill_name] = scores.get(skill_name, 0) + 2

        sorted_skills = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for skill_name, score in sorted_skills[:top_n]:
            skill = self.skills.get(skill_name)
            if skill:
                results.append({
                    'name': skill.name,
                    'path': skill.path,
                    'category': skill.category,
                    'relevance': score,
                    'description': skill.description[:200] + '...' if len(skill.description) > 200 else skill.description,
                    'triggers': skill.triggers,
                    'outputs': skill.outputs
                })

        return results

    def get_skill(self, name: str) -> Optional[SkillInfo]:
        """根据名称获取Skill详情"""
        return self.skills.get(name)

    def get_skill_content(self, name: str) -> Optional[str]:
        """获取Skill的完整内容"""
        skill = self.skills.get(name)
        if skill:
            try:
                with open(skill.path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                return None
        return None

    def list_all_skills(self) -> List[Dict]:
        """列出所有Skills"""
        return [
            {
                'name': skill.name,
                'category': skill.category,
                'path': skill.path,
                'triggers': skill.triggers
            }
            for skill in self.skills.values()
        ]


# 关键词到Skills的直接映射
KEYWORD_SKILL_MAP = {
    # 内容规划
    "观点": ["mckinsey-core-insight", "mckinsey-conclusion-first"],
    "结论": ["mckinsey-core-insight", "mckinsey-conclusion-first"],
    "核心": ["mckinsey-core-insight"],
    "故事线": ["mckinsey-story-line"],
    "金字塔": ["mckinsey-pyramid-principle"],
    "MECE": ["mckinsey-pyramid-principle"],

    # 结构设计
    "模板": ["mckinsey-slide-template"],
    "结构": ["mckinsey-slide-template", "mckinsey-information-hierarchy"],
    "布局": ["mckinsey-slide-template", "mckinsey-layout-standards"],
    "幻灯片": ["mckinsey-slide-template"],

    # 数据分析
    "数据": ["mckinsey-data-selection", "mckinsey-key-metrics"],
    "指标": ["mckinsey-key-metrics"],
    "洞察": ["mckinsey-insight-extraction"],

    # 图表选择与分类
    "图表": ["mckinsey-chart-type-guide", "mckinsey-chart-classification"],
    "可视化": ["mckinsey-visualization-principles"],
    "选择图表": ["mckinsey-chart-type-guide", "mckinsey-chart-classification"],
    "图表分类": ["mckinsey-chart-classification"],
    "图表类型": ["mckinsey-chart-classification", "mckinsey-chart-type-guide"],

    # 图表制作 - 基础
    "条形图": ["mckinsey-bar-chart"],
    "柱状图": ["mckinsey-column-chart"],
    "环形图": ["mckinsey-donut-chart"],
    "饼图": ["mckinsey-donut-chart"],
    "堆叠图": ["mckinsey-stacked-chart"],
    "折线图": ["mckinsey-line-chart"],
    "百分比": ["mckinsey-percentage-chart"],

    # 图表制作 - 复合
    "复合图表": ["mckinsey-combination-chart", "mckinsey-multi-dimensional-charts"],
    "组合图": ["mckinsey-combination-chart"],
    "双轴图": ["mckinsey-combination-chart"],
    "混合图表": ["mckinsey-combination-chart"],
    "分组图": ["mckinsey-grouped-chart"],
    "分组柱状图": ["mckinsey-grouped-chart"],
    "对比图": ["mckinsey-grouped-chart"],

    # 图表制作 - 多维分析
    "多维分析": ["mckinsey-multi-dimensional-charts"],
    "多维图表": ["mckinsey-multi-dimensional-charts"],
    "瀑布图": ["mckinsey-multi-dimensional-charts"],
    "双向条形图": ["mckinsey-multi-dimensional-charts"],
    "增长驱动": ["mckinsey-multi-dimensional-charts"],
    "因素分解": ["mckinsey-multi-dimensional-charts"],
    "竞争转换": ["mckinsey-multi-dimensional-charts"],
    "消费者流向": ["mckinsey-multi-dimensional-charts"],
    "财务分析图表": ["mckinsey-multi-dimensional-charts"],
    "价格带分析": ["mckinsey-multi-dimensional-charts"],
    "气泡图": ["mckinsey-multi-dimensional-charts"],
    "归因分析图表": ["mckinsey-multi-dimensional-charts"],

    # 设计规范
    "颜色": ["mckinsey-color-standards"],
    "配色": ["mckinsey-color-standards"],
    "字体": ["mckinsey-font-standards"],
    "设计": ["mckinsey-color-standards", "mckinsey-layout-standards"],

    # 观点表达
    "结论先行": ["mckinsey-conclusion-first"],
    "表达": ["mckinsey-conclusion-first", "mckinsey-concise-expression"],
    "简洁": ["mckinsey-concise-expression"],
    "逻辑": ["mckinsey-logical-connection"],

    # 质量审核
    "审核": ["mckinsey-content-review", "mckinsey-design-review"],
    "检查": ["mckinsey-content-review"],
    "质量": ["mckinsey-quality-review"],

    # 母婴电商应用
    "母婴": ["mckinsey-maternal-ecommerce-charts"],
    "母婴电商": ["mckinsey-maternal-ecommerce-charts"],
    "跨境电商": ["mckinsey-maternal-ecommerce-charts"],

    # 消费者分析
    "用户分析": ["mckinsey-consumer-analysis-charts"],
    "消费者分析": ["mckinsey-consumer-analysis-charts"],
    "用户画像": ["mckinsey-consumer-analysis-charts"],
    "流失分析": ["mckinsey-consumer-analysis-charts"],
    "留存分析": ["mckinsey-consumer-analysis-charts"],
    "忠诚度": ["mckinsey-consumer-analysis-charts"],
    "复购分析": ["mckinsey-consumer-analysis-charts"],
    "用户分群": ["mckinsey-consumer-analysis-charts"],
    "人群对比": ["mckinsey-consumer-analysis-charts"],
    "新客分析": ["mckinsey-consumer-analysis-charts"],
    "老客分析": ["mckinsey-consumer-analysis-charts"],
    "IPA分析": ["mckinsey-consumer-analysis-charts"],
    "LTV": ["mckinsey-consumer-analysis-charts", "mckinsey-maternal-ecommerce-charts"],

    # 品牌分析
    "品牌分析": ["mckinsey-brand-health-charts"],
    "品牌健康度": ["mckinsey-brand-health-charts"],
    "品牌漏斗": ["mckinsey-brand-health-charts"],
    "品牌认知": ["mckinsey-brand-health-charts"],
    "品牌定位": ["mckinsey-brand-health-charts"],
    "品牌形象": ["mckinsey-brand-health-charts"],
    "品牌竞争力": ["mckinsey-brand-health-charts"],
    "品牌对标": ["mckinsey-brand-health-charts"],
    "NPS": ["mckinsey-brand-health-charts"],
    "品牌忠诚": ["mckinsey-brand-health-charts"],
    "感知图": ["mckinsey-brand-health-charts"],

    # 渠道分析
    "渠道分析": ["mckinsey-channel-strategy-charts", "mckinsey-maternal-ecommerce-charts"],
    "渠道效率": ["mckinsey-channel-strategy-charts"],
    "渠道策略": ["mckinsey-channel-strategy-charts"],
    "促销分析": ["mckinsey-channel-strategy-charts", "mckinsey-maternal-ecommerce-charts"],
    "促销效果": ["mckinsey-channel-strategy-charts"],
    "渠道渗透": ["mckinsey-channel-strategy-charts"],
    "线上线下": ["mckinsey-channel-strategy-charts"],
    "O2O": ["mckinsey-channel-strategy-charts"],
    "促销结构": ["mckinsey-channel-strategy-charts"],
    "获客成本": ["mckinsey-channel-strategy-charts"],

    # 其他业务场景
    "品类分析": ["mckinsey-maternal-ecommerce-charts"],
    "价格分析": ["mckinsey-maternal-ecommerce-charts", "mckinsey-multi-dimensional-charts"],
    "竞品分析": ["mckinsey-maternal-ecommerce-charts", "mckinsey-brand-health-charts"],
    "供应链": ["mckinsey-maternal-ecommerce-charts"],
    "内容营销": ["mckinsey-maternal-ecommerce-charts"],

    # 麦肯锡专属
    "麦肯锡": ["mckinsey-slide-template", "mckinsey-color-standards"],
    "McKinsey": ["mckinsey-slide-template"],
}


def find_skills_for_query(query: str) -> List[str]:
    """快速查找与查询相关的Skills"""
    found_skills = set()

    for keyword, skills in KEYWORD_SKILL_MAP.items():
        if keyword in query:
            found_skills.update(skills)

    return list(found_skills)


# 命令行接口
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(f"\n搜索: {query}")
        print("=" * 60)

        index = McKinseySkillsIndex()
        results = index.search(query)

        if results:
            print(f"\n找到 {len(results)} 个相关Skills:\n")
            for i, result in enumerate(results, 1):
                print(f"{i}. {result['name']}")
                print(f"   类别: {result['category']}")
                print(f"   相关性: {'★' * result['relevance']}")
                print()
        else:
            print("未找到相关Skills")

            keyword_results = find_skills_for_query(query)
            if keyword_results:
                print(f"\n基于关键词映射的建议Skills:")
                for skill in keyword_results[:5]:
                    print(f"  - {skill}")
    else:
        index = McKinseySkillsIndex()
        print("\n所有可用麦肯锡PPT Skills:")
        print("=" * 60)

        current_category = None
        for skill in sorted(index.skills.values(), key=lambda x: x.category):
            if skill.category != current_category:
                current_category = skill.category
                print(f"\n[{current_category}]")
            print(f"  - {skill.name}")
