/* ============================================================================
 *  「我的资料 / 评论区 / 消息中心」三个页面的 UI 端到端。
 *
 *  和 social_smoke.js 的分工：那个打接口验规则，这个挂页面验**页面真的接上了**：
 *  表单有没有回填、保存有没有真的发出去、评论发完列表有没有多一条、
 *  消息 tab 能不能过滤、点"全部已读"小红点会不会消失。
 *
 *  跑法（**需要 h2 profile 的后端**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     $NODE _qa/social_ui_test.js
 * ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");
const net = require("net");

const ROOT = process.env.XHW_ROOT || "http://127.0.0.1:8085";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else {
    fail++;
    console.log("  FAIL " + what + (extra !== undefined ? "   → " + JSON.stringify(extra) : ""));
  }
}

/* 裸 RESP 删 key：点赞是"切换"，而点赞名单在 Redis 里不随后端重启清空，
   不先清掉的话重跑时"点赞"会变成"取消"（详见 social_smoke.js 的同名注释） */
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

async function api(path, method, body, token) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.authorization = token;
  const r = await fetch(ROOT + "/api" + path, {
    method: method || "GET",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return r.json();
}
async function login(phone) {
  await api("/user/code?phone=" + phone, "POST");
  const c = await api("/user/code/dev?phone=" + phone);
  return (await api("/user/login", "POST", { phone, code: c.data })).data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");

async function open(path, token) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented: navigation/.test(e.message)) errs.push("jsdomError: " + e.message);
  });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  vc.on("warn", (...a) => {
    const s = a.join(" ");
    if (s.indexOf("[tk-icon]") !== -1) errs.push("console.warn: " + s);
  });
  vc.on("log", () => {});
  vc.on("info", () => {});
  const dom = await JSDOM.fromURL(ROOT + path, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      if (token) win.sessionStorage.setItem("token", token);
    }
  });
  await sleep(4200);
  return { dom, errs };
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const toast = (doc) => [...doc.querySelectorAll(".toast")].map(txt).join(" | ");
function setInput(win, el, v) {
  el.value = v;
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

(async () => {
  /* ---------------------------------------------------- 准备数据 */
  const tokenA = await login(newPhone());
  const tokenB = await login(newPhone());
  const A = (await api("/user/me", "GET", undefined, tokenA)).data;
  const B = (await api("/user/me", "GET", undefined, tokenB)).data;

  const blogId = (await api("/blog", "POST", {
    shopId: 1, title: "UI 用例用笔记", content: "造的数据", images: "/imgs/blogs/blog1.jpg"
  }, tokenA)).data;
  // B 跟 A 产生三类互动，让消息页有东西可看
  await redisDel("blog:liked:" + blogId);
  await api("/blog/like/" + blogId, "PUT", undefined, tokenB);
  await api("/follow/" + A.id + "/true", "PUT", undefined, tokenB);
  await api("/blog-comments", "POST", { blogId, content: "UI 用例的评论" }, tokenB);
  console.log(`A=${A.id}  B=${B.id}  笔记=${blogId}\n`);

  /* ============================================== 1. 我的资料页 */
  console.log("=== 1. 我的资料 ===");
  let { dom, errs } = await open("/info-edit.html", tokenA);
  let win = dom.window, doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  const inputs = [...doc.querySelectorAll(".inp")];
  ok("昵称输入框回填了当前昵称", inputs[0].value === A.nickName, inputs[0].value);
  ok("页面标题是「我的资料」", txt(doc.querySelector(".hd__t")) === "我的资料");
  ok("性别有三个选项（男/女/保密）",
     [...doc.querySelectorAll(".chip")].map(txt).join("/") === "男/女/保密",
     [...doc.querySelectorAll(".chip")].map(txt));
  ok("性别一开始是「保密」（新用户没填过）",
     [...doc.querySelectorAll(".chip")].filter((c) => c.className.indexOf("on") !== -1).map(txt)[0] === "保密");
  ok("生日是 date 输入框", doc.querySelector('input[type="date"]') !== null);
  ok("城市那行显示「去选择」", txt(doc.querySelector(".row__v")).indexOf("去选择") !== -1,
     txt(doc.querySelector(".row__v")));
  ok("有头像上传入口（隐藏的 file input）", doc.querySelector('input[type="file"]') !== null);

  // 空昵称：拦在本地，不发请求
  setInput(win, inputs[0], "   ");
  doc.querySelector(".hd__btn--txt").click();
  await sleep(500);
  ok("昵称清空后保存被本地拦住", toast(doc).indexOf("昵称不能为空") !== -1, toast(doc));

  // 真的改一次：昵称 + 性别 + 城市 + 生日 + 简介
  const newNick = "UI改过的昵称";
  setInput(win, inputs[0], newNick);
  [...doc.querySelectorAll(".chip")].filter((c) => txt(c) === "女")[0].click();
  await sleep(150);
  ok("点「女」之后该项高亮",
     [...doc.querySelectorAll(".chip")].filter((c) => c.className.indexOf("on") !== -1).map(txt)[0] === "女");

  doc.querySelector(".row--link").click();
  await sleep(300);
  ok("城市选择器打开了", doc.querySelectorAll(".rg").length === 1);
  const cols = [...doc.querySelectorAll(".rg__col")];
  const c1 = [...cols[0].querySelectorAll(".rg__it")].filter((x) => txt(x).indexOf("四川省") === 0)[0];
  c1.click(); await sleep(120);
  const c2 = [...cols[1].querySelectorAll(".rg__it")].filter((x) => txt(x).indexOf("成都") === 0)[0];
  c2.click(); await sleep(120);
  doc.querySelector(".rg__ok").click();
  await sleep(300);
  ok("城市回填成「成都」", txt(doc.querySelector(".row__v")) === "成都", txt(doc.querySelector(".row__v")));

  setInput(win, doc.querySelector('input[type="date"]'), "1995-08-16");
  await sleep(120);
  doc.querySelector(".hd__btn--txt").click();
  await sleep(2500);
  ok("保存成功提示", toast(doc).indexOf("已保存") !== -1, toast(doc));

  // 服务端回读：三个字段都要落到库里，而且昵称要走 Redis 那份登录态
  const meNow = (await api("/user/me", "GET", undefined, tokenA)).data;
  ok("昵称真的改了（Redis 登录态也刷了）", meNow.nickName === newNick, meNow.nickName);
  const infoNow = (await api("/user/info/" + A.id, "GET", undefined, tokenA)).data || {};
  ok("性别存成 true（女）", infoNow.gender === true, infoNow.gender);
  ok("城市存成成都", infoNow.city === "成都", infoNow.city);
  ok("生日存下来了", infoNow.birthday === "1995-08-16", infoNow.birthday);
  ok("页面上的昵称也跟着变了", txt(doc.querySelector(".prof__nm")) === newNick,
     txt(doc.querySelector(".prof__nm")));
  dom.window.close();

  /* ============================================== 2. 评论区 */
  console.log("\n=== 2. 笔记详情 · 评论 ===");
  ({ dom, errs } = await open("/blog-detail.html?id=" + blogId, tokenA));
  win = dom.window; doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("评论区在", !!doc.querySelector("#comments"));
  ok("标题写着「评论」", txt(doc.querySelector("#comments .sec__t")) === "评论",
     txt(doc.querySelector("#comments .sec__t")));
  const cmts = () => [...doc.querySelectorAll(".cmt")];
  ok("渲染出 B 的那条评论", cmts().length === 1, cmts().length);
  ok("评论里是评论人昵称 + 正文",
     txt(cmts()[0]).indexOf(B.nickName) !== -1 && txt(cmts()[0]).indexOf("UI 用例的评论") !== -1,
     txt(cmts()[0]));
  ok("A 看不到删除按钮（不是自己发的）", !cmts()[0].querySelector(".cmt__del"));

  // A 发一条
  setInput(win, doc.querySelector(".cmt-box__ta"), "A 也来说一句");
  await sleep(150);
  ok("有内容时发送按钮可用", doc.querySelector(".cmt-box__f .btn").disabled === false);
  doc.querySelector(".cmt-box__f .btn").click();
  await sleep(2500);
  ok("发送后提示", toast(doc).indexOf("评论已发出") !== -1, toast(doc));
  ok("列表多了一条", cmts().length === 2, cmts().length);
  ok("输入框被清空", doc.querySelector(".cmt-box__ta").value === "");
  const mine = cmts().filter((c) => c.querySelector(".cmt__del"));
  ok("自己发的那条才有删除按钮", mine.length === 1, mine.length);

  // 删自己的（走确认抽屉）
  mine[0].querySelector(".cmt__del").click();
  await sleep(400);
  ok("弹出了删除确认抽屉", !!doc.querySelector(".sheet"));
  [...doc.querySelectorAll(".sheet .btn")].filter((b) => txt(b) === "再想想")[0].click();
  await sleep(600);
  ok("点「再想想」没删", cmts().length === 2, cmts().length);
  cmts().filter((c) => c.querySelector(".cmt__del"))[0].querySelector(".cmt__del").click();
  await sleep(400);
  [...doc.querySelectorAll(".sheet .btn")].filter((b) => txt(b) === "删除")[0].click();
  await sleep(2500);
  ok("确认后删掉了", cmts().length === 1, cmts().length);
  ok("删的是自己那条，B 的还在",
     txt(cmts()[0]).indexOf("UI 用例的评论") !== -1, txt(cmts()[0]));

  ok("底部操作栏的评论数跟着变", txt(doc.querySelector(".bar .btn--bk:last-of-type")).indexOf("1") !== -1,
     txt(doc.querySelector(".bar")));
  dom.window.close();

  /* ============================================== 3. 消息中心 */
  console.log("\n=== 3. 消息中心 ===");
  ({ dom, errs } = await open("/message.html", tokenA));
  win = dom.window; doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  const msgs = () => [...doc.querySelectorAll(".msg")];
  ok("渲染出 3 条消息", msgs().length === 3, msgs().length);
  const types = msgs().map((m) => txt(m.querySelector(".atag"))).sort();
  ok("三类都在（赞/关注/评论）", types.join("/") === "关注/评论/赞", types);
  ok("每条都写了是谁干的", msgs().every((m) => txt(m).indexOf(B.nickName) !== -1),
     msgs().map((m) => txt(m).slice(0, 30)));
  ok("评论类消息带上了笔记标题和评论正文",
     msgs().some((m) => txt(m).indexOf("UI 用例用笔记") !== -1 && txt(m).indexOf("UI 用例的评论") !== -1),
     msgs().map((m) => txt(m)));
  ok("未读的带小红点", doc.querySelectorAll(".msg__dot").length === 3,
     doc.querySelectorAll(".msg__dot").length);
  ok("未读的卡片有左竖线", doc.querySelectorAll(".msg--new").length === 3);

  // tab 过滤
  const tabs = [...doc.querySelectorAll(".tabs__i")];
  ok("有四个 tab（全部/赞/关注/评论）", tabs.length === 4, tabs.length);
  tabs.filter((t) => txt(t).indexOf("关注") === 0)[0].click();
  await sleep(200);
  ok("点「关注」只剩 1 条", msgs().length === 1, msgs().length);
  ok("剩下的那条确实是关注类", txt(msgs()[0].querySelector(".atag")) === "关注");
  tabs.filter((t) => txt(t).indexOf("评论") === 0)[0].click();
  await sleep(200);
  ok("点「评论」只剩 1 条且是评论类", msgs().length === 1 &&
     txt(msgs()[0].querySelector(".atag")) === "评论", msgs().length);
  tabs[0].click();
  await sleep(200);
  ok("切回「全部」又是 3 条", msgs().length === 3, msgs().length);

  // 进这一页**不该**自动清除未读：右上角那个「全部已读」按钮就是靠这个状态才存在的
  ok("进消息页不会自动把未读清掉（否则「全部已读」就成了死按钮）",
     doc.querySelectorAll(".msg__dot").length === 3,
     doc.querySelectorAll(".msg__dot").length);
  ok("服务端的未读数也还是 3",
     (await api("/message/unread", "GET", undefined, tokenA)).data === 3);
  ok("右上角「全部已读」按钮在（因为 unread > 0）",
     !!doc.querySelector(".hd__btn--txt"), "没有 .hd__btn--txt");

  doc.querySelector(".hd__btn--txt").click();
  await sleep(1800);
  ok("点「全部已读」之后小红点消失",
     doc.querySelectorAll(".msg__dot").length === 0,
     doc.querySelectorAll(".msg__dot").length);
  ok("服务端的未读数归零",
     (await api("/message/unread", "GET", undefined, tokenA)).data === 0);
  ok("消息本身还在（只是已读，不是删了）", msgs().length === 3, msgs().length);
  ok("按钮自己也消失了（已经全是已读）", !doc.querySelector(".hd__btn--txt"));
  dom.window.close();

  /* ============================================== 4. 底导小红点 */
  console.log("\n=== 4. 底部导航的未读小红点 ===");
  // 底导的小红点取的是同一个未读数：先让它归零，再来一条新的，B 端行为才对得上
  await api("/blog-comments", "POST", { blogId, content: "再来一条" }, tokenB);
  ({ dom, errs } = await open("/index.html", tokenA));
  doc = dom.window.document;
  const dot = doc.querySelector(".tk-ft__dot");
  ok("首页底导的「消息」上有未读小红点", !!dot, "没有 .tk-ft__dot");
  ok("小红点上显示的是 1", dot && txt(dot) === "1", dot && txt(dot));
  dom.window.close();

  // 未登录时不能因为问未读数而被弹去登录页
  ({ dom, errs } = await open("/index.html", null));
  doc = dom.window.document;
  ok("未登录看首页不会被送去登录页（仍在首页）",
     !!doc.querySelector(".cats") && !/login\.html/.test(dom.window.location.href),
     dom.window.location.href);
  ok("未登录时没有小红点", !doc.querySelector(".tk-ft__dot"));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
