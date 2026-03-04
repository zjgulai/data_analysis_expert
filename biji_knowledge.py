#!/usr/bin/env python3
"""
Biji（Get笔记）知识库 API 调用示例。
知识库链接: https://biji.com/topic/Q0GzOMDY
文档: https://doc.biji.com/docs/QfMcwcoHqic5urkTBQKcAPIWnJe/
"""
import os
import json
import urllib.request
import urllib.error
from typing import List, Optional

BIJI_OPENAPI = "https://open-api.biji.com/getnote/openapi"
KNOWLEDGE_SEARCH = f"{BIJI_OPENAPI}/knowledge/search"
# 你的知识库 ID（来自 https://biji.com/topic/Q0GzOMDY）
TOPIC_ID = "Q0GzOMDY"


def search_knowledge(
    question: str,
    topic_ids: Optional[List[str]] = None,
    deep_seek: bool = True,
    refs: bool = False,
    api_key: Optional[str] = None,
) -> dict:
    """
    调用 Biji 知识库搜索接口。
    API Key 请通过环境变量 BIJI_API_KEY 传入，勿写入代码。
    """
    api_key = api_key or os.environ.get("BIJI_API_KEY")
    if not api_key:
        raise ValueError("请设置环境变量 BIJI_API_KEY，或在调用时传入 api_key")

    topic_ids = topic_ids or [TOPIC_ID]
    payload = {
        "question": question,
        "topic_ids": topic_ids,
        "deep_seek": deep_seek,
        "refs": refs,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        KNOWLEDGE_SEARCH,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-OAuth-Version": "1",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


if __name__ == "__main__":
    import sys
    q = sys.argv[1] if len(sys.argv) > 1 else "知识库主要内容是什么"
    try:
        result = search_knowledge(q)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"请求失败: {e}", file=sys.stderr)
        raise
