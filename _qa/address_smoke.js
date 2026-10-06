/* ============================================================================
   地址簿接口烟测：把收货地址那六个接口的**业务规则和边界**逐条打一遍。

   为什么单独一个脚本，不并进 api_smoke.js：
     api_smoke 验的是"老接口还通不通"（路径、形状）；这个脚本验的是
     "规则对不对"——首条自动默认、设默认要互斥、删默认要补位、
     以及**水平越权**。规则类的断言必须精确到具体值，混在一起就看不出来了。

   跑法（默认打用户的 nginx 8080 -> 8081）：
     node _qa/address_smoke.js
   要验新后端 + 现网前端：
     $NODE _qa/static_proxy.js 8085 8082
     XHW_ROOT=http://127.0.0.1:8085 node _qa/address_smoke.js

   ⚠️ 会往内存库写数据（新建用户 + 若干地址）。H2 是内存库，重启后端即清空。
   ========================================================================= */
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8080") + "/api";

let pass = 0, fail = 0;
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else {
    fail++;
    console.log("  FAIL " + what + (extra !== undefined ? "   → " + JSON.stringify(extra) : ""));
  }
}

async function req(path, opts, token) {
  const init = Object.assign({ method: "GET" }, opts || {});
  init.headers = Object.assign({}, init.headers || {});
  if (init.body) init.headers["content-type"] = "application/json";
  if (token) init.headers.authorization = token;
  const res = await fetch(ROOT + path, init);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = { raw: text }; }
  return { status: res.status, body };
}
const get = (p, t) => req(p, { method: "GET" }, t);
const post = (p, data, t) => req(p, { method: "POST", body: JSON.stringify(data) }, t);
const put = (p, data, t) => req(p, { method: "PUT", body: data ? JSON.stringify(data) : undefined }, t);
const del = (p, t) => req(p, { method: "DELETE" }, t);

/* 用开发取码接口拿码再登录，不碰 Redis、不依赖控制台 */
async function login(phone) {
  const sent = await req("/user/code?phone=" + phone, { method: "POST" });
  if (!sent.body.success) throw new Error("发码失败: " + sent.body.errorMsg);
  const code = await get("/user/code/dev?phone=" + phone);
  if (!code.body.success) {
    throw new Error("取码失败（xhw.dev-login-code 是不是关着？）: " + code.body.errorMsg);
  }
  const res = await post("/user/login", { phone: phone, code: code.body.data });
  if (!res.body.success) throw new Error("登录失败: " + res.body.errorMsg);
  return res.body.data;
}

// 省市区三级：写法必须和 regions.json / tb_address 逐字一致
const addr = (o) => Object.assign(
  { name: "张三", phone: "13800138000",
    province: "浙江省", city: "杭州", district: "拱墅区",
    detail: "文三路 1 号", tag: 0, isDefault: 0 }, o);
const byId = (list, id) => list.filter((a) => a.id === id)[0];

(async () => {
  /* ------------------------------------------------------------ 准备 */
  const seedPhone = "13686869696";                     // tb_user.id = 1，有 3 条种子地址
  const freshPhone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const tokenSeed = await login(seedPhone);
  const tokenFresh = await login(freshPhone);
  console.log(`种子用户 ${seedPhone} / 新用户 ${freshPhone}\n`);

  /* ------------------------------------------------ A. 读：默认置顶 */
  console.log("=== A. 列表读取 ===");
  const listSeed = (await get("/address/list", tokenSeed)).body.data || [];
  /* 种子数据校验只在 H2 是干净的时候成立（同一进程里被手动改过就不是 3 条了）。
     与其红一片让人以为代码坏了，不如明说"跳过"。
     想跑这段就重启后端 —— H2 是内存库，重启即还原。 */
  if (listSeed.length === 3) {
    ok("种子用户有 3 条地址", true);
    ok("默认地址排在最前", listSeed[0] && listSeed[0].isDefault === 1, listSeed[0]);
    ok("默认那条正是杭州那条", listSeed[0] && listSeed[0].city === "杭州", listSeed[0] && listSeed[0].city);
  } else {
    console.log(`  skip 种子数据校验（H2 已被改动过，当前 ${listSeed.length} 条；重启后端即还原）`);
  }

  let listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("新用户的地址簿是空的", listFresh.length === 0, listFresh.length);

  /* ------------------------------------------------------ B. 字段校验 */
  console.log("\n=== B. 字段校验（文案必须和后端一字不差） ===");
  const badCases = [
    [addr({ name: "   " }), "收货人不能为空"],
    [addr({ phone: "   " }), "手机号不能为空"],
    [addr({ phone: "12345" }), "手机号格式看着不对"],
    [addr({ phone: "12800138000" }), "手机号格式看着不对"],
    [addr({ province: " " }), "请选择省份"],
    [addr({ city: " " }), "请选择城市"],
    [addr({ detail: "  " }), "详细地址不能为空"],
    [addr({ name: "字".repeat(33) }), "收货人最多 32 个字"]
  ];
  for (const [payload, expect] of badCases) {
    const r = await post("/address", payload, tokenFresh);
    ok(`拒绝非法输入：「${expect}」`, r.body.success === false && r.body.errorMsg === expect,
       r.body.errorMsg);
  }
  // 校验失败不该留下脏数据
  ok("校验失败的请求没有写库", ((await get("/address/list", tokenFresh)).body.data || []).length === 0);

  /* ------------------------------------------ C. 首条自动默认 + trim */
  console.log("\n=== C. 新增 ===");
  const first = await post("/address", addr({
    name: " 张三 ", phone: " 13800138000 ",
    province: " 浙江省 ", city: " 杭州 ", district: " 拱墅区 ",
    detail: " 文三路 1 号 "
  }), tokenFresh);
  ok("新增成功并返回 id", first.body.success && first.body.data, first.body);
  const id1 = first.body.data;

  listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("第一条地址自动成为默认", listFresh.length === 1 && listFresh[0].isDefault === 1, listFresh);
  ok("落库前做了 trim（收货人）", listFresh[0].name === "张三", listFresh[0].name);
  ok("落库前做了 trim（城市）", listFresh[0].city === "杭州", listFresh[0].city);
  ok("落库前做了 trim（详细地址）", listFresh[0].detail === "文三路 1 号", listFresh[0].detail);
  ok("省市区三级都存下来了",
     listFresh[0].province === "浙江省" && listFresh[0].city === "杭州" && listFresh[0].district === "拱墅区",
     [listFresh[0].province, listFresh[0].city, listFresh[0].district]);
  ok("trim 之后长度校验不被前后空格误伤",
     (await post("/address", addr({ name: "  " + "字".repeat(32) + "  " }), tokenFresh)).body.success === true);

  // 上一步多加了一条，先删掉，保持后面断言干净
  const junk = (await get("/address/list", tokenFresh)).body.data.filter((a) => a.name.length === 32)[0];
  if (junk) await del("/address/" + junk.id, tokenFresh);

  // 伪造 userId：前端传了也不该作数
  const second = await post("/address", addr({ userId: 1, name: "李四", phone: "13900139000", province: "北京市", city: "北京", district: "朝阳区", detail: "三里屯路 1 号" }), tokenFresh);
  const id2 = second.body.data;
  listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("伪造 userId 无效：地址仍归自己", listFresh.length === 2, listFresh.length);
  ok("只有一条默认地址", listFresh.filter((a) => a.isDefault === 1).length === 1);
  ok("第二条不是默认（默认只会在第一条上）", byId(listFresh, id2).isDefault === 0);
  ok("伪造 userId 没有把地址写进别人的簿子",
     ((await get("/address/list", tokenSeed)).body.data || []).length === listSeed.length);

  /* ---------------------------------------------------------- D. 设默认 */
  console.log("\n=== D. 设为默认 ===");
  ok("设为默认成功", (await put("/address/" + id2 + "/default", null, tokenFresh)).body.success === true);
  listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("默认地址换成了第二条", byId(listFresh, id2).isDefault === 1);
  ok("原来的默认被取消", byId(listFresh, id1).isDefault === 0);
  ok("全局有且只有一条默认", listFresh.filter((a) => a.isDefault === 1).length === 1);
  ok("默认地址排到了列表第一位", listFresh[0].id === id2, listFresh.map((a) => a.id));
  ok("重复设同一个默认是幂等的",
     (await put("/address/" + id2 + "/default", null, tokenFresh)).body.success === true &&
     ((await get("/address/list", tokenFresh)).body.data.filter((a) => a.isDefault === 1).length === 1));

  /* ------------------------------------------------------------ E. 编辑 */
  console.log("\n=== E. 编辑 ===");
  ok("编辑成功", (await put("/address", {
    id: id1, name: "张三丰", phone: "13800138000",
    province: "浙江省", city: "杭州", district: "拱墅区",
    detail: "文三路 2 号", tag: 1, isDefault: 0
  }, tokenFresh)).body.success === true);
  listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("收货人改掉了", byId(listFresh, id1).name === "张三丰", byId(listFresh, id1).name);
  ok("标签改掉了", byId(listFresh, id1).tag === 1, byId(listFresh, id1).tag);
  ok("详细地址改掉了", byId(listFresh, id1).detail === "文三路 2 号", byId(listFresh, id1).detail);
  ok("编辑时传 isDefault=0 不会把默认地址变成没有默认",
     listFresh.filter((a) => a.isDefault === 1).length === 1);

  ok("编辑不存在的 id -> 地址不存在",
     (await put("/address", addr({ id: 999999 }), tokenFresh)).body.errorMsg === "地址不存在");

  /* -------------------------------------------- F. 删除 / 默认补位 */
  console.log("\n=== F. 删除 ===");
  ok("删除默认地址成功", (await del("/address/" + id2, tokenFresh)).body.success === true);
  listFresh = (await get("/address/list", tokenFresh)).body.data || [];
  ok("删掉之后只剩一条", listFresh.length === 1, listFresh.length);
  ok("默认自动补位到剩下的那条", listFresh[0].id === id1 && listFresh[0].isDefault === 1, listFresh[0]);
  ok("删不存在的 id -> 地址不存在",
     (await del("/address/999999", tokenFresh)).body.errorMsg === "地址不存在");
  ok("删完之后仍有默认地址（不留「没有默认」的坏状态）",
     listFresh.filter((a) => a.isDefault === 1).length === 1);

  /* -------------------------------------------------------- G. 越权 */
  console.log("\n=== G. 水平越权（拿 B 的令牌去动 A 的数据） ===");
  if (!listSeed.length) {
    console.log("  skip 越权校验（种子用户地址簿为空，没有可用的靶子）");
  } else {
  const victim = listSeed[0].id;
  const rRead = await get("/address/" + victim, tokenFresh);
  ok("读别人的地址 -> 地址不存在（不区分「不存在」和「不是你的」）",
     rRead.body.success === false && rRead.body.errorMsg === "地址不存在", rRead.body);
  ok("单查接口没有泄露别人的收货人",
     JSON.stringify(rRead.body).indexOf(listSeed[0].phone) === -1);
  ok("改别人的地址 -> 地址不存在",
     (await put("/address", addr({ id: victim, name: "黑客" }), tokenFresh)).body.errorMsg === "地址不存在");
  ok("删别人的地址 -> 地址不存在",
     (await del("/address/" + victim, tokenFresh)).body.errorMsg === "地址不存在");
  ok("把别人的地址设成自己的默认 -> 地址不存在",
     (await put("/address/" + victim + "/default", null, tokenFresh)).body.errorMsg === "地址不存在");

  const seedAfter = (await get("/address/list", tokenSeed)).body.data || [];
  ok("受害者的数据一条没少、一条没变", seedAfter.length === listSeed.length &&
     seedAfter[0].id === listSeed[0].id && seedAfter[0].name === listSeed[0].name,
     seedAfter.map((a) => a.name));
  ok("B 的列表里看不到 A 的任何地址",
     ((await get("/address/list", tokenFresh)).body.data || []).every((a) => a.userId !== listSeed[0].userId));
  }

  /* ------------------------------------------------------ H. 登录态 */
  console.log("\n=== H. 未登录 ===");
  const anon = await get("/address/list");
  ok("未登录访问地址接口返回 401", anon.status === 401, anon.status);
  const anonPost = await post("/address", addr({}));
  ok("未登录不能新增地址", anonPost.status === 401, anonPost.status);

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
