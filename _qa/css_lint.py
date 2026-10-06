#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""ticket.css 的静态体检。

为什么要有它：`_qa/html_lint.py` 查的是 HTML 结构，查不到 CSS 层面的**行为**问题。
而这一轮踩的坑恰恰是纯 CSS 的、而且肉眼看不出来：

    轮播 .gal 是个 `overflow-x: auto` 的滚动容器，图片又能高到 78vh，
    于是它几乎铺满整屏；手指/滚轮落在它身上时，**纵向滚动被这个容器吃掉了**
    （纵向它 overflow-y: hidden 滚不动，又不会把手势还给页面），
    表现是"整个页面卡住、滑不下去"。

这种 bug 在 jsdom 里也测不出来（jsdom 不做布局、不做手势），
所以只能在**规则层面**把它挡住：凡是横向滚动容器，都必须显式声明
`touch-action: pan-x`，意思是"这里只接管横向手势，纵向交给页面"。

跑法（不用起服务）：
    python _qa/css_lint.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSS = os.path.join(ROOT, "nginx-1.18.0", "html", "xhw", "css", "ticket.css")

problems = []
notes = []


def rules(text):
    """把 CSS 拆成 (选择器, 声明体) —— 够用就行，不追求完整解析。"""
    # 先去掉注释，否则注释里的花括号会打乱配对
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", text):
        yield m.group(1).strip(), " ".join(m.group(2).split())


def main():
    if not os.path.exists(CSS):
        print("找不到", CSS)
        return 2
    text = open(CSS, encoding="utf-8").read()

    n_rules = 0
    hscroll = 0
    for sel, body in rules(text):
        n_rules += 1
        if sel.startswith("@"):          # @media 之类，跳过
            continue

        # ---- 检查 1：横向滚动容器必须显式声明 touch-action ----
        if re.search(r"overflow-x:\s*(auto|scroll)", body):
            hscroll += 1
            if "touch-action" not in body:
                problems.append(
                    "%s 是横向滚动容器（overflow-x: auto）但没有 touch-action。\n"
                    "      风险：它会把纵向手势吃掉，页面可能整页滑不动。\n"
                    "      修法：加 `touch-action: pan-x;`" % sel)
            elif not re.search(r"touch-action:\s*(pan-x|auto)", body):
                problems.append(
                    "%s 的 touch-action 值是 %s，横向容器一般是 pan-x。"
                    % (sel, re.search(r"touch-action:\s*([^;]+)", body).group(1).strip()))

        # ---- 检查 2：全屏 fixed 元素（会挡住点击/滚动，值得人眼过一遍）----
        if "position: fixed" in body and re.search(r"inset:\s*0", body):
            notes.append("%s 是全屏 fixed（遮罩类），确认它只在需要时挂载" % sel)

        # ---- 检查 3：横向滚动容器不该同时有 max-height: Nvh 这种"能长很高"的设定 ----
        for m in re.finditer(r"max-height:\s*(\d+(?:\.\d+)?)vh", body):
            v = float(m.group(1))
            if v >= 70:
                notes.append(
                    "%s 里有 max-height: %gvh —— 配上 overflow 容器就是"
                    "「一个几乎铺满整屏、还会吃手势的块」，建议压到 60vh 以下"
                    % (sel, v))

    print("检查 %s" % os.path.relpath(CSS, ROOT))
    print("  规则 %d 条，其中横向滚动容器 %d 个" % (n_rules, hscroll))
    print()

    if notes:
        print("提示（不影响通过，人工过一眼）：")
        for n in notes:
            print("  · " + n)
        print()

    if problems:
        print("发现问题：")
        for p in problems:
            print("  ✗ " + p)
        print()
        print("不通过：%d 个" % len(problems))
        return 1

    print("全部通过：横向滚动容器都声明了 touch-action，没有全屏遮罩滥用")
    return 0


if __name__ == "__main__":
    sys.exit(main())
