# -*- coding: utf-8 -*-
"""
把全国的省-市-区三级行政区划整理成站点用的 regions.json。

数据来源：https://github.com/xianyuxm/china-area-json 的 area-full.json（源自高德开放平台），
原始文件缓存在 _qa/backup/area-full.json，重跑不需要联网。

为什么要"整理"而不是直接把原始文件丢给后端用 —— 原始数据有三处不能直接上：
  1. 直辖市（北京/上海/天津/重庆）的市一级叫「北京城区」「重庆郊县」这种机器名，
     直接显示在"选城市"里很怪；重庆还被拆成了城区+郊县两个并列节点。
  2. 市名一律带「市」后缀（杭州市/北京市），而 tb_shop.city 里存的是「杭州」。
     两边对不上，筛选就会稳定返回空 —— 而且不报错。
  3. 台湾省在源数据里没有下级（0 个市），选进去是一片空白。这里按标准的
     6 直辖市 + 3 市 + 11 县补齐（金门、连江属福建省，不并入台湾省）。

产出：src/main/resources/regions.json
用法：python _qa/_build_regions.py [--refresh]
"""

import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW_URL = "https://cdn.jsdelivr.net/gh/xianyuxm/china-area-json@master/area-full.json"
RAW_CACHE = os.path.join(HERE, "backup", "area-full.json")
OUT = os.path.join(ROOT, "src", "main", "resources", "regions.json")

# 省级行政区按官方顺序排。用户找"广东"时扫一眼就能定位，
# 按数据源里那种「河南、广东、内蒙古…」的顺序会让人以为自己看错了。
PROVINCE_ORDER = [
    "北京市", "天津市", "河北省", "山西省", "内蒙古自治区",
    "辽宁省", "吉林省", "黑龙江省",
    "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省",
    "河南省", "湖北省", "湖南省", "广东省", "广西壮族自治区", "海南省",
    "重庆市", "四川省", "贵州省", "云南省", "西藏自治区",
    "陕西省", "甘肃省", "青海省", "宁夏回族自治区", "新疆维吾尔自治区",
    "香港特别行政区", "澳门特别行政区", "台湾省",
]

# 直辖市：省 = 市，合并成"一个城市节点 + N 个区"
MUNICIPALITIES = {"北京市", "上海市", "天津市", "重庆市"}

# 港澳：源数据把 18 个区直接挂在省级下面当"市"用，那在三级选择器里就成了
# 「香港特别行政区 → 中西区 →（空）」，第二级显示的是区名，语义是错的。
# 这里和直辖市一样处理成「香港特别行政区 → 香港 → 中西区/湾仔区/…」。
MUNI_CITY_NAME = {
    "北京市": "北京", "上海市": "上海", "天津市": "天津", "重庆市": "重庆",
    "香港特别行政区": "香港", "澳门特别行政区": "澳门",
}

# 台湾省：源数据缺下级，按标准行政区划补齐（6 直辖市 + 3 市 + 11 县）。
# 坐标取各市县的行政中心。金门县、连江县（马祖）属福建省，不并入台湾省。
TAIWAN = [
    ("台北市", 121.5654, 25.0330), ("新北市", 121.4657, 25.0124),
    ("桃园市", 121.3009, 24.9936), ("台中市", 120.6736, 24.1477),
    ("台南市", 120.2120, 22.9908), ("高雄市", 120.3014, 22.6273),
    ("基隆市", 121.7392, 25.1276), ("新竹市", 120.9686, 24.8066),
    ("嘉义市", 120.4491, 23.4801),
    ("宜兰县", 121.7534, 24.7570), ("新竹县", 121.0177, 24.8387),
    ("苗栗县", 120.8214, 24.5602), ("彰化县", 120.5416, 24.0759),
    ("南投县", 120.6855, 23.9099), ("云林县", 120.5426, 23.7092),
    ("嘉义县", 120.3322, 23.4590), ("屏东县", 120.4879, 22.6690),
    ("台东县", 121.1500, 22.7554), ("花莲县", 121.6015, 23.9911),
    ("澎湖县", 119.5713, 23.5711),
]


def center_of(node):
    """把 "113.753094,34.767052" 拆成 (lng, lat)；缺失或异常一律返回 (None, None)。"""
    c = node.get("center")
    if not c or "," not in c:
        return None, None
    try:
        lng, lat = c.split(",")[:2]
        return round(float(lng), 6), round(float(lat), 6)
    except (TypeError, ValueError):
        return None, None


def short_city(name):
    """去掉市一级的「市」后缀：杭州市 → 杭州。自治州/地区/盟保持原样（字都带着含义）。"""
    if name.endswith("市") and len(name) > 1:
        return name[:-1]
    return name


def fetch_raw(refresh=False):
    if os.path.exists(RAW_CACHE) and not refresh:
        return json.load(open(RAW_CACHE, encoding="utf-8"))
    req = urllib.request.Request(RAW_URL, headers={"User-Agent": "xhw-demo/1.0"})
    raw = urllib.request.urlopen(req, timeout=90).read()
    os.makedirs(os.path.dirname(RAW_CACHE), exist_ok=True)
    open(RAW_CACHE, "wb").write(raw)
    print("已下载原始数据 %.1f KB" % (len(raw) / 1024))
    return json.loads(raw.decode("utf-8"))


def build(data):
    out = []
    for prov in data:
        pname = prov["name"]
        cities = []

        if pname in MUNI_CITY_NAME:
            # 直辖市：把「北京城区」「重庆郊县」这些并列节点合成一个城市节点
            seen, districts = set(), []
            for c in prov.get("districts") or []:
                kids = c.get("districts") or []
                if kids:
                    for d in kids:
                        if d["name"] not in seen:
                            seen.add(d["name"])
                            districts.append(d["name"])
                elif c["name"] not in seen:
                    # 港澳不一样：它们的二级节点本身就是区（中西区、湾仔区…），没有第三级。
                    # 不特殊处理的话，香港会变成「香港 → 18 个区 → 空」，
                    # 区一级永远是空的，等于三级选择器在港澳这两地直接失效。
                    seen.add(c["name"])
                    districts.append(c["name"])
            lng, lat = center_of(prov)
            cities.append({
                "name": MUNI_CITY_NAME[pname],
                "x": lng, "y": lat,
                "districts": districts,
            })
        else:
            # 按 adcode 排，得到的是标准的行政区划顺序（数据源自带的顺序是乱的）
            for c in sorted(prov.get("districts") or [], key=lambda c: str(c.get("adcode") or "")):
                lng, lat = center_of(c)
                cities.append({
                    "name": short_city(c["name"]),
                    "x": lng, "y": lat,
                    "districts": [d["name"] for d in (c.get("districts") or [])],
                })

        if pname == "台湾省":
            cities = [{
                "name": short_city(n), "x": lng, "y": lat, "districts": [],
            } for n, lng, lat in TAIWAN]

        out.append({"name": pname, "cities": cities})

    # 带上省份坐标（省级节点本身也要能在将来的地图上用）
    by_name = {p["name"]: p for p in data}
    for p in out:
        lng, lat = center_of(by_name.get(p["name"], {}))
        p["x"], p["y"] = lng, lat

    order = {n: i for i, n in enumerate(PROVINCE_ORDER)}
    out.sort(key=lambda p: order.get(p["name"], 999))
    return out


def main():
    data = fetch_raw("--refresh" in sys.argv)
    regions = build(data)

    n_city = sum(len(p["cities"]) for p in regions)
    n_dist = sum(len(c["districts"]) for p in regions for c in p["cities"])
    assert len(regions) == 34, f"省级数不对：{len(regions)}"
    for p in regions:
        assert p["cities"], f"{p['name']} 没有下级城市"
    # 直辖市必须合并成一个节点（重庆原本是「城区 + 郊县」两个）
    for p in regions:
        if p["name"] in MUNI_CITY_NAME:
            assert len(p["cities"]) == 1, f"{p['name']} 未合并：{[c['name'] for c in p['cities']]}"

    text = json.dumps(regions, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    print(f"省级 {len(regions)}  市级 {n_city}  区县级 {n_dist}")
    print(f"regions.json {len(text.encode('utf-8')) / 1024:.1f} KB -> {OUT}")
    print("抽查：", " / ".join(
        f"{p['name']}({len(p['cities'])}市)" for p in regions[:6]))
    # 港澳的区一级必须非空，否则三级选择器在这两地是废的
    for p in regions:
        if p["name"] in ("香港特别行政区", "澳门特别行政区"):
            assert p["cities"][0]["districts"], p["name"] + " 的区一级是空的"
    for want in ("浙江省", "北京市", "重庆市", "海南省", "台湾省", "香港特别行政区"):
        p = [x for x in regions if x["name"] == want][0]
        nm = [c["name"] for c in p["cities"]]
        print(f"  {want}: {len(nm)} 个 -> {nm[:10]}")


if __name__ == "__main__":
    main()
