/* ============================================================================
 *  P0 三条的验证：数据自洽 + 越权收口。
 *
 *    ① 发表评论要回写 tb_blog.comments（原来 BlogServiceImpl 里连 setComments 都没有，
 *       所以首页/店铺详情/地图页卡片上的「N 条评价」永远是种子数据里的假数字）
 *    ② credits / level / fans / followee 不再永远是 0
 *       （这四个字段的写入点原来是 0 处，页面上「积分」「粉丝」「关注」全是死的）
 *    ③ 门店 / 发券的写接口被收口，不再是"任何登录用户都能改任意门店"的水平越权
 *
 *  跑法（**必须 h2 profile**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/p0_smoke.js
 * ========================================================================= */
const net = require("net");
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8080") + "/api";

let pass = 0, fail = 0;
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else {
    fail++;
    console.log("  FAIL " + what + (extra !== undefined ? "   → " + JSON.stringify(extra) : ""));
  }
}

/* 点赞是"切换"，名单在 Redis 里不随后端重启清空 —— 重跑前先清掉，
   否则"点赞"会变成"取消"，积分的 +1/-1 就反了（详见 social_smoke.js 的注释） */
function redisDel(key) {
  return new Promise((resolve) => {
    let raw = "", settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (e) { /* ignore */ }
      resolve(raw.trim());
    };
    const sock = net.createConnection({ host: "127.0.0.1", port: 6379 });
    sock.on("connect", () => sock.write(
      "*2\r\n$3\r\nDEL\r\n$" + Buffer.byteLength(key) + "\r\n" + key + "\r\n"));
    sock.on("data", (d) => { raw += d.toString("latin1"); if (/\r\n/.test(raw)) finish(); });
    sock.on("error", finish);
    setTimeout(finish, 2000);
  });
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
const post = (p, d, t) => req(p, { method: "POST", body: d === undefined ? undefined : JSON.stringify(d) }, t);
const put = (p, d, t) => req(p, { method: "PUT", body: JSON.stringify(d) }, t);
const del = (p, t) => req(p, { method: "DELETE" }, t);

async function login(phone) {
  await req("/user/code?phone=" + phone, { method: "POST" });
  const c = await get("/user/code/dev?phone=" + phone);
  const l = await post("/user/login", { phone: phone, code: c.body.data });
  return l.body.data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");

/** 读 A 的积分/等级/粉丝/关注 */
async function stats(token, userId) {
  const r = await get("/user/info/" + userId, token);
  const d = r.body.data || {};
  return { credits: d.credits || 0, level: d.level || 0, fans: d.fans || 0, followee: d.followee || 0 };
}
/** 读一篇笔记的评论数 */
async function commentsOf(blogId, token) {
  return ((await get("/blog/" + blogId, token)).body.data || {}).comments || 0;
}

(async () => {
  const tokenA = await login(newPhone());
  const tokenB = await login(newPhone());
  const meA = (await get("/user/me", tokenA)).body.data;
  const meB = (await get("/user/me", tokenB)).body.data;
  console.log(`A=${meA.id}  B=${meB.id}\n`);

  /* ================================================== ① 评论数回写 */
  console.log("=== ① 发表评论回写 tb_blog.comments ===");

  // 基线要在"发帖"之前取：发帖本身就会 +10 积分
  const sBase = await stats(tokenA, meA.id);
  const blogId = (await post("/blog", {
    shopId: 1, title: "P0 用例笔记", content: "验证评论数", images: "/imgs/blogs/blog1.jpg"
  }, tokenA)).body.data;
  // 发帖的 +10 必须**立刻**断言：再往下 ① 段还有评论加减，
  // 到 ② 段再回头比就不只差 10 了（上一版就是这么写错的）
  const afterBlog = await stats(tokenA, meA.id);
  ok("发帖 +10 积分", afterBlog.credits === sBase.credits + 10,
     [sBase.credits, afterBlog.credits]);
  const c0 = await commentsOf(blogId, tokenA);
  ok("新笔记的评论数是 0", c0 === 0, c0);

  const c1 = (await post("/blog-comments", { blogId, content: "第一条" }, tokenB)).body.data;
  ok("B 评论后评论数变成 1", await commentsOf(blogId, tokenA) === 1, await commentsOf(blogId, tokenA));
  const c2 = (await post("/blog-comments", { blogId, content: "第二条" }, tokenB)).body.data;
  ok("B 再评论一条变成 2", await commentsOf(blogId, tokenA) === 2, await commentsOf(blogId, tokenA));
  await post("/blog-comments", { blogId, content: "A 自己评的" }, tokenA);
  ok("自己评论也算数（只是不给积分）", await commentsOf(blogId, tokenA) === 3,
     await commentsOf(blogId, tokenA));
  await del("/blog-comments/" + c1, tokenB);
  ok("删掉一条变回 2", await commentsOf(blogId, tokenA) === 2, await commentsOf(blogId, tokenA));
  ok("越权删除（A 删 B 的）没影响计数",
     (await del("/blog-comments/" + c2, tokenA)).body.errorMsg === "评论不存在" &&
     await commentsOf(blogId, tokenA) === 2, await commentsOf(blogId, tokenA));

  /* ================================================== ② 积分 / 等级 */
  console.log("\n=== ② credits / level 不再永远是 0 ===");

  // 「没有资料行」这个状态只能用**全新的用户**去看 ——
  // A 现在已经有积分了，拿它断言"初始为 0"是拿脏数据当基线
  const tokenC = await login(newPhone());
  const meC = (await get("/user/me", tokenC)).body.data;
  const fresh = await stats(tokenC, meC.id);
  ok("全新用户：还没有 tb_user_info 行", fresh.credits === 0, fresh);
  ok("全新用户等级是 1（不是 0 —— 0 积分和 1 级必须是同一个意思）",
     fresh.level === 1, fresh.level);
  ok("全新用户粉丝/关注都是 0", fresh.fans === 0 && fresh.followee === 0, fresh);
  // 往后全用"相对上一个值"的写法，重跑也不会因为绝对值对不上而误报
  let cur = (await stats(tokenA, meA.id)).credits;
  await post("/user/sign", undefined, tokenA);
  let nxt = (await stats(tokenA, meA.id)).credits;
  ok("签到 +5 积分", nxt === cur + 5, [cur, nxt]);
  cur = nxt;

  await redisDel("blog:liked:" + blogId);
  await put("/blog/like/" + blogId, null, tokenB);
  nxt = (await stats(tokenA, meA.id)).credits;
  ok("笔记被赞 +1", nxt === cur + 1, [cur, nxt]);
  cur = nxt;

  await put("/blog/like/" + blogId, null, tokenA);
  nxt = (await stats(tokenA, meA.id)).credits;
  ok("自己赞自己不给分", nxt === cur, [cur, nxt]);

  await post("/blog-comments", { blogId, content: "再评论一条" }, tokenB);
  nxt = (await stats(tokenA, meA.id)).credits;
  ok("笔记被评论 +2", nxt === cur + 2, [cur, nxt]);
  cur = nxt;

  // 把之前 B 那两条评论删掉（-2 -2），再取消赞（-1）
  await del("/blog-comments/" + c2, tokenB);
  await put("/blog/like/" + blogId, null, tokenB);
  nxt = (await stats(tokenA, meA.id)).credits;
  ok("删评论 -2、取消赞 -1（来回刷不出分）", nxt === cur - 3, [cur, nxt]);
  ok("积分不会被减成负数", nxt >= 0, nxt);

  // 自己评论自己不加积分：3 条里 A 自己那条是 +0
  const selfBefore = (await stats(tokenA, meA.id)).credits;
  await post("/blog-comments", { blogId, content: "A 再自己评" }, tokenA);
  ok("自己评论自己不加积分", (await stats(tokenA, meA.id)).credits === selfBefore,
     [(await stats(tokenA, meA.id)).credits, selfBefore]);

  /* ================================================== ② fans / followee */
  console.log("\n=== ② fans / followee 现算，不再是 0 ===");

  ok("一开始 A 的粉丝数是 0", (await stats(tokenA, meA.id)).fans === 0);
  await put("/follow/" + meA.id + "/true", null, tokenB);
  const fa = await stats(tokenA, meA.id);
  const fb = await stats(tokenB, meB.id);
  ok("B 关注 A 之后，A 的粉丝 +1", fa.fans === 1, fa);
  ok("A 的关注数仍然是 0", fa.followee === 0, fa);
  ok("B 的关注数是 1", fb.followee === 1, fb);
  ok("B 的粉丝数是 0", fb.fans === 0, fb);
  await put("/follow/" + meA.id + "/false", null, tokenB);
  ok("取关之后 A 的粉丝数回到 0（不是停在 1）",
     (await stats(tokenA, meA.id)).fans === 0, (await stats(tokenA, meA.id)).fans);
  ok("取关之后 B 的关注数回到 0",
     (await stats(tokenB, meB.id)).followee === 0, (await stats(tokenB, meB.id)).followee);

  /* ================================================== ③ 越权收口 */
  console.log("\n=== ③ 门店 / 发券写接口收口 ===");

  const shop1before = (await get("/shop/1")).body.data;
  ok("门店写接口默认关闭：POST /shop 被拒",
     (await post("/shop", { name: "越权新建的店", area: "测试" }, tokenB)).body.errorMsg ===
     "门店维护功能暂未开放");
  ok("PUT /shop 也被拒",
     (await put("/shop", { id: 1, name: "我改了别人的店" }, tokenB)).body.errorMsg ===
     "门店维护功能暂未开放");
  const shop1after = (await get("/shop/1")).body.data;
  ok("1 号店的名字真的没被改", shop1after.name === shop1before.name,
     [shop1before.name, shop1after.name]);

  ok("POST /voucher 被拒",
     (await post("/voucher", { shopId: 1, name: "白拿的券", type: 1,
                                payValue: 100, actualValue: 200 }, tokenB)).body.errorMsg
       === "发券功能暂未开放（管理端还没做）");
  ok("POST /voucher/seckill 被拒",
     (await post("/voucher/seckill", { shopId: 1, name: "白拿的秒杀券", type: 1,
                                       payValue: 100, actualValue: 200,
                                       stock: 100 }, tokenB)).body.errorMsg
       === "发券功能暂未开放（管理端还没做）");

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
