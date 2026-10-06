# -*- coding: utf-8 -*-
"""
前端静态体检（无需起服务、无需浏览器）：
  1. 自定义元素自闭合  <tk-icon .../>  —— HTML 解析器不把自定义元素当 void，
     自闭合会把后面的兄弟节点全吞成它的子节点，页面会静默缺块。
  2. HTML 注释开闭配平  <!-- ... -->  —— 写成 <!-- ... */ 会一路吞到下一个 -->。
  3. 标签配平（引号感知扫描，属性值里出现 < > 也不误判）。
  4. href/src 里引用的本地静态资源是否真的存在于 web root。

用法：
  python html_lint.py [web_root]
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r"D:\xhw\nginx-1.18.0\html\xhw"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}

# 需要检查配平的容器标签（不追求全量，覆盖会互相影响的块级父元素）
PAIR_TAGS = {"div", "section", "main", "header", "footer", "article", "span",
             "button", "h1", "h2", "h3", "p", "a", "template", "nav", "ul", "li",
             "label", "textarea", "video", "figure", "form"}

ASSET = re.compile(r"""(?:href|src)\s*=\s*["'](/[^"'#?]+)["']""", re.I)


def strip_script_style(s):
    return re.sub(r"<(script|style)\b.*?</\1>", "", s, flags=re.S | re.I)


def scan_tags(body):
    """引号感知地扫出所有标签。

    浏览器解析 HTML 时，只有引号外的 '>' 才结束一个标签；
    属性值里出现 < > 是合法的（例如 v-else-if="list.length < 9"）。
    朴素正则在这里会误判，所以手动扫描。

    产出 (closing, name, selfclose, start_offset)
    """
    out = []
    i = 0
    n = len(body)
    while True:
        i = body.find("<", i)
        if i < 0:
            break

        # 注释整段跳过
        if body.startswith("<!--", i):
            end = body.find("-->", i + 4)
            i = n if end < 0 else end + 3
            continue
        # 文档声明 / 处理指令
        if body.startswith("<!", i) or body.startswith("<?", i):
            end = body.find(">", i)
            i = n if end < 0 else end + 1
            continue

        j = i + 1
        closing = False
        if j < n and body[j] == "/":
            closing = True
            j += 1
        if j >= n or not body[j].isalpha():
            i += 1
            continue

        k = j
        while k < n and (body[k].isalnum() or body[k] in "-:_."):
            k += 1
        name = body[j:k].lower()

        # 扫到引号外那个 '>'
        quote = None
        p = k
        while p < n:
            c = body[p]
            if quote:
                if c == quote:
                    quote = None
            elif c in "\"'":
                quote = c
            elif c == ">":
                break
            p += 1
        if p >= n:
            break

        inner = body[k:p]
        selfclose = inner.rstrip().endswith("/")
        out.append((closing, name, selfclose, i))
        i = p + 1
    return out


def line_of(body, off):
    return body[:off].count("\n") + 1


def check_page(fn, body, problems):
    tags = scan_tags(body)

    # 0. 有固定底栏的页面必须有 <main class="main"> 容器。
    #    底部导航 .tk-ft 是 position: fixed，只有 .main 带
    #    padding-bottom: calc(var(--ft) + 28px) 把它的高度让出来。
    #    少了这一层，页面**最后一个元素会被底栏永久盖住**，滚到底也露不出来。
    #    实测踩过：shop-detail（被盖住的是最后一张代金券卡片的底部）、
    #    index / shop-list / address 三个页面也一起中招。
    if "<foot-bar" in body and not re.search(r'class="main\b', body):
        problems.append("%s  有 <foot-bar> 固定底栏，但没有 <main class=\"main\"> 容器 —— "
                        "页面最后一个元素会被底栏永久盖住" % fn)

    stack = []
    for closing, name, selfclose, off in tags:
        line = line_of(body, off)

        # 1. 自定义元素（带短横线）不许自闭合
        if selfclose and "-" in name:
            problems.append("%s:%d  自定义元素自闭合 <%s/> —— 应写成 <%s></%s>，"
                            "否则解析器会把后续兄弟节点吞成它的子节点"
                            % (fn, line, name, name, name))
            continue
        if name in VOID or selfclose:
            continue

        if not closing:
            stack.append((name, line))
        else:
            idx = None
            for t in range(len(stack) - 1, -1, -1):
                if stack[t][0] == name:
                    idx = t
                    break
            if idx is None:
                problems.append("%s:%d  找不到对应开标签的 </%s>" % (fn, line, name))
            else:
                for t, l in stack[idx + 1:]:
                    if t in PAIR_TAGS:
                        problems.append("%s:%d  <%s>（第 %d 行开）一直没闭合，"
                                        "就在 </%s> 之前" % (fn, l, t, l, name))
                del stack[idx:]

    for t, l in stack:
        if t in PAIR_TAGS:
            problems.append("%s:%d  <%s> 从头到尾没有闭合" % (fn, l, t))


def main():
    files = sorted(f for f in os.listdir(ROOT) if f.endswith(".html"))
    print("检查 %d 个页面：%s\n" % (len(files), ", ".join(files)))

    problems = []
    for fn in files:
        src = io.open(os.path.join(ROOT, fn), encoding="utf-8").read()
        body = strip_script_style(src)

        # 2. 注释配平
        if body.count("<!--") != body.count("-->"):
            problems.append("%s  注释不配平：<!-- %d 个，--> %d 个"
                            % (fn, body.count("<!--"), body.count("-->")))
        for m in re.finditer(r"<!--(?:(?!-->).)*\*/", body, re.S):
            problems.append("%s:%d  注释用 */ 收尾，解析器会一路吞到下一个 -->"
                            % (fn, line_of(body, m.start())))

        # 坏注释会把后面整段吞掉，导致标签检查再也看不到它们。
        # 这里先把 */ 原地换成 -->（等长，行号不变）再扫，好把真实影响范围一并报出来。
        body = re.sub(r"<!--(?:(?!-->).)*\*/",
                      lambda m: m.group(0).replace("*/", "-->"), body, flags=re.S)

        # 1 & 3. 标签
        check_page(fn, body, problems)

        # 4. 本地静态资源
        for m in ASSET.finditer(src):
            rel = m.group(1)
            if not os.path.exists(os.path.join(ROOT, rel.lstrip("/").replace("/", os.sep))):
                problems.append("%s:%d  引用的静态文件不存在 %s"
                                % (fn, src[:m.start()].count("\n") + 1, rel))

    print("-" * 62)
    if problems:
        print("发现 %d 个问题：\n" % len(problems))
        for p in problems:
            print("  " + p)
        sys.exit(1)
    print("全部通过：自定义元素均成对、注释配平、标签配平、静态资源齐全")


main()
