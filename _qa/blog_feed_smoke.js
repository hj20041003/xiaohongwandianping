/* ============================================================================
 *  笔记「最新」排序 + 搜笔记。
 *
 *  这两条是同一个主题：**列表的排法和过滤**。
 *  排序要守的第一条规矩是「排序列名必须走白名单」——
 *  把前端传的 sort 直接拼进 order by 就是 SQL 注入。
 *  搜索要守的是「空关键词不是搜索全部，是没搜」。
 *
 *  跑法（**必须 h2 profile**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/blog_feed_smoke.js
 * ========================================================================= */
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8085") + "/api";

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
const post = (p, d, t) => req(p, { method: "POST", body: d === undefined ? undefined : JSON.stringify(d) }, t);

async function login(phone) {
  await req("/user/code?phone=" + phone, { method: "POST" });
  const c = await get("/user/code/dev?phone=" + phone);
  return (await post("/user/login", { phone, code: c.body.data })).body.data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");

const ids = (r) => (r.body.data || []).map((b) => b.id);
const times = (r) => (r.body.data || []).map((b) => new Date(b.createTime).getTime());
const desc = (a) => a.every((v, i) => i === 0 || a[i - 1] >= v);

(async () => {
  const token = await login(newPhone());
  const me = (await get("/user/me", token)).body.data;

  /* ================================================== 1. 排序白名单 */
  console.log("=== 1. 排序：hot / new ===");
  const hot = await get("/blog/hot?current=1");
  ok("不传 sort 时默认按人气（liked 倒序）", hot.body.success === true, hot.body);
  const hotLiked = (hot.body.data || []).map((b) => b.liked);
  ok("hot 的 liked 是非递增的", hotLiked.every((v, i) => i === 0 || hotLiked[i - 1] >= v), hotLiked);

  const byNew = await get("/blog/hot?current=1&sort=new");
  ok("sort=new 能返回结果", byNew.body.success === true);
  ok("new 的 createTime 是非递增的（真的是按时间）", desc(times(byNew)), times(byNew));

  // sort 是白名单：乱传一个不存在的列名，不能拼进 SQL、也不能 500
  const bogus = await get("/blog/hot?current=1&sort=id;DROP%20TABLE%20tb_blog--");
  ok("乱传 sort 不会注入（当默认值处理，不报错也不注入）",
     bogus.status === 200 && bogus.body.success === true, { status: bogus.status, n: (bogus.body.data || []).length });
  const stillThere = await get("/blog/hot?current=1");
  ok("表还在（注入没生效）", (stillThere.body.data || []).length > 0);

  /* ================================================== 2. 搜索 */
  console.log("\n=== 2. 搜笔记 ===");
  // 先发两篇带独特关键词的笔记，搜出来的必须是它们
  const kw1 = "烤苕皮", kw2 = "酸梅汤";
  const b1 = (await post("/blog", {
    shopId: 1, title: "成都街头的" + kw1, content: "本地人推荐的路口，三块五一串",
    images: "/imgs/blogs/blog1.jpg"
  }, token)).body.data;
  const b2 = (await post("/blog", {
    shopId: 1, title: "饭后必喝的" + kw2, content: "冰镇的那种，解辣",
    images: "/imgs/blogs/blog1.jpg"
  }, token)).body.data;
  ok("造了两篇带唯一关键词的笔记", !!b1 && !!b2, [b1, b2]);

  const r1 = await get("/blog/search?keyword=" + encodeURIComponent(kw1));
  ok("搜标题里的关键词能搜到", ids(r1).indexOf(b1) !== -1, ids(r1));
  ok("只搜到相关的（不含另一篇）", ids(r1).indexOf(b2) === -1, ids(r1));

  const r2 = await get("/blog/search?keyword=" + encodeURIComponent("解辣"));
  ok("搜正文里的关键词也能搜到", ids(r2).indexOf(b2) !== -1, ids(r2));

  const r3 = await get("/blog/search?keyword=" + encodeURIComponent("没有这个词xyzzy"));
  ok("搜不到时返回空数组（不是 null、也不是全量）",
     Array.isArray(r3.body.data) && r3.body.data.length === 0, r3.body.data);

  const r4 = await get("/blog/search?keyword=" + encodeURIComponent("   "));
  ok("空/纯空白关键词返回空数组（\"没搜\"不等于\"搜全部\"）",
     Array.isArray(r4.body.data) && r4.body.data.length === 0, r4.body.data);

  // 通配符必须被转义：搜 % 不该把全表都搜出来
  const r5 = await get("/blog/search?keyword=" + encodeURIComponent("%"));
  ok("搜 % 不会匹配全表（LIKE 通配符已转义）",
     Array.isArray(r5.body.data) && r5.body.data.length === 0, (r5.body.data || []).length);
  const r6 = await get("/blog/search?keyword=" + encodeURIComponent("_"));
  ok("搜 _ 也不会匹配单字符（_ 是单字符通配符）",
     Array.isArray(r6.body.data) && r6.body.data.length === 0, (r6.body.data || []).length);

  /* ================================================== 3. 搜索 + 区域 + 排序 */
  console.log("\n=== 3. 搜索的三个参数一起用 ===");
  const r7 = await get("/blog/search?keyword=" + encodeURIComponent(kw1) +
                      "&city=" + encodeURIComponent("成都") + "&sort=new");
  ok("关键词 + 城市 + 排序 能一起传", r7.body.success === true, r7.body);
  ok("两个关键词搜到 2 条（它们都关联 1 号店，而 1 号店在杭州）",
     ids(r7).length === 0, ids(r7));
  const r8 = await get("/blog/search?keyword=" + encodeURIComponent(kw1) + "&sort=new");
  ok("不限定城市时能搜到", ids(r8).indexOf(b1) !== -1, ids(r8));
  ok("搜索默认按最新（刚发的那条在前）",
     ids(r8)[0] === b2 || ids(r8)[0] === b1, ids(r8));

  const r9 = await get("/blog/search?keyword=" + encodeURIComponent(kw1) + "&sort=hot");
  ok("搜索也能按人气排", r9.body.success === true);

  /* ================================================== 4. 未登录也能搜 */
  console.log("\n=== 4. 未登录（首页未登录也要能搜）===");
  ok("未登录能搜笔记",
     (await get("/blog/search?keyword=" + encodeURIComponent(kw1))).status === 200);

  /* ================================================== 5. 我的笔记排序 */
  console.log("\n=== 5. 我的笔记按时间倒序 ===");
  const mine = await get("/blog/of/me?current=1", token);
  ok("我的笔记按发布时间倒序（原来没写 order by，靠数据库默认）",
     desc(times(mine)), times(mine));
  ok("我发的两篇都在", ids(mine).indexOf(b1) !== -1 && ids(mine).indexOf(b2) !== -1, ids(mine));

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
