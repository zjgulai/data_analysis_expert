#!/usr/bin/env python3
"""
Reddit VOC 采集（无需 API 注册）
通过 Reddit 公开 .json 接口（在 URL 后加 .json）拉取帖子和评论，无需 Client ID / Secret。
适用于无法完成 Reddit API 注册时的替代方案。请设置合理 User-Agent 并控制请求频率。
"""

import argparse
import re
import time
from datetime import datetime, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
VOC_DIR = SCRIPT_DIR.parent
RAW_LOGS = VOC_DIR / "logs" / "raw"

try:
    import requests
except ImportError:
    print("请先安装: pip install requests")
    raise SystemExit(1)

try:
    from openpyxl import Workbook
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

BASE = "https://old.reddit.com"
# 使用浏览器风格 User-Agent，否则 Reddit 易返回 403
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
REQUEST_DELAY = 2.0  # 请求间隔（秒），避免被限流

SUBREDDITS = [
    "breastfeeding",
    "WorkingMoms",
    "ExclusivelyPumping",
    "BabyBumps",
    "beyondthebump",
    "NewParents",
]

ROLLING_DAYS = 180
MAX_POSTS_PER_SUB = 500   # 每 sub 最多拉取帖子数（控制总请求量）
MAX_COMMENTS_PER_POST = 50


def sanitize(s: str, max_len: int = 400) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s.strip())
    return s[:max_len] + ("..." if len(s) > max_len else "")


def fetch_listing(session, url: str):
    """请求一个 .json 列表，返回 (children, after) 或 ([], None)。"""
    try:
        r = session.get(url, timeout=15)
        if r.status_code == 429:
            print(f"  限流 429，等待 60s 后重试: {url[:60]}...")
            time.sleep(60)
            return fetch_listing(session, url)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and "data" in data:
            children = data["data"].get("children", [])
            after = data["data"].get("after")
            return children, after
        if isinstance(data, list) and len(data) >= 1 and "data" in data[0]:
            children = data[0]["data"].get("children", [])
            after = data[0]["data"].get("after")
            return children, after
        return [], None
    except Exception as e:
        print(f"  请求失败 {url[:50]}...: {e}")
        return [], None


def fetch_posts(session, cutoff_ts: float):
    """按 sub 拉取 new 列表，分页直到超过 cutoff 或达到上限。"""
    posts_by_id = {}
    for sub in SUBREDDITS:
        count = 0
        after = None
        while count < MAX_POSTS_PER_SUB:
            if after:
                url = f"{BASE}/r/{sub}/new.json?limit=100&after={after}"
            else:
                url = f"{BASE}/r/{sub}/new.json?limit=100"
            time.sleep(REQUEST_DELAY)
            children, next_after = fetch_listing(session, url)
            if not children:
                break
            for child in children:
                d = child.get("data", {})
                if d.get("kind") == "t3":
                    created = d.get("created_utc") or 0
                    if created < cutoff_ts:
                        continue
                    pid = d.get("id")
                    if not pid or pid in posts_by_id:
                        continue
                    permalink = d.get("permalink", "")
                    if not permalink.startswith("http"):
                        permalink = BASE + (permalink if permalink.startswith("/") else "/" + permalink)
                    posts_by_id[pid] = {
                        "id": pid,
                        "subreddit": sub,
                        "title": (d.get("title") or "").strip(),
                        "url": permalink,
                        "created_utc": created,
                        "selftext": (d.get("selftext") or "").strip(),
                        "num_comments": int(d.get("num_comments") or 0),
                        "score": int(d.get("score") or 0),
                    }
                    count += 1
                    if count >= MAX_POSTS_PER_SUB:
                        break
            if count >= MAX_POSTS_PER_SUB or len(children) < 100:
                break
            after = next_after
            if not after:
                break
        print(f"  r/{sub}: 本批新增 {count} 条，累计帖子 {len(posts_by_id)}")
    return list(posts_by_id.values())


def fetch_comments_for_post(session, sub: str, post_id: str, post_url: str):
    """拉取单帖评论（顶层），返回 [(body, created_utc, score, comment_link)]。"""
    url = f"{BASE}/r/{sub}/comments/{post_id}.json"
    time.sleep(REQUEST_DELAY)
    try:
        r = session.get(url, timeout=15)
        if r.status_code == 429:
            time.sleep(60)
            return fetch_comments_for_post(session, sub, post_id, post_url)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return []
    out = []
    # data[0] = post listing, data[1] = comment listing
    if not isinstance(data, list) or len(data) < 2:
        return out
    children = data[1].get("data", {}).get("children", [])
    for i, child in enumerate(children):
        if i >= MAX_COMMENTS_PER_POST:
            break
        d = child.get("data", {})
        kind = d.get("kind", "")
        if kind != "t1":
            continue
        body = (d.get("body") or "").strip()
        if not body:
            continue
        permalink = d.get("permalink", "")
        if not permalink.startswith("http"):
            permalink = BASE + (permalink if permalink.startswith("/") else "/" + permalink)
        out.append((
            body,
            d.get("created_utc") or 0,
            int(d.get("score") or 0),
            permalink,
        ))
    return out


def main():
    parser = argparse.ArgumentParser(description="Reddit VOC 采集（无需 API，使用公开 .json 接口）")
    parser.add_argument("--no-comments", action="store_true", help="不拉取评论，仅帖子（更快）")
    args = parser.parse_args()

    cutoff = (datetime.utcnow() - timedelta(days=ROLLING_DAYS)).timestamp()
    print(f"拉取最近 {ROLLING_DAYS} 天帖子（cutoff = {datetime.utcfromtimestamp(cutoff).strftime('%Y-%m-%d')} UTC），来源: old.reddit.com .json")

    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    })

    posts = fetch_posts(session, cutoff)
    posts.sort(key=lambda p: p["created_utc"], reverse=True)
    print(f"共 {len(posts)} 条帖子")

    RAW_LOGS.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    out_md = RAW_LOGS / f"{today}-reddit-posts.md"
    all_comments = []

    rows = []
    for p in posts:
        created = datetime.utcfromtimestamp(p["created_utc"]).strftime("%Y-%m-%d %H:%M UTC")
        rows.append({
            "id": p["id"],
            "subreddit": f"r/{p['subreddit']}",
            "title": sanitize(p["title"], 200),
            "url": p["url"],
            "created": created,
            "selftext": sanitize(p["selftext"]),
            "num_comments": p["num_comments"],
            "score": p["score"],
        })

    with open(out_md, "w", encoding="utf-8") as f:
        f.write(f"# Reddit 原始帖子与评论 {today}\n\n")
        f.write(f"> 由 `reddit_voc_fetch_json.py` 生成（**无需 API 注册**，使用 old.reddit.com 公开 .json）。范围：**最近 {ROLLING_DAYS} 天**。共 **{len(rows)}** 条帖子。\n\n")
        f.write("---\n\n## 帖子列表\n\n")
        f.write("| 序号 | subreddit | title | url | created | num_comments | score | selftext（摘要） |\n")
        f.write("|------|-----------|-------|-----|---------|--------------|-------|------------------|\n")
        for i, r in enumerate(rows, 1):
            st = (r["selftext"] or "").replace("|", "\\|").replace("\n", " ")[:300]
            if len((r["selftext"] or "")) > 300:
                st += "..."
            tit = (r["title"] or "").replace("|", "\\|").replace("\n", " ")
            f.write(f"| {i} | {r['subreddit']} | {tit} | {r['url']} | {r['created']} | {r['num_comments']} | {r['score']} | {st} |\n")
        f.write("\n---\n\n## 帖子正文与评论\n\n")
        for i, r in enumerate(rows, 1):
            p = posts[i - 1]
            f.write(f"### [{i}] {r['subreddit']} | {r['created']} | [原帖链接]({r['url']})\n\n")
            f.write(f"**标题**：{r['title']}\n\n")
            if r["selftext"]:
                f.write(f"**正文**：\n\n{r['selftext']}\n\n")
            if not args.no_comments:
                comments = fetch_comments_for_post(session, p["subreddit"], p["id"], p["url"])
                f.write(f"**评论（共 {len(comments)} 条，仅顶层）**：\n\n")
                for j, (body, created_utc, score, permalink) in enumerate(comments, 1):
                    created_str = datetime.utcfromtimestamp(created_utc).strftime("%Y-%m-%d %H:%M UTC")
                    body_esc = (body or "").replace("\n", " ").strip()[:500]
                    if len(body) > 500:
                        body_esc += "..."
                    f.write(f"- [{created_str}] (score={score}) [评论链接]({permalink})\n  {body_esc}\n\n")
                    all_comments.append({
                        "post_id": p["id"],
                        "post_url": p["url"],
                        "comment_index": j,
                        "body": body,
                        "created_utc": created_utc,
                        "score": score,
                        "comment_link": permalink,
                    })
            else:
                f.write("**评论**：未拉取（使用了 --no-comments）。\n\n")
            f.write("\n")

    print(f"已写入 {out_md}")

    if OPENPYXL_AVAILABLE:
        out_xlsx = RAW_LOGS / f"{today}-reddit-posts.xlsx"
        wb = Workbook()
        ws_posts = wb.active
        ws_posts.title = "帖子"
        ws_posts.append(["post_id", "post_url", "subreddit", "title", "created", "selftext", "num_comments", "score"])
        for r in rows:
            ws_posts.append([r["id"], r["url"], r["subreddit"], r["title"], r["created"], (r["selftext"] or "")[:32767], r["num_comments"], r["score"]])
        ws_comments = wb.create_sheet("评论", 1)
        ws_comments.append(["post_id", "post_url", "comment_index", "comment_body", "comment_created_readable", "comment_score", "comment_link"])
        for c in all_comments:
            ws_comments.append([
                c["post_id"],
                c["post_url"],
                c["comment_index"],
                (c["body"] or "")[:32767],
                datetime.utcfromtimestamp(c["created_utc"]).strftime("%Y-%m-%d %H:%M UTC"),
                c["score"],
                c["comment_link"],
            ])
        wb.save(out_xlsx)
        print(f"已写入 Excel -> {out_xlsx}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
