# -*- coding: utf-8 -*-
"""
把 db/xhw.sql 从「只有杭州」扩成「全国 8 城」的种子数据。

为什么要有这个生成器，而不是直接手改 xhw.sql：
  1. tb_shop 用的是**位置式 INSERT**（INSERT INTO tb_shop VALUES (...)，不写列名），
     加一列就等于所有行都要在同一位置补一个值。手改 84 行，错一个逗号就是一整块
     数据对不上列，而且报错信息只会说「列数不匹配」，很难定位。
  2. 需要生成的 70 家店 / 16 篇笔记里，坐标、图片、时间都是从几个小池子里循环取的，
     手写字面量既容易抄错、也没法复现。
  所以：数据源写在本文件里 -> 生成 SQL 文本 -> 原地替换 xhw.sql 的对应块，
  其余部分（建表语句、其它表、注释）逐字节保持不变。

幂等：重复运行结果一致（用固定随机种子做坐标抖动）。
用法：
    python _qa/_gen_nationwide_sql.py            # 生成并覆盖
    python _qa/_gen_nationwide_sql.py --dry-run  # 只打印统计，不落盘
"""
import json
import os
import random
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SQL_PATH = os.path.join(ROOT, "src", "main", "resources", "db", "xhw.sql")
BAK_PATH = os.path.join(HERE, "backup", "upstream.sql.orig")

# ---------------------------------------------------------------------------
# 1. 城市定义：中心点 + 10 家店
#    坐标抖动幅度 0.018 度（≈2km），是为了配合 /shop/of/type 的 GEO 分支——
#    那个分支的搜索半径硬编码是 5000m，抖动太大就会有店落在半径外、列表凭空少几家。
# ---------------------------------------------------------------------------
CITIES = [
    {
        "name": "北京", "lon": 116.4074, "lat": 39.9042,
        "shops": [
            ("四季民福烤鸭店(故宫店)", 1, "王府井", "南池子大街11号", 168, 41820, 12036, 48, "10:30-22:00"),
            ("胡大饭馆(簋街总店)", 1, "簋街", "东直门内大街235号", 132, 93514, 24817, 47, "11:00-04:00"),
            ("聚宝源(牛街总店)", 1, "牛街", "牛街西里二区商业1号楼", 118, 62470, 18922, 47, "10:00-21:30"),
            ("局气(三里屯店)", 1, "三里屯", "三里屯路19号院3号楼", 105, 38205, 9644, 45, "10:30-22:00"),
            ("南门涮肉(天坛店)", 1, "天坛", "天坛路63号", 142, 47160, 13208, 46, "11:00-22:30"),
            ("紫光园(朝阳门店)", 1, "朝阳门", "朝阳门外大街6号院", 88, 27930, 7105, 44, "06:30-21:00"),
            ("温莎KTV(朝阳大悦城店)", 2, "朝阳大悦城", "朝阳北路101号朝阳大悦城F7", 96, 19640, 2308, 45, "12:00-06:00"),
            ("良子健身足道(国贸店)", 5, "国贸", "建国门外大街甲6号中环世贸B座", 158, 8210, 1462, 46, "11:00-02:00"),
            ("思妍丽SPA(国贸店)", 6, "国贸", "建国门外大街1号国贸商城B1", 480, 3120, 508, 47, "10:00-22:00"),
            ("D Lounge(三里屯店)", 8, "三里屯", "三里屯太古里北区N4-32", 220, 14780, 3926, 46, "19:00-03:00"),
        ],
    },
    {
        "name": "上海", "lon": 121.4737, "lat": 31.2304,
        "shops": [
            ("老吉士酒家(天平路店)", 1, "天平路", "天平路41号", 180, 33640, 10825, 47, "11:00-14:00,17:00-22:00"),
            ("南翔馒头店(豫园店)", 1, "豫园", "豫园路85号", 95, 128450, 31206, 44, "09:00-21:00"),
            ("绿波廊(豫园店)", 1, "豫园", "豫园路115号", 165, 41280, 12690, 46, "11:00-21:00"),
            ("阿娘面馆(思南路店)", 1, "淮海中路", "思南路36号", 62, 52710, 14338, 45, "06:30-14:00"),
            ("兰心餐厅(进贤路店)", 1, "新天地", "进贤路166号", 88, 29840, 8042, 45, "11:00-14:00,17:00-21:00"),
            ("小杨生煎(黄河路店)", 1, "人民广场", "黄河路97号", 38, 96430, 21507, 44, "07:00-22:00"),
            ("纯K(新天地店)", 2, "新天地", "马当路245号新天地时尚F3", 128, 24380, 3194, 46, "12:00-05:00"),
            ("一茶一足(静安寺店)", 5, "静安寺", "南京西路1618号久光百货F6", 168, 9640, 1735, 45, "11:00-01:00"),
            ("东田造型(南京西路店)", 3, "南京西路", "南京西路1266号恒隆广场F4", 388, 5210, 862, 47, "10:00-21:00"),
            ("Speak Low(复兴中路店)", 8, "淮海中路", "复兴中路579号", 200, 17930, 4871, 47, "18:00-02:00"),
        ],
    },
    {
        "name": "广州", "lon": 113.2644, "lat": 23.1291,
        "shops": [
            ("点都德(惠福东店)", 1, "北京路", "惠福东路470号", 78, 88620, 24391, 46, "07:00-22:00"),
            ("陶陶居酒家(第十甫路总店)", 1, "上下九", "第十甫路20号", 105, 64280, 18744, 47, "07:30-22:00"),
            ("炳胜品味(珠江新城店)", 1, "珠江新城", "华夏路8号合景国际金融广场", 168, 39170, 10268, 47, "11:00-22:00"),
            ("银记肠粉店(文昌北路店)", 1, "上下九", "文昌北路236号", 32, 104360, 22180, 44, "06:30-22:00"),
            ("惠食佳(滨江东总店)", 1, "客村", "滨江东路199号", 120, 47290, 13406, 46, "11:00-22:30"),
            ("啫啫煲(体育西店)", 1, "体育西路", "天河路228号天环广场", 95, 31850, 8217, 44, "11:00-22:00"),
            ("星聚会KTV(天河城店)", 2, "天河城", "天河路208号天河城F6", 88, 21470, 2648, 44, "12:00-05:00"),
            ("富桥足道(珠江新城店)", 5, "珠江新城", "珠江东路6号周大福金融中心", 148, 7930, 1364, 45, "11:00-02:00"),
            ("柔婷SPA(天河城店)", 6, "天河城", "天河路208号天河城F5", 320, 4180, 674, 46, "10:00-22:00"),
            ("拾叁唐(琶醍店)", 8, "琶洲", "阅江西路118号珠江琶醍", 158, 16320, 4105, 45, "18:00-02:00"),
        ],
    },
    {
        "name": "深圳", "lon": 114.0579, "lat": 22.5431,
        "shops": [
            ("潮好味(海岸城店)", 1, "海岸城", "文心五路33号海岸城F4", 128, 34480, 9027, 46, "11:00-22:00"),
            ("八合里海记(华强北店)", 1, "华强北", "振兴路111号", 108, 57620, 15632, 47, "11:00-23:00"),
            ("客语(万象天地店)", 1, "万象天地", "深南大道9668号万象天地F5", 78, 42910, 11204, 45, "11:00-22:00"),
            ("陈鹏鹏鹅肉饭店(车公庙店)", 1, "车公庙", "泰然九路1号", 68, 38760, 9761, 46, "11:00-21:30"),
            ("木屋烧烤(福田CBD店)", 1, "福田CBD", "福华三路88号", 88, 63210, 17442, 45, "17:00-03:00"),
            ("大鸽饭(科技园店)", 1, "科技园", "科苑路15号", 98, 29140, 7416, 45, "11:00-22:00"),
            ("米乐星KTV(东门店)", 2, "东门", "东门中路2001号", 78, 18620, 2137, 43, "12:00-04:00"),
            ("天浴良子(华强北店)", 5, "华强北", "华强北路1058号", 158, 7240, 1246, 45, "11:00-02:00"),
            ("罗亚帝(万象城店)", 3, "万象城", "宝安南路1881号万象城F4", 358, 3960, 623, 47, "10:00-21:30"),
            ("本色酒吧(蛇口店)", 8, "蛇口", "望海路海上世界广场B区", 188, 13280, 3287, 45, "19:00-03:00"),
        ],
    },
    {
        "name": "成都", "lon": 104.0665, "lat": 30.5723,
        "shops": [
            ("小龙坎老火锅(春熙路总店)", 1, "春熙路", "中纱帽街8号", 108, 82460, 23118, 46, "11:00-02:00"),
            ("大龙燚火锅(春熙路店)", 1, "春熙路", "中纱帽街8号远洋太古里", 118, 61380, 16947, 46, "11:00-02:00"),
            ("马旺子川小馆(太古里店)", 1, "太古里", "中纱帽街8号远洋太古里F2", 88, 33720, 8704, 47, "11:00-21:30"),
            ("明婷饭店(建设路店)", 1, "建设路", "双建路8号", 68, 24390, 6521, 44, "11:00-14:00,17:00-21:00"),
            ("甘食记成都肥肠粉(玉林店)", 1, "玉林", "玉林西路123号", 28, 71840, 15209, 45, "07:00-20:00"),
            ("钟水饺(总府路店)", 1, "春熙路", "总府路23号", 35, 45710, 9843, 44, "07:00-21:00"),
            ("温莎KTV(天府三街店)", 2, "天府三街", "天府大道中段500号", 88, 16740, 1972, 45, "12:00-05:00"),
            ("良子足道(科华北路店)", 5, "科华北路", "科华北路62号", 138, 8620, 1543, 46, "11:00-02:00"),
            ("颜术SPA(银泰城店)", 6, "银泰城", "天府大道北段1199号银泰in99", 368, 3110, 486, 47, "10:00-22:00"),
            ("小酒馆(玉林西路店)", 8, "玉林", "玉林西路55号", 98, 20630, 5824, 47, "19:00-02:00"),
        ],
    },
    {
        "name": "重庆", "lon": 106.5516, "lat": 29.5630,
        "shops": [
            ("珮姐老火锅(解放碑店)", 1, "解放碑", "中华路8号", 118, 74920, 20431, 47, "11:00-02:00"),
            ("渝宗老灶火锅(观音桥店)", 1, "观音桥", "建新北路8号", 108, 53680, 14376, 46, "11:00-01:00"),
            ("晓宇火锅(枇杷山总店)", 1, "南坪", "枇杷山正街86号", 98, 41260, 11208, 45, "11:00-22:00"),
            ("花市豌杂面(青年路店)", 1, "解放碑", "青年路32号", 15, 89340, 17862, 46, "06:30-15:00"),
            ("胖子妈盐水鸭(沙坪坝店)", 1, "沙坪坝", "沙南街4号", 45, 36710, 8104, 44, "08:00-20:00"),
            ("大队长火锅(时代天街店)", 1, "时代天街", "龙湖时代天街B馆F3", 128, 29480, 7652, 45, "11:00-23:00"),
            ("星空KTV(观音桥店)", 2, "观音桥", "北城天街37号", 78, 17390, 2058, 43, "12:00-04:00"),
            ("巴渝足道(解放碑店)", 5, "解放碑", "民权路28号", 128, 9410, 1673, 45, "11:00-02:00"),
            ("美丽田园(江北嘴店)", 6, "江北嘴", "江北城西大街5号", 398, 2680, 421, 46, "10:00-21:30"),
            ("九街壹号(九街店)", 8, "九街", "九街高屋", 158, 15270, 3968, 45, "19:00-04:00"),
        ],
    },
    {
        "name": "西安", "lon": 108.9398, "lat": 34.3416,
        "shops": [
            ("子午路张记肉夹馍(小寨店)", 1, "小寨", "子午路8号", 18, 96310, 19248, 46, "07:00-21:00"),
            ("老孙家泡馍(东大街店)", 1, "钟楼", "东大街364号", 55, 48720, 11286, 45, "09:00-21:30"),
            ("醉长安(大雁塔店)", 1, "大雁塔", "慈恩路9号", 88, 35490, 9127, 46, "11:00-22:00"),
            ("魏家凉皮(高新路店)", 1, "高新路", "高新路25号", 26, 72480, 16043, 45, "07:00-22:00"),
            ("西安饭庄(钟楼店)", 1, "钟楼", "东大街298号", 98, 26830, 7042, 45, "10:30-21:00"),
            ("回民街老米家泡馍", 1, "回民街", "北院门112号", 42, 58140, 13418, 44, "08:00-22:00"),
            ("星聚会KTV(小寨店)", 2, "小寨", "小寨西路232号", 82, 19460, 2314, 44, "12:00-05:00"),
            ("唐御足道(大雁塔店)", 5, "大雁塔", "雁塔南路18号", 138, 8140, 1428, 45, "11:00-02:00"),
            ("木北造型(大唐不夜城店)", 3, "大唐不夜城", "慈恩路1号", 328, 3720, 592, 46, "10:00-22:00"),
            ("1912酒吧(曲江店)", 8, "曲江", "雁南一路3号", 148, 12630, 3142, 44, "19:00-03:00"),
        ],
    },
]

# ---------------------------------------------------------------------------
# 2.1 省市区三级映射
#     tb_shop 从这一版开始带 province / district 两列（原来只有 city）。
#     区一级是**按店名逐个指定**的，不是按城市统一填一个值——因为用户要能按区筛选，
#     同一个城市里十几家店如果全填同一个区，那"选区"就退化成了"选市"。
#     生成器会拿 _qa/../src/main/resources/regions.json 逐条校验：
#     这个省、这个市、这个区必须真实存在，否则拒绝生成。
# ---------------------------------------------------------------------------
PROVINCES = {
    "杭州": "浙江省", "北京": "北京市", "上海": "上海市", "广州": "广东省",
    "深圳": "广东省", "成都": "四川省", "重庆": "重庆市", "西安": "陕西省",
}

# 杭州那 14 家老店全在拱墅区（数据本身就是拱墅区的：金华路、上塘路、运河上街、丽水路…）
HANGZHOU_DISTRICT = "拱墅区"

DISTRICTS = {
    # 北京
    "北京|四季民福烤鸭店(故宫店)": "东城区", "北京|胡大饭馆(簋街总店)": "东城区",
    "北京|聚宝源(牛街总店)": "西城区", "北京|局气(三里屯店)": "朝阳区",
    "北京|南门涮肉(天坛店)": "东城区", "北京|紫光园(朝阳门店)": "东城区",
    "北京|温莎KTV(朝阳大悦城店)": "朝阳区", "北京|良子健身足道(国贸店)": "朝阳区",
    "北京|思妍丽SPA(国贸店)": "朝阳区", "北京|D Lounge(三里屯店)": "朝阳区",
    # 上海
    "上海|老吉士酒家(天平路店)": "徐汇区", "上海|南翔馒头店(豫园店)": "黄浦区",
    "上海|绿波廊(豫园店)": "黄浦区", "上海|阿娘面馆(思南路店)": "黄浦区",
    "上海|兰心餐厅(进贤路店)": "黄浦区", "上海|小杨生煎(黄河路店)": "黄浦区",
    "上海|纯K(新天地店)": "黄浦区", "上海|一茶一足(静安寺店)": "静安区",
    "上海|东田造型(南京西路店)": "静安区", "上海|Speak Low(复兴中路店)": "静安区",
    # 广州
    "广州|点都德(惠福东店)": "越秀区", "广州|陶陶居酒家(第十甫路总店)": "荔湾区",
    "广州|炳胜品味(珠江新城店)": "天河区", "广州|银记肠粉店(文昌北路店)": "荔湾区",
    "广州|惠食佳(滨江东总店)": "海珠区", "广州|啫啫煲(体育西店)": "天河区",
    "广州|星聚会KTV(天河城店)": "天河区", "广州|富桥足道(珠江新城店)": "天河区",
    "广州|柔婷SPA(天河城店)": "天河区", "广州|拾叁唐(琶醍店)": "海珠区",
    # 深圳
    "深圳|潮好味(海岸城店)": "南山区", "深圳|八合里海记(华强北店)": "福田区",
    "深圳|客语(万象天地店)": "南山区", "深圳|陈鹏鹏鹅肉饭店(车公庙店)": "福田区",
    "深圳|木屋烧烤(福田CBD店)": "福田区", "深圳|大鸽饭(科技园店)": "南山区",
    "深圳|米乐星KTV(东门店)": "罗湖区", "深圳|天浴良子(华强北店)": "福田区",
    "深圳|罗亚帝(万象城店)": "罗湖区", "深圳|本色酒吧(蛇口店)": "南山区",
    # 成都
    "成都|小龙坎老火锅(春熙路总店)": "锦江区", "成都|大龙燚火锅(春熙路店)": "锦江区",
    "成都|马旺子川小馆(太古里店)": "锦江区", "成都|明婷饭店(建设路店)": "成华区",
    "成都|甘食记成都肥肠粉(玉林店)": "武侯区", "成都|钟水饺(总府路店)": "锦江区",
    "成都|温莎KTV(天府三街店)": "武侯区", "成都|良子足道(科华北路店)": "武侯区",
    "成都|颜术SPA(银泰城店)": "武侯区", "成都|小酒馆(玉林西路店)": "武侯区",
    # 重庆
    "重庆|珮姐老火锅(解放碑店)": "渝中区", "重庆|渝宗老灶火锅(观音桥店)": "江北区",
    "重庆|晓宇火锅(枇杷山总店)": "南岸区", "重庆|花市豌杂面(青年路店)": "渝中区",
    "重庆|胖子妈盐水鸭(沙坪坝店)": "沙坪坝区", "重庆|大队长火锅(时代天街店)": "渝北区",
    "重庆|星空KTV(观音桥店)": "江北区", "重庆|巴渝足道(解放碑店)": "渝中区",
    "重庆|美丽田园(江北嘴店)": "江北区", "重庆|九街壹号(九街店)": "江北区",
    # 西安
    "西安|子午路张记肉夹馍(小寨店)": "雁塔区", "西安|老孙家泡馍(东大街店)": "碑林区",
    "西安|醉长安(大雁塔店)": "雁塔区", "西安|魏家凉皮(高新路店)": "雁塔区",
    "西安|西安饭庄(钟楼店)": "碑林区", "西安|回民街老米家泡馍": "莲湖区",
    "西安|星聚会KTV(小寨店)": "雁塔区", "西安|唐御足道(大雁塔店)": "雁塔区",
    "西安|木北造型(大唐不夜城店)": "雁塔区", "西安|1912酒吧(曲江店)": "雁塔区",
}

OPEN_HOURS = ["10:00-22:00", "11:00-22:00", "11:00-23:30", "10:30-21:30", "00:00-24:00",
              "11:30-02:00", "09:00-21:00", "12:00-04:00"]

# ---------------------------------------------------------------------------
# 2. 新增笔记：每条挑一家上面生成出来的店，落在一座城里
#    shop_id 在下面按「北京 15-24 / 上海 25-34 / 广州 35-44 / 深圳 45-54 /
#    成都 55-64 / 重庆 65-74 / 西安 75-84」推算，不要硬编码。
# ---------------------------------------------------------------------------
# (城市, 该城第几家店(0 起), user_id, liked, comments, 标题, 正文, 图片下标)
BLOG_SEEDS = [
    ("北京", 1, 1, 42, 108, "簋街的麻辣小龙虾🦞我一次能干三斤",
     "东直门内大街一整条街都是小龙虾的味道，随便挑一家都不难吃。<br/>"
     "这次去的是排到腿软的胡大，晚上十点还在叫号。<br/><br/>"
     "✔️麻辣小龙虾（138/份）虾个头大、壳薄，剥起来不费劲，麻辣底汤里泡一会儿更入味<br/>"
     "✔️馋嘴蛙 辣得很正，蛙肉滑嫩<br/>"
     "✔️烤脑花 上面一层辣椒面，配啤酒刚刚好<br/><br/>"
     "📍地址：东直门内大街235号<br/>"
     "🚇交通：地铁2号线东直门站D口，出来往西走10分钟<br/><br/>"
     "⚠️建议八点前到，晚了至少等一小时。", 0),
    ("北京", 3, 5, 26, 41, "三里屯的京味儿新派烤鸭，皮脆到掉渣",
     "局气的装修是老北京胡同风，进门先看见鸟笼和自行车。<br/><br/>"
     "「局气烤鸭」皮真的很脆，蘸白糖先吃一片，油脂化在嘴里。<br/>"
     "「京味炸酱面」面条筋道，酱是自家炒的，不齁咸。<br/>"
     "「豌豆黄」做成做成小方砖，清甜解腻。<br/><br/>"
     "📍地址：三里屯路19号院3号楼<br/>"
     "人均105，两个人点一个套餐再加一份鸭架汤刚好。", 7),
    ("上海", 1, 2, 36, 92, "豫园这家百年小笼，我一个人吃了三笼🥟",
     "南翔馒头店的门永远是排着的，一楼打包窗口其实快很多。<br/><br/>"
     "✔️鲜肉小笼（42/笼）皮薄到透光，先咬个小口吸汤，不然一定烫嘴<br/>"
     "✔️蟹粉小笼（88/笼）蟹味足，贵是贵了点但值<br/>"
     "✔️蟹壳黄 咸口的，酥得掉渣<br/><br/>"
     "📍地址：豫园路85号<br/>"
     "🚇交通：地铁10号线豫园站1号口<br/><br/>"
     "💡九点前去人最少，十一点以后基本要排半小时以上。", 12),
    ("上海", 3, 6, 18, 27, "思南路的一碗黄鱼面，是上海人的深夜食堂",
     "阿娘面馆开了二十多年，店面很小，三四张桌子。<br/><br/>"
     "「黄鱼面」58 一碗，黄鱼是现拆的，汤头奶白，没有腥味。<br/>"
     "「辣肉面」22，肉丁给得很实在，拌开之后香味全出来了。<br/><br/>"
     "📍地址：思南路36号<br/>"
     "⏰只做早市和午市，下午两点半就收摊，去晚了吃不上。", 20),
    ("广州", 0, 1, 28, 63, "广州人的一天从早茶开始丨点都德测评",
     "早上七点就开门，八点半到已经有本地阿叔在叹茶了。<br/><br/>"
     "✔️虾饺皇 皮薄馅足，一只里面塞了三四只虾<br/>"
     "✔️干蒸烧卖 上面一撮蟹子在嘴里爆开<br/>"
     "✔️凤爪 炖得很烂，轻轻一抿就脱骨<br/>"
     "✔️叉烧包 掰开流汁，甜咸刚好<br/>"
     "✔️艇仔粥 料给得足，花生和油条碎很香<br/><br/>"
     "📍地址：惠福东路470号<br/>"
     "💰人均 78，茶位费 6 元/位。", 25),
    ("广州", 3, 2, 15, 34, "惠福东这家肠粉，我连吃了三天早餐",
     "银记的肠粉是布拉肠，米浆现磨，皮薄得能看见里面的料。<br/><br/>"
     "「鲜虾肠粉」18，虾仁给得很足<br/>"
     "「牛肉肠粉」15，牛肉腌过，很嫩<br/>"
     "「艇仔粥」12，配肠粉刚好<br/><br/>"
     "📍地址：文昌北路236号<br/>"
     "⏰六点半开门，工作日八点前去基本不用等。", 30),
    ("深圳", 1, 5, 24, 52, "华强北这家潮汕牛肉火锅，现切现涮🥩",
     "八合里海记的牛肉是当天从潮汕送过来的，进门就能看见师傅在明档切肉。<br/><br/>"
     "✔️吊龙 涮八秒，粉粉的刚好，蘸沙茶酱绝配<br/>"
     "✔️五花趾 有嚼劲，肉味更浓<br/>"
     "✔️牛肉丸 手打的，弹到可以在碗里蹦<br/><br/>"
     "📍地址：振兴路111号<br/>"
     "🚇地铁2号线燕南站A口<br/><br/>"
     "💡锅底选牛骨清汤，别选麻辣，不然吃不出肉的好坏。", 35),
    ("深圳", 4, 6, 9, 15, "福田CBD的木屋烧烤，加班后的深夜续命摊🍢",
     "晚上十一点过去还在满座，撸串的氛围特别好。<br/><br/>"
     "「烤五花肉」油脂被烤掉了，蘸辣椒面很香<br/>"
     "「烤茄子」蒜蓉给得足，一整个挖着吃<br/>"
     "「烤鸡翅」中规中矩，但胜在便宜<br/><br/>"
     "📍地址：福华三路88号<br/>"
     "💰人均 88，啤酒买二送一。", 41),
    ("成都", 0, 1, 31, 74, "成都火锅天花板？小龙坎春熙路总店实测🌶️",
     "排号两百多桌，等了一个半小时，好在味道没让我失望。<br/><br/>"
     "✔️牛油锅底 越煮越香，不糊锅<br/>"
     "✔️毛肚 七上八下，脆得很<br/>"
     "✔️鸭肠 一根下锅十五秒就捞，脆弹<br/>"
     "✔️酥肉 现炸的，撒花椒粉直接吃也别有风味<br/><br/>"
     "📌小技巧：点鸳鸯锅，用清汤锅涮蔬菜，红锅只涮肉。<br/>"
     "📍地址：中纱帽街8号", 5),
    ("成都", 4, 2, 12, 22, "玉林西路的深夜，一串肥肠粉和一首民谣",
     "玉林是成都最松弛的地方，晚上八点整条街都是小馆子。<br/><br/>"
     "甘食记的肥肠粉 12 一碗，肥肠处理得很干净，粉条爽滑，加一个锅盔泡进去。<br/>"
     "吃完往西走两百米就是小酒馆，门口永远有人在拍照。<br/><br/>"
     "📍地址：玉林西路123号<br/>"
     "⏰早七点到晚八点，卖完就关门。", 15),
    ("重庆", 0, 5, 21, 47, "解放碑的九宫格老火锅，辣到我怀疑人生🔥",
     "珮姐的锅底是纯牛油，红汤滚起来那一下香味直接上头。<br/><br/>"
     "✔️老肉片 厚切，涮久了也不柴<br/>"
     "✔️鲜鹅肠 脆得出声<br/>"
     "✔️土豆片 薄薄的，涮十秒就是脆的<br/>"
     "✔️冰汤圆 解辣神器，一定要点<br/><br/>"
     "📍地址：中华路8号<br/>"
     "⚠️不能吃辣的一定要点微辣，重庆的微辣和外地不是一个概念。", 45),
    ("重庆", 3, 6, 8, 13, "重庆人的早晨，是一碗七块钱的豌杂面",
     "花市豌杂面在解放碑开了很多年，早上六点半就开门。<br/><br/>"
     "「豌杂面」12 二两，豌豆煮得又粉又面，杂酱咸香，拌开之后每一根面都挂上酱。<br/>"
     "再加一个卤蛋，一顿早饭就齐了。<br/><br/>"
     "📍地址：青年路32号<br/>"
     "💡本地人都是「二两豌杂，多辣，加蛋」。", 10),
    ("西安", 0, 1, 17, 29, "西安的肉夹馍，现打的馍才叫馍🥙",
     "子午路张记的白吉馍是现打的，出炉那一下能听见「咔」的一声。<br/><br/>"
     "「腊汁肉夹馍」12，肥瘦相间，肉汁浸到馍里，咬一口会流。<br/>"
     "「凉皮」8，擀面皮更筋道，辣椒油是自家泼的。<br/>"
     "「冰峰」3，吃这套必须配冰峰。<br/><br/>"
     "📍地址：子午路8号<br/>"
     "⏰早上七点到晚上九点，中午排队最久。", 32),
    ("西安", 1, 5, 6, 11, "钟楼旁一碗羊肉泡馍，掰馍掰到手酸",
     "老孙家的泡馍要自己掰，馍掰得越小越入味，服务员说最好掰成黄豆大小。<br/><br/>"
     "「优质羊肉泡馍」45，汤是羊骨吊了一夜的，浓而不膻。<br/>"
     "配一碟糖蒜和辣酱，吃完浑身都热了。<br/><br/>"
     "📍地址：东大街364号<br/>"
     "💡掰馍大约要花二十分钟，赶时间的话可以让师傅机器切。", 47),
    ("杭州", 2, 2, 14, 25, "运河边的杭帮菜，西湖醋鱼居然不腥",
     "新白鹿是杭州本地人常去的馆子，性价比很高。<br/><br/>"
     "「西湖醋鱼」用的是草鱼，浇汁酸甜平衡，趁热吃完全没有土腥味。<br/>"
     "「东坡肉」一小盅，肥而不腻，配米饭一绝。<br/>"
     "「龙井虾仁」虾仁清甜，茶香很淡。<br/><br/>"
     "📍地址：台州路2号运河上街购物中心F5", 22),
    ("杭州", 4, 6, 5, 9, "上塘路的海底捞，是深夜最靠谱的选择",
     "凌晨一点过去的，还在正常营业，服务依旧在线。<br/><br/>"
     "锅底点了番茄加清汤，番茄锅先喝一碗汤。<br/>"
     "虾滑是现挤的，服务员会帮忙下。<br/><br/>"
     "📍地址：上塘路458号水晶城购物中心F6<br/>"
     "💡工作日晚上十点后去不用排队。", 37),
]

# 只在本地图片里挑，保证一定加载得出来
LOCAL_IMG_DIR = os.path.join(ROOT, "nginx-1.18.0", "html", "xhw", "imgs", "blogs")


# ---------------------------------------------------------------------------
# 3. 地址簿种子数据（收货地址）
#    (user_id, 收货人, 手机号, 城市, 详细地址, 标签, 是否默认)
#    标签：0 家 / 1 公司 / 2 学校 / 3 其他
#
#    只给种子用户预置。新注册用户（开发取码接口随便填个新号）地址簿是空的，
#    正好能走一遍「新增第一条 -> 自动成为默认」的完整流程。
# ---------------------------------------------------------------------------
ADDRESS_SEEDS = [
    (1, "小鱼同学", "13800138000", "浙江省", "杭州", "拱墅区",
     "拱墅区金华路锦昌文华苑 29 号 3 单元 1102", 0, 1),
    (1, "小鱼同学", "13800138000", "北京市", "北京", "朝阳区",
     "朝阳区三里屯路 19 号院 3 号楼 1801", 1, 0),
    (1, "老妈", "13900139000", "上海市", "上海", "黄浦区",
     "黄浦区思南路 36 号 2 楼", 0, 0),
    (2, "可可", "13700137000", "四川省", "成都", "锦江区",
     "锦江区中纱帽街 8 号远洋太古里 2 栋 506", 0, 1),
    (2, "可可（前台代收）", "13700137000", "广东省", "深圳", "南山区",
     "南山区科苑路 15 号 A 座 1203", 1, 0),
]


# ---------------------------------------------------------------------------
# 4. 省市区交叉校验
#     这是整套数据里**最容易静默出错**的地方：tb_shop 里的区域名是手写的，
#     regions.json 里的也是另一份来源，两边只要有一个字对不上（比如"市"后缀、
#     "朝阳区" vs "朝阳"），筛选接口就会稳定返回空数组，而且**不报任何错**。
#     所以在生成阶段就把它炸出来，比上线后查一天强。
# ---------------------------------------------------------------------------
REGIONS_PATH = os.path.join(ROOT, "src", "main", "resources", "regions.json")


def load_region_index():
    with open(REGIONS_PATH, encoding="utf-8") as f:
        regions = json.load(f)
    idx = {}
    for prov in regions:
        for city in prov["cities"]:
            idx[(prov["name"], city["name"])] = set(city["districts"])
    return idx


def check_region(idx, province, city, district, where):
    assert (province, city) in idx, \
        "%s 的「%s / %s」在 regions.json 里不存在" % (where, province, city)
    if district:
        assert district in idx[(province, city)], \
            "%s 的区「%s」不属于 %s %s" % (where, district, province, city)


def build_address_sql():
    """生成 tb_address 的建表 + 种子行。

    返回的文本用 CRLF 换行，和 xhw.sql 其余部分保持一致
    （生成结果整体是 "\\r\\n".join 出来的，混进 LF 会让文件变成混合换行）。
    """
    head = [
        "-- ----------------------------",
        "-- Table structure for tb_address",
        "-- ----------------------------",
        "-- 收货地址簿。原版项目没有这个概念，是这次新加的完整增删改查模块。",
        "-- 注意：这里只存「用户的收件地址」，和 tb_shop 的店铺地址是两回事 ——",
        "-- 前者是私有的、按 user_id 隔离的；后者是公开的门店资料。",
        "DROP TABLE IF EXISTS tb_address;",
        "CREATE TABLE tb_address  (",
        "                                id bigint  NOT NULL AUTO_INCREMENT,",
        "                                user_id bigint  NOT NULL,",
        "                                name varchar(32) NOT NULL,",
        "                                phone varchar(20) NOT NULL,",
        "                                -- 省 / 市 / 区三级，写法必须和 regions.json 逐字一致",
        "                                province varchar(32) NOT NULL DEFAULT '',",
        "                                city varchar(32) NOT NULL,",
        "                                district varchar(32) NULL DEFAULT NULL,",
        "                                detail varchar(255) NOT NULL,",
        "                                tag tinyint  NOT NULL DEFAULT 0,",
        "                                is_default tinyint  NOT NULL DEFAULT 0,",
        "                                create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "                                update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "                                PRIMARY KEY (id),",
        "                                INDEX idx_address_user(user_id)",
        ");",
        "",
        "-- ----------------------------",
        "-- Records of tb_address",
        "-- ----------------------------",
        "-- 只给种子用户预置。用开发取码接口随便填个新手机号登录出来的是新用户，",
        "-- 他的地址簿是空的 —— 正好把「第一条自动变默认」这条规则走一遍。",
        "-- 想直接看有数据的版本，用 13686869696（tb_user.id = 1）登录。",
    ]
    rows = []
    for i, (uid, name, phone, province, city, district, detail, tag, dft) in enumerate(ADDRESS_SEEDS, start=1):
        rows.append(
            "INSERT INTO tb_address VALUES (%d, %d, '%s', '%s', '%s', '%s', '%s', '%s', %d, %d, "
            "'2022-03-01 10:%02d:%02d', '2022-03-12 09:%02d:%02d');"
            % (i, uid, name, phone, province, city, district, detail, tag, dft,
               (i * 3) % 60, (i * 7) % 60, (i * 5) % 60, (i * 11) % 60))
    return "\r\n".join(head + rows) + "\r\n"



def parse_values_rows(text):
    """把 `INSERT INTO tb_xxx VALUES (....);` 拆成 [[值字符串, ...], ...]。

    逗号会出现在字符串里（图片路径、正文里都有），所以不能直接 split(',')，
    必须跟踪单引号的开关状态。转义方面种子数据里只有 '' 这一种，一并处理。
    """
    rows = []
    for line in text.split("\n"):
        line = line.strip()
        m = re.match(r"^INSERT INTO (\w+) VALUES \((.*)\);\s*$", line, re.S)
        if not m:
            continue
        body = m.group(2)
        vals, cur, in_q, i = [], [], False, 0
        while i < len(body):
            c = body[i]
            if c == "'":
                if in_q and i + 1 < len(body) and body[i + 1] == "'":
                    cur.append("''")
                    i += 2
                    continue
                in_q = not in_q
            if c == "," and not in_q:
                vals.append("".join(cur).strip())
                cur = []
            else:
                cur.append(c)
            i += 1
        vals.append("".join(cur).strip())
        rows.append((m.group(1), vals))
    return rows


def find_block(lines, start_pred, end_pred):
    """返回 [start, end] 闭区间下标。"""
    start = None
    for i, ln in enumerate(lines):
        if start_pred(ln):
            start = i
            break
    if start is None:
        raise SystemExit("找不到起始行")
    end = None
    for j in range(start, len(lines)):
        if end_pred(lines[j]):
            end = j
            break
    if end is None:
        raise SystemExit("找不到结束行")
    return start, end


def build_favorites_sql():
    """生成 tb_favorites 的建表语句（不预置种子行）。

    为什么挂在生成流程里、而不是手写进 xhw.sql：
    本脚本每次都从 backup 出发生成**整份**文件，手写进产物里的东西会被整份覆盖掉
    （tb_address 就是这么丢过一次的）。

    为什么不预置种子行：收藏是**用户行为**，不像地址那样有"演示价值"。
    种子用户（tb_user.id=1..5）收藏哪篇笔记是随意的，反而会让演示数据看着假。
    空表 + 界面上有入口，用户自己点两下就有数据了。
    """
    head = [
        "-- ----------------------------",
        "-- Table structure for tb_favorites",
        "-- ----------------------------",
        "-- 笔记收藏。原版项目没有这个功能，是这次新加的。",
        "--",
        "-- 两个设计要点：",
        "--   1) id 用 AUTO_INCREMENT 而不是雪花号：笔记 id 本身很小（自增），",
        "--      用雪花号只会平白引入 JS 53 位精度那个坑（见改造说明第二十三节）。",
        "--   2) uk_user_blog 是**唯一索引**：收藏是幂等的，重复收藏不该报错也不该插第二行。",
        "--      有了它，服务层只要 catch 住 DuplicateKeyException 就算幂等成功。",
        "DROP TABLE IF EXISTS tb_favorites;",
        "CREATE TABLE tb_favorites  (",
        "                                id bigint  NOT NULL AUTO_INCREMENT,",
        "                                user_id bigint  NOT NULL,",
        "                                blog_id bigint  NOT NULL,",
        "                                create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "                                update_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "                                PRIMARY KEY (id),",
        "                                UNIQUE INDEX uk_fav_user_blog(user_id, blog_id),",
        "                                INDEX idx_fav_user(user_id)",
        ");",
        "",
    ]
    return "\r\n".join(head)


# 券面额档位：给不同店配不同面额，看起来不像复制粘贴
VOUCHER_AMOUNTS = [50, 80, 100, 120, 150]


def build_voucher_rows(shop_ids, city_first_shop_id):
    """生成券的 INSERT 行，返回 [(表名, 值元组字符串), ...]。

    为什么要重新生成、而不是留着上游那 2 张：
    上游只给 1 号店配了券，84 家店里 83 家没有 —— 演示时随便点一家店
    就是"暂无优惠券"，秒杀流程也只在一家店能演示。

    规则：
      - 每家店 1 张代金券（type=0），面额按 VOUCHER_AMOUNTS 轮转
      - 每座城的**首店**再加 1 张秒杀券（type=1），这样 8 个城市都能演示秒杀
      - 时间戳写死，不取当前时间：生成器要幂等（跑第二遍结果必须一样）
      - tb_voucher 本项目的表**没有 begin_time/end_time**（11 列），
        有效期只存在于 tb_seckill_voucher，所以别往 tb_voucher 里塞日期
    """
    out = []
    vid = 100          # 从 100 起，避开上游原来的 1、2
    stock_begin = "2024-01-01 00:00:00"
    stock_end = "2030-12-31 23:59:59"
    created = "2024-01-01 09:00:00"

    for i, sid in enumerate(shop_ids):
        amount = VOUCHER_AMOUNTS[i % len(VOUCHER_AMOUNTS)]
        title = "%d元代金券" % amount
        sub = "周一至周日均可使用" if i % 2 == 0 else "节假日通用"
        rules = "全场通用，无需预约，可叠加，不兑现不找零"
        # 付 47.5 得 50 的代金券这种"打折"结构，和上游那张一个路子
        pay = amount * 100 - 250
        out.append(("tb_voucher",
                    "(%d, %d, '%s', '%s', '%s', %d, %d, 0, 1, '%s', '%s')"
                    % (vid, sid, title, sub, rules, pay, amount * 100, created, created)))
        vid += 1

    for city, sid in sorted(city_first_shop_id.items(), key=lambda kv: kv[1]):
        amount = 100
        title = "%d元代金券（秒杀·%s）" % (amount, city)
        out.append(("tb_voucher",
                    "(%d, %d, '%s', '每日 10:00 开抢，先到先得', '秒杀专享，每个用户限购 1 张', "
                    "%d, %d, 1, 1, '%s', '%s')"
                    % (vid, sid, title, amount * 100 - 2000, amount * 100, created, created)))
        out.append(("tb_seckill_voucher",
                    "(%d, 100, '%s', '%s', '%s', '%s')"
                    % (vid, created, stock_begin, stock_end, created)))
        vid += 1

    return out


def replace_voucher_rows(text, rows):
    """把结果里所有券的 INSERT 行删掉，换成新生成的。

    为什么不直接追加：那 2 张老券会留下来，和新的一起构成"1 号店有两张券"
    这种看不出所以然的数据。**要换就换干净。**
    """
    keep = []
    for line in text.split("\r\n"):
        st = line.strip()
        if st.startswith("INSERT INTO tb_voucher VALUES") or \
           st.startswith("INSERT INTO tb_seckill_voucher VALUES"):
            continue
        keep.append(line)

    head = [
        "",
        "-- ----------------------------",
        "-- Records of tb_voucher / tb_seckill_voucher（由 _gen_nationwide_sql.py 生成）",
        "-- ----------------------------",
        "-- 上游原版只 seed 了 2 张券、都在 1 号店，84 家店里 83 家没有券，",
        "-- 换个店就看不到券、也没法演示秒杀。这里给每家店配一张代金券、",
        "-- 每座城市首店再加一张秒杀券。",
    ]
    body = []
    for table, values in rows:
        body.append("INSERT INTO %s VALUES %s;" % (table, values))
    return "\r\n".join(keep + head + body) + "\r\n"


def main():
    dry = "--dry-run" in sys.argv
    # 永远从**原始备份**出发生成（备份不存在时才先把当前文件备份一份）。
    # 这样脚本是真幂等的：跑第二遍不会在已经扩过的 84 行上再扩一次。
    if os.path.exists(BAK_PATH):
        src = BAK_PATH
    else:
        src = SQL_PATH
        os.makedirs(os.path.dirname(BAK_PATH), exist_ok=True)
        shutil.copy2(SQL_PATH, BAK_PATH)
        print("原文件已备份 ->", BAK_PATH)
    # newline="" 必须带上：默认的通用换行模式会把 \r\n 折成 \n，
    # 后面 split("\r\n") 就只切出一行，find_block 直接找不到东西。
    raw = open(src, encoding="utf-8", newline="").read()
    lines = raw.split("\r\n")

    # ---- 取出老的 tb_shop / tb_blog 插入行 ----
    shop_rows = [r for r in parse_values_rows(raw.replace("\r\n", "\n")) if r[0] == "tb_shop"]
    blog_rows = [r for r in parse_values_rows(raw.replace("\r\n", "\n")) if r[0] == "tb_blog"]
    assert len(shop_rows) == 14, f"预期 14 家杭州店，实际 {len(shop_rows)}"
    assert len(blog_rows) == 4, f"预期 4 篇杭州笔记，实际 {len(blog_rows)}"

    orig_shops = [v for _, v in shop_rows]
    orig_blogs = [v for _, v in blog_rows]

    # 老 14 家店的图片串，拿来循环给新店用（都是已经能打开的 CDN 图）。
    # 注意解析结果里**带着外层的单引号**，下面拼 SQL 时不要再包一层。
    img_sets = [r[3] for r in orig_shops]
    assert len(img_sets) == 14

    # ---- 生成新店 ----
    new_shops = []
    city_first_shop_id = {}
    next_id = 15
    rnd = random.Random(20261003)
    for ci, city in enumerate(CITIES):
        city_first_shop_id[city["name"]] = next_id
        for si, (name, type_id, area, address, price, sold, comments, score, hours) in enumerate(city["shops"]):
            # 抖动幅度 0.018 度；同一座城里的店不能重叠到同一个点
            dx = round(rnd.uniform(-0.018, 0.018), 6)
            dy = round(rnd.uniform(-0.018, 0.018), 6)
            # 每家店在城里错开图片组，避免同屏出现两张一样的图
            imgs = img_sets[(ci * 3 + si) % len(img_sets)]
            key = city["name"] + "|" + name
            assert key in DISTRICTS, "有店没指定区：" + key
            district = DISTRICTS[key]
            n = next_id
            vals = [
                str(n), "'" + name.replace("'", "''") + "'", str(type_id),
                imgs, "'" + area + "'",
                "'" + PROVINCES[city["name"]] + "'", "'" + city["name"] + "'",
                "'" + district + "'",
                "'" + address + "'",
                repr(round(city["lon"] + dx, 6)), repr(round(city["lat"] + dy, 6)),
                str(price), str(sold), str(comments), str(score), "'" + hours + "'",
                "'2022-02-18 10:%02d:%02d'" % (n % 60, (n * 7) % 60),
                "'2022-03-10 09:%02d:%02d'" % (n % 60, (n * 13) % 60),
            ]
            new_shops.append(vals)
            next_id += 1
    assert len(new_shops) == 70
    # 杭州沿用原来的 14 家（id 1~14），所以「杭州首店 id」= 1，
    # 这样 BLOG_SEEDS 里写 ("杭州", 2) 就落到 id 3 的新白鹿身上。
    city_first_shop_id["杭州"] = 1

    # ---- 省市区逐条校验（见 check_region 的注释）----
    idx = load_region_index()
    check_region(idx, "浙江省", "杭州", HANGZHOU_DISTRICT, "杭州 14 家老店")
    for city in CITIES:
        for shop in city["shops"]:
            check_region(idx, PROVINCES[city["name"]], city["name"],
                         DISTRICTS[city["name"] + "|" + shop[0]],
                         "门店 " + shop[0])
    for seed in ADDRESS_SEEDS:
        check_region(idx, seed[3], seed[4], seed[5], "地址 " + seed[1])

    # ---- 本地图片池（按名称排序，取 3 张给一篇笔记）----
    pool = []
    for dp, dn, fn in os.walk(LOCAL_IMG_DIR):
        for f in fn:
            if f.lower().endswith((".jpg", ".png", ".jpeg", ".webp")):
                rel = os.path.relpath(os.path.join(dp, f), os.path.dirname(LOCAL_IMG_DIR))
                pool.append("/imgs/" + rel.replace("\\", "/"))
    pool.sort()
    assert len(pool) >= 50, f"本地图片太少：{len(pool)}"

    # ---- 生成新笔记 ----
    new_blogs = []
    bid = 8
    for (city, idx, uid, liked, comments, title, content, img_idx) in BLOG_SEEDS:
        shop_id = city_first_shop_id[city] + idx
        imgs = ",".join(pool[(img_idx + k * 7) % len(pool)] for k in range(3))
        assert len(content) < 2048, f"正文超长：{title}"
        new_blogs.append([
            str(bid), str(shop_id), str(uid), "'" + title + "'", "'" + imgs + "'",
            "'" + content.replace("'", "''") + "'",
            str(liked), str(comments),
            "'2022-02-2%d %02d:%02d:00'" % (bid % 9, 8 + bid % 12, (bid * 11) % 60),
            "'2022-03-11 10:%02d:%02d'" % (bid % 60, (bid * 17) % 60),
        ])
        bid += 1
    assert len(new_blogs) == len(BLOG_SEEDS)

    # ---- 重组 tb_shop 的 CREATE 与 INSERT ----
    s0, s1 = find_block(lines, lambda l: l.startswith("CREATE TABLE tb_shop"),
                        lambda l: l.strip() == ");")
    new_create = [
        "-- 城市。原版种子数据只有杭州，14 家全挤在拱墅区，首页那个「切换城市」",
        "-- 自然也就成了摆设。加这一列之后，店铺和笔记才谈得上按城市筛选。",
        "CREATE TABLE tb_shop  (",
        "                            id bigint  NOT NULL AUTO_INCREMENT,",
        "                            name varchar(128) NOT NULL,",
        "                            type_id bigint  NOT NULL,",
        "                            images varchar(1024) NOT NULL,",
        "                            area varchar(128) NULL DEFAULT NULL,",
        "                            -- 省 / 市 / 区三级。区域名必须和 regions.json 里的写法逐字一致，",
        "                            -- 不一致的话筛选会稳定返回空，而且不报错——最安静的一种 bug。",
        "                            province varchar(32) NOT NULL DEFAULT '浙江省',",
        "                            city varchar(32) NOT NULL DEFAULT '杭州',",
        "                            district varchar(32) NULL DEFAULT NULL,",
        "                            address varchar(255) NOT NULL,",
        "                            x double  NOT NULL,",
        "                            y double  NOT NULL,",
        "                            avg_price bigint  NULL DEFAULT NULL,",
        "                            sold int   NOT NULL,",
        "                            comments int   NOT NULL,",
        "                            score int   NOT NULL,",
        "                            open_hours varchar(32) NULL DEFAULT NULL,",
        "                            create_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,",
        "                            update_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,",
        "                            PRIMARY KEY (id),",
        "                            INDEX foreign_key_type(type_id),",
        "                            INDEX idx_shop_city(city),",
        "                            INDEX idx_shop_region(province, city, district)",
        ");",
    ]
    lines[s0:s1 + 1] = new_create

    # 重新定位插入块（前面的行数变了）
    t0, t1 = find_block(lines, lambda l: l.startswith("INSERT INTO tb_shop VALUES"),
                        lambda l: not l.startswith("INSERT INTO tb_shop VALUES"))
    t1 -= 1  # end_pred 命中的是第一条非插入行

    out = []
    for vals in orig_shops:      # 老 14 家：在 area 之后补 province / city / district
        v = vals[:5] + ["'浙江省'", "'杭州'", "'" + HANGZHOU_DISTRICT + "'"] + vals[5:]
        out.append("INSERT INTO tb_shop VALUES (" + ", ".join(v) + ");")
    for vals in new_shops:
        out.append("INSERT INTO tb_shop VALUES (" + ", ".join(vals) + ");")
    lines[t0:t1 + 1] = out

    # ---- 重组 tb_blog 的 INSERT ----
    b0, b1 = find_block(lines, lambda l: l.startswith("INSERT INTO tb_blog VALUES"),
                        lambda l: not l.startswith("INSERT INTO tb_blog VALUES"))
    b1 -= 1
    blog_out = ["INSERT INTO tb_blog VALUES (" + ", ".join(v) + ");" for v in orig_blogs]
    blog_out.append("-- 以下为全国化改造新增：每个新城市挑 2 家店各配 1 篇笔记。")
    blog_out.append("-- 笔记本身没有城市字段，城市是顺着 shop_id 关联到 tb_shop.city 的，")
    blog_out.append("-- 所以 /blog/hot?city=xxx 的筛选是 join 出来的，不需要额外加列。")
    blog_out += ["INSERT INTO tb_blog VALUES (" + ", ".join(v) + ");" for v in new_blogs]
    lines[b0:b1 + 1] = blog_out

    result = "\r\n".join(lines)

    # ---- 追加 tb_address ----
    # 为什么放在这里、而不是手写进 xhw.sql：
    # 本脚本每次都是从 backup 出发生成整份文件，手写进产物里的东西会被整份覆盖掉。
    # 地址簿想长期存在，就只能挂到生成流程里来。
    result = result.rstrip("\r\n") + "\r\n\r\n" + build_address_sql()

    # ---- 追加 tb_favorites ----
    # 同样的理由：只建表、不预置数据（见 build_favorites_sql 的 docstring）
    result = result.rstrip("\r\n") + "\r\n\r\n" + build_favorites_sql()

    # ---- 券：把上游那 2 张换成"每家店都有" ----
    # orig_shops / new_shops 都是"值元组"，第 0 个就是 shop id
    all_shop_ids = [int(v[0]) for v in orig_shops] + [int(v[0]) for v in new_shops]
    all_shop_ids.sort()
    assert len(all_shop_ids) == 84, f"门店 id 数不对：{len(all_shop_ids)}"
    result = replace_voucher_rows(result, build_voucher_rows(all_shop_ids, city_first_shop_id))

    # ---- 自检 ----
    n_shop = result.count("INSERT INTO tb_shop VALUES")
    n_blog = result.count("INSERT INTO tb_blog VALUES")
    n_addr = result.count("INSERT INTO tb_address VALUES")
    assert n_shop == 14 + 70, f"店铺行数不对：{n_shop}"
    assert "CREATE TABLE tb_favorites" in result, "tb_favorites 建表语句没生成"
    assert "uk_fav_user_blog" in result, "tb_favorites 少了防重复收藏的唯一索引"
    n_voucher = result.count("INSERT INTO tb_voucher VALUES")
    n_seckill = result.count("INSERT INTO tb_seckill_voucher VALUES")
    assert n_voucher == 84 + 8, f"代金券+秒杀券行数不对：{n_voucher}（应为 84+8）"
    assert n_seckill == 8, f"秒杀库存行数不对：{n_seckill}（应为 8）"
    assert n_blog == 4 + len(BLOG_SEEDS), f"笔记行数不对：{n_blog}"
    assert n_addr == len(ADDRESS_SEEDS), f"地址行数不对：{n_addr}"
    # 每行的值个数必须和列数一致：tb_shop 18 列（原 15 + 省市区），tb_blog 10，tb_address 12
    for r in parse_values_rows(result):
        if r[0] == "tb_shop":
            assert len(r[1]) == 18, f"tb_shop 列数 {len(r[1])} != 18: {r[1][1]}"
        if r[0] == "tb_blog":
            assert len(r[1]) == 10, f"tb_blog 列数 {len(r[1])} != 10: {r[1][3]}"
        if r[0] == "tb_address":
            assert len(r[1]) == 12, f"tb_address 列数 {len(r[1])} != 12: {r[1][2]}"
        if r[0] == "tb_voucher":
            assert len(r[1]) == 11, f"tb_voucher 列数 {len(r[1])} != 11: {r[1][2]}"
        if r[0] == "tb_seckill_voucher":
            assert len(r[1]) == 6, f"tb_seckill_voucher 列数 {len(r[1])} != 6: {r[1][0]}"

    print("tb_shop 行数:", n_shop, " tb_blog 行数:", n_blog, " tb_address 行数:", n_addr)
    print("券：代金券+秒杀券", n_voucher, "张（其中秒杀", n_seckill, "张），覆盖", len(all_shop_ids), "家店")
    print("城市:", "、".join(c["name"] for c in CITIES), "+ 杭州（原 14 家）")
    for c in CITIES:
        print("  %s 首店 id=%d" % (c["name"], city_first_shop_id[c["name"]]))
    print("总字节:", len(result.encode("utf-8")))

    if dry:
        print("[dry-run] 未落盘")
        return

    os.makedirs(os.path.dirname(BAK_PATH), exist_ok=True)
    with open(SQL_PATH, "w", encoding="utf-8", newline="") as f:
        f.write(result)
    print("已写入", SQL_PATH)


if __name__ == "__main__":
    main()
