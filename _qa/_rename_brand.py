# -*- coding: utf-8 -*-
"""
一次性迁移脚本：把项目里「黑马 / hmdp」的痕迹清成「小红碗 / xhw」。

⚠️ 这是一次性脚本，正常情况下**不需要再跑**。留在仓库里是为了：
    1. 记录当时到底改了哪些形态（免得以后有人问"这个名字怎么改的"）；
    2. 如果有人把仓库回滚到改名之前，可以直接重跑一次。

为什么要用一个 .py 文件而不是命令行里的一段 heredoc：
    git-bash 在把 heredoc 内容交给 shell 时，会**把内容里的反斜杠替换成正斜杠**
    （MSYS 的路径转换）。于是 r'D:\\hmdp' 这种规则在脚本里变成了 'D:/hmdp'，
    Java 字符串里的 "D:\\\\hmdp\\\\nginx..." 一处都匹配不上，还查不出来——
    因为替换是"0 次命中"这种静默失败。用文件写就不经过 shell，没有这个问题。

用法：
    python _qa/_rename_brand.py            # 就地替换
    python _qa/_rename_brand.py --dry-run  # 只报告会改哪些文件
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# 不改的地方：
#   .git / target / node_modules / __pycache__：构建产物与缓存
#   .idea            ：IDE 本地状态，重新导入工程时会自己生成
#   logs             ：nginx 的历史错误日志，里面是当时真实的旧路径，改了反而是篡改记录
#   _frontend_origin_backup：上游原版前端的**原样备份**，改了它就失去对照价值
#   改造说明.md       ：里面有刻意的「改前名称 → 改后名称」对照表（比如 D:\hmdp → D:\xhw），
#                       再跑一次这个脚本会把改前那一列也改掉，对照就没了
SKIP_DIRS = {".git", "target", "node_modules", "__pycache__", ".mvn",
             ".idea", "logs", "_frontend_origin_backup"}
BIN_EXT = (".png", ".jpg", ".jpeg", ".gif", ".ico", ".jar", ".woff", ".woff2",
           ".ttf", ".zip", ".7z", ".exe", ".dll", ".class")

# 上游原版 SQL 是"别人的文件"，保持原样（它还带着自己的 Source Schema 头）；
# 本脚本自己当然也不能被替换，否则规则表会被改坏；
# 改造说明.md 见上面 SKIP_DIRS 的说明
SKIP_FILES = {"upstream-original.sql", "_rename_brand.py", "改造说明.md"}

# 顺序很重要：越具体的规则越靠前，否则泛规则会先把上下文吃掉
RULES = [
    # ---- 出处 / 外部引用：中性化，但不篡改别人文章的标题 ----
    ("本项目基于黑马程序员《Redis 入门到实战》课程配套源码改造而来。",
     "本项目基于一套 Redis 实战课程的开源配套源码改造而来。"),
    ("黑马程序员Redis入门到实战教程，深度透析redis底层原理+redis分布式锁+企业解决方案+redis实战",
     "Redis 入门到实战课程（B 站）"),
    ("CSDN 黑马点评", "CSDN Redis 实战项目参考"),
    ("原版 `hhuzzz/hmdp`", "原版上游仓库"),
    ("这一段是黑马点评的经典考点", "这一段是经典的限流考点"),
    ("把黑马点评的 MySQL 建表+数据脚本", "把上游的 MySQL 建表+数据脚本"),

    # ---- 品牌名 ----
    ("黑马点评", "小红碗"),
    ("黑马", "小红碗"),
    ("HMDP", "XHW"),
    ("Hmdp", "Xhw"),

    # 主类名。**上一版漏了这条**，因为它既不含 "hmdp" 也不含 "HMDP"，
    # 自检模式扫不到，最后 IDEA 的运行配置里留下了 com.xhw.HmDianPingApplication。
    ("HmDianPingApplication", "XiaoHongWanApplication"),

    # ---- 目录 / 文件名（反斜杠和正斜杠两种写法都要管）----
    # Java 字符串里写的是**双反斜杠**（"D:\\hmdp\\nginx-1.18.0\\html\\hmdp\\imgs"），
    # 单反斜杠的规则匹配不到，所以这两种都要列
    (r"nginx-1.18.0\\html\\hmdp", r"nginx-1.18.0\\html\\xhw"),
    ("nginx-1.18.0/html/hmdp", "nginx-1.18.0/html/xhw"),
    (r"nginx-1.18.0\html\hmdp", r"nginx-1.18.0\html\xhw"),
    ("_frontend_origin_backup/hmdp", "_frontend_origin_backup/original-frontend"),
    ("_frontend_origin_backup\\hmdp", "_frontend_origin_backup\\original-frontend"),
    (r"src\main\resources\db\hmdp.sql", r"src\main\resources\db\xhw.sql"),
    ('"src", "main", "resources", "db", "hmdp.sql"',
     '"src", "main", "resources", "db", "xhw.sql"'),
    ('"nginx-1.18.0", "html", "hmdp", "imgs", "blogs"',
     '"nginx-1.18.0", "html", "xhw", "imgs", "blogs"'),
    ('"nginx-1.18.0", "html", "hmdp"', '"nginx-1.18.0", "html", "xhw"'),
    ("db/hmdp.sql", "db/xhw.sql"),
    (r"db\hmdp.sql", r"db\xhw.sql"),
    ("backup/hmdp.sql.orig", "backup/upstream.sql.orig"),
    ("hmdp.sql.orig", "upstream.sql.orig"),
    ("target/hmdp-1.0-SNAPSHOT.jar", "target/xhw-1.0-SNAPSHOT.jar"),
    ("hmdp-1.0-SNAPSHOT.jar", "xhw-1.0-SNAPSHOT.jar"),
    ("html/hmdp", "html/xhw"),
    ("├── hmdp.sql", "├── upstream-original.sql"),
    ("├── hmdp/", "├── original-frontend/"),

    # ---- 项目根目录 D:\hmdp -> D:\xhw（Java 字符串里是双反斜杠）----
    (r"D:\\hmdp", r"D:\\xhw"),
    (r"D:\hmdp", r"D:\xhw"),
    ("D:/hmdp", "D:/xhw"),

    # ---- 包名 ----
    ("com.hmdp", "com.xhw"),
    ("com/hmdp", "com/xhw"),

    # ---- 数据源 / 连接串 / 账号 ----
    ("3306/hmdp", "3306/xhw"),
    ("jdbc:h2:mem:hmdp", "jdbc:h2:mem:xhw"),
    ("hmdp123456", "xhw123456"),
    ("set \"DB_USER=hmdp\"", "set \"DB_USER=xhw\""),
    ("set \"DB_NAME=hmdp\"", "set \"DB_NAME=xhw\""),
    ("DBNAME=hmdp", "DBNAME=xhw"),
    ("DBUSER=hmdp", "DBUSER=xhw"),
    ("${DB_USER:hmdp}", "${DB_USER:xhw}"),
    ("${DB_NAME:hmdp}", "${DB_NAME:xhw}"),
    ("CREATE DATABASE hmdp", "CREATE DATABASE xhw"),
    ("a dedicated user hmdp", "a dedicated user xhw"),
    ("专用账号 hmdp/xhw123456", "专用账号 xhw/xhw123456"),
    ("只授权 hmdp.*", "只授权 xhw.*"),
    ("127.0.0.1:3306 / hmdp", "127.0.0.1:3306 / xhw"),
    ("Schema = hmdp", "Schema = xhw"),
    ("TABLE_SCHEMA = 'hmdp'", "TABLE_SCHEMA = 'xhw'"),
    ("xhw database", "xhw database"),

    # ---- Spring / 自定义配置键 ----
    ("name: hmdp", "name: xhw"),
    ("hmdp.upload-dir", "xhw.upload-dir"),
    ("hmdp.preheat-", "xhw.preheat-"),
    ("hmdp.dev-", "xhw.dev-"),
    ("hmdp: debug", "xhw: debug"),
    ("\nhmdp:", "\nxhw:"),
    ("* hmdp:", "* xhw:"),

    # ---- 前端 localStorage 键（改了等于让用户重选一次区域，可接受）----
    ('"hmdp:region"', '"xhw:region"'),
    ('"hmdp:city"', '"xhw:city"'),

    # ---- 杂项 ----
    ("hmdp_code.txt", "xhw_code.txt"),
    ("hmdp_ttl.txt", "xhw_ttl.txt"),
    ("hmdp_ping.txt", "xhw_ping.txt"),
    ("hmdp-demo/1.0", "xhw-demo/1.0"),
    ("比如 hmdp", "比如 xhw"),
    ("数据库速查清单", "数据库速查清单"),
    ("--  hmdp 数据库速查清单", "--  xhw 数据库速查清单"),
    ("模块名不叫 `hmdp`", "模块名不叫 `xhw`"),
    ("on project hmdp", "on project xhw"),
    ("hmdp database", "xhw database"),
    # 兜底：剩下的裸 hmdp（放在最后，前面的具体规则都已经处理过了）
    ("hmdp.sql", "xhw.sql"),
]


def read_text(path):
    """按 utf-8 -> gbk 依次尝试解码（.bat 是 GBK，混编会让中文变乱码）"""
    raw = open(path, "rb").read()
    for enc in ("utf-8", "gbk"):
        try:
            return raw.decode(enc), enc, raw
        except UnicodeDecodeError:
            continue
    return None, None, raw


def main():
    dry = "--dry-run" in sys.argv
    changed, total_hits = [], 0
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for f in fn:
            if os.path.splitext(f)[1].lower() in BIN_EXT:
                continue
            full = os.path.join(dp, f)
            if os.path.basename(full) in SKIP_FILES:
                continue
            text, enc, raw = read_text(full)
            if text is None:
                continue
            before = text
            for a, b in RULES:
                text = text.replace(a, b)
            if text == before:
                continue
            n = sum(before.count(a) for a, _ in RULES if before.count(a))
            changed.append((os.path.relpath(full, ROOT).replace(os.sep, "/"), enc, n))
            total_hits += n
            if not dry:
                # 保持原有换行风格：原来有 CRLF 就继续用 CRLF
                newline = "\r\n" if raw.count(b"\r\n") else ""
                with open(full, "w", encoding=enc, newline=newline) as fh:
                    fh.write(text)

    print("%s 改动 %d 个文件，共 %d 处"
          % ("[dry-run]" if dry else "[已写入]", len(changed), total_hits))
    for p, enc, n in sorted(changed, key=lambda x: -x[2]):
        print("  %-56s %-6s %d" % (p, enc, n))

    # 收尾自检：还有没有漏的
    left = []
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for f in fn:
            if os.path.splitext(f)[1].lower() in BIN_EXT:
                continue
            full = os.path.join(dp, f)
            if os.path.basename(full) in SKIP_FILES:
                continue
            text, enc, _ = read_text(full)
            if text is None:
                continue
            for i, line in enumerate(text.split("\n")):
                # 模式要覆盖**所有**变体。上一版只有 hmdp/HMDP/黑马，
                # 于是 "HmDianPing" 这类驼峰写法扫不出来，漏了一个主类名。
                if re.search(r"hmdianping|hmdp|黑马", line, re.I):
                    left.append("%s:%d  %s" % (os.path.relpath(full, ROOT).replace(os.sep, "/"),
                                               i + 1, line.strip()[:80]))
    print("\n残留 %d 行" % len(left))
    for l in left:
        print("  ", l)


if __name__ == "__main__":
    main()
