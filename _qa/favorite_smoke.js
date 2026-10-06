/* ============================================================================
 *  笔记收藏：幂等、隔离、越权。
 *
 *  收藏和点赞的语义差别是这一轮的重点：
 *    点赞 = 切换（PUT /blog/like/{id} 一次调用，内部判断加还是减）
 *    收藏 = 显式开关（PUT 和 DELETE 两个方法，各自定义、各自幂等）
 *  所以接口测的是「重复调用不报错」和「重复调用不产生第二行」。
 *
 *  跑法（**必须 h2 profile**，会写库；表由 _gen_nationwide_sql.py 生成）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/favorite_smoke.js
 * ========================================================================= */
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
const put = (p, d, t) => req(p, { method: "PUT", body: d === undefined ? undefined : JSON.stringify(d) }, t);
/* ⚠️ del 只有两个参数。之前它被写成 del(p, undefined, token)（照抄 post/put 的样子），
   于是 token 被静默丢掉、每个 DELETE 都变成未登录的 401 ——
   而"别人取消不掉我的收藏"那条断言还因此**假通过**了。
   加个守卫：t 必须是字符串，否则立刻炸，别让它悄悄变成 401。 */
function del(p, t) {
  if (typeof t !== "string" || !t) {
    throw new Error("del() 第二个参数必须是 token —— 是不是又写成 del(p, undefined, token) 了？");
  }
  return req(p, { method: "DELETE" }, t);
}

async function login(phone) {
  await req("/user/code?phone=" + phone, { method: "POST" });
  const c = await get("/user/code/dev?phone=" + phone);
  return (await req("/user/login", {
    method: "POST", body: JSON.stringify({ phone, code: c.body.data })
  })).body.data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");

const isFav = async (id, t) => (await get("/blog/" + id + "/favorite", t)).body.data === true;
const myFav = async (t) => (await get("/blog/of/favorite", t)).body.data || [];

(async () => {
  const tokenA = await login(newPhone());
  const tokenB = await login(newPhone());
  const meA = (await get("/user/me", tokenA)).body.data;
  const meB = (await get("/user/me", tokenB)).body.data;
  // 拿两篇不同的笔记
  const all = (await get("/blog/hot", tokenA)).body.data || [];
  const b1 = all[0], b2 = all[1];
  ok("拿到两篇可用的笔记", !!b1 && !!b2, [b1 && b1.id, b2 && b2.id]);
  console.log(`A=${meA.id}  B=${meB.id}  笔记 ${b1.id} / ${b2.id}\n`);

  /* ================================================== 1. 基本开关 */
  console.log("=== 1. 收藏 / 取消收藏 ===");
  ok("一开始没收藏", (await isFav(b1.id, tokenA)) === false);
  ok("一开始收藏列表是空的", (await myFav(tokenA)).length === 0);

  ok("收藏成功", (await put("/blog/" + b1.id + "/favorite", undefined, tokenA)).body.success === true);
  ok("状态变成已收藏", (await isFav(b1.id, tokenA)) === true);
  ok("收藏列表里有这 1 条", (await myFav(tokenA)).length === 1, (await myFav(tokenA)).length);
  ok("返回的是 Blog 本身（带标题），不是裸 id",
     (await myFav(tokenA))[0] && (await myFav(tokenA))[0].title, (await myFav(tokenA))[0]);

  ok("取消收藏成功", (await del("/blog/" + b1.id + "/favorite", tokenA)).body.success === true);
  ok("状态变回未收藏", (await isFav(b1.id, tokenA)) === false);
  ok("收藏列表空了", (await myFav(tokenA)).length === 0);

  /* ================================================== 2. 幂等 */
  console.log("\n=== 2. 幂等：重复调不报错、也不产生第二行 ===");
  await put("/blog/" + b1.id + "/favorite", undefined, tokenA);
  ok("重复收藏仍然成功（不是报错）",
     (await put("/blog/" + b1.id + "/favorite", undefined, tokenA)).body.success === true);
  ok("但收藏列表里还是只有 1 条（唯一索引挡住了）",
     (await myFav(tokenA)).length === 1, (await myFav(tokenA)).length);

  ok("重复取消也成功",
     (await del("/blog/" + b1.id + "/favorite", tokenA)).body.success === true);
  ok("重复取消之后状态还是未收藏", (await isFav(b1.id, tokenA)) === false);
  ok("从没收藏过就取消，也不报错",
     (await del("/blog/" + b2.id + "/favorite", tokenA)).body.success === true);

  /* ================================================== 3. 多条与顺序 */
  console.log("\n=== 3. 多条与排序 ===");
  await put("/blog/" + b1.id + "/favorite", undefined, tokenA);
  await put("/blog/" + b2.id + "/favorite", undefined, tokenA);
  const list = await myFav(tokenA);
  ok("收藏了 2 条", list.length === 2, list.length);
  ok("新的收藏排在前面（按收藏时间倒序，不是按笔记 id）",
     list[0].id === b2.id, list.map((x) => x.id));
  ok("两篇笔记都取到了标题", list.every((b) => !!b.title), list.map((b) => b.title));

  /* ================================================== 4. 隔离与越权 */
  console.log("\n=== 4. 隔离与越权 ===");
  ok("B 看不到 A 的收藏（状态是未收藏）", (await isFav(b1.id, tokenB)) === false);
  ok("B 的收藏列表是空的", (await myFav(tokenB)).length === 0, (await myFav(tokenB)).length);
  // A 收藏了，B 也收藏同一篇 —— 两条独立记录，靠 uk_fav_user_blog 区分
  ok("B 收藏同一篇也不受影响", (await put("/blog/" + b1.id + "/favorite", undefined, tokenB)).body.success === true);
  ok("B 收藏后 A 依然收藏着", (await isFav(b1.id, tokenA)) === true);
  ok("B 自己的列表里也只�� 1 条", (await myFav(tokenB)).length === 1);
  // B 取消不能影响 A
  await del("/blog/" + b1.id + "/favorite", tokenB);
  ok("B 取消之后 A 还是收藏状态（删不掉别人的行）", (await isFav(b1.id, tokenA)) === true);
  ok("A 的收藏列表还是 2 条", (await myFav(tokenA)).length === 2, (await myFav(tokenA)).length);

  /* ================================================== 5. 非法输入 */
  console.log("\n=== 5. 非法输入与未登录 ===");
  ok("收藏不存在的笔记被拒",
     (await put("/blog/999999/favorite", undefined, tokenA)).body.errorMsg === "这篇笔记不存在");
  ok("取消不存在的笔记也报错（它根本没被收藏过，但这里是幂等的，所以不报错）",
     (await del("/blog/999999/favorite", tokenA)).body.success === true);

  ok("未登录查不到收藏状态", (await get("/blog/" + b1.id + "/favorite")).status === 401);
  ok("未登录收藏不了", (await put("/blog/" + b1.id + "/favorite", undefined)).status === 401);
  ok("未登录看不了收藏列表", (await get("/blog/of/favorite")).status === 401);

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
