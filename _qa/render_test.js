/* ============================================================================
   前端渲染回归：用 jsdom 真挂载每个页面（脚本、样式、XHR 全走 nginx 8080），
   收集控制台异常，并断言关键 DOM 是否真的渲染出来。
   跑法（在 libs 目录下）：
     NODE_PATH=C:\Users\hongj\.workbuddy\binaries\node\workspace/node_modules \
     node render_test.js
   ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");
const net = require("net");
const amapStub = require("./_amap_stub");

/* 默认打用户正在跑的 nginx(8080)。
   需要验证「新后端 + 前端」的组合时，先起 _qa/static_proxy.js，
   然后 XHW_ROOT=http://127.0.0.1:8085 node _qa/render_test.js */
const ROOT = process.env.XHW_ROOT || "http://127.0.0.1:8080";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 沙箱里 spawn 不出 redis-cli.exe（EBUSY），所以直接用 RESP 协议问 Redis。
   只用到 GET，解析 bulk string 就够了。 */
function redisGet(key) {
  return new Promise((resolve) => {
    let raw = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (e) { /* ignore */ }
      resolve(parseBulk(raw));
    };
    const sock = net.createConnection({ host: "127.0.0.1", port: 6379 });
    sock.on("connect", () => {
      sock.write("*2\r\n$3\r\nGET\r\n$" + Buffer.byteLength(key) + "\r\n" + key + "\r\n");
    });
    sock.on("data", (d) => {
      raw += d.toString("latin1");
      const m = /^\$(-?\d+)\r\n/.exec(raw);
      if (m) {
        if (m[1] === "-1") return finish();
        const need = m[0].length + Number(m[1]) + 2;
        if (raw.length >= need) return finish();
      }
    });
    sock.on("error", finish);
    setTimeout(finish, 2500);
  });
}

function parseBulk(s) {
  const m = /^\$(\d+)\r\n/.exec(s);
  if (!m) return "";
  return s.slice(m[0].length, m[0].length + Number(m[1]));
}

/* ------------------------------------------------------------------ 登录 */
async function getToken() {
  const phone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const codeRes = await fetch(`${ROOT}/api/user/code?phone=${phone}`, { method: "POST" });
  const codeJson = await codeRes.json();
  if (!codeJson.success) throw new Error("发验证码失败: " + codeJson.errorMsg);

  const code = await redisGet("login:code:" + phone);
  if (!code) throw new Error("Redis 里没拿到验证码");

  const loginRes = await fetch(`${ROOT}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code })
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success) throw new Error("登录失败: " + loginJson.errorMsg);
  return { token: loginJson.data, phone };
}

/* -------------------------------------------------------------- 单页渲染 */
async function render(label, path, token, expect) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errs.push("jsdomError: " + e.message));
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  // 图标名写错只会在 ui.js 里 warn 一下，不报错但图标是空的，所以当成失败
  vc.on("warn", (...a) => {
    const s = a.join(" ");
    if (s.indexOf("[tk-icon]") !== -1) errs.push("console.warn: " + s);
  });
  vc.on("log", () => {});
  vc.on("info", () => {});

  let dom;
  const started = Date.now();
  try {
    dom = await JSDOM.fromURL(ROOT + path, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(win) {
        if (token) win.sessionStorage.setItem("token", token);
        // 地图页会按需注入高德脚本（995 KB）。jsdom 里既跑不起来、
        // 又会把测试拖住，所以塞一个替身：页面见到 window.AMap 就不再请求外网。
        amapStub.install(win);
      }
    });
  } catch (e) {
    return { label, path, ok: false, errs: ["加载失败: " + e.message], checks: [] };
  }

  await sleep(4200);

  const doc = dom.window.document;
  const app = doc.getElementById("app");
  const text = (app ? app.textContent : "").replace(/\s+/g, " ").trim();
  const html = app ? app.innerHTML : "";

  const checks = [];
  (expect.text || []).forEach((t) => {
    checks.push({ what: `文本含 "${t}"`, pass: text.indexOf(t) !== -1 });
  });
  (expect.selector || []).forEach((s) => {
    const n = doc.querySelectorAll(s).length;
    checks.push({ what: `存在 ${s} (${n} 个)`, pass: n > 0 });
  });

  const ok = checks.every((c) => c.pass) &&
             errs.filter((e) => !/Not implemented: navigation/.test(e)).length === 0 &&
             html.length > 80;

  dom.window.close();
  return { label, path, ok, errs, checks, ms: Date.now() - started,
           excerpt: text.slice(0, 130) };
}

/* ------------------------------------------------------------------ 主流程 */
(async () => {
  console.log("=== 1. 走完整登录流程拿 token ===");
  const { token, phone } = await getToken();
  console.log("登录成功  手机号 " + phone + "  token " + token.slice(0, 12) + "…\n");

  const cases = [
    { label: "首页", path: "/index.html",
      expect: { text: ["达人探店", "小红碗"], selector: [".cats .cat", ".note"] } },

    { label: "店铺列表", path: "/shop-list.html?type=1&name=" + encodeURIComponent("美食"),
      expect: { text: ["美食", "人均"], selector: [".sortbar", ".shop", ".shop__no"] } },

    /* .gal__nav 是轮播的左右翻页按钮（只有多于一张图时才渲染）；
       这里只守"渲染出来了"，能不能翻由 gallery_ui_test.js 验。 */
    { label: "店铺详情", path: "/shop-detail.html?id=1",
      expect: { text: ["代金券", "剩余"],
                selector: [".tkt", ".tkt__punch", ".tkt__stub", ".gal",
                           ".gal__nav--prev", ".gal__nav--next"] } },

    /* 注意：GET /blog/{id} 在拦截器里没放行（只放行了 /blog/hot），
       后端契约就是"看笔记详情要登录"，所以这条用例必须带 token。 */
    { label: "笔记详情（需登录）", path: "/blog-detail.html?id=4", token: true,
      expect: { text: ["探店笔记", "点赞的人"], selector: [".prose", ".bar", ".gal"] } },

    /* 未登录时不该闪空页面，而是给出"要登录"的明确说明 */
    { label: "笔记详情（未登录）", path: "/blog-detail.html?id=4",
      expect: { text: ["登录后才能看这篇笔记"], selector: [".empty"] } },

    { label: "登录页", path: "/login.html",
      expect: { text: ["小红碗", "获取验证码"], selector: [".chk", ".note-box"] } },

    { label: "旧密码登录页", path: "/login2.html",
      expect: { text: ["这里没有密码登录"], selector: [".empty"] } },

    /* 地图页：地图能不能起来取决于有没有配高德 key（js/config.js），
       所以这里只断言"外壳 + 门店列表"这些**与 key 无关**的部分一定在；
       地图本身（标记、fitBounds、定位）由 _qa/map_test.js 用高德替身覆盖。 */
    { label: "地图找店", path: "/map.html",
      expect: { text: ["地图找店", "全国门店"],
                selector: [".mp", ".mp__cv", ".shop"] } },

    /* 我的订单：这里只守"外壳一定在"——有没有订单取决于该账号买过券没有，
       列表本身由 order_ui_test.js 验（那边会先下单再打开页面）。 */
    { label: "我的订单（需登录）", path: "/order.html", token: true,
      expect: { text: ["我的订单", "全部", "待支付"], selector: [".tabs", ".tabs__i"] } },

    /* 消息中心：这里只守"外壳一定在"。
       消息列表依赖**当前账号有没有被点赞/关注/评论过**，用别的账号打开时
       就是空状态，所以不能断言 .msg —— 那些由 social_ui_test.js 验
       （那边会先造出互动数据再看列表、tab 过滤、未读清零）。 */
    { label: "消息中心", path: "/message.html",
      expect: { text: ["消息", "全部", "评论"],
                selector: [".tabs", ".tabs__i"] } },

    { label: "我的（需登录）", path: "/info.html", token: true,
      expect: { text: ["签到", "我的笔记", "连续"], selector: [".punch__c", ".stats", ".tabs__i"] } },

    { label: "我的资料（需登录）", path: "/info-edit.html", token: true,
      expect: { text: ["我的资料", "昵称", "个人简介", "保存"],
                selector: [".prof", ".inp", ".txa", ".chip"] } },

    { label: "发笔记（需登录）", path: "/blog-edit.html", token: true,
      expect: { text: ["发笔记", "关联商户"], selector: [".upl__btn", ".txa"] } },

    { label: "TA 的主页（需登录）", path: "/other-info.html?id=2", token: true,
      expect: { text: ["TA 的笔记", "共同关注"], selector: [".prof", ".stats", ".tabs__i"] } },

    /* 后端的 /user/{id} 等接口要登录，未登录时给明确说明而不是假壳 */
    { label: "TA 的主页（未登录）", path: "/other-info.html?id=2",
      expect: { text: ["登录后才能查看"], selector: [".empty"] } },

    /* 地址簿两个页面都要登录。用新 token 进去地址簿是空的 ——
       正好顺带验一次空状态（首次跑 api_smoke / address_ui_test 建出来的用户不算，
       每次登录都是随机手机号，所以这里稳定是空）。 */
    { label: "地址簿（需登录）", path: "/address.html", token: true,
      expect: { text: ["我的地址", "门店地址", "地址簿还是空的"],
                selector: [".tabs", ".empty"] } },

    { label: "新增地址（需登录）", path: "/address-edit.html", token: true,
      expect: { text: ["新增地址", "收货人", "详细地址"],
                selector: [".inp", ".txa", ".chips .chip"] } }
  ];

  const results = [];
  for (const c of cases) {
    const r = await render(c.label, c.path, c.token ? token : null, c.expect);
    results.push(r);
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${r.label}  ${r.path}  (${r.ms}ms)`);
    if (!r.ok) {
      r.checks.filter((x) => !x.pass).forEach((x) => console.log("       未通过: " + x.what));
      r.errs.filter((e) => !/Not implemented: navigation/.test(e))
            .slice(0, 6).forEach((e) => console.log("       报错: " + e.slice(0, 200)));
      if (r.excerpt) console.log("       实际文本: " + r.excerpt);
    }
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== 合计 ${pass}/${results.length} 通过 ===`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => {
  console.error("测试脚本自身出错: " + e.stack);
  process.exit(2);
});
