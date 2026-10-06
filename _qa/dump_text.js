/* 把每个页面渲染后的可见文本 dump 出来，用于人工眼检内容质量。
   同时统计几个关键组件的实例数，确认不是空状态在冒充。 */
const { JSDOM, VirtualConsole } = require("jsdom");
const net = require("net");

const ROOT = "http://127.0.0.1:8080";
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
      if (m) { if (m[1] === "-1") return finish();
        if (raw.length >= m[0].length + Number(m[1]) + 2) return finish(); }
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
  ["登录", "/login.html", 0],
  ["login2", "/login2.html", 0],
  ["地图", "/map.html", 0],
  ["消息", "/message.html", 0]
];

const COUNT = [".tkt", ".gal__i", ".note", ".shop", ".cat", ".punch__c",
               ".tabs__i", ".stars__f", ".row", ".upl__btn", ".likes .av", ".empty"];

(async () => {
  const token = await getToken();
  for (const [label, path, needToken] of PAGES) {
    let dom;
    try {
      dom = await JSDOM.fromURL(ROOT + path, {
        runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
        virtualConsole: new VirtualConsole(),
        beforeParse(w) { if (needToken) w.sessionStorage.setItem("token", token); }
      });
    } catch (e) { console.log(`\n##### ${label} 加载失败 ${e.message}`); continue; }
    await sleep(4200);

    const doc = dom.window.document;
    const app = doc.getElementById("app");
    const text = (app ? app.textContent : "").replace(/\s+/g, " ").trim();

    const counts = COUNT.map((s) => `${s}=${doc.querySelectorAll(s).length}`).join(" ");

    console.log("\n" + "=".repeat(72));
    console.log(`##### ${label}   ${path}`);
    console.log(`组件实例：${counts}`);
    console.log("-".repeat(72));
    console.log(text.length > 900 ? text.slice(0, 900) + " …【截断，共 " + text.length + " 字】" : text);

    dom.window.close();
  }
})().catch((e) => { console.error(e.stack); process.exit(2); });
