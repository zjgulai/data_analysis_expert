#!/usr/bin/env python3
"""
复杂指标贡献度计算工具
基于偏微分和全微分计算各过程指标的静态贡献度、波动贡献度和贡献占比
"""
import re
from typing import Dict, List, Tuple, Callable, Optional
from dataclasses import dataclass
import math


@dataclass
class ContributionResult:
    """贡献度计算结果"""
    factor_name: str
    base_value: float
    current_value: float
    delta: float
    partial_derivative: float
    elasticity: float
    wave_contribution: float
    contribution_ratio: float
    direction: str  # 'positive' or 'negative'


@dataclass
class ComplexContributionAnalysis:
    """复杂贡献度分析结果"""
    formula: str
    result_name: str
    factors: List[str]
    base_result: float
    current_result: float
    total_delta: float
    contributions: List[ContributionResult]
    first_order_sum: float
    interaction_effect: float
    interaction_ratio: float


class ComplexContributionCalculator:
    """复杂指标贡献度计算器"""

    def __init__(self):
        self.common_formulas = {
            # 乘法链式: Y = A * B * C
            'multiplication_chain': {
                'formula': 'Y = A * B * C',
                'partials': {
                    'A': lambda A, B, C: B * C,
                    'B': lambda A, B, C: A * C,
                    'C': lambda A, B, C: A * B,
                },
                'calc': lambda A, B, C: A * B * C
            },
            # 减法链式: Y = 1 - A - B - C
            'subtraction_chain': {
                'formula': 'Y = 1 - A - B - C',
                'partials': {
                    'A': lambda A, B, C: -1,
                    'B': lambda A, B, C: -1,
                    'C': lambda A, B, C: -1,
                },
                'calc': lambda A, B, C: 1 - A - B - C
            },
            # ROI型: Y = (A - B) / B
            'roi_type': {
                'formula': 'Y = (A - B) / B',
                'partials': {
                    'A': lambda A, B: 1 / B,
                    'B': lambda A, B: -A / (B ** 2),
                },
                'calc': lambda A, B: (A - B) / B
            },
            # 毛利型: Y = A * (1 - B) - C
            'profit_type': {
                'formula': 'Y = A * (1 - B) - C',
                'partials': {
                    'A': lambda A, B, C: 1 - B,
                    'B': lambda A, B, C: -A,
                    'C': lambda A, B, C: -1,
                },
                'calc': lambda A, B, C: A * (1 - B) - C
            },
            # 混合除法: Y = (A * B) / C
            'mixed_division': {
                'formula': 'Y = (A * B) / C',
                'partials': {
                    'A': lambda A, B, C: B / C,
                    'B': lambda A, B, C: A / C,
                    'C': lambda A, B, C: -(A * B) / (C ** 2),
                },
                'calc': lambda A, B, C: (A * B) / C
            },
            # 混合加除: Y = (A * B + C) / D
            'mixed_add_div': {
                'formula': 'Y = (A * B + C) / D',
                'partials': {
                    'A': lambda A, B, C, D: B / D,
                    'B': lambda A, B, C, D: A / D,
                    'C': lambda A, B, C, D: 1 / D,
                    'D': lambda A, B, C, D: -(A * B + C) / (D ** 2),
                },
                'calc': lambda A, B, C, D: (A * B + C) / D
            },
            # 四因素乘法: Y = A * B * C * D
            'four_factor_multiplication': {
                'formula': 'Y = A * B * C * D',
                'partials': {
                    'A': lambda A, B, C, D: B * C * D,
                    'B': lambda A, B, C, D: A * C * D,
                    'C': lambda A, B, C, D: A * B * D,
                    'D': lambda A, B, C, D: A * B * C,
                },
                'calc': lambda A, B, C, D: A * B * C * D
            },
            # 销售额公式: Y = A * B * C (访客 * 转化率 * 客单价)
            'sales_formula': {
                'formula': '销售额 = 访客数 * 转化率 * 客单价',
                'partials': {
                    '访客数': lambda visitors, cvr, aov: cvr * aov,
                    '转化率': lambda visitors, cvr, aov: visitors * aov,
                    '客单价': lambda visitors, cvr, aov: visitors * cvr,
                },
                'calc': lambda visitors, cvr, aov: visitors * cvr * aov
            },
        }

    def analyze(self,
                formula_type: str,
                base_values: Dict[str, float],
                current_values: Dict[str, float],
                factor_names: Optional[List[str]] = None) -> ComplexContributionAnalysis:
        """
        执行复杂贡献度分析

        Args:
            formula_type: 公式类型
            base_values: 基期各因素值
            current_values: 本期各因素值
            factor_names: 因素名称列表（可选）

        Returns:
            ComplexContributionAnalysis: 分析结果
        """
        if formula_type not in self.common_formulas:
            raise ValueError(f"未知的公式类型: {formula_type}")

        formula_info = self.common_formulas[formula_type]
        partials = formula_info['partials']
        calc = formula_info['calc']

        # 获取因素名称
        if factor_names is None:
            factor_names = list(partials.keys())

        # 计算基期和本期结果
        base_args = [base_values[name] for name in factor_names]
        current_args = [current_values[name] for name in factor_names]

        base_result = calc(*base_args)
        current_result = calc(*current_args)
        total_delta = current_result - base_result

        # 计算各因素贡献
        contributions = []
        first_order_sum = 0

        for name in factor_names:
            base_val = base_values[name]
            current_val = current_values[name]
            delta = current_val - base_val

            # 计算偏导数（在基期值处）
            partial_func = partials[name]
            partial_derivative = partial_func(*base_args)

            # 计算弹性系数
            if base_result != 0:
                elasticity = partial_derivative * (base_val / base_result)
            else:
                elasticity = float('inf') if partial_derivative != 0 else 0

            # 计算波动贡献
            wave_contribution = partial_derivative * delta
            first_order_sum += wave_contribution

            # 计算贡献占比
            if abs(total_delta) > 1e-10:
                contribution_ratio = wave_contribution / total_delta * 100
            else:
                contribution_ratio = 0

            # 判断方向
            direction = 'positive' if wave_contribution > 0 else 'negative'

            contributions.append(ContributionResult(
                factor_name=name,
                base_value=base_val,
                current_value=current_val,
                delta=delta,
                partial_derivative=partial_derivative,
                elasticity=elasticity,
                wave_contribution=wave_contribution,
                contribution_ratio=contribution_ratio,
                direction=direction
            ))

        # 计算交互效应
        interaction_effect = total_delta - first_order_sum
        if abs(total_delta) > 1e-10:
            interaction_ratio = interaction_effect / total_delta * 100
        else:
            interaction_ratio = 0

        return ComplexContributionAnalysis(
            formula=formula_info['formula'],
            result_name='Y',
            factors=factor_names,
            base_result=base_result,
            current_result=current_result,
            total_delta=total_delta,
            contributions=contributions,
            first_order_sum=first_order_sum,
            interaction_effect=interaction_effect,
            interaction_ratio=interaction_ratio
        )

    def analyze_custom(self,
                       calc_func: Callable,
                       partial_funcs: Dict[str, Callable],
                       base_values: Dict[str, float],
                       current_values: Dict[str, float],
                       formula_str: str = "自定义公式") -> ComplexContributionAnalysis:
        """
        使用自定义公式进行贡献度分析

        Args:
            calc_func: 结果指标计算函数
            partial_funcs: 各因素偏导数函数字典
            base_values: 基期各因素值
            current_values: 本期各因素值
            formula_str: 公式字符串（用于显示）

        Returns:
            ComplexContributionAnalysis: 分析结果
        """
        factor_names = list(partial_funcs.keys())

        # 计算基期和本期结果
        base_args = {name: base_values[name] for name in factor_names}
        current_args = {name: current_values[name] for name in factor_names}

        base_result = calc_func(**base_args)
        current_result = calc_func(**current_args)
        total_delta = current_result - base_result

        # 计算各因素贡献
        contributions = []
        first_order_sum = 0

        for name in factor_names:
            base_val = base_values[name]
            current_val = current_values[name]
            delta = current_val - base_val

            # 计算偏导数
            partial_func = partial_funcs[name]
            partial_derivative = partial_func(**base_args)

            # 计算弹性系数
            if base_result != 0:
                elasticity = partial_derivative * (base_val / base_result)
            else:
                elasticity = float('inf') if partial_derivative != 0 else 0

            # 计算波动贡献
            wave_contribution = partial_derivative * delta
            first_order_sum += wave_contribution

            # 计算贡献占比
            if abs(total_delta) > 1e-10:
                contribution_ratio = wave_contribution / total_delta * 100
            else:
                contribution_ratio = 0

            direction = 'positive' if wave_contribution > 0 else 'negative'

            contributions.append(ContributionResult(
                factor_name=name,
                base_value=base_val,
                current_value=current_val,
                delta=delta,
                partial_derivative=partial_derivative,
                elasticity=elasticity,
                wave_contribution=wave_contribution,
                contribution_ratio=contribution_ratio,
                direction=direction
            ))

        # 计算交互效应
        interaction_effect = total_delta - first_order_sum
        if abs(total_delta) > 1e-10:
            interaction_ratio = interaction_effect / total_delta * 100
        else:
            interaction_ratio = 0

        return ComplexContributionAnalysis(
            formula=formula_str,
            result_name='Y',
            factors=factor_names,
            base_result=base_result,
            current_result=current_result,
            total_delta=total_delta,
            contributions=contributions,
            first_order_sum=first_order_sum,
            interaction_effect=interaction_effect,
            interaction_ratio=interaction_ratio
        )


def format_report(analysis: ComplexContributionAnalysis) -> str:
    """格式化分析报告"""
    lines = []
    lines.append("=" * 60)
    lines.append("复杂指标贡献度分析报告")
    lines.append("=" * 60)

    # 公式信息
    lines.append(f"\n【指标关系】{analysis.formula}")

    # 变动概览
    lines.append(f"\n【变动概览】")
    lines.append(f"  基期值: {analysis.base_result:.4f}")
    lines.append(f"  本期值: {analysis.current_result:.4f}")
    lines.append(f"  总变动: {analysis.total_delta:+.4f}")

    # 因素变动
    lines.append(f"\n【因素变动】")
    lines.append(f"{'因素':<15} {'基期值':>12} {'本期值':>12} {'变动':>12} {'变动率':>10}")
    lines.append("-" * 65)
    for c in analysis.contributions:
        change_rate = (c.delta / c.base_value * 100) if c.base_value != 0 else float('inf')
        lines.append(f"{c.factor_name:<15} {c.base_value:>12.4f} {c.current_value:>12.4f} {c.delta:>+12.4f} {change_rate:>+10.1f}%")

    # 静态贡献度（敏感度）
    lines.append(f"\n【静态贡献度（敏感度）】")
    lines.append(f"{'因素':<15} {'偏导数':>12} {'弹性系数':>12} {'影响方向':>10}")
    lines.append("-" * 55)
    for c in analysis.contributions:
        direction = "正向" if c.partial_derivative > 0 else "负向"
        lines.append(f"{c.factor_name:<15} {c.partial_derivative:>12.4f} {c.elasticity:>12.4f} {direction:>10}")

    # 波动贡献度
    lines.append(f"\n【波动贡献度】")
    lines.append(f"{'因素':<15} {'波动贡献':>12} {'贡献占比':>12} {'累计占比':>12}")
    lines.append("-" * 55)
    cumulative = 0
    for c in analysis.contributions:
        cumulative += c.contribution_ratio
        lines.append(f"{c.factor_name:<15} {c.wave_contribution:>+12.4f} {c.contribution_ratio:>+12.1f}% {cumulative:>+12.1f}%")

    # 交互效应
    lines.append(f"\n【交互效应分析】")
    lines.append(f"  一阶全微分合计: {analysis.first_order_sum:+.4f}")
    lines.append(f"  交互效应: {analysis.interaction_effect:+.4f} ({analysis.interaction_ratio:+.1f}%)")
    lines.append(f"  实际变动: {analysis.total_delta:+.4f}")
    lines.append(f"  验证: {'✓ 通过' if abs(analysis.first_order_sum + analysis.interaction_effect - analysis.total_delta) < 1e-6 else '✗ 异常'}")

    # 结论
    lines.append(f"\n【关键结论】")
    # 按贡献占比排序
    sorted_contribs = sorted(analysis.contributions, key=lambda x: abs(x.contribution_ratio), reverse=True)
    for i, c in enumerate(sorted_contribs[:3], 1):
        direction = "提升" if c.wave_contribution > 0 else "拖累"
        lines.append(f"  {i}. {c.factor_name} {direction}结果 {abs(c.contribution_ratio):.1f}%")

    if abs(analysis.interaction_ratio) > 10:
        lines.append(f"  * 注意: 交互效应显著({analysis.interaction_ratio:+.1f}%)，需关注因素间协同作用")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)


# 示例使用
if __name__ == "__main__":
    calculator = ComplexContributionCalculator()

    print("【示例1: 销售额归因分析】")
    print("公式: 销售额 = 访客数 × 转化率 × 客单价")
    print()

    # 销售额归因
    result1 = calculator.analyze(
        formula_type='sales_formula',
        base_values={'访客数': 100000, '转化率': 0.05, '客单价': 100},
        current_values={'访客数': 120000, '转化率': 0.045, '客单价': 110}
    )
    print(format_report(result1))

    print("\n\n【示例2: 运营毛利率归因分析】")
    print("公式: 运营毛利率 = 1 - 成本率 - 广告费率 - 履约费率")
    print()

    # 运营毛利率归因
    result2 = calculator.analyze(
        formula_type='subtraction_chain',
        base_values={'A': 0.45, 'B': 0.15, 'C': 0.08},  # 成本率, 广告费率, 履约费率
        current_values={'A': 0.46, 'B': 0.16, 'C': 0.08}
    )
    print(format_report(result2))

    print("\n\n【示例3: ROI归因分析】")
    print("公式: ROI = (销售额 - 成本) / 成本")
    print()

    # ROI归因
    result3 = calculator.analyze(
        formula_type='roi_type',
        base_values={'A': 250, 'B': 100},  # 销售额, 成本
        current_values={'A': 280, 'B': 140}
    )
    print(format_report(result3))

    print("\n\n【示例4: 自定义公式分析】")
    print("公式: 毛利额 = 销售额 × (1 - 成本率) - 固定成本")
    print()

    # 自定义公式
    def profit_calc(销售额, 成本率, 固定成本):
        return 销售额 * (1 - 成本率) - 固定成本

    partials = {
        '销售额': lambda 销售额, 成本率, 固定成本: 1 - 成本率,
        '成本率': lambda 销售额, 成本率, 固定成本: -销售额,
        '固定成本': lambda 销售额, 成本率, 固定成本: -1,
    }

    result4 = calculator.analyze_custom(
        calc_func=profit_calc,
        partial_funcs=partials,
        base_values={'销售额': 1000, '成本率': 0.6, '固定成本': 100},
        current_values={'销售额': 1200, '成本率': 0.65, '固定成本': 120},
        formula_str="毛利额 = 销售额 × (1 - 成本率) - 固定成本"
    )
    print(format_report(result4))
