/* ============================================================================
 *  「我的订单」的端到端：下单 -> 异步落库 -> 查到 -> 模拟支付 -> 越权挡住。
 *
 *  这条链有个必须处理的特点：**下单是异步落库的**。
 *  POST /voucher-order/seckill/{id} 只做两件事 —— 跑 Lua（XADD 进 Stream + 扣库存）
 *  和返回 orderId；真正往 tb_voucher_order 插行的是后台的 Stream 消费者。
 *  所以下单后**立刻**查订单列表大概率是空的，脚本必须轮询等一会儿。
 *  这一点也写进了 order.html 的提示条里。
 *
 *  跑法（**必须 h2 profile**，会写库）：
 *     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082 --spring.profiles.active=h2
 *     $NODE _qa/static_proxy.js 8085 8082
 *     XHW_ROOT=http://127.0.0.1:8085 $NODE _qa/order_smoke.js
 * ========================================================================= */
const net = require("net");
const ROOT = (process.env.XHW_ROOT || "http://127.0.0.1:8080") + "/api";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


/* 裸 RESP 问 Redis 一个命令（沙箱里 spawn redis-cli 会 EBUSY）。
   这里用它查"本机有几个后端在消费秒杀 Stream" —— 见下面 countConsumers 的说明。 */
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
      if (raw.length > 40 && raw.indexOf("\r\n") > 0) setTimeout(done, 60);
    });
    sock.on("error", done);
    setTimeout(done, 1500);
  });
}

/**
 * 有几个后端实例在消费 stream.orders / g1。
 * 秒杀是「XADD -> 消费者异步落库」：本机同时跑两个后端而各连各的库时，
 * 消息只会落到其中一个库，表现为"下单成功但订单列表是空的"。
 * 依赖消费者名带端口（VoucherOrderServiceImpl.consumerName()）；
 * 还在跑的旧实例注册的名字是没有端口的 c1，所以两种形态都要数。
 */
async function countConsumers() {
  var raw = await redisCmd("XINFO", "CONSUMERS", "stream.orders", "g1");
  if (!raw) return 1;
  var names = raw.match(/c1(-\d+)?/g);
  return names ? new Set(names).size : 1;
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

async function login(phone) {
  await req("/user/code?phone=" + phone, { method: "POST" });
  const c = await get("/user/code/dev?phone=" + phone);
  return (await post("/user/login", { phone, code: c.body.data })).body.data;
}
const newPhone = () => "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");


/* 动态找一张秒杀券。
   原来这里写死 id=2，那是上游种子里的固定值；种子重新生成后 id 变了（现在每城首店一张），
   写死就会周期性炸掉。**测试里不要硬编码种子数据的 id。** */
async function findSeckillVoucher(token) {
  for (let sid = 1; sid <= 30; sid++) {
    const list = (await get("/voucher/list/" + sid, token)).body.data || [];
    const hit = list.filter(function (v) { return v.type === 1; })[0];
    if (hit) return hit;
  }
  return null;
}

const myOrders = async (token) => (await get("/voucher-order/my", token)).body.data || [];

/** 轮询等订单出现（异步落库）。返回找到的订单或 null */
async function waitForOrder(token, orderId, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const list = await myOrders(token);
    // 按字符串比：订单号是 19 位雪花号，JS 的 Number 存不住（见下面那条断言）
    const hit = list.filter((o) => String(o.id) === String(orderId))[0];
    if (hit) return hit;
    await sleep(400);
  }
  return null;
}

(async () => {
  const tokenA = await login(newPhone());
  const tokenB = await login(newPhone());
  const meA = (await get("/user/me", tokenA)).body.data;
  const meB = (await get("/user/me", tokenB)).body.data;
  console.log(`A=${meA.id}  B=${meB.id}\n`);

  /* ================================================== 1. 下单 */
  console.log("=== 1. 秒杀下单 ===");

  /* ---- 前置检查：有没有别的后端在抢秒杀消息 ---- */
  const consumers = await countConsumers();
  if (consumers > 1) {
    console.log("  ⚠️ SKIP：本机有 " + consumers + " 个后端在消费 stream.orders / g1。");
    console.log("     秒杀是「XADD -> 消费者异步落库」，消息只会进到其中一个后端连着的库里，");
    console.log("     所以本脚本要断言的「下单后能查到订单」在这里**必然失败**，");
    console.log("     而那个失败和代码对错无关。");
    console.log("     → 跑之前先停掉 IDEA 里的后端，只留命令行这一个。");
    console.log();
    console.log("（不计入通过/失败：这次没有可验证的对象）");
    process.exit(0);
  }

  ok("新用户还没有订单", (await myOrders(tokenA)).length === 0);

  const sv = await findSeckillVoucher(tokenA);
  ok("能找到一个秒杀券（用来下单）", !!sv, sv);
  if (!sv) { console.log("没有秒杀券，跳过下单相关用例"); process.exit(1); }
  console.log("  用券 id=" + sv.id + " " + sv.title);
  const buy = await post("/voucher-order/seckill/" + sv.id, undefined, tokenA);
  ok("下单成功并返回订单 id（是字符串，避免 53 位精度问题）",
     buy.body.success && typeof buy.body.data === "string", buy.body);
  const orderId = buy.body.data;

  // 立刻查一次：多半还没有（异步落库），但记录一下这个事实
  const rightAfter = await myOrders(tokenA);
  console.log("  （下单后立刻查：" + rightAfter.length + " 条 —— 异步落库，通常是 0）");

  const order = await waitForOrder(tokenA, orderId);
  ok("稍等之后订单出现在列表里", !!order, order);
  if (!order) {
    console.log(`\n==================================================`);
    console.log(`通过 ${pass}，失败 ${fail}`);
    process.exit(1);
  }

  /* 这条是本脚本存在意义最大的一条：订单号必须当字符串走。
     它是 RedisIdWorker 生成的 19 位雪花号（6.4e17 量级），
     而 JS 的安全整数上限是 2^53 ≈ 9.007e15 —— 一旦按数字传，
     JSON.parse 就会四舍五入（实测 645599808689537028 → 645599808689537000），
     前端拿这个 id 去调支付接口只会得到"订单不存在或已支付"。 */
  ok("订单号是字符串而不是数字（19 位雪花号在 JS 里会掉精度）",
     typeof order.id === "string", typeof order.id + " / " + order.id);
  // 写死"19 位"是不行的（RedisIdWorker 的位数会随时间变长）。
  // 真正要守的性质是：**它超过了 JS 的安全整数上限**，所以必须当字符串走。
  ok("订单号超过 JS 的安全整数上限（所以只能当字符串传）",
     BigInt(String(order.id)) > BigInt(Number.MAX_SAFE_INTEGER),
     [order.id, String(Number.MAX_SAFE_INTEGER)]);
  ok("下单接口返回的订单号和列表里的是同一个（没经过精度损耗）",
     String(order.id) === String(orderId), [order.id, orderId]);
  if (!order) {
    console.log(`\n==================================================`);
    console.log(`通过 ${pass}，失败 ${fail}`);
    process.exit(1);
  }

  /* ================================================== 2. 字段齐不齐 */
  console.log("\n=== 2. 列表项字段 ===");
  ok("券名带上了", typeof order.voucherTitle === "string" && order.voucherTitle.length > 0, order.voucherTitle);
  ok("店名带上了（服务端 join 好的，不是让前端再查）",
     typeof order.shopName === "string" && order.shopName.length > 0, order.shopName);
  ok("带上了 shopId，能跳回店铺页", !!order.shopId, order.shopId);
  ok("实付金额是分（整数，前端自己换算）",
     Number.isInteger(order.payValue) && order.payValue > 0, order.payValue);
  ok("新订单是「待支付」", order.status === 1 && order.statusText === "待支付",
     [order.status, order.statusText]);
  ok("还没支付，所以 payTime 是空的", order.payTime === null || order.payTime === undefined,
     order.payTime);
  ok("下单时间有值", !!order.createTime, order.createTime);
  ok("前端能据此判断要不要显示「去支付」", order.payable === true, order.payable);

  /* ================================================== 3. 模拟支付 */
  console.log("\n=== 3. 模拟支付 ===");
  ok("支付成功", (await post("/voucher-order/" + orderId + "/pay", undefined, tokenA)).body.success === true);
  const paid = (await myOrders(tokenA)).filter((o) => String(o.id) === String(orderId))[0];
  ok("状态变成 2 已支付", paid.status === 2 && paid.statusText === "已支付",
     [paid.status, paid.statusText]);
  ok("payTime 被写上了", !!paid.payTime, paid.payTime);
  ok("支付方式有文案（1 = 余额）", paid.payTypeText === "余额", [paid.payType, paid.payTypeText]);
  ok("已支付的不再显示「去支付」", paid.payable === false, paid.payable);

  ok("重复支付被拒", (await post("/voucher-order/" + orderId + "/pay", undefined, tokenA))
       .body.errorMsg === "订单不存在或已支付");

  /* ================================================== 4. 越权与隔离 */
  console.log("\n=== 4. 越权与数据隔离 ===");
  ok("B 付不了 A 的订单（越权）",
     (await post("/voucher-order/" + orderId + "/pay", undefined, tokenB))
       .body.errorMsg === "订单不存在或已支付");
  ok("B 的订单列表是空的（不串号）", (await myOrders(tokenB)).length === 0,
     (await myOrders(tokenB)).length);
  ok("B 付一个不存在的订单也不行",
     (await post("/voucher-order/999999/pay", undefined, tokenB))
       .body.errorMsg === "订单不存在或已支付");

  /* ================================================== 5. 未登录 */
  console.log("\n=== 5. 未登录 ===");
  ok("未登录看不了订单列表", (await get("/voucher-order/my")).status === 401);
  ok("未登录付不了款", (await post("/voucher-order/" + orderId + "/pay")).status === 401);

  /* ================================================== 6. 重复下单 */
  console.log("\n=== 6. 同一张券不能重复买 ===");
  const again = await post("/voucher-order/seckill/" + sv.id, undefined, tokenA);
  ok("A 再抢同一张秒杀券被拒（禁止重复下单）",
     again.body.success === false && /重复下单/.test(again.body.errorMsg || ""), again.body);

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
