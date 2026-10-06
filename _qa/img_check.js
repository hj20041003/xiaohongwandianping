/* 渲染每个页面，收集所有 <img src> 和 CSS background-image，
   再逐个走 nginx 请求，报告非 200 的资源。破图是图片站最显眼的缺陷。 */
const { JSDOM, VirtualConsole } = require("jsdom");
const net = require("net");

/* 默认打用户正在跑的 nginx(8080)。
   需要验证「新后端 + 前端」的组合时，先起 _qa/static_proxy.js，
   然后 XHW_ROOT=http://127.0.0.1:8085 node _qa/img_check.js */
const ROOT = process.env.XHW_ROOT || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function redisGet(key) {
  return new Promise((resolve) => {
    let raw = "", settled = false;
    const finish = () => {
      if (settled) return; settled = true;
      try { sock.destroy(); } catch (e) {}
      const m = /^\$(\d+)\r\n/.exec(raw);
      resolve(m ? raw.slice(m[0].length, m[0].length + Number(m[1])) : "");
    };
    const sock = net.createConnection({ host: "127.0.0.1", port: 6379 });
    sock.on("connect", () => sock.write(
      "*2\r\n$3\r\nGET\r\n$" + Buffer.byteLength(key) + "\r\n" + key + "\r\n"));
    sock.on("data", (d) => {
      raw += d.toString("latin1");
      const m = /^\$(-?\d+)\r\n/.exec(raw);
      if (m) {
        if (m[1] === "-1") return finish();
        if (raw.length >= m[0].length + Number(m[1]) + 2) return finish();
      }
    });
    sock.on("error", finish);
    setTimeout(finish, 2500);
  });
}

async function getToken() {
  const phone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  await fetch(`${ROOT}/api/user/code?phone=${phone}`, { method: "POST" });
  const code = await redisGet("login:code:" + phone);
  const r = await fetch(`${ROOT}/api/user/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code })
  });
  return (await r.json()).data;
}

const PAGES = [
  ["首页", "/index.html", 0],
  ["店铺列表", "/shop-list.html?type=1&name=%E7%BE%8E%E9%A3%9F", 0],
  ["店铺详情", "/shop-detail.html?id=1", 0],
  ["笔记详情", "/blog-detail.html?id=4", 1],
  ["我的", "/info.html", 1],
  ["我的资料", "/info-edit.html", 1],
  ["发笔记", "/blog-edit.html", 1],
  ["TA 的主页", "/other-info.html?id=2", 0],
  ["登录", "/login.html", 0]
];

(async () => {
  const token = await getToken();
  const all = new Map();          // src -> [来源页面]
  const perPage = [];

  for (const [label, path, needToken] of PAGES) {
    const vc = new VirtualConsole();   // 静音
    let dom;
    try {
      dom = await JSDOM.fromURL(ROOT + path, {
        runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
        virtualConsole: vc,
        beforeParse(w) { if (needToken) w.sessionStorage.setItem("token", token); }
      });
    } catch (e) { perPage.push([label, path, -1]); continue; }

    await sleep(4200);

    const doc = dom.window.document;
    const srcs = new Set();
    doc.querySelectorAll("img").forEach((im) => {
      const s = im.getAttribute("src");
      if (s && !s.startsWith("data:")) srcs.add(s);
    });
    // <a href> 指向的本地页面也顺带验一下
    const hrefs = new Set();
    doc.querySelectorAll("a[href^='/']").forEach((a) => {
      const h = a.getAttribute("href");
      if (h && h.endsWith(".html")) hrefs.add(h);
    });

    perPage.push([label, path, srcs.size]);
    srcs.forEach((s) => {
      const full = s.startsWith("http") ? s : ROOT + (s.startsWith("/") ? s : "/" + s);
      if (!all.has(full)) all.set(full, []);
      all.get(full).push(label);
    });
    hrefs.forEach((h) => {
      const full = ROOT + h;
      if (!all.has(full)) all.set(full, []);
      all.get(full).push(label + "(链接)");
    });

    dom.window.close();
  }

  console.log("=== 每页收集到的图片数 ===");
  perPage.forEach(([l, p, n]) => console.log(`  ${l.padEnd(10)} ${String(n).padStart(3)} 张   ${p}`));

  console.log(`\n=== 逐项请求 ${all.size} 个本地资源 ===`);
  const bad = [];
  for (const [url, from] of all) {
    let status = 0;
    try {
      const r = await fetch(url, { method: "GET" });
      status = r.status;
    } catch (e) { status = -1; }
    if (status !== 200) bad.push([url, status, [...new Set(from)].join(",")]);
  }

  if (bad.length) {
    console.log(`发现 ${bad.length} 个异常资源：`);
    bad.forEach(([u, s, f]) => console.log(`  [${s}] ${u}   <- ${f}`));
  } else {
    console.log("全部 200，无破图、无死链");
  }
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e.stack); process.exit(2); });
