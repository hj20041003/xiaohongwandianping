# 小红碗 · 本地生活点评

一个前后端分离的本地生活点评 / 团购应用。**全国 84 家门店、8 座城市**，
支持省市区三级联动、地图找店、代金券秒杀、笔记社区、地址簿、订单支付。

> 起点是 [黑马点评](https://github.com/hhuzzz/hmdp)（Redis 实战课程项目）。
> 它本身是一个「单城 14 家店的 Redis 练习场」—— 为了把 Redis 的各个特性走一遍，
> 功能是散着做的。这个项目在它基础上做了 19 轮改造，把它变成一个能真正点得下去的应用，
> 并补上了课程里没有的部分。改造过程全部记录在 [`改造说明.md`](./改造说明.md)
> （含每一轮的取舍、定位过程和踩过的坑）。

---

## 技术栈

| 层 | 用了什么 |
| --- | --- |
| 后端 | Spring Boot 2.7.4 · MyBatis-Plus 3.5.2 · MySQL 8 · Redis 7.2 |
| 前端 | Vue 2 + axios，**零构建**（本地 `<script>` 引入，多页面 16 个） |
| 网关 | nginx 1.18（静态资源 + `/api` 前缀剥离后转发到后端） |
| 地图 | 高德地图 JS API |
| 测试 | Node(jsdom) + Python 写的 27 个回归脚本，共 **500+ 条断言**，不依赖任何测试框架 |

**为什么前端零构建**：课程原版用 Element UI（element.css 235KB + element.js 575KB）
撑起界面，但整个项目只有 16 个页面。索性去掉打包器和 UI 库，写了一套自己的组件
（`js/ui.js` 里 27 个内联 SVG 图标 + 8 个组件）和一套设计系统
（`css/ticket.css`，主题是「票根」—— 纸张底色、1.5px 描边、不超过 4px 的圆角），
打开即改即见效，也没有构建产物要维护。

---

## 快速开始

需要 **JDK 8+ / Maven / MySQL 8 / Redis 5+**（推荐 6.2+，秒杀依赖 Redis Stream）。

```bash
# 1) 建库 + 灌种子数据（12 张表 / 84 家门店 / 20 篇笔记 / 92 张代金券）
init-mysql.bat              # 会问一次 MySQL root 密码

# 2) 装依赖并打包
mvn package -DskipTests

# 3) 起后端（8081）
start.bat                   # 或：java -jar target/xhw-1.0-SNAPSHOT.jar

# 4) 起 nginx（8080），前端就在 nginx-1.18.0/html/xhw/
nginx-1.18.0/start-nginx.bat
```

浏览器打开 **http://localhost:8080**。

**登录**：项目内置了一个「开发取码」接口（`GET /user/code/dev`），
验证码直接显示在登录页上，不需要接短信服务，任意手机号即可登录。
这个开关由配置项 `xhw.dev-login-code` 控制，关掉就是标准流程。

> **没有 MySQL 也能跑**：加 `--spring.profiles.active=h2` 会切到 H2 内存库并自动灌同一份
> 种子数据（`src/main/resources/db/xhw.sql`），适合只想看界面的场景。

### 项目自己的脚本

| 脚本 | 作用 |
| --- | --- |
| `init-mysql.bat` | 建库 + 灌种子数据（幂等，可重复跑） |
| `start.bat` / `stop-backend.bat` | 起 / 停后端（`stop-backend.bat 8081` 也能释放别的端口） |
| `nginx-1.18.0/start-nginx.bat` / `stop-nginx.bat` | 起 / 停 nginx |
| `db-console.bat` | 打开 MySQL 命令行 |
| `watch-log.bat` | 跟踪后端日志 |
| `get-code.bat` | 命令行取一个验证码（不用开浏览器） |

> 仓库里**不含 nginx 程序本体**（`nginx.exe` / `docs` / `contrib` 都是上游发行版内容）。
> 用自己的 nginx 指向 `nginx-1.18.0/html/xhw` 即可，配置参考 `nginx-1.18.0/conf/nginx.conf`。

---

## 相对原版做了什么

### 一、把「课程 Demo」变成一个真实的应用

- **全国化**：从「只有杭州 14 家店」扩到 **8 城 84 家店**，配套 **34 省 / 390 市 / 3259 区**
  的三级联动选择器（`regions.json`，带逐级门店数）
- **地图找店**（底部导航第 2 页）：高德 JS API，围绕**每城门店坐标的均值**做 GEO 检索，
  按城市分组渲染标记、点标记出卡片、切城市重新 `fitBounds`
- **16 个页面**全部重做，统一设计系统；底部导航、骨架屏、空状态、错误态都补齐

### 二、补上原版缺失的功能

| 模块 | 说明 |
| --- | --- |
| 地址簿 | 收货地址增删改查 6 个接口 + UI；**越权校验写在 where 条件里**（`findMine`），而不是查出来再判断 |
| 我的订单 | 秒杀下单后的闭环：订单列表 + 模拟支付（待支付 → 已支付） |
| 笔记收藏 | 幂等开关（`PUT` 收藏 / `DELETE` 取消），靠唯一索引保证不重复 |
| 笔记搜索 | 标题 + 正文，`LIKE` 通配符转义；空关键词不当"搜索全部" |
| 笔记排序 | 最热 / 最新；排序**列名走白名单**，不把前端传的值拼进 order by |
| 评论区 / 消息中心 | 评论列表 + 发表；通知列表 + 未读红点 |
| 我的资料 | 昵称 / 头像 / 简介可编辑，头像走上传接口 |

### 三、修掉的真 bug（这部分比功能更值得看）

改造过程中查出并修掉的问题，每一个都在 `改造说明.md` 里记了定位过程：

- **订单号是 19 位雪花号，在 JS 里会掉精度。**
  `JSON.parse('645599808689537028')` 得到 `645599808689537000`（差 28 万），
  前端拿它去调接口只会得到"订单不存在"，而且页面提示里显示的订单号本身就是错的。
  修法是把 64 位 id 序列化成字符串。
- **`401 + 空 body` 未必是"没登录"。** Spring 处理时抛异常会 forward 到 `/error`，
  而这个 forward **也走拦截器**，于是 500 被伪装成了 401 —— 我为此绕了好几轮，
  最后靠打印 `requestURI` 才看出拦截器只跑了 `/error`。
- **MyBatis-Plus 的链式包装器不能传给 `count()` / `remove()` / `update()`**，
  会抛 `can not use this method for "getSqlFirst"`。同一条链上的 `list()` / `page()`
  却是好的，所以现象是"一半能用一半不能"，很难凭直觉判断。
- **页面缺一层 `<main class="main">`，最后一个元素被固定底栏永久盖住**，
  滚到底也露不出来（表现成"看不到完整的代金券"）。扫出 4 个页面中招。
- **横向轮播会把纵向滚动手势吃掉**，页面一长就整页卡住。修法是 `touch-action: pan-x`。
- **两个后端共用同一个 Redis 消费组时秒杀订单会"丢"**：消息只会落到其中一个后端
  连着的库里，表现为"下单成功但订单列表是空的"。

### 四、把"容易犯的错"变成机器检查

改到后期，有些 bug 靠眼睛发现不了（比如"内容被固定底栏盖住"—— 被盖住的部分永远不出现，
截图里看就是"没有"）。所以写了几个静态检查：

```
_qa/html_lint.py    自定义元素成对、注释配平、标签配平、静态资源齐全，
                    以及「有底栏就必须有 main 容器」
_qa/css_lint.py     横向滚动容器必须声明 touch-action；提示会吃手势的高块
_qa/render_test.js  16 个页面在 jsdom 里真跑 Vue/axios，断言渲染结果
_qa/img_check.js    破图与死链
```

---

## 目录结构

```
xhw/
├── src/main/java/com/xhw/          后端（94 个类，58 个接口）
│   ├── controller/                 控制器：只做参数解析与响应
│   ├── service/ + service/impl/    业务逻辑
│   ├── mapper/                     数据访问（MyBatis-Plus）
│   ├── config/                     拦截器、Redis、秒杀库存预热
│   └── utils/                      雪花 ID、登录态、常量
├── src/main/resources/
│   ├── db/xhw.sql                  **整份种子数据**（由 _qa/_gen_nationwide_sql.py 生成）
│   ├── regions.json                34 省 / 390 市 / 3259 区（由 _qa/_build_regions.py 生成）
│   └── application.yaml            默认 MySQL；--spring.profiles.active=h2 切内存库
├── nginx-1.18.0/
│   ├── conf/nginx.conf             8080 → 8081，/api 剥前缀
│   └── html/xhw/                   **前端源码**（零构建的多页面 + 图片）
├── _qa/                            回归套件（27 个脚本，500+ 断言）
├── init-mysql.bat / start.bat ...  项目自己的运维脚本
└── 改造说明.md                      19 轮改造的完整记录
```

> `db/xhw.sql` 和 `regions.json` 都是**生成**出来的，不要手改 ——
> 手改会被下次重跑生成器整份覆盖。要改数据请改 `_qa/_gen_nationwide_sql.py`。

---

## 回归测试

不依赖任何测试框架，纯 Node + Python：

```bash
# 静态检查（不用起服务）
python _qa/html_lint.py
python _qa/css_lint.py

# 起一个测试后端 + 一次性静态站点（不会动你自己的 8080/8081）
java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
node _qa/static_proxy.js 8085 8082

# 然后逐个跑
XHW_ROOT=http://127.0.0.1:8085 node _qa/render_test.js
XHW_ROOT=http://127.0.0.1:8085 node _qa/api_smoke.js
# ... 详见 _qa/README.md
```

覆盖：HTML 结构 / CSS 规则 / 页面渲染 / 24 个接口契约 / 越权与数据隔离 /
省市区联动 52 例 / 地图 33 例 / 地址簿 107 例 / 社交 108 例 / 订单 49 例 / 收藏 52 例。

`_qa/README.md` 里记着每个脚本的用途，以及写这些脚本时踩过的坑
（比如"辅助函数参数个数不一致会静默丢掉 token，让断言假通过"）。

---

## 已知限制

这是学习项目，下面几处是**刻意的简化**，不是没做完：

- **支付是模拟的**。项目没接任何支付网关，「去支付」只是把订单从「待支付」改成「已支付」。
  真实项目这一步应该由支付回调触发，而且要验签。
- **搜索用 `LIKE` 而不是全文索引**。种子数据只有 20 篇笔记，上 FULLTEXT 属于过度设计。
- **私信只有单向通知**，没有用户之间的会话。
- **没有管理端**。
- 秒杀用 Redis Stream 异步落库，所以**刚抢完立刻刷新，订单可能还没入库**（一两秒后就有）。
  这不是 bug，是异步的代价 —— 页面里也写了提示。

---

## License

学习项目，代码可自由参考。
原始的课程项目版权归 [原作者](https://github.com/hhuzzz/hmdp) 所有。
