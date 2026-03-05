# Reddit VOC 采集脚本使用说明

用 **Reddit 官方 API** 拉取母婴相关 subreddit 的**最近半年（180 天）**内的帖子，并抓取**每帖下方的评论**，一并输出到 `logs/raw/YYYY-MM-DD-reddit-posts.md`，便于你批量筛选并打标签后填入当日 VOC 表。

---

## 1. 获取 Reddit API 凭证（一次性）

1. 用你的 Reddit 账号登录，打开：<https://www.reddit.com/prefs/apps>  
2. 点击 **“create another app…”**（或 create application）。  
3. 填写：
   - **name**：随便填，如 `maternal_voc`
   - **App type**：选 **script**
   - **description**：可留空
   - **redirect uri**：填 `http://localhost:8080`
4. 创建后页面上会显示：
   - **personal use script** 下面的一串字符 → 即 `REDDIT_CLIENT_ID`
   - **secret** → 即 `REDDIT_CLIENT_SECRET`
5. **Reddit 用户名**：是你登录 Reddit 时显示的用户名（不是邮箱）。若用 Google 登录 Reddit，请在 Reddit 设置里查看你的 **username**。  
6. **Reddit 密码**：你的 Reddit 登录密码；若开启了两步验证，需在 Reddit 设置里生成 **App Password** 并用它代替登录密码。

---

## 2. 安装依赖

在项目根目录或本目录下执行：

```bash
pip install praw
```

若启用 **PullPush 双源**（见下文），需额外安装：

```bash
pip install requests
```

若需同时导出 **Excel**（帖子表 + 评论表，含帖子链接与评论链接），需安装：

```bash
pip install openpyxl
```

若希望用本目录下的 `.env` 文件免输环境变量，可一并安装：

```bash
pip install praw python-dotenv
```

（若项目用 uv/poetry，可在对应环境中安装。）

---

## 3. 配置环境变量

任选一种方式。

**方式 A：命令行临时设置（仅当前终端有效）**

```bash
export REDDIT_CLIENT_ID="你的 client_id"
export REDDIT_CLIENT_SECRET="你的 client_secret"
export REDDIT_USERNAME="你的 Reddit 用户名"
export REDDIT_PASSWORD="你的 Reddit 密码或 App Password"
```

**方式 B：本目录下建 `.env` 文件（不要提交到 Git）**

在 `books/maternal_social_voc/scripts/` 下新建 `.env`，内容示例：

```
REDDIT_CLIENT_ID=你的client_id
REDDIT_CLIENT_SECRET=你的client_secret
REDDIT_USERNAME=你的Reddit用户名
REDDIT_PASSWORD=你的密码或App_Password
```

然后在运行前执行一次：`set -a && source .env && set +a`（bash），或使用 `python-dotenv` 在脚本里加载（本脚本未内置，需自行 `pip install python-dotenv` 并加几行代码）。

**方式 C：系统或 IDE 配置**

在系统环境变量或 Cursor/IDE 的运行配置里设置上述四个变量。

---

## 4. 运行脚本

在项目根目录执行（保证能找到 `books/maternal_social_voc/scripts/`）：

```bash
python books/maternal_social_voc/scripts/reddit_voc_fetch.py
```

或在 `books/maternal_social_voc/scripts/` 下执行：

```bash
python reddit_voc_fetch.py
```

**可选：启用 PullPush 双源**（在 PRAW 基础上再从 [PullPush](https://pullpush.io/) 拉取帖子并合并，帖子量会更多）：

```bash
python reddit_voc_fetch.py --pullpush
```

或设置环境变量：`USE_PULLPUSH=1`。PullPush 为 Pushshift 后继的公开归档 API，**无需 Reddit 账号**；数据可能有数小时到数天延迟，仅使用公开归档数据，合规使用请遵守其服务条款。评论仍由 PRAW 抓取（PullPush 来源的帖无实时评论）。

成功时会打印：`已写入 xxx 条帖子 -> .../logs/raw/YYYY-MM-DD-reddit-posts.md`。

**无法完成 Reddit API 注册时**，可选用下面两种方式之一：

1. **公开 .json 接口**（简单，但易被 Reddit 403）：  
   `python books/maternal_social_voc/scripts/reddit_voc_fetch_json.py`  
   直接请求 `old.reddit.com/r/xxx/new.json`，仅需 `requests`。若返回 403，说明当前网络/环境被 Reddit 拦截。

2. **Playwright 浏览器方式**（推荐，用真实浏览器绕过 403）：  
   ```bash
   pip install playwright
   python -m playwright install chromium
   python books/maternal_social_voc/scripts/reddit_voc_fetch_playwright.py
   ```  
   用 Chromium 打开 .json 页面，与主脚本输出相同（.md + .xlsx）。可选 `--no-comments` 只拉帖子。

3. **RPA / 浏览器 MCP**：若本机脚本均 403，可用 Cursor 的 **Browser MCP** 手动采集：打开 `old.reddit.com/r/breastfeeding/new` 等页面，对页面做 snapshot，把帖子标题与链接整理到表格，再粘贴进 `logs/raw/` 下当日 Markdown 或 Excel 模板中使用。

---

## 5. 输出文件说明

- **路径**：`books/maternal_social_voc/logs/raw/YYYY-MM-DD-reddit-posts.md`（Markdown）；若已安装 openpyxl，会同时生成 `YYYY-MM-DD-reddit-posts.xlsx`（含「帖子」与「评论」两个工作表，帖子表含 post_url，评论表含 post_url 与 comment_link）。
- **数据来源**：**PRAW**（new 列表 + 关键词 search + **时间分片**，突破单次 1000 条上限）+ 可选 **PullPush**。输出文件头部会注明本次是否包含 PullPush。
- **时间范围**：每次运行拉取的是**最近 180 天（滚动半年）**内的帖子（按发帖时间过滤）。
- **内容**：
  1. **帖子列表**：表格列——序号、subreddit、title、url、created、num_comments、score、selftext 摘要。
  2. **帖子正文与评论**：按帖分段，每段包含该帖的标题、正文、以及该帖下**顶层评论**（每帖最多保留 50 条），每条评论含时间、score、链接与正文摘要（500 字内）。
- **建议用法**：打开该 MD，从「帖子列表」或「帖子正文与评论」中按「吸奶器 / 背奶 / 品牌 / 痛点」等筛选出高价值帖或评论，复制到 [02-日常VOC采集模板与示例.md](../02-日常VOC采集模板与示例.md) 的表格中，补全「人群标签、需求/痛点标签、提及品牌、原文摘要」等列，再合并进当日 `logs/YYYY-MM-DD-daily-voc.md` 与当周摘要。  
  若在 Cursor 内做即时 Reddit 查询，可搭配 Reddit 相关 MCP（与批量采集脚本分工：MCP 做即时查，脚本做每日大批量）。

---

## 6. 每天定时跑（可选）

- **macOS / Linux**：在 crontab 中加一行（早上 9 点跑，需先配置好环境变量）：
  `0 9 * * * cd /path/to/shopify_analysis && python books/maternal_social_voc/scripts/reddit_voc_fetch.py`
- **Windows**：用任务计划程序，新建任务，程序填 `python`，参数填脚本路径，并设置环境变量。

跑完后每天打开 `logs/raw/` 下当日文件做筛选与打标签即可。

---

## 7. 每日洞察报告与新闻风格日报

在完成当日 VOC 采集（`logs/YYYY-MM-DD-daily-voc.md`）后，可生成**反直觉洞察、淘金式/逆向思维、策略优化点、未满足需求点**及**新闻风格 HTML 日报**（供截图或打印为图，团队每日学习）：

```bash
python3 books/maternal_social_voc/scripts/generate_daily_insight_report.py YYYY-MM-DD
```

- 输出：`logs/daily-briefs/YYYY-MM-DD-insight.md`、`logs/daily-briefs/YYYY-MM-DD-daily-brief.html`
- 将 HTML 用浏览器打开后，截图或「打印 → 另存为 PDF」即可得到精美图文日报。详见 [logs/daily-briefs/README.md](../logs/daily-briefs/README.md)。
