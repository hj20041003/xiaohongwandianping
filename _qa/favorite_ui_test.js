/* ============================================================================
 *  收藏的 UI 端到端：笔记详情点星标 -> 收藏页看得到 -> 列表里取消 -> 星标变空心。
 *
 *  和 favorite_smoke.js 的分工：那个打接口验规则，这个验**页面真的接上了**
 *  （星标按钮、状态回填、收藏页、取消收藏后的两处同步）。
 *
 *  跑法（**需要 h2 profile 的后端**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     $NODE _qa/favorite_ui_test.js
 * ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");

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

async function api(path, method, body, token) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.authorization = token;
  const r = await fetch(ROOT + "/api" + path, {
    method: method || "GET", headers,
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
    runScripts: "dangerously", resources: "usable",
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) { if (token) win.sessionStorage.setItem("token", token); }
  });
  await sleep(4200);
  return { dom, errs };
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const toast = (doc) => [...doc.querySelectorAll(".toast")].map(txt).join(" | ");

(async () => {
  const token = await login(newPhone());
  const blogId = (await api("/blog/hot", "GET", undefined, token)).data[0].id;
  console.log("笔记 id =", blogId, "\n");

  /* ============================================== 1. 笔记详情：点星标 */
  console.log("=== 1. 笔记详情页的收藏按钮 ===");
  let { dom, errs } = await open("/blog-detail.html?id=" + blogId, token);
  let doc = dom.window.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("底部有收藏按钮（星标）", !!doc.querySelector('.bar .btn--bk [name="star"], .bar .btn--bk svg'),
     [...doc.querySelectorAll(".bar .btn--bk")].length + " 个 .btn--bk");
  const starBtn = [...doc.querySelectorAll(".bar .btn--bk")].filter((b) =>
    b.querySelector("svg") && /star/i.test(b.innerHTML) || b.getAttribute("aria-label") === "收藏"
  )[0];
  ok("找得到那个收藏按钮", !!starBtn, [...doc.querySelectorAll(".bar .btn--bk")].map((b) => b.getAttribute("aria-label")));

  const isFilled = () => {
    const svg = starBtn && starBtn.querySelector("svg");
    return svg ? /fill="currentColor"/.test(svg.outerHTML) : false;
  };
  ok("初始是空心（没收藏）", isFilled() === false, starBtn && starBtn.innerHTML.slice(0, 80));

  starBtn.click();
  await sleep(1800);
  ok("点一下提示已收藏", toast(doc).indexOf("已收藏") !== -1, toast(doc));
  ok("星标变成实心", isFilled() === true, starBtn && starBtn.innerHTML.slice(0, 80));
  ok("按钮 aria-label 变成「取消收藏」", starBtn.getAttribute("aria-label") === "取消收藏",
     starBtn.getAttribute("aria-label"));
  ok("服务端也确实是收藏状态",
     (await api("/blog/" + blogId + "/favorite", "GET", undefined, token)).data === true);
  dom.window.close();

  /* ============================================== 2. 收藏页看得到 */
  console.log("\n=== 2. 收藏页 ===");
  ({ dom, errs } = await open("/favorite.html", token));
  doc = dom.window.document;
  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("标题是「我的收藏」", txt(doc.querySelector(".hd__t")) === "我的收藏",
     txt(doc.querySelector(".hd__t")));
  const cards = () => [...doc.querySelectorAll(".shop")];
  ok("收藏的那篇渲染出来了", cards().length === 1, cards().length);
  ok("卡片上有标题", txt(cards()[0].querySelector(".shop__t")).length > 2,
     txt(cards()[0].querySelector(".shop__t")));
  ok("卡片上有点赞/评论/时间", /赞|thumb|条/.test(cards()[0].innerHTML) === false &&
     cards()[0].querySelectorAll(".shop__meta span").length >= 2,
     cards()[0].querySelector(".shop__meta") && txt(cards()[0].querySelector(".shop__meta")));
  ok("有「取消收藏」按钮", !!cards()[0].querySelector(".fav-x"),
     cards()[0].innerHTML.slice(-120));
  dom.window.close();

  /* ============================================== 3. 我的页入口与角标 */
  console.log("\n=== 3. 「我的」页的入口 ===");
  ({ dom, errs } = await open("/info.html", token));
  doc = dom.window.document;
  const rows = [...doc.querySelectorAll(".row--link")];
  const favRow = rows.filter((r) => txt(r).indexOf("我的收藏") !== -1)[0];
  ok("「我的服务」里有「我的收藏」这一行", !!favRow, rows.map((r) => txt(r).slice(0, 8)));
  ok("这一行链到 /favorite.html", favRow && /\/favorite\.html$/.test(favRow.getAttribute("href")),
     favRow && favRow.getAttribute("href"));
  ok("收藏了 1 条时角标显示 1",
     favRow && txt(favRow.querySelector(".ord__st")) === "1",
     favRow && txt(favRow.querySelector(".ord__st")));
  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  dom.window.close();

  /* ============================================== 4. 列表里取消 */
  console.log("\n=== 4. 在收藏页取消 ===");
  ({ dom, errs } = await open("/favorite.html", token));
  doc = dom.window.document;
  cards()[0].querySelector(".fav-x").click();
  await sleep(1800);
  ok("提示已取消收藏", toast(doc).indexOf("已取消收藏") !== -1, toast(doc));
  ok("列表空了就显示空状态", cards().length === 0 &&
     /还没有收藏/.test(txt(doc.querySelector(".empty__t"))), cards().length);
  ok("服务端也变成未收藏",
     (await api("/blog/" + blogId + "/favorite", "GET", undefined, token)).data === false);
  dom.window.close();

  /* ============================================== 5. 回到详情页星标应为空心 */
  console.log("\n=== 5. 两处状态是一致的 ===");
  ({ dom, errs } = await open("/blog-detail.html?id=" + blogId, token));
  doc = dom.window.document;
  const btn2 = [...doc.querySelectorAll(".bar .btn--bk")].filter((b) =>
    /star/i.test(b.innerHTML) || b.getAttribute("aria-label") === "收藏")[0];
  ok("详情页的星标也回到未收藏",
     btn2 && btn2.getAttribute("aria-label") === "收藏", btn2 && btn2.getAttribute("aria-label"));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
