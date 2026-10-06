/* 接口烟测：把前端各页面真正会触发的请求逐条打一遍，
   确认重做前端后这些路径依然通。只看 success/形状，不改数据语义。 */
const net = require("net");

/* 默认打用户正在跑的 nginx(8080)。验证"新后端 + 前端"的组合时，
   先起 _qa/static_proxy.js，再 XHW_ROOT=http://127.0.0.1:8085 node _qa/api_smoke.js */
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8080") + "/api";
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

let pass = 0, fail = 0;
const fails = [];

/* 真的按 multipart/form-data 发一次，和浏览器 <input type=file> 一致 */
async function uploadImage(label, token) {
  const fd = new FormData();
  // 一个最小的合法 JPEG（含 FFD8 头），后端只看后缀、不看内容
  fd.append("file", new Blob([Buffer.from("ffd8ffe000104a4649460001", "hex")], { type: "image/jpeg" }),
            "probe.jpg");
  let status = 0, text = "";
  try {
    const r = await fetch(ROOT + "/upload/blog", {
      method: "POST", headers: token ? { authorization: token } : {}, body: fd
    });
    status = r.status; text = await r.text();
  } catch (e) { status = -1; text = e.message; }

  let ok = false, note = "HTTP " + status + " " + text.slice(0, 80);
  if (status === 200) {
    const j = JSON.parse(text);
    ok = j.success !== false;
    note = ok ? "返回相对路径 " + j.data : "errorMsg=" + j.errorMsg;
  }
  if (ok) { pass++; console.log(`  ok   ${label}\n         ${note}`); return JSON.parse(text).data; }
  fail++; fails.push(label); console.log(`  FAIL ${label}\n         ${note}`);
  return null;
}

async function call(label, method, path, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers["authorization"] = token;
  if (body && !raw) headers["Content-Type"] = "application/json";
  let status = 0, text = "";
  try {
    const r = await fetch(ROOT + path, {
      method, headers, body: body ? (raw ? body : JSON.stringify(body)) : undefined
    });
    status = r.status;
    text = await r.text();
  } catch (e) { status = -1; text = e.message; }

  let ok = status === 200, note = "";
  if (status === 200) {
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object" && "success" in j) {
        ok = j.success !== false;
        note = j.success ? JSON.stringify(j.data).slice(0, 90) : "errorMsg=" + j.errorMsg;
      } else {
        note = text.slice(0, 90);
      }
    } catch (e) { note = text.slice(0, 90); }
  } else { note = "HTTP " + status + " " + text.slice(0, 60); }

  if (ok) { pass++; console.log(`  ok   ${label}`); if (note) console.log(`         ${note}`); }
  else { fail++; fails.push(label); console.log(`  FAIL ${label}\n         ${note}`); }
  return text;
}

(async () => {
  console.log("=== 登录 ===");
  const phone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  await call("POST /user/code 发验证码", "POST", `/user/code?phone=${phone}`);
  const code = await redisGet("login:code:" + phone);
  const loginText = await call("POST /user/login 登录", "POST", "/user/login", { body: { phone, code } });
  const token = JSON.parse(loginText).data;
  const uid = JSON.parse(loginText).data ? null : null;

  console.log("\n=== 只读接口 ===");
  await call("GET /shop-type/list", "GET", "/shop-type/list");
  await call("GET /shop/1", "GET", "/shop/1");
  await call("GET /shop/of/name?name=茶", "GET", "/shop/of/name?name=" + encodeURIComponent("茶"));
  // 带坐标走 GEO 分支，这是之前 500 的那条
  await call("GET /shop/of/type?typeId=1&x=120.149&y=30.31", "GET", "/shop/of/type?typeId=1&current=1&x=120.149&y=30.31");
  await call("GET /voucher/list/1", "GET", "/voucher/list/1");
  await call("GET /blog/hot?current=1", "GET", "/blog/hot?current=1");
  await call("GET /user/me", "GET", "/user/me", { token });
  await call("GET /user/1", "GET", "/user/1", { token });
  await call("GET /user/info/1", "GET", "/user/info/1", { token });
  await call("GET /blog/4", "GET", "/blog/4", { token });
  await call("GET /blog/likes/4", "GET", "/blog/likes/4", { token });
  await call("GET /blog/of/me", "GET", "/blog/of/me", { token });
  await call("GET /blog/of/user?id=2", "GET", "/blog/of/user?id=2&current=1", { token });
  await call("GET /blog/of/follow 关注流", "GET", "/blog/of/follow?lastId=" + Date.now() + "&offset=0", { token });
  await call("GET /follow/common/1", "GET", "/follow/common/1", { token });
  await call("GET /follow/or/not/1", "GET", "/follow/or/not/1", { token });

  console.log("\n=== 签到 ===");
  await call("GET /user/sign/count 签到前", "GET", "/user/sign/count", { token });
  await call("POST /user/sign", "POST", "/user/sign", { token });
  await call("GET /user/sign/count 签到后", "GET", "/user/sign/count", { token });

  console.log("\n=== 关注 / 点赞 ===");
  await call("PUT /follow/1/true", "PUT", "/follow/1/true", { token });
  await call("GET /follow/or/not/1 关注后", "GET", "/follow/or/not/1", { token });
  await call("PUT /follow/1/false", "PUT", "/follow/1/false", { token });
  await call("PUT /blog/like/4", "PUT", "/blog/like/4", { token });
  await call("GET /blog/4 点赞后回读", "GET", "/blog/4", { token });
  await call("PUT /blog/like/4 再点一次取消", "PUT", "/blog/like/4", { token });

  console.log("\n=== 秒杀下单 ===");
  // 动态找一张秒杀券：写死 id 的话，重新生成种子就会炸
  let svId = null;
  for (let sid = 1; sid <= 30 && !svId; sid++) {
    const list = (await call("GET /voucher/list/" + sid + " 找秒杀券", "GET", "/voucher/list/" + sid)).data || [];
    const hit = list.filter((v) => v.type === 1)[0];
    if (hit) svId = hit.id;
  }
  if (svId) {
    const vo = await call("POST /voucher-order/seckill/" + svId, "POST", "/voucher-order/seckill/" + svId, { token });
    console.log("         券 " + svId + " -> 订单号 " + vo);
  } else {
    console.log("         没找到秒杀券，跳过下单");
  }

  console.log("\n=== 发笔记 ===");
  const fileName = await uploadImage("POST /upload/blog 上传图片（真 multipart）", token);
  const saveRes = await call("POST /blog 发笔记", "POST", "/blog", {
    token,
    body: {
      shopId: 1, title: "烟测笔记", content: "第一行<br/>第二行\n\n第三段",
      images: fileName ? "/imgs" + fileName : "/imgs/blogs/blog1.jpg", isLike: false
    }
  });

  const listAfter = await call("GET /blog/of/me 发出后回读", "GET", "/blog/of/me", { token });
  const mine = JSON.parse(listAfter).data || [];
  console.log(`         我的笔记 ${mine.length} 篇` + (mine[0] ? `，最新："${mine[0].title}" / images=${mine[0].images}` : ""));

  // 上传的图是 nginx 静态服务的，不走 /api 前缀，所以单独用绝对地址探一次
  if (mine[0] && mine[0].images) {
    let status = 0;
    try { status = (await fetch("http://127.0.0.1:8080" + mine[0].images)).status; } catch (e) { status = -1; }
    if (status === 200) { pass++; console.log(`  ok   图片可直接访问 ${mine[0].images}`); }
    else { fail++; fails.push("图片可直接访问"); console.log(`  FAIL 图片可直接访问 -> HTTP ${status}`); }
  }

  console.log("\n=== 清理刚上传的测试图 ===");
  if (fileName) {
    await call("GET /upload/blog/delete", "GET",
      "/upload/blog/delete?name=" + encodeURIComponent(fileName), { token });
  }

  console.log("\n" + "=".repeat(50));
  console.log(`通过 ${pass}，失败 ${fail}`);
  if (fails.length) console.log("失败项：" + fails.join("；"));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e.stack); process.exit(2); });
