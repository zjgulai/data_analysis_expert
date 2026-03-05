#!/usr/bin/env python3
"""
Reddit VOC 采集（Playwright 浏览器方式，绕过 403）
用真实浏览器请求 old.reddit.com 的 .json，避免被 Reddit 拦截。无需 API 注册。
依赖：pip install playwright && python -m playwright install chromium
"""

import argparse
import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
VOC_DIR = SCRIPT_DIR.parent
RAW_LOGS = VOC_DIR / "logs" / "raw"

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("请先安装: pip install playwright && python -m playwright install chromium")
    raise SystemExit(1)

try:
    from openpyxl import Workbook
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

# 优先 old，若被 403 可尝试 www（部分网络只拦其一）
BASE = "https://old.reddit.com"
BASE_ALT = "https://www.reddit.com"
SUBREDDITS = [
    "breastfeeding",
    "WorkingMoms",
    "ExclusivelyPumping",
    "BabyBumps",
    "beyondthebump",
    "NewParents",
]
ROLLING_DAYS = 180
MAX_POSTS_PER_SUB = 300
MAX_COMMENTS_PER_POST = 50
REQUEST_DELAY = 1.5


def sanitize(s: str, max_len: int = 400) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s.strip())
    return s[:max_len] + ("..." if len(s) > max_len else "")


def main():
    parser = argparse.ArgumentParser(description="Reddit VOC 采集（Playwright 浏览器，无需 API）")
    parser.add_argument("--no-comments", action="store_true", help="不拉取评论")
    parser.add_argument("--debug", action="store_true", help="打印首个请求的响应状态与内容摘要")
    args = parser.parse_args()

    cutoff = (datetime.utcnow() - timedelta(days=ROLLING_DAYS)).timestamp()
    print(f"拉取最近 {ROLLING_DAYS} 天帖子，来源: old.reddit.com（Playwright 浏览器）")

    posts_by_id = {}
    all_comments = []
    bases_to_try = [BASE, BASE_ALT]
    warned_403 = False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        for sub in SUBREDDITS:
            count = 0
            after = None
            base_used = BASE
            while count < MAX_POSTS_PER_SUB:
                if after:
                    url = f"{base_used}/r/{sub}/new.json?limit=100&after={after}"
                else:
                    url = f"{base_used}/r/{sub}/new.json?limit=100"
                try:
                    resp = page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    time.sleep(REQUEST_DELAY)
                    if not resp:
                        if args.debug and after is None:
                            print(f"    [debug] resp is None for {url[:60]}")
                        break
                    if resp.status == 403:
                        if base_used == BASE:
                            base_used = BASE_ALT
                            if args.debug:
                                print(f"    [debug] 403 on old.reddit, 尝试 www.reddit.com")
                            continue
                        if not warned_403:
                            warned_403 = True
                            print("  Reddit 返回 403（当前网络可能被拦截）。建议：1) 在本机/home 网络运行 2) 配置 Reddit API 用 reddit_voc_fetch.py 3) 用 Browser MCP 手动采集")
                        break
                    if resp.status != 200:
                        if args.debug and after is None:
                            print(f"    [debug] status={resp.status} url={url[:60]}")
                        break
                    body_bytes = resp.body()
                    raw = body_bytes.decode("utf-8", errors="replace") if body_bytes else ""
                    if args.debug and after is None and sub == SUBREDDITS[0]:
                        print(f"    [debug] status={resp.status} body_len={len(raw)} body_preview={raw[:300]!r}")
                    data = None
                    try:
                        if raw.strip():
                            data = json.loads(raw)
                    except json.JSONDecodeError:
                        pass
                    if not data and raw.strip().startswith("<"):
                        try:
                            data = page.evaluate("() => { try { return JSON.parse(document.body.innerText); } catch(e) { return null; } }")
                        except Exception:
                            pass
                    if not data:
                        try:
                            data = json.loads(page.locator("pre").first.inner_text())
                        except Exception:
                            if args.debug and after is None:
                                print(f"    [debug] parse failed, body starts with: {raw[:150]!r}")
                            break
                    if isinstance(data, dict) and "data" in data:
                        children = data["data"].get("children", [])
                        next_after = data["data"].get("after")
                    else:
                        break
                    for child in children:
                        d = child.get("data", {})
                        if d.get("kind") != "t3":
                            continue
                        created = d.get("created_utc") or 0
                        if created < cutoff:
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
                    if not children or count >= MAX_POSTS_PER_SUB:
                        break
                    after = next_after
                    if not after:
                        break
                except Exception as e:
                    print(f"  r/{sub} 请求异常: {e}")
                    break
            print(f"  r/{sub}: 本批新增 {count} 条，累计 {len(posts_by_id)}")

        posts = list(posts_by_id.values())
        posts.sort(key=lambda x: x["created_utc"], reverse=True)

        if not args.no_comments and posts:
            print("拉取评论中…")
            for i, p in enumerate(posts):
                if i >= 100:
                    break
                url = f"{BASE}/r/{p['subreddit']}/comments/{p['id']}.json"
                try:
                    page.goto(url, wait_until="networkidle", timeout=15000)
                    time.sleep(REQUEST_DELAY)
                    try:
                        data = page.evaluate("() => JSON.parse(document.body.innerText)")
                    except Exception:
                        data = None
                    if not data or not isinstance(data, list) or len(data) < 2:
                        continue
                    if isinstance(data, list) and len(data) >= 2:
                        children = data[1].get("data", {}).get("children", [])
                        for j, child in enumerate(children):
                            if j >= MAX_COMMENTS_PER_POST:
                                break
                            d = child.get("data", {})
                            if d.get("kind") != "t1":
                                continue
                            body = (d.get("body") or "").strip()
                            if not body:
                                continue
                            pl = d.get("permalink", "")
                            if not pl.startswith("http"):
                                pl = BASE + (pl if pl.startswith("/") else "/" + pl)
                            all_comments.append({
                                "post_id": p["id"],
                                "post_url": p["url"],
                                "comment_index": len([c for c in all_comments if c["post_id"] == p["id"]]) + 1,
                                "body": body,
                                "created_utc": d.get("created_utc") or 0,
                                "score": int(d.get("score") or 0),
                                "comment_link": pl,
                            })
                except Exception:
                    pass

        browser.close()

    # 修正 comment_index
    by_post = {}
    for c in all_comments:
        pid = c["post_id"]
        if pid not in by_post:
            by_post[pid] = []
        by_post[pid].append(c)
    all_comments = []
    for pid, lst in by_post.items():
        for j, c in enumerate(lst, 1):
            c["comment_index"] = j
            all_comments.append(c)

    print(f"共 {len(posts)} 条帖子，{len(all_comments)} 条评论")

    RAW_LOGS.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    out_md = RAW_LOGS / f"{today}-reddit-posts.md"
    rows = []
    for p in posts:
        rows.append({
            "id": p["id"],
            "subreddit": f"r/{p['subreddit']}",
            "title": sanitize(p["title"], 200),
            "url": p["url"],
            "created": datetime.utcfromtimestamp(p["created_utc"]).strftime("%Y-%m-%d %H:%M UTC"),
            "selftext": sanitize(p["selftext"]),
            "num_comments": p["num_comments"],
            "score": p["score"],
        })

    with open(out_md, "w", encoding="utf-8") as f:
        f.write(f"# Reddit 原始帖子与评论 {today}\n\n")
        f.write(f"> 由 `reddit_voc_fetch_playwright.py` 生成（**Playwright 浏览器**，无需 API）。范围：**最近 {ROLLING_DAYS} 天**。共 **{len(rows)}** 条帖子。\n\n")
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
        comments_by_post = {}
        for c in all_comments:
            pid = c["post_id"]
            if pid not in comments_by_post:
                comments_by_post[pid] = []
            comments_by_post[pid].append(c)
        for i, r in enumerate(rows, 1):
            p = posts[i - 1]
            f.write(f"### [{i}] {r['subreddit']} | {r['created']} | [原帖链接]({r['url']})\n\n")
            f.write(f"**标题**：{r['title']}\n\n")
            if r["selftext"]:
                f.write(f"**正文**：\n\n{r['selftext']}\n\n")
            comments = comments_by_post.get(p["id"], [])
            f.write(f"**评论（共 {len(comments)} 条）**：\n\n")
            for c in sorted(comments, key=lambda x: x["comment_index"]):
                created_str = datetime.utcfromtimestamp(c["created_utc"]).strftime("%Y-%m-%d %H:%M UTC")
                body_esc = (c["body"] or "").replace("\n", " ").strip()[:500]
                if len(c["body"]) > 500:
                    body_esc += "..."
                f.write(f"- [{created_str}] (score={c['score']}) [评论链接]({c['comment_link']})\n  {body_esc}\n\n")
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
                c["post_id"], c["post_url"], c["comment_index"], (c["body"] or "")[:32767],
                datetime.utcfromtimestamp(c["created_utc"]).strftime("%Y-%m-%d %H:%M UTC"),
                c["score"], c["comment_link"],
            ])
        wb.save(out_xlsx)
        print(f"已写入 Excel -> {out_xlsx}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
