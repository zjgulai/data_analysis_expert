#!/usr/bin/env python3
"""
Biji知识库API客户端封装。

提供跨境电商数据分析Skills访问Biji知识库的能力，支持：
- API认证与调用
- 查询参数配置（deep_seek, refs）
- 结果解析与格式化
- 错误处理与重试
- 结果缓存与去重

知识库链接: https://biji.com/topic/Q0GzOMDY
API文档: https://doc.biji.com/docs/QfMcwcoHqic5urkTBQKcAPIWnJe/
"""
import os
import json
import time
import hashlib
import urllib.request
import urllib.error
from typing import List, Optional, Dict, Any
from functools import lru_cache


# API配置
BIJI_OPENAPI = "https://open-api.biji.com/getnote/openapi"
KNOWLEDGE_SEARCH = f"{BIJI_OPENAPI}/knowledge/search"
DEFAULT_TOPIC_ID = "Q0GzOMDY"  # 跨境电商数据分析知识库

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # 秒
REQUEST_TIMEOUT = 60  # 秒


class BijiClientError(Exception):
    """Biji API客户端错误基类"""
    pass


class BijiAuthError(BijiClientError):
    """认证错误"""
    pass


class BijiAPIError(BijiClientError):
    """API调用错误"""
    pass


class BijiClient:
    """
    Biji知识库客户端。

    使用示例:
        client = BijiClient()
        result = client.search("RFM模型如何应用于跨境电商客户分群？")
        print(result["answer"])
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        topic_ids: Optional[List[str]] = None,
        cache_enabled: bool = True,
        cache_size: int = 128
    ):
        """
        初始化Biji客户端。

        Args:
            api_key: API密钥，默认从环境变量BIJI_API_KEY读取
            topic_ids: 知识库ID列表，默认使用DEFAULT_TOPIC_ID
            cache_enabled: 是否启用缓存
            cache_size: 缓存大小（查询数）
        """
        self.api_key = api_key or os.environ.get("BIJI_API_KEY")
        if not self.api_key:
            raise BijiAuthError(
                "请设置环境变量BIJI_API_KEY，或在初始化时传入api_key参数。\n"
                "获取API Key: https://biji.com/settings/api"
            )

        self.topic_ids = topic_ids or [DEFAULT_TOPIC_ID]
        self.cache_enabled = cache_enabled
        self._cache: Dict[str, Dict] = {}

    def _get_cache_key(self, question: str, deep_seek: bool, refs: bool) -> str:
        """生成缓存键"""
        content = f"{question}|{deep_seek}|{refs}|{','.join(self.topic_ids)}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """从缓存获取结果"""
        if not self.cache_enabled:
            return None
        return self._cache.get(cache_key)

    def _save_to_cache(self, cache_key: str, result: Dict) -> None:
        """保存结果到缓存"""
        if self.cache_enabled:
            # 简单的LRU策略：缓存超过限制时清空一半
            if len(self._cache) >= 128:
                keys_to_remove = list(self._cache.keys())[:64]
                for key in keys_to_remove:
                    del self._cache[key]
            self._cache[cache_key] = result

    def _make_request(
        self,
        question: str,
        deep_seek: bool = True,
        refs: bool = False
    ) -> Dict[str, Any]:
        """
        发送API请求。

        Args:
            question: 查询问题
            deep_seek: 是否深度搜索
            refs: 是否返回引用

        Returns:
            API响应字典

        Raises:
            BijiAPIError: API调用失败
        """
        payload = {
            "question": question,
            "topic_ids": self.topic_ids,
            "deep_seek": deep_seek,
            "refs": refs,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            KNOWLEDGE_SEARCH,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "X-OAuth-Version": "1",
            },
            method="POST",
        )

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                    result = json.loads(resp.read().decode())
                    return result
            except urllib.error.HTTPError as e:
                if e.code == 401:
                    raise BijiAuthError("API Key无效或已过期")
                elif e.code == 429:
                    # 速率限制，等待后重试
                    wait_time = RETRY_DELAY * (attempt + 1) * 2
                    time.sleep(wait_time)
                    last_error = BijiAPIError(f"API速率限制，已重试{attempt + 1}次")
                else:
                    last_error = BijiAPIError(f"HTTP错误: {e.code} {e.reason}")
            except urllib.error.URLError as e:
                last_error = BijiAPIError(f"网络错误: {e.reason}")
                time.sleep(RETRY_DELAY)
            except json.JSONDecodeError as e:
                last_error = BijiAPIError(f"响应解析失败: {e}")
            except Exception as e:
                last_error = BijiAPIError(f"未知错误: {e}")

        raise last_error or BijiAPIError("请求失败，已达最大重试次数")

    def search(
        self,
        question: str,
        deep_seek: bool = True,
        refs: bool = False,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        搜索知识库。

        Args:
            question: 查询问题
            deep_seek: 是否深度搜索（更准确但更慢）
            refs: 是否返回引用来源
            use_cache: 是否使用缓存

        Returns:
            包含answer和可选refs的字典
            {
                "answer": "回答内容",
                "refs": [{"title": "来源标题", "url": "来源URL"}]  # 如果refs=True
            }
        """
        # 检查缓存
        cache_key = self._get_cache_key(question, deep_seek, refs)
        if use_cache:
            cached = self._get_from_cache(cache_key)
            if cached:
                return cached

        # 发送请求
        result = self._make_request(question, deep_seek, refs)

        # 保存缓存
        self._save_to_cache(cache_key, result)

        return result

    def batch_search(
        self,
        questions: List[str],
        deep_seek: bool = True,
        refs: bool = False,
        delay: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        批量搜索知识库。

        Args:
            questions: 问题列表
            deep_seek: 是否深度搜索
            refs: 是否返回引用
            delay: 请求间隔（秒），避免速率限制

        Returns:
            结果列表，顺序与输入一致
        """
        results = []
        for i, question in enumerate(questions):
            if i > 0:
                time.sleep(delay)
            try:
                result = self.search(question, deep_seek, refs)
                results.append(result)
            except BijiClientError as e:
                results.append({"error": str(e), "answer": None})
        return results

    def get_answer(self, question: str, deep_seek: bool = True) -> str:
        """
        获取问题的回答（简化接口）。

        Args:
            question: 查询问题
            deep_seek: 是否深度搜索

        Returns:
            回答文本
        """
        result = self.search(question, deep_seek=deep_seek)
        return result.get("answer", "")

    def format_result(self, result: Dict[str, Any]) -> str:
        """
        格式化搜索结果为Markdown。

        Args:
            result: search()返回的结果

        Returns:
            Markdown格式的文本
        """
        output = []

        if "answer" in result and result["answer"]:
            output.append("## 回答\n")
            output.append(result["answer"])

        if "refs" in result and result["refs"]:
            output.append("\n\n## 参考来源\n")
            for i, ref in enumerate(result["refs"], 1):
                title = ref.get("title", "未知来源")
                url = ref.get("url", "")
                output.append(f"{i}. [{title}]({url})")

        if "error" in result:
            output.append(f"\n\n**错误**: {result['error']}")

        return "\n".join(output)


# 预定义的跨境电商分析查询
CBEC_QUERIES = {
    "customer_segmentation": [
        "RFM模型如何应用于跨境电商客户分群？",
        "跨境电商客户生命周期分析方法有哪些？",
        "如何计算客户价值CLV？",
    ],
    "pricing_optimization": [
        "跨境电商价格弹性分析方法有哪些？",
        "跨境电商动态定价模型如何构建？",
        "如何进行竞品定价分析？",
    ],
    "inventory_management": [
        "跨境电商安全库存计算方法？",
        "跨境电商库存周转分析方法？",
        "EOQ经济订货量模型如何应用？",
    ],
    "user_behavior": [
        "跨境电商转化漏斗分析方法？",
        "跨境电商用户留存分析方法？",
        "同期群分析Cohort Analysis如何实施？",
    ],
    "advertising": [
        "跨境电商广告归因模型有哪些？",
        "如何优化ROAS？",
        "多触点归因分析方法？",
    ],
}


def query_knowledge_for_skill(skill_name: str) -> List[Dict[str, Any]]:
    """
    为特定Skill查询知识库。

    Args:
        skill_name: Skill名称（如customer_segmentation）

    Returns:
        查询结果列表
    """
    client = BijiClient()
    questions = CBEC_QUERIES.get(skill_name, [])

    if not questions:
        return []

    return client.batch_search(questions)


# 命令行接口
if __name__ == "__main__":
    import sys

    def print_usage():
        print("用法:")
        print("  python biji_client.py <问题>              # 搜索单个问题")
        print("  python biji_client.py --skill <skill名>   # 查询Skill相关知识")
        print("  python biji_client.py --test              # 测试API连接")
        print()
        print("可用的skill名:")
        for name in CBEC_QUERIES:
            print(f"  - {name}")

    if len(sys.argv) < 2:
        print_usage()
        sys.exit(0)

    if sys.argv[1] == "--test":
        print("测试Biji API连接...")
        try:
            client = BijiClient()
            result = client.search("知识库主要内容是什么？")
            print("✓ API连接成功")
            print(f"回答: {result.get('answer', 'N/A')[:200]}...")
        except Exception as e:
            print(f"✗ API连接失败: {e}")
            sys.exit(1)

    elif sys.argv[1] == "--skill":
        if len(sys.argv) < 3:
            print_usage()
            sys.exit(1)
        skill_name = sys.argv[2]
        print(f"查询Skill '{skill_name}' 相关知识...")
        results = query_knowledge_for_skill(skill_name)
        for i, result in enumerate(results, 1):
            print(f"\n--- 问题 {i} ---")
            print(client.format_result(result))

    else:
        question = " ".join(sys.argv[1:])
        try:
            client = BijiClient()
            result = client.search(question)
            print(client.format_result(result))
        except Exception as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(1)
