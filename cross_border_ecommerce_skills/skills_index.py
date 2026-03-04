#!/usr/bin/env python3
"""
Skills自动查找系统
==================
当用户提问时，自动搜索并返回相关的Skills。

使用方法:
    from skills_index import SkillsIndex

    index = SkillsIndex()
    results = index.search("帮我做指标归因分析")
    for skill in results:
        print(skill['name'], skill['relevance'])
"""

import os
import re
import json
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


class SkillsIndex:
    """Skills索引和搜索系统"""

    def __init__(self, skills_dir: str = None):
        """
        初始化Skills索引

        Args:
            skills_dir: Skills目录路径，默认为当前文件所在目录下的skills/
        """
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

            # 提取YAML frontmatter
            if not content.startswith('---'):
                return None

            # 找到第二个---
            end_idx = content.find('---', 3)
            if end_idx == -1:
                return None

            frontmatter = content[3:end_idx].strip()

            # 解析YAML（简单解析，不使用yaml库）
            name = ""
            description = ""
            triggers = []
            outputs = []

            # 提取name
            for line in frontmatter.split('\n'):
                if line.startswith('name:'):
                    name = line.split(':', 1)[1].strip()
                    break

            # 提取description（多行文本块）
            desc_start = frontmatter.find('description:')
            if desc_start != -1:
                desc_content = frontmatter[desc_start + 12:].strip()
                # 移除开头的 | 符号
                if desc_content.startswith('|'):
                    desc_content = desc_content[1:].strip()
                description = desc_content

                # 从description中提取触发条件
                trigger_match = re.search(r'触发条件[：:]\s*\n((?:\s*\d+\..*\n?)+)', description)
                if trigger_match:
                    trigger_text = trigger_match.group(1)
                    # 提取每个触发条件
                    for line in trigger_text.split('\n'):
                        line = line.strip()
                        if line and re.match(r'^\d+\.', line):
                            # 移除序号
                            trigger = re.sub(r'^\d+\.\s*', '', line)
                            triggers.append(trigger)

                # 从description中提取输出内容
                output_match = re.search(r'输出内容[：:]\s*\n((?:\s*[-]\s*.*\n?)+)', description)
                if output_match:
                    output_text = output_match.group(1)
                    for line in output_text.split('\n'):
                        line = line.strip()
                        if line.startswith('-'):
                            outputs.append(line[1:].strip())

            # 提取类别（从路径）
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
        # 扫描所有SKILL.md文件
        for skill_file in self.skills_dir.rglob("SKILL.md"):
            skill_info = self._parse_skill_file(skill_file)
            if skill_info and skill_info.name:
                self.skills[skill_info.name] = skill_info

                # 构建关键词索引
                self._index_keywords(skill_info)

        print(f"索引构建完成: {len(self.skills)} 个Skills")

    def _index_keywords(self, skill: SkillInfo):
        """为Skill建立关键词索引"""
        keywords = set()

        # 从触发条件提取关键词
        for trigger in skill.triggers:
            # 提取引号内的关键词
            quoted = re.findall(r'["""]([^"""]+)["""]', trigger)
            for q in quoted:
                # 分割成多个关键词（按顿号、逗号分割）
                parts = re.split(r'[、，,]', q)
                keywords.update(p.strip() for p in parts if len(p.strip()) >= 2)
            # 也提取所有中文词
            words = re.findall(r'[\u4e00-\u9fff]+', trigger)
            keywords.update(words)

        # 从描述提取关键词
        desc_words = re.findall(r'[\u4e00-\u9fff]+', skill.description)
        keywords.update(desc_words)

        # 从名称提取关键词
        name_words = re.findall(r'[a-z-]+', skill.name.lower())
        keywords.update(name_words)

        # 添加预定义的关键词映射
        for kw, skills in KEYWORD_SKILL_MAP.items():
            if skill.name in skills:
                keywords.add(kw)

        # 添加到索引
        for keyword in keywords:
            if len(keyword) >= 2:
                if keyword not in self.keyword_index:
                    self.keyword_index[keyword] = []
                if skill.name not in self.keyword_index[keyword]:
                    self.keyword_index[keyword].append(skill.name)

    def search(self, query: str, top_n: int = 5) -> List[Dict]:
        """
        搜索与查询相关的Skills

        Args:
            query: 用户查询文本
            top_n: 返回前N个结果

        Returns:
            排序后的Skills列表，包含name, path, relevance, description
        """
        scores: Dict[str, int] = {}

        # 方法1: 检查索引中的关键词是否在查询中出现（反向匹配）
        for keyword, skill_names in self.keyword_index.items():
            if len(keyword) >= 2 and keyword in query:
                for skill_name in skill_names:
                    scores[skill_name] = scores.get(skill_name, 0) + 1

        # 方法2: 使用预定义的关键词映射（权重更高）
        for keyword, skill_names in KEYWORD_SKILL_MAP.items():
            if keyword in query:
                for skill_name in skill_names:
                    scores[skill_name] = scores.get(skill_name, 0) + 2

        # 按得分排序
        sorted_skills = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        # 构建结果
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

    def get_category_skills(self, category: str) -> List[SkillInfo]:
        """获取某个类别下的所有Skills"""
        return [
            skill for skill in self.skills.values()
            if skill.category == category
        ]


# 关键词到Skills的直接映射（用于快速查找）
KEYWORD_SKILL_MAP = {
    # 归因分析相关
    "归因": ["cbec-contribution-calculation", "cbec-ad-attribution", "cbec-margin-attribution"],
    "贡献度": ["cbec-contribution-calculation", "cbec-complex-contribution", "cbec-binning-contribution"],
    "贡献": ["cbec-contribution-calculation", "cbec-complex-contribution"],
    "因素分解": ["cbec-contribution-calculation", "cbec-structural-analysis"],
    "指标拆解": ["cbec-contribution-calculation", "cbec-structural-analysis"],
    "偏微分": ["cbec-complex-contribution"],
    "全微分": ["cbec-complex-contribution"],
    "弹性系数": ["cbec-complex-contribution"],
    "敏感度": ["cbec-complex-contribution"],

    # 财务分析
    "毛利率": ["cbec-margin-attribution"],
    "毛利": ["cbec-margin-attribution", "cbec-dupont-analysis"],
    "杜邦": ["cbec-dupont-analysis"],
    "ROI": ["cbec-dupont-analysis", "cbec-ad-performance-analysis"],
    "ROE": ["cbec-dupont-analysis"],

    # 趋势分析
    "同比": ["cbec-yoy-mom-analysis"],
    "环比": ["cbec-yoy-mom-analysis"],
    "趋势": ["cbec-yoy-mom-analysis", "cbec-demand-forecasting"],
    "预测": ["cbec-demand-forecasting"],

    # 用户分析
    "用户": ["cbec-customer-segmentation", "cbec-user-behavior-analysis", "cbec-cohort-analysis"],
    "客户": ["cbec-customer-segmentation", "cbec-cohort-analysis"],
    "RFM": ["cbec-customer-segmentation"],
    "分群": ["cbec-customer-segmentation"],
    "分层": ["cbec-customer-segmentation"],
    "留存": ["cbec-cohort-analysis"],
    "群组": ["cbec-cohort-analysis"],
    "漏斗": ["cbec-conversion-funnel"],
    "转化": ["cbec-conversion-funnel", "cbec-sales-conversion-analysis"],

    # 广告营销
    "广告": ["cbec-ad-attribution", "cbec-ad-performance-analysis"],
    "营销": ["cbec-ad-attribution", "cbec-promotion-analysis"],
    "促销": ["cbec-promotion-analysis"],
    "活动": ["cbec-promotion-analysis", "cbec-campaign-analysis"],
    "社媒": ["cbec-social-media-analysis"],
    "社交媒体": ["cbec-social-media-analysis"],

    # 渠道分析
    "渠道": ["cbec-channel-effect-analysis", "cbec-traffic-source-analysis"],
    "流量": ["cbec-traffic-source-analysis", "cbec-ad-performance-analysis"],

    # 监控预警
    "异常": ["cbec-anomaly-detection"],
    "监控": ["cbec-anomaly-detection", "cbec-alert-management"],
    "预警": ["cbec-alert-management", "cbec-risk-warning-system"],
    "报警": ["cbec-alert-management"],
    "风险": ["cbec-risk-warning-system"],

    # 供应链
    "库存": ["cbec-inventory-optimization"],
    "供应商": ["cbec-supplier-performance"],
    "供应链": ["cbec-inventory-optimization", "cbec-supplier-performance"],

    # 定价
    "定价": ["cbec-pricing-optimization"],
    "价格": ["cbec-pricing-optimization"],
    "成本": ["cbec-cost-structure-analysis"],

    # 产品分析
    "品类": ["cbec-category-management"],
    "产品": ["cbec-category-management"],
    "SKU": ["cbec-category-management"],

    # 方法论
    "指标体系": ["cbec-metrics-system-design"],
    "A/B测试": ["cbec-ab-testing"],
    "AB测试": ["cbec-ab-testing"],
    "因果": ["cbec-causal-inference"],
    "结构分析": ["cbec-structural-analysis"],
    "周期": ["cbec-cyclical-analysis"],

    # 报告
    "看板": ["cbec-dashboard-design"],
    "报表": ["cbec-data-reporting"],
    "报告": ["cbec-data-reporting"],

    # 竞品
    "竞品": ["cbec-competitive-analysis"],
    "竞争": ["cbec-competitive-analysis"],

    # 数据基础
    "数据清洗": ["cbec-data-cleaning"],
    "知识库": ["cbec-knowledge-query"],
}


def find_skills_for_query(query: str) -> List[str]:
    """
    快速查找与查询相关的Skills

    Args:
        query: 用户查询文本

    Returns:
        相关Skill名称列表
    """
    found_skills = set()

    for keyword, skills in KEYWORD_SKILL_MAP.items():
        if keyword in query:
            found_skills.update(skills)

    return list(found_skills)


def get_skill_path(skill_name: str) -> Optional[str]:
    """获取Skill文件的路径"""
    index = SkillsIndex()
    skill = index.get_skill(skill_name)
    return skill.path if skill else None


# 命令行接口
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(f"\n搜索: {query}")
        print("=" * 60)

        index = SkillsIndex()
        results = index.search(query)

        if results:
            print(f"\n找到 {len(results)} 个相关Skills:\n")
            for i, result in enumerate(results, 1):
                print(f"{i}. {result['name']}")
                print(f"   类别: {result['category']}")
                print(f"   相关性: {'★' * result['relevance']}")
                print(f"   触发条件: {', '.join(result['triggers'][:2])}...")
                print()
        else:
            print("未找到相关Skills")

            # 使用关键词映射尝试
            keyword_results = find_skills_for_query(query)
            if keyword_results:
                print(f"\n基于关键词映射的建议Skills:")
                for skill in keyword_results[:5]:
                    print(f"  - {skill}")
    else:
        # 列出所有Skills
        index = SkillsIndex()
        print("\n所有可用Skills:")
        print("=" * 60)

        current_category = None
        for skill in sorted(index.skills.values(), key=lambda x: x.category):
            if skill.category != current_category:
                current_category = skill.category
                print(f"\n[{current_category}]")
            print(f"  - {skill.name}")
