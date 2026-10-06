/* ============================================================================
 *  轮播的左右翻页按钮。
 *
 *  要验的不只是"按钮画出来了"，而是**真的能翻**：
 *    - 第一张时「上一张」置灰、最后一张时「下一张」置灰
 *    - 点「下一张」-> 圆点跟着走、计数变成 2 / 3
 *    - 置灰的按钮点不动（不是点了没反应却还显示可点）
 *
 *  jsdom 里没有真实的滚动（Element.scrollTo 不完整），所以 tk-gallery.jump()
 *  是"先改 cur 再发滚动"——状态立刻变，滚动只是视觉效果。
 *  这样交互在 jsdom 里就完全可断言了。
 *
 *  跑法：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     $NODE _qa/gallery_ui_test.js
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

async function open(path, token) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented: navigation/.test(e.message)) errs.push("jsdomError: " + e.message);
  });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  // tk-icon 找不到图标名会 warn —— 这是本项目最容易犯的错，必须当失败
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

(async () => {
  /* ================================================= 1. 店铺详情页 */
  console.log("=== 1. 店铺详情页的轮播 ===");
  // 38 号店（银记肠粉店·文昌北路店）有 3 张图
  let { dom, errs } = await open("/shop-detail.html?id=38");
  let doc = dom.window.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));

  const prev = doc.querySelector(".gal__nav--prev");
  const next = doc.querySelector(".gal__nav--next");
  ok("有「上一张」按钮", !!prev);
  ok("有「下一张」按钮", !!next);
  ok("两个按钮都有 aria-label（无障碍）",
     prev && prev.getAttribute("aria-label") === "上一张" &&
     next && next.getAttribute("aria-label") === "下一张",
     [prev && prev.getAttribute("aria-label"), next && next.getAttribute("aria-label")]);
  ok("按钮里是图标不是文字（图标名 back / right 存在）",
     prev && prev.querySelector("svg") && next && next.querySelector("svg"));

  const dots = () => [...doc.querySelectorAll(".gal__dot")];
  const onIdx = () => dots().findIndex((d) => d.className.indexOf("on") !== -1);
  const counter = () => txt(doc.querySelector(".gal__n"));

  ok("有 3 个圆点", dots().length === 3, dots().length);
  ok("初始在第 1 张（圆点 + 计数）", onIdx() === 0 && counter() === "1 / 3",
     [onIdx(), counter()]);
  ok("第 1 张时「上一张」置灰", prev.disabled === true, prev.disabled);
  ok("第 1 张时「下一张」可点", next.disabled === false, next.disabled);

  /* ---- 往下翻 ---- */
  next.click();
  await sleep(250);
  ok("点「下一张」到第 2 张", onIdx() === 1 && counter() === "2 / 3", [onIdx(), counter()]);
  ok("第 2 张时两个按钮都可点", prev.disabled === false && next.disabled === false,
     [prev.disabled, next.disabled]);

  next.click();
  await sleep(250);
  ok("再点一次到第 3 张", onIdx() === 2 && counter() === "3 / 3", [onIdx(), counter()]);
  ok("最后一张时「下一张」置灰", next.disabled === true, next.disabled);

  /* ---- 置灰之后点不动 ---- */
  next.click();
  await sleep(200);
  ok("置灰的「下一张」点了没有反应（还停在第 3 张）",
     onIdx() === 2 && counter() === "3 / 3", [onIdx(), counter()]);

  /* ---- 往回翻 ---- */
  prev.click();
  await sleep(250);
  ok("点「上一张」回到第 2 张", onIdx() === 1 && counter() === "2 / 3", [onIdx(), counter()]);

  /* ---- 点圆点仍然可用（原有功能没被破坏）---- */
  dots()[0].click();
  await sleep(250);
  ok("点第 1 个圆点能跳回去", onIdx() === 0 && counter() === "1 / 3", [onIdx(), counter()]);

  ok("翻完之后仍无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));

  /* ================================================= 2. 笔记详情页也用了同一个组件 */
  console.log("\n=== 2. 笔记详情页（同一个组件）===");
  dom.window.close();
  // 笔记详情要登录，拿个 token
  const api = async (p) => {
    const init = { method: "GET", headers: {} };
    const r = await fetch(ROOT + "/api" + p);
    return r.json();
  };
  const phone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  await fetch(ROOT + "/api/user/code?phone=" + phone, { method: "POST" });
  const code = (await api("/user/code/dev?phone=" + phone)).data;
  const lr = await fetch(ROOT + "/api/user/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone, code: code })
  });
  const token = (await lr.json()).data;
  const blogId = (await api("/blog/hot")).data[0].id;

  ({ dom, errs } = await open("/blog-detail.html?id=" + blogId, token));
  doc = dom.window.document;
  ok("笔记详情页也有左右按钮", !!doc.querySelector(".gal__nav--next"),
     !!doc.querySelector(".gal__nav"));
  ok("无控制台报错（图标名没写错）", errs.length === 0, errs.slice(0, 2).join(" | "));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
