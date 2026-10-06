/* ============================================================================
 *  「我的资料 + 评论 + 消息」三个新模块的接口烟测。
 *
 *  为什么单独一个脚本：这三块全是**新写**的（原来资料只有读接口、
 *  BlogCommentsController 是个空壳、消息完全不存在），而它们之间是有依赖的：
 *  消息的三类来源里有两类要**先产生互动**（点赞、评论）才有数据。
 *  所以用例必须按"A 发笔记 → B 点赞/关注/评论 → A 查消息"这条链走，
 *  顺序不能打乱。
 *
 *  跑法（**必须 h2 profile**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/social_smoke.js
 * ========================================================================= */
const net = require("net");
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8080") + "/api";

/* 直接问 Redis 删一个 key（裸 RESP，沙箱里 spawn redis-cli 会 EBUSY）。
   为什么测试需要这个：`PUT /blog/like` 是**切换**（点一次赞、再点一次取消），
   而点赞名单存在 Redis 里 —— **Redis 不随后端重启重置，H2 会**。
   于是重跑本脚本时：新笔记的 id 和上一轮撞上（H2 自增从头来），
   而 blog:liked:{id} 里还留着上一轮的成员 → B 的"点赞"被当成"取消"，
   成员被删掉，消息也就没了。清一下才谈得上"可重复跑"。 */
function redisDel(key) {
  return new Promise((resolve) => {
    let raw = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (e) { /* ignore */ }
      resolve(raw.trim());
    };
    const sock = net.createConnection({ host: "127.0.0.1", port: 6379 });
    sock.on("connect", () => {
      sock.write("*2\r\n$3\r\nDEL\r\n$" + Buffer.byteLength(key) + "\r\n" + key + "\r\n");
    });
    sock.on("data", (d) => { raw += d.toString("latin1"); if (/\r\n/.test(raw)) finish(); });
    sock.on("error", finish);
    setTimeout(finish, 2000);
  });
}

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
const put = (p, d, t) => req(p, { method: "PUT", body: JSON.stringify(d) }, t);
const del = (p, t) => req(p, { method: "DELETE" }, t);

/* 用开发取码接口登录，不碰 Redis */
async function login(phone) {
  await req("/user/code?phone=" + phone, { method: "POST" });
  const c = await get("/user/code/dev?phone=" + phone);
  if (!c.body.success) throw new Error("取码失败: " + c.body.errorMsg);
  const l = await post("/user/login", { phone: phone, code: c.body.data });
  if (!l.body.success) throw new Error("登录失败: " + l.body.errorMsg);
  return l.body.data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");

(async () => {
  const tokenA = await login(newPhone());
  const tokenB = await login(newPhone());
  const meA = (await get("/user/me", tokenA)).body.data;
  const meB = (await get("/user/me", tokenB)).body.data;
  console.log(`A = ${meA.id}(${meA.nickName})   B = ${meB.id}(${meB.nickName})\n`);

  /* ================================================== 1. 我的资料 */
  console.log("=== 1. 我的资料 ===");

  // 昵称/头像在 tb_user 上，改完之后**必须**同步刷掉 Redis 里的登录态缓存，
  // 否则 GET /user/me 返回的还是旧昵称 —— 这条断言就是在守这件事
  const nick = "改过名字的人";
  ok("改昵称成功", (await put("/user/me", { nickName: nick }, tokenA)).body.success === true);
  ok("回读 /user/me 拿到的是新昵称（Redis 里的登录态也刷了）",
     (await get("/user/me", tokenA)).body.data.nickName === nick,
     (await get("/user/me", tokenA)).body.data.nickName);

  ok("昵称留空被拒", (await put("/user/me", { nickName: "   " }, tokenA)).body.errorMsg === "昵称不能为空");
  ok("昵称超 32 字被拒",
     (await put("/user/me", { nickName: "字".repeat(33) }, tokenA)).body.errorMsg === "昵称最多 32 个字");
  ok("昵称不会因为一次失败被写坏",
     (await get("/user/me", tokenA)).body.data.nickName === nick);

  ok("改资料成功", (await put("/user/info", {
    city: "成都", gender: true, birthday: "1998-05-20", introduce: "爱吃辣"
  }, tokenA)).body.success === true);
  let infoA = (await get("/user/info/" + meA.id, tokenA)).body.data || {};
  ok("城市存下来了", infoA.city === "成都", infoA.city);
  ok("性别存下来了（true = 女）", infoA.gender === true, infoA.gender);
  ok("生日存下来了", infoA.birthday === "1998-05-20", infoA.birthday);
  ok("简介存下来了", infoA.introduce === "爱吃辣", infoA.introduce);

  ok("性别改成 false（男）能存下来，和「没填」分得开",
     (await put("/user/info", { gender: false }, tokenA)).body.success === true &&
     (await get("/user/info/" + meA.id, tokenA)).body.data.gender === false);
  // 复原，后面还要用
  await put("/user/info", { city: "成都", gender: true, birthday: "1998-05-20", introduce: "爱吃辣" }, tokenA);

  ok("城市填一个区划里没有的被拒",
     (await put("/user/info", { city: "火星省火星市" }, tokenA)).body.errorMsg === "这个城市不在区划数据里");
  ok("城市留空是允许的（清空城市）", (await put("/user/info", { city: "" }, tokenA)).body.success === true);
  await put("/user/info", { city: "成都" }, tokenA);

  ok("生日填未来被拒",
     (await put("/user/info", { birthday: "2099-01-01" }, tokenA)).body.errorMsg === "生日不能是未来的日期");
  ok("生日早于 1900 被拒",
     (await put("/user/info", { birthday: "1800-01-01" }, tokenA)).body.errorMsg === "生日早于 1900 年");
  ok("简介超 128 字被拒",
     (await put("/user/info", { introduce: "字".repeat(129) }, tokenA)).body.errorMsg === "个人简介最多 128 个字");

  // 伪造 userId：实体上带着这个字段，前端可以塞别人的进来
  await put("/user/info", { userId: meB.id, city: "上海", introduce: "我改的是别人" }, tokenA);
  const infoB = (await get("/user/info/" + meB.id, tokenB)).body.data || {};
  ok("伪造 userId 无效：改不到别人头上", infoB.city !== "上海", infoB.city);
  ok("自己的资料倒是被改了", ((await get("/user/info/" + meA.id, tokenA)).body.data || {}).city === "上海");

  ok("未登录改不了资料", (await put("/user/me", { nickName: "x" })).status === 401);

  /* ================================================== 2. 评论 */
  console.log("\n=== 2. 评论 ===");

  // A 发一篇笔记（评论要挂在笔记上）
  const blogRes = await post("/blog", {
    shopId: 1, title: "烟测用笔记", content: "这条是用例造的，跑完重启后端就没了", images: "/imgs/blogs/blog1.jpg"
  }, tokenA);
  ok("A 发出了一篇笔记", blogRes.body.success === true, blogRes.body);
  const blogId = blogRes.body.data;

  ok("评论列表一开始是空的",
     ((await get("/blog-comments/" + blogId, tokenA)).body.data || []).length === 0);

  const addRes = await post("/blog-comments", { blogId: blogId, content: "  沙发  " }, tokenB);
  ok("B 发表评论成功并返回 id", addRes.body.success && addRes.body.data, addRes.body);
  const cmtId = addRes.body.data;

  let list = (await get("/blog-comments/" + blogId, tokenA)).body.data || [];
  ok("A 能看到这条评论", list.length === 1, list.length);
  ok("评论人昵称填上了（不是只有 userId）", list[0].userName === meB.nickName, list[0].userName);
  ok("前后空格被 trim 了", list[0].content === "沙发", list[0].content);
  ok("A 看这条评论 mine=false（不是自己发的）", list[0].mine === false);
  ok("B 看同一条 mine=true",
     ((await get("/blog-comments/" + blogId, tokenB)).body.data || [])[0].mine === true);

  ok("空内容被拒",
     (await post("/blog-comments", { blogId: blogId, content: "   " }, tokenB)).body.errorMsg === "评论内容不能为空");
  ok("超 200 字被拒",
     (await post("/blog-comments", { blogId: blogId, content: "字".repeat(201) }, tokenB))
       .body.errorMsg === "评论最多 200 个字");
  ok("往不存在的笔记上评论被拒",
     (await post("/blog-comments", { blogId: 999999, content: "x" }, tokenB))
       .body.errorMsg === "这篇笔记不存在");
  ok("缺少 blogId 被拒",
     (await post("/blog-comments", { content: "x" }, tokenB)).body.errorMsg === "缺少笔记 id");

  ok("A 删不掉 B 的评论（越权）",
     (await del("/blog-comments/" + cmtId, tokenA)).body.errorMsg === "评论不存在");
  ok("越权删除之后评论还在",
     ((await get("/blog-comments/" + blogId, tokenA)).body.data || []).length === 1);

  /* ================================================== 3. 消息 */
  console.log("\n=== 3. 消息 ===");

  // 到这一步为止：B 评论过 A 的笔记了
  let msgs = (await get("/message/list", tokenA)).body.data || {};
  ok("A 收到了 B 的评论消息",
     (msgs.list || []).some((m) => m.type === "comment" && m.fromUserId === meB.id),
     msgs.list);
  ok("评论消息带上了笔记标题和评论正文",
     (msgs.list || []).some((m) => m.type === "comment" && m.blogTitle === "烟测用笔记" && m.content === "沙发"));
  ok("评论消息的发送者昵称填上了",
     (msgs.list || []).filter((m) => m.type === "comment")[0].fromName === meB.nickName);

  // B 点赞 A 的笔记。
  // 先清掉这个笔记的点赞名单：见上面 redisDel 的注释 —— 不清的话，
  // 重跑时这条"点赞"会变成"取消"，后面所有关于 like 消息的断言都会莫名其妙地挂。
  await redisDel("blog:liked:" + blogId);
  ok("B 点赞 A 的笔记成功", (await put("/blog/like/" + blogId, null, tokenB)).body.success === true);
  // B 关注 A
  ok("B 关注 A 成功", (await put("/follow/" + meA.id + "/true", null, tokenB)).body.success === true);

  msgs = (await get("/message/list", tokenA)).body.data || {};
  const types = (msgs.list || []).map((m) => m.type);
  ok("三类消息都到齐了（like / follow / comment）",
     types.indexOf("like") !== -1 && types.indexOf("follow") !== -1 && types.indexOf("comment") !== -1,
     types);
  ok("总数对得上（3 条）", msgs.total === 3, msgs.total);
  ok("按时间倒序（最新的在最前）",
     new Date(msgs.list[0].createTime).getTime() >=
     new Date(msgs.list[msgs.list.length - 1].createTime).getTime(), msgs.list.map((m) => m.createTime));
  ok("未读数是 3", msgs.unread === 3, msgs.unread);
  ok("/message/unread 单独问也是 3", (await get("/message/unread", tokenA)).body.data === 3);

  ok("A 自己赞自己的笔记不会给自己发消息",
     (await put("/blog/like/" + blogId, null, tokenA)).body.success === true &&
     ((await get("/message/list", tokenA)).body.data || {}).total === 3,
     ((await get("/message/list", tokenA)).body.data || {}).total);

  ok("标记已读成功", (await post("/message/read", undefined, tokenA)).body.success === true);
  ok("标记后未读归零", (await get("/message/unread", tokenA)).body.data === 0);
  ok("标记后消息本身还在（不是删了）",
     ((await get("/message/list", tokenA)).body.data || {}).total === 3);
  ok("标记后每条都变成已读",
     ((await get("/message/list", tokenA)).body.data.list || []).every((m) => m.unread === false));

  ok("A 自己这边没有收到任何消息（没人跟他互动）",
     ((await get("/message/list", tokenB)).body.data || {}).total === 0,
     ((await get("/message/list", tokenB)).body.data || {}).total);

  // 未登录：底导的小红点会在每个页面问一次，必须拿到 0 而不是 401
  const anon = await get("/message/unread");
  ok("未登录问未读数返回 0 而不是 401（否则首页会被送进登录页）",
     anon.status === 200 && anon.body.data === 0, { status: anon.status, body: anon.body });
  ok("未登录看不了消息列表", (await get("/message/list")).status === 401);

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
