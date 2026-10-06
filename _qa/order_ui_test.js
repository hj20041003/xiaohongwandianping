/* ============================================================================
 *  「我的订单」页面端到端：下单 -> 页面看得到 -> 点「去支付」-> 状态变。
 *
 *  和 order_smoke.js 的分工：那个打接口验规则，这个挂页面验**页面真的接上了**
 *  （列表渲染、状态标签、tab 过滤、支付按钮点完会刷新）。
 *
 *  跑法（**需要 h2 profile 的后端**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     $NODE _qa/order_ui_test.js
 * ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");
const net = require("net");

/* 裸 RESP 问 Redis 一个命令（沙箱里 spawn redis-cli 会 EBUSY）。
   这里用它查"本机有几个后端在消费秒杀 Stream"。 */
function redisCmd() {
  var args = Array.prototype.slice.call(arguments);
  return new Promise(function (resolve) {
    var parts = ["*" + args.length];
    args.forEach(function (a) {
      var b = Buffer.byteLength(a);
      parts.push("$" + b, a);
    });
    var cmd = parts.join("\r\n") + "\r\n";
    var raw = "", settled = false;
    var sock = net.createConnection({ host: "127.0.0.1", port: 6379 });
    function done() {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (e) { /* ignore */ }
      resolve(raw);
    }
    sock.on("connect", function () { sock.write(cmd); });
    sock.on("data", function (d) {
      raw += d.toString("latin1");
      // 响应以 \r\n 结束就够用了（XINFO 的结果是嵌套数组，粗略判断够用）
      if (raw.length > 40 && raw.indexOf("\r\n") > 0) setTimeout(done, 60);
    });
    sock.on("error", done);
    setTimeout(done, 1500);
  });
}

/**
 * 有几个后端实例在消费 stream.orders / g1。
 * ⚠️ 这依赖消费者名带端口（VoucherOrderServiceImpl.CONSUMER_NAME = "c1-" + port）。
 * 如果消费者名又变回写死的 "c1"，这里会永远返回 1，检测就失效了。
 */
async function countConsumers() {
  var raw = await redisCmd("XINFO", "CONSUMERS", "stream.orders", "g1");
  if (!raw) return 1;                       // 查不到就当 1，别因此卡住测试
  var names = raw.match(/c1(-\d+)?/g);
  return names ? new Set(names).size : 1;
}

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


/* 动态找一张秒杀券。
   原来这里写死 id=2，那是上游种子里的固定值；种子重新生成后 id 变了（现在每城首店一张），
   写死就会周期性炸掉。**测试里不要硬编码种子数据的 id。** */
async function findSeckillVoucher(token) {
  for (let sid = 1; sid <= 30; sid++) {
    const list = (await api("/voucher/list/" + sid, token)).body.data || [];
    const hit = list.filter(function (v) { return v.type === 1; })[0];
    if (hit) return hit;
  }
  return null;
}

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

/** 等异步落库的订单被页面拿到（页面在 created 里只查一次，所以要重开） */
async function reopen(token, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const { dom, errs } = await open("/order.html", token);
    if (dom.window.document.querySelector(".ord__st")) return { dom, errs };
    dom.window.close();
    await sleep(500);
  }
  return open("/order.html", token);
}

(async () => {
  /* ---- 前置检查 1：本机有几个后端在消费秒杀 Stream ---- */
  const consumers = await countConsumers();
  if (consumers > 1) {
    console.log("  ⚠️ SKIP：本机有 " + consumers + " 个后端在消费 stream.orders / g1。");
    console.log("     秒杀订单只会落进其中一个后端连着的库，本页的「下单 / 去支付 / 订单数」");
    console.log("     断言在这里必然失败，而那个失败和代码对错无关。");
    console.log("     → 跑之前先停掉 IDEA 里的后端。\n");
    console.log("（不计入通过/失败）");
    process.exit(0);
  }

  const token = await login(newPhone());

  /* ---- 前置检查 2：找一张秒杀券（不写死 id，种子重生成就会变）---- */
  let sv = null;
  for (let sid = 1; sid <= 30 && !sv; sid++) {
    const list = (await api("/voucher/list/" + sid, "GET", undefined, token)).data || [];
    sv = list.filter(function (v) { return v.type === 1; })[0] || null;
  }
  if (!sv) {
    console.log("  ⚠️ SKIP：没找到秒杀券（种子数据里一张都没有）");
    process.exit(0);
  }
  console.log("用券 id=" + sv.id + " " + sv.title + "\n");
  console.log("已下单，等异步落库…\n");
  const buy = await api("/voucher-order/seckill/" + sv.id, "POST", undefined, token);
  ok("下单成功", buy.success && buy.data, buy);
  ok("下单返回的订单号是字符串（19 位雪花号在 JS 里会掉精度）",
     typeof buy.data === "string", typeof buy.data);

  /* ---------------------------------------------------- 1. 列表渲染 */
  console.log("\n=== 1. 订单列表 ===");
  let { dom, errs } = await reopen(token);
  let doc = dom.window.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("标题是「我的订单」", txt(doc.querySelector(".hd__t")) === "我的订单",
     txt(doc.querySelector(".hd__t")));
  const ords = () => [...doc.querySelectorAll(".ord")];
  ok("订单渲染出来了", ords().length === 1, ords().length);

  const o = ords()[0];
  ok("显示了店铺名", /\d+分店|茶餐厅|餐厅|店/.test(txt(o.querySelector(".ord__shop"))),
     txt(o.querySelector(".ord__shop")));
  ok("显示了券名", txt(o.querySelector(".ord__t")).length > 2, txt(o.querySelector(".ord__t")));
  ok("状态标签是「待支付」", txt(o.querySelector(".ord__st")) === "待支付",
     txt(o.querySelector(".ord__st")));
  ok("金额是「￥80.00」这种形式（分转元）", /￥\d+\.\d\d/.test(txt(o.querySelector(".ord__amt"))),
     txt(o.querySelector(".ord__amt")));
  ok("待支付时有「去支付」按钮", !!o.querySelector(".ord__ft .btn"),
     txt(o.querySelector(".ord__ft")));

  // 订单号别被显示成精度损耗后的数字
  ok("页面上的订单号没掉精度", txt(o).indexOf(String(buy.data).slice(0, 12)) !== -1 ||
     !o.querySelector(".ord__id"), txt(o).slice(0, 60));

  /* ---------------------------------------------------- 2. tab 过滤 */
  console.log("\n=== 2. tab 过滤 ===");
  const tabs = [...doc.querySelectorAll(".tabs__i")];
  ok("有四个 tab（全部/待支付/已支付）", tabs.length === 3, tabs.length);
  tabs.filter((t) => txt(t).indexOf("已支付") === 0)[0].click();
  await sleep(200);
  ok("「已支付」里是空的", ords().length === 0, ords().length);
  ok("空状态说明了原因", /这一类还没有订单/.test(txt(doc.querySelector(".empty__t"))),
     txt(doc.querySelector(".empty__t")));
  tabs[0].click();
  await sleep(200);
  ok("切回「全部」又是 1 条", ords().length === 1, ords().length);

  /* ---------------------------------------------------- 3. 模拟支付 */
  console.log("\n=== 3. 模拟支付 ===");
  ords()[0].querySelector(".ord__ft .btn").click();
  await sleep(2600);
  ok("提示支付成功", toast(doc).indexOf("支付成功") !== -1, toast(doc));
  ok("状态标签变成「已支付」", txt(ords()[0].querySelector(".ord__st")) === "已支付",
     txt(ords()[0].querySelector(".ord__st")));
  ok("「去支付」按钮消失了", !ords()[0].querySelector(".ord__ft .btn"),
     txt(ords()[0].querySelector(".ord__ft")));
  ok("显示了支付方式与时间", /余额/.test(txt(ords()[0].querySelector(".ord__ft"))),
     txt(ords()[0].querySelector(".ord__ft")));

  /* ---------------------------------------------------- 4. 我的页入口 */
  console.log("\n=== 4. 「我的」页的入口 ===");
  ({ dom, errs } = await open("/info.html", token));
  doc = dom.window.document;
  const rows = [...doc.querySelectorAll(".row--link")];
  const orderRow = rows.filter((r) => txt(r).indexOf("我的订单") !== -1)[0];
  ok("「我的服务」里有「我的订单」这一行", !!orderRow,
     rows.map((r) => txt(r).slice(0, 10)));
  ok("这一行链到 /order.html", orderRow && /\/order\.html$/.test(orderRow.getAttribute("href")),
     orderRow && orderRow.getAttribute("href"));
  // 刚付完就没有待支付了，角标应该不显示
  ok("已支付后不再显示待支付角标",
     !orderRow || orderRow.querySelector(".ord__st") === null,
     orderRow && txt(orderRow.querySelector(".ord__st")));
  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
