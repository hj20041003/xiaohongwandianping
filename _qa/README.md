# _qa — 前端回归检查

改完前端后跑一遍这几个（1、2 是必跑），几分钟内能确认页面没被改坏。
1、2、3、4、5、6 需要在 nginx（8080）+ 后端（8081）+ Redis（6379）都跑着的时候执行；
**8 及之后那几个另起一套（需要一个带新功能的后端），见各自的说明**。

## 环境变量

```bash
NODE="C:/Users/hongj/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"
PY="C:/Users/hongj/.workbuddy/binaries/python/versions/3.13.12/python.exe"
export NODE_PATH="C:/Users/hongj/.workbuddy/binaries/node/workspace/node_modules"
```

## 0. 数据库：默认 MySQL，H2 是个 profile

| 配置 | 数据库 | 用途 |
| --- | --- | --- |
| 默认（`application.yaml`） | 本机 **MySQL 8**（`xhw` / `xhw123456`） | 日常开发演示，数据持久 |
| `--spring.profiles.active=h2` | H2 内存库（`application-h2.yaml`） | **写库回归**、重启即还原 |

数据库还没建的话，**双击项目根目录的 `init-mysql.bat`**。
它做四件事：建 `xhw` 库 + 账号 → 导种子 → 打印行数自检 →
**发现遗留的 `hmdp` 库就先 dump 成 `_backup_legacy_hmdp.sql`，再问一次（要输 `YES`）
才 drop 掉**。root 密码只在开头问一次（写进临时 defaults 文件，比 `-pPASSWORD` 安全），
脚本是 drop + recreate，可以重复跑。

**Redis 不需要任何改动**：243 个 key 里没有一个含旧品牌名，命名从一开始就是业务语义。
`cache:shop:*` / `shop:geo:*` / `seckill:stock:*` 每次后端启动都会重写，换库后自动就对了。

**因此第 4、9、10 这三个会写库的脚本请配 h2 profile 跑**：

```bash
java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
$NODE _qa/static_proxy.js 8085 8082
XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/api_smoke.js
```

只读的（1、2、3、8）直接打 MySQL就行——顺便就验证了真库上页面是好的。

两个必须记住的点（都写进 `init-mysql.bat` 的注释了）：

- 要导的是 `src\main\resources\db\xhw.sql`（**当前**种子：12 张表、84 家店、带省市区）。
  项目根目录那个 `xhw.sql` 是原版虎哥的老脚本，**没有 province / district 列**，导了白导。
- 笔记标题里有 🍷🥩💰🐎，建库和导入都必须 `utf8mb4`，否则报错或乱码。

## 1. `html_lint.py` — 静态体检（不用起服务）

```bash
$PY _qa/html_lint.py                 # 默认查 nginx-1.18.0/html/xhw
$PY _qa/html_lint.py <web_root>      # 也可以指定别的目录
```

查四件事：

1. **自定义元素不能自闭合。** `<tk-icon name="back"/>` 是错的。HTML 解析器只把
   `img`、`br`、`input` 这类**真正的 void 元素**当自闭合处理；对 `tk-icon` 这种
   自定义元素，它会认为标签还没结束，把后面所有兄弟节点都当成它的子节点吞掉。
   症状是页面**静默缺一大块**，控制台一条报错都没有。必须写成 `<tk-icon ...></tk-icon>`。
2. **注释不能拿 `*/` 收尾。** `<!-- 说明 */` 这种写法解析器不认，会一路吞到下一个
   `-->` 为止，中间的内容全进注释。本项目的 `info.html` 踩过一次，「签到」整块消失。
3. 标签配平（引号感知扫描，属性值里出现 `<` `>` 不会误判，例如 `v-if="n < 9"`）。
4. `href` / `src` 引用的本地静态文件是否真的存在。

工具自测：把 `<!-- x */` 和 `<tk-icon/>` 写进一个临时文件，应该报出来。
一个从来不报错的检查器等于没有。

## 2. `render_test.js` — 渲染回归（核心）

```bash
$NODE _qa/render_test.js
```

用 jsdom 真挂载 14 个页面场景（脚本、样式、XHR 全走 nginx），跑真实登录流程拿 token，
然后断言：关键文本在不在、关键选择器有没有渲染出节点、控制台有没有报错、
图标名有没有写错（`[tk-icon]` 警告当失败处理）。

**为什么用 jsdom 而不是真浏览器**：本机沙箱里浏览器二进制会被 SIGTERM 掉，
`agent-browser open` 一律 exit 1。jsdom 是能真跑 Vue + axios 的替代方案。
它的局限是不做布局，所以**查不出纯 CSS 的视觉问题**，那部分只能靠人眼看。

## 3. `img_check.js` — 破图与死链

```bash
$NODE _qa/img_check.js
```

挂载各页，收集所有 `<img src>` 和站内 `.html` 链接，逐个请求，报告非 200。
图片站最容易翻车的地方，改完图片相关代码必跑。

## 4. `api_smoke.js` — 接口烟测

```bash
$NODE _qa/api_smoke.js
```

把前端各页面真正会触发的请求逐条打一遍（登录、签到、关注、点赞、秒杀、上传、发笔记）。

> ⚠️ 会往内存库写数据（新建用户/笔记/订单）。H2 是内存库，**跑完重启后端**就清干净了。
> 上传的测试图它会自己删掉，但笔记行还在，所以重启是必须的。

## 5. `login_click.js` — 登录页发码按钮真实点击

```bash
$NODE _qa/login_click.js 13611112222     # 手机号可省，默认 13611112222
```

用 jsdom 真填手机号、真点「获取验证码」，断言：
页面弹出「验证码已生成…」、按钮进入 60 秒倒计时、控制台无报错。

**用途**：排查「后端控制台看不到验证码」时，用来把问题**一刀切开**——

- 本脚本 PASS → 页面发的请求确实到了后端，后端的 `log.info` 一定执行了，
  问题在"你看日志的地方"（比如验证码被 MyBatis 的 SQL 日志冲走了，Ctrl+F 搜「登录验证码」）。
- 本脚本 FAIL（弹红字 / 不倒计时 / 有报错）→ 问题在前端，
  控制台没日志是正常的，别再去翻后端了。

它还会报告当前是哪种取码模式：
`开发接口可用（页面显示了验证码…）` 还是 `退回控制台提示`。

配合 Redis 交叉验证（限流键带时间戳，能看出最后一次调用是什么时候）：

```bash
redis-cli --raw get login:code:<手机号>            # 有值 = 后端收到了
redis-cli --raw zrange sms:sendtime:<手机号> 0 -1 WITHSCORES
```

> 注意发码是**按手机号**限流的：1 分钟 1 次、5 分钟 5 次，
> 且**被限流拦下时不会生成也不打印验证码**。连跑本脚本要换手机号。

## 6. `devcode_probe.js` — 开发取码接口的端到端验证

```bash
$NODE _qa/devcode_probe.js                      # 默认手机号 13677778888，默认后端 8081
$NODE _qa/devcode_probe.js 13900001111          # 换手机号
$NODE _qa/devcode_probe.js 13900001111 8082     # 再指定后端端口（比如临时新起的实例）
$NODE _qa/devcode_probe.js 13900001111 8082 locked   # 期望"限流开着"
```

第二个参数是**后端端口，默认 8081**（本项目真实后端所在端口）。
第三个参数传 `locked` 表示**期望限流是开着的**（后端 `xhw.dev-skip-sms-limit=false`）：
这时第一次发码后会锁 60 秒、再点拿不到新码。不传则期望限流已关闭、可以反复取码。

它会**点两次**「获取验证码」：第一次验证"码能显示并自动填入"，
第二次验证"再点一次还能不能拿到**另一个新码**"——这正是
`xhw.dev-skip-sms-limit` 这个开关两个方向是否都对的直接判据。
两种状态各跑一次，都 PASS 才算过。

验证「填手机号 → 取码 → 自动填入 → 点登录成功」整条链路，
针对的是 `xhw.dev-login-code` 那个开发取码接口。

**它顺带解决了一个实际难题**：后端改了代码，但 8081 上还跑着**没重启的旧实例**，
这时怎么验证"新后端 + 现网前端"的组合？

jsdom 30 的 `requestInterceptor` **只能返回合成响应、不能改 URL**，
（旧版的 `ResourceLoader` 在 30 里已经不导出了），所以这里**自己当代理**：
在拦截器里把 `http://localhost:8080/api/*` 转发到指定端口，把响应包成 `Response` 返回。

两个坑：

- **必须转 `method` 和 `body`**。`POST /user/login` 的 body 是 JSON，丢了 body 后端只回 400。
  发流式 body 时 Node fetch 还要 `duplex: "half"`。
- **别整包转发 `Headers`**。把 `content-length` 之类原样带过去、和实际 body 对不上时，
  undici 会直接抛错，表现为前端弹「连不上服务器」——看起来像后端挂了，其实是代理的锅。

结果长这样：

```
已点击「获取验证码」，手机号 13699990001（/api 已转发到 :8082）
提示：["验证码 042945，已自动填入"]
渲染出 .devcode 取码块：是
  页面上显示的验证码： 042945
  输入框里自动填入的： 042945
  两者一致且是 6 位数字：是
  退路提示 note-box 是否同时出现（应为否）：否 ✓
点「登录」后的 token：9a7f74bb2ce4…
[PASS] 填手机号 → 取码 → 自动填入 → 登录成功（全程不用碰控制台）
```

## 7. `_gen_startnginx.py` — 启动脚本生成器（不是测试，是构建工具）

```bash
$PY _qa/_gen_startnginx.py
```

生成 `nginx-1.18.0/start-nginx.bat` 和 `nginx-1.18.0/stop-nginx.bat`（覆盖式）。

**为什么必须有它**：这两个 bat 里的中文必须是 **GBK**（cmd 代码页 936）。直接手改或用
编辑器逐段替换，很容易变成"一半 GBK 一半 UTF-8"的混编文件，双击后会把中文行当命令执行
（满屏 `'xxx' 不是内部或外部命令`，看起来像脚本逻辑坏了，其实只是编码坏了）。
从这一个 UTF-8 的 Python 源统一转码出去，可以保证整份文件只有一种编码；
脚本末尾还会自检字节数、CRLF 数量、GBK 能否干净解码、有没有残留的半角感叹号
（`setlocal enabledelayedexpansion` 会把正文里的 `!` 吃掉）。

**改了启动逻辑请改这个 py，然后重新生成，不要直接改 bat。**

## 8. `region_test.js` — 省 / 市 / 区 三级联动端到端

```bash
$NODE _qa/region_test.js            # 默认打 http://127.0.0.1:8085
```

真挂页面、真点三列，走完「浙江省 → 四川省 → 成都 → 锦江区」这条链路，
再验证按钮标签、副标题、localStorage、笔记过滤、店铺列表、地址簿。
**需要新后端**（区域树接口和三级筛选都是这一轮加的），起法同第 9 节那三步。

它抓出过三个真问题，都属于"看起来正常、实际不对"：

1. 级联自动落到**一家店都没有的区**（行政排序第一的「滨江区」，而店都在拱墅区）
2. Vue 2 里 `filter(function(){ ... this.c })` 的 `this` 不是组件 → 第三级永远空
3. `util` 里的缓存不是响应式的 → 「距离」按钮永远不出现（但每家店确实带着距离）

> 另外 jsdom **每个实例有独立的 localStorage**，所以"刷新后还在"这类断言
> 只能靠 `beforeParse` 预置来模拟，不能指望上一个实例写下的值。

## 9. `address_smoke.js` — 地址簿接口规则 + 越权

```bash
$NODE _qa/address_smoke.js
# 或打新后端：XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/address_smoke.js
```

**为什么单独一个脚本、不并进 `api_smoke.js`**：`api_smoke` 验的是"老接口还通不通"
（路径、返回形状）；这个验的是**规则对不对**——首条自动默认、设默认互斥、
删默认补位、编辑不能取消默认、字段校验文案，以及**水平越权**。
规则类的断言必须精确到具体值，混进烟测里就看不出来了。

50 条断言，重点在 G 段（安全）：

```
=== G. 水平越权（拿 B 的令牌去动 A 的数据） ===
  ok   读别人的地址 -> 地址不存在（不区分「不存在」和「不是你的」）
  ok   单查接口没有泄露别人的收货人
  ok   改 / 删 / 设默认 别人的地址 -> 地址不存在
  ok   受害者的数据一条没少、一条没变
  ok   伪造 userId 无效：地址仍归自己
```

**会写内存库**（新建用户 + 地址）。H2 是内存库，重启后端即清空。

> 里面「种子用户有 3 条地址」那几条只在 H2 干净时成立。
> 被改动过会打印 `skip` 并说明原因，而不是甩一片红。

## 10. `address_ui_test.js` — 地址簿 UI 端到端

```bash
$NODE _qa/address_ui_test.js            # 默认打 http://127.0.0.1:8085
```

和 `address_smoke.js` 的分工：**接口对但页面没接上，是两回事**。
这个脚本真挂页面、真点按钮，走完 新增 → 设为默认 → 删除 → 编辑，
外加"所在地区"那一栏的省市区三级选择。

**它每次现建一个新用户、用接口预置三条地址。**
第一版是拿种子用户跑的，结果它自己把种子数据改了（换了默认、删了一条），
第二次跑第一步就红——**一个只能绿一次的测试等于没有**。

它抓出过一个真实缺陷：地址卡上「默认」徽标和标签写成了 `v-if / v-else`，
导致把一条写着「公司」的地址设为默认之后，「公司」就凭空消失了。
默认是状态、标签是分类，两个独立维度不能二选一。

## 11. `_gen_nationwide_sql.py` — 种子数据生成器（构建工具）

```bash
$PY _qa/_gen_nationwide_sql.py            # 生成并覆盖 xhw.sql，原文件首次会自动备份
$PY _qa/_gen_nationwide_sql.py --dry-run  # 只打印统计，不落盘
```

生成 8 城 84 家店 + 20 篇笔记 + 5 条收货地址（每条都带省市区）。
**必须用这个脚本改种子数据，不要手改 `xhw.sql`**：
`tb_shop` 是位置式 `INSERT ... VALUES (...)`，加一列等于每一行都要在同一位置补值，
手写错一个逗号，报的错是"列数不匹配"，定位极难。

脚本从 `_qa/backup/upstream.sql.orig`（**不是当前文件**）出发生成，所以是幂等的；
末尾自检行数与每行值个数。城市清单、店名、**每家店的区县**、坐标抖动、
图片循环都在脚本里，改数据请改 `CITIES` / `DISTRICTS` / `BLOG_SEEDS` / `ADDRESS_SEEDS`。

它还有一道**交叉校验** `check_region()`：每一家店、每一条地址的省市区
都必须在 `src/main/resources/regions.json` 里真实存在，否则**拒绝生成**。
这不是洁癖 —— `regions.json`、`tb_shop`、前端查询参数这三处的名字只要差一个字
（「杭州市」vs「杭州」），筛选就会稳定返回空数组而且不报错，
在生成阶段炸掉比上线后查一天划算。它当场就抓出过两个错。

## 12. `_build_regions.py` — 全国行政区划整理（构建工具）

```bash
$PY _qa/_build_regions.py            # 用本地缓存，不联网
$PY _qa/_build_regions.py --refresh  # 重新下载原始数据
```

原始数据来自 [xianyuxm/china-area-json](https://github.com/xianyuxm/china-area-json)
（源自高德开放平台），缓存在 `_qa/backup/area-full.json`。
脚本负责整理成 `src/main/resources/regions.json`
（**34 省 / 390 市 / 3259 区 / 67 KB**），并修掉三处不能直接用的地方：
直辖市的「城区 / 郊县」机器名、港澳把区当市、台湾省缺下级。
**改了行政区划要重跑它，然后重启后端。**

## 13. `map_test.js` — 地图找店页端到端

```bash
$NODE _qa/map_test.js                      # 默认打用户的 nginx 8080
$NODE _qa/map_test.js http://127.0.0.1:8085
```

**只读脚本**（地图页不写库），所以不需要新后端，用户的 nginx 就能跑。

33 条。最要紧的一组是**「地图能不能起来都要能用」**：地图依赖一个用户自己申请的
高德 key，`js/config.js` 里填没填是使用者自己的事，所以断言刻意做成与 key 无关 ——
配了 key 走真地图分支，没配走降级分支，**两条路的门店列表和城市切换都必须可用**。

```
ok   地图区要么起来了、要么是说明卡（绝不空白）
ok   说明卡里给了明确的下一步（申请 key 的入口 或 加载中/失败的说明）
ok   列表照常渲染出 84 家店
ok   缩略图用的是门店类型图标（不是空 src）
```

地图逻辑本身也能测 —— 靠 `_amap_stub.js`（见第 14 节）：

```
ok   地图实例建起来了
ok   全国视图画了 84 个标记
ok   标记用的是真实经纬度（不是 0,0）
ok   画完标记会把视野 fit 到这些点上
ok   切到成都后地图重画成 10 个标记（不是留着全国的 84 个）
```

> **一条真测不了的**：jsdom 不做布局，`getBoundingClientRect()` 恒为 0，
> 量不到容器高度（替身是骗过页面、不是修好 jsdom）。
> 所以"页面在真实浏览器里的观感"仍然只能人眼看一次。

## 14. `_amap_stub.js` — jsdom 用的高德替身（辅助文件）

不是独立脚本，被 `render_test.js` 和 `map_test.js` `require` 进去用。它做两件事：

1. 往 `window` 上塞一个假的 `AMap`，页面见到它就不会再去注入那 995 KB 的外网脚本
   （jsdom 里既跑不起来、又会把测试拖住）；
2. 把 `HTMLElement.prototype.clientHeight` 伪装成固定值，让页面走到
   「建图 → 画标记 → fitBounds」的**真实分支**，调用记录挂在 `window.__amap`
   上供断言读取（`markers` / `bounds` / `fit` / `cleared` / `circles`）。

`clearMap()` 会顺手把 `log.markers` 清空，所以它的语义是"**此刻**图上有几个标记"。

## 15. `_rename_brand.py` — 品牌改名（一次性迁移脚本）

```bash
$PY _qa/_rename_brand.py --dry-run   # 只报告
$PY _qa/_rename_brand.py             # 就地替换
```

把「黑马 / hmdp」清成「小红碗 / xhw」。**正常情况下不需要再跑**，
留着是为了记录当时改了哪些形态，以及万一回滚了可以直接重跑。

刻意**不动**的地方（改了反而是错的）：
`_frontend_origin_backup/`（上游原版前端的原样备份）、`upstream-original.sql`
（别人写的文件）、`logs/`（历史日志）、`改造说明.md`（里面有"改前 → 改后"对照表）。

> ⚠️ 写成 .py 文件而不是命令行里的一段 heredoc，是有原因的：
> **git-bash 会把 heredoc 内容里的反斜杠折成正斜杠**，
> 于是 `r'D:\hmdp'` 这种规则在脚本里变成了 `'D:/hmdp'`，
> Java 字符串里的 `"D:\\hmdp\\..."` 一处都匹配不上 —— 而且这种失败是静默的
> （"0 次命中"看起来和"没有需要改的"一模一样）。

## 15. `p0_smoke.js` — 数据自洽 + 越权收口

```bash
$PY   # 先起 h2 后端 + QA 站点
XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/p0_smoke.js
```

29 条，验三件之前**看着有、其实是死的**事：

```
ok   B 评论后评论数变成 1            ← 以前 BlogServiceImpl 连 setComments 都没有
ok   签到 +5 积分 / 笔记被赞 +1 / 笔记被评论 +2
ok   删评论 -2、取消赞 -1（来回刷不出分）
ok   全新用户等级是 1（不是 0 —— 0 积分和 1 级必须是同一个意思）
ok   取关之后 A 的粉丝数回到 0（不是停在 1）
ok   PUT /shop 被拒（水平越权）
```

**写这类脚本时踩过的两个坑**（都写进脚本注释了）：

1. `post()` 返回 `{status, body}`，取 id 要写 `.body.data`。
   写成 `.data` 的话 `blogId` 是 `undefined`，**后面全红但没有任何报错**。
2. 别**跨段比较**：在"评论加减"跑完之后回头断言"发帖 +10"，差值当然不是 10。
   要么在动作发生的那一刻立刻断言，要么全程用相对上一个值的写法。

## 16. `order_smoke.js` / `order_ui_test.js` — 秒杀闭环

```bash
$PY   # 先起 h2 后端 + QA 站点
XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/order_smoke.js      # 26 条，打接口
$NODE _qa/order_ui_test.js                                  # 23 条，挂页面
```

秒杀流程以前断在"下单"这一步：能抢到，但订单没地方看。现在补了
`GET /voucher-order/my` 和 `POST /voucher-order/{id}/pay`（模拟支付）。

**跑这两个脚本要注意一件事：下单是异步落库的。**
`POST /voucher-order/seckill/{id}` 只跑 Lua（`XADD` + 扣库存）就返回了，
真正 `INSERT tb_voucher_order` 的是后台的 Stream 消费者。
所以脚本是**轮询等**（`waitForOrder`），页面里也写了提示条 ——
刚抢完立刻刷新，订单可能还没入库。

## 17. `favorite_smoke.js` / `favorite_ui_test.js` — 笔记收藏

```bash
$PY   # 先起 h2 后端 + QA 站点
XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/favorite_smoke.js   # 30 条，打接口
$NODE _qa/favorite_ui_test.js                                # 22 条，挂页面
```

`tb_favorites` 的建表语句在 **`_qa/_gen_nationwide_sql.py`** 里（`build_favorites_sql()`），
不在 `xhw.sql` 里手写 —— 重跑一次生成器就会把手写的部分整份覆盖掉。

> ⚠️ 用了 `tb_favorites` 之后，**要让它在你自己的 MySQL 里生效，
> 得重跑一次 `init-mysql.bat`**（drop + recreate `xhw` 库）。h2 那套不需要，是每次启动重新灌的。

**写这类脚本时踩过的坑**（已写进脚本注释）：`del` 辅助函数如果只有 `(p, t)` 两个参数，
却照抄 `post`/`put` 写成 `del(path, undefined, token)`，token 会被**静默丢掉**，
每个 DELETE 变成未登录的 401。这类错不会全红 —— "操作应该生效"的断言
反而会因为"什么都没发生"而**假通过**。所以 `del` 带了守卫，token 不是字符串就直接抛。

## 18. `blog_feed_smoke.js` — 笔记排序 + 搜索

```bash
$PY   # 先起 h2 后端 + QA 站点
XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/blog_feed_smoke.js   # 22 条
```

守三件容易翻车的事：

```
ok   乱传 sort 不会注入（当默认值处理，不报错也不注入）
ok   搜 % 不会匹配全表（LIKE 通配符已转义）
ok   搜 _ 也不会匹配单字符（_ 是单字符通配符）
ok   空/纯空白关键词返回空数组（"没搜"不等于"搜全部"）
```

## 19. 优惠券铺开后的两个变化（2026-10-06）

### 券的 id 变了，别再写死
种子重新生成后，秒杀券的 id 从 `2` 变成了 `184~191`（每座城首店一张）。
`api_smoke` / `order_smoke` / `order_ui_test` 原来都写死 `/voucher-order/seckill/2`，
现在改成**动态找一张 type=1 的券**：

```js
for (let sid = 1; sid <= 30 && !sv; sid++) {
  const list = (await api("/voucher/list/" + sid)).data || [];
  sv = list.filter(v => v.type === 1)[0] || null;
}
```

> **测试里不要硬编码种子数据的 id。** 种子是可再生的（`init-mysql.bat` 会重建），
> 写死就是埋雷 —— 这一轮三个脚本同时炸。

### 订单测试会在"两实例并存"时跳过
秒杀是「XADD 进 Stream → 消费者异步落库」。本机同时跑着两个后端
（IDEA 里一个 + 命令行一个）而它们**各连各的库**时，消息只会落到其中一个库，
"下单后查不到订单"是必然结果，和代码对错无关。

所以 `order_smoke` / `order_ui_test` 跑之前会先数消费者：

```bat
"C://Program Files//Redis//redis-cli.exe" XINFO CONSUMERS stream.orders g1
```

大于 1 就**跳过并打印原因**（不计入通过/失败）。
想跑完整的订单用例，先把 IDEA 里的后端停掉。

消费者名现在是 `c1-<端口>`（`VoucherOrderServiceImpl.consumerName()`），
所以 `XINFO CONSUMERS` 能直接看出有几个实例在抢。

## 20. `css_lint.py` — CSS 静态体检（不用起服务）

```bash
$PY _qa/css_lint.py
```

`html_lint.py` 查 HTML 结构，**查不到 CSS 的行为问题**。这个补上。
起因是一个真踩过的坑：

> 店铺详情页的图片轮播 `.gal` 是 `overflow-x: auto` 的滚动容器，
> 图片又能高到 78vh 几乎铺满整屏 —— 手指/滚轮落在它身上时**纵向滚动被它吃掉**，
> 表现为"整个页面滑不动"。

这种 bug **jsdom 测不出来**（不做布局、不做手势），真浏览器在本机沙箱里也起不来，
所以只能在规则层面挡住。它检查：

1. 凡是 `overflow-x: auto|scroll` 的规则，**必须有 `touch-action: pan-x`**（否则不通过）
2. 列出全屏 `position: fixed` + `inset: 0` 的元素（遮罩类，人眼过一眼）
3. 提示 `max-height >= 70vh` 的规则 —— 配上 overflow 容器就是"铺满整屏还会吃手势的块"

## 21. `html_lint.py` 的「底栏必须有 main 容器」检查

`html_lint.py` 除了查标签配平，现在还查一条**很容易漏的布局规则**：

> 页面里有 `<foot-bar>`（固定底栏 `.tk-ft`，`position: fixed`）时，
> 必须有 `<main class="main">` 把内容包起来 —— 只有它带
> `padding-bottom: calc(var(--ft) + 28px)` 给底栏让高度。
> 少了这一层，**页面最后一个元素会被底栏永久盖住，滚到底也露不出来**。

踩过的实例：`shop-detail.html` 缺这一层，被盖住的正是最后一张代金券卡片的底部
（「到店核销」+「怎么用」），表现成"看不到完整的代金券"。
同一批还发现 `index.html` / `shop-list.html` / `address.html` 也中了。

**这类 bug 光看截屏看不出来**（被盖住的部分永远不出现，很容易当成"就是没有"），
所以必须在静态检查层面挡住。

> 写完检查记得**验一下它真的会报**：临时去掉某个页面的 `main` → 跑 lint 应该失败 → 还原。
> 不验的话很容易是个永远不报的空壳。

## 22. `gallery_ui_test.js` — 轮播的左右翻页按钮

```bash
$PY   # 先起 h2 后端 + QA 站点
NODE_PATH=... XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/gallery_ui_test.js   # 19 条
```

不只验"按钮画出来了"，而是验**真的能翻**：置灰状态、翻页后圆点和计数跟着走、
置灰的按钮点不动、以及同一个组件在笔记详情页也生效。

**为什么这个交互 jsdom 里测得到**：`tk-gallery.jump()` 是
「先改 `cur`、再发滚动」——状态立刻变，滚动只是视觉效果。
如果只靠 `scrollLeft` 的副作用改状态，jsdom（没有真实滚动）里点了按钮什么都验不到。

## 附：`dump_text.js`

把每页渲染后的可见文本和关键组件实例数打出来，用于人眼检查文案和空状态。
排查「页面看起来对了但其实渲染的是空状态」时很有用。

## 已知的环境限制

- 沙箱里 `spawnSync redis-cli.exe` 报 `EBUSY`，所以脚本里改用裸 RESP 协议
  (`net.createConnection`) 直接问 Redis 拿验证码。
- 沙箱里浏览器二进制不可用，见上。
- git-bash 缺 `tail`/`grep` 等 coreutils，管道会整条失败；脚本输出建议用
  Python 过滤，或直接裸跑。
