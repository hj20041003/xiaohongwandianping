/* 临时验证：开发取码接口打通时，登录页会不会显示 + 自动填入验证码。
   jsdom 30 的 requestInterceptor 只能"返回合成响应"、不能改 URL，
   所以这里自己当代理：把 8080 上的 /api/* 转发到真正的后端。

   用法：node devcode_probe.js [手机号] [后端端口] [locked]

   后端端口默认 8081（即本项目真实后端所在端口）。
   如果想拿一个临时实例练手（不打扰 8081 上正跑着的服务），
   可以自己另起一个，然后传它的端口，比如：
       node devcode_probe.js 13677778888 8082

   第三个参数传 "locked" 表示**期望限流是开着的**（即后端
   xhw.dev-skip-sms-limit=false）：这时第一次发码会锁住 60 秒、
   再点也拿不到新码。不传则期望限流已关闭，可以反复取码。
   两种状态各跑一次，就能证明这个开关两个方向都对。 */
const { JSDOM, VirtualConsole, requestInterceptor } = require("jsdom");

const PHONE = process.argv[2] || "13677778888";
const BACKEND = process.argv[3] || "8081";
const EXPECT_LOCKED = (process.argv[4] || "").toLowerCase() === "locked";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const reroute = requestInterceptor(async (request) => {
  let u;
  try { u = new URL(request.url); } catch { return undefined; }
  if (u.port !== "8080" || !u.pathname.startsWith("/api/")) return undefined;

  const target = new URL(u.href);
  target.port = BACKEND;
  target.pathname = u.pathname.slice("/api".length);

  // 只转必要的头。整包转发 Headers 会把 content-length 之类的原样带过去，
  // 和实际 body 对不上时 undici 直接抛错（表现成"连不上服务器"）。
  const headers = {};
  const auth = request.headers.get("authorization");
  if (auth) headers.authorization = auth;
  const ct = request.headers.get("content-type");
  if (ct) headers["content-type"] = ct;

  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    init.body = request.body;
    init.duplex = "half";       // Node fetch 发流式 body 时必须声明
  }

  let r;
  try {
    r = await fetch(target.href, init);
  } catch (e) {
    console.log("[代理出错] " + request.method + " " + target.href + " -> " + e.message);
    return new Response('{"success":false,"errorMsg":"代理转发失败"}', {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const body = await r.arrayBuffer();
  return new Response(body, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("content-type") || "application/json" },
  });
});

(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented: navigation/.test(e.message)) errs.push("jsdomError: " + e.message);
  });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));

  const dom = await JSDOM.fromURL("http://localhost:8080/login.html", {
    runScripts: "dangerously",
    resources: { interceptors: [reroute] },
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  await sleep(3000);

  const win = dom.window, doc = win.document;
  const input = doc.querySelector("#phone");
  const btn = doc.querySelector(".btn--g");

  input.value = PHONE;
  input.dispatchEvent(new win.Event("input", { bubbles: true }));
  await sleep(150);
  btn.click();
  console.log("已点击「获取验证码」，手机号 " + PHONE + "（/api 已转发到 :" + BACKEND + "）");
  await sleep(2600);

  console.log("提示：" + JSON.stringify([...doc.querySelectorAll(".toast")].map((e) => e.textContent.trim())));

  const box = doc.querySelector(".devcode");
  console.log("渲染出 .devcode 取码块：" + (box ? "是" : "否"));
  let ok = false;
  if (box) {
    const shown = box.querySelector(".devcode__v").textContent.trim();
    const filled = doc.querySelector("#code").value.trim();
    console.log("  页面上显示的验证码： " + shown);
    console.log("  输入框里自动填入的： " + filled);
    console.log("  两者一致且是 6 位数字：" + (shown === filled && /^\d{6}$/.test(filled) ? "是" : "否"));
    console.log("  退路提示 note-box 是否同时出现（应为否）：" + (doc.querySelector(".note-box") ? "是 ✗" : "否 ✓"));
    ok = shown === filled && /^\d{6}$/.test(filled) && !doc.querySelector(".note-box");
  }
  console.log("控制台报错：" + (errs.length ? "\n  " + errs.join("\n  ") : "无"));

  /* ---- 关键第二步：**再点一次** ----
     这是"每次输入号码都给我一个新验证码"的直接验证。
     限流关着（默认期望）：再点应拿到一个**新的**码，按钮不该被锁。
     传了 locked（期望限流开着）：第一次发码后按钮应锁成"60 秒后重发"，再点拿不到新码。
     两种状态各跑一次，就能证明这个开关两个方向都对。 */
  const firstCode = box ? box.querySelector(".devcode__v").textContent.trim() : "";
  console.log("限流提示条 .devhint：" + (doc.querySelector(".devhint") ? "有" : "无"));
  console.log("按钮文案：" + JSON.stringify(btn.textContent.trim()) + "，disabled=" + btn.disabled);

  const lockedBefore = btn.disabled || /秒后重发/.test(btn.textContent);
  btn.click();                       // 锁着的时候这次点击本来就无效
  await sleep(2800);

  const v2 = doc.querySelector(".devcode__v");
  const secondCode = v2 ? v2.textContent.trim() : "";
  const filled2 = doc.querySelector("#code").value.trim();

  console.log("第二次点击后：");
  console.log("  新验证码：" + (secondCode || "(没拿到)") + "   第一次是：" + (firstCode || "(无)"));

  let modeOk, modeMsg;
  if (EXPECT_LOCKED) {
    modeOk = lockedBefore && (!secondCode || secondCode === firstCode);
    modeMsg = "限流开着：按钮锁 60 秒、再点拿不到新码";
    console.log("  按钮是否已锁（应为是）：" + (lockedBefore ? "是 ✓" : "否 ✗"));
    console.log("  是否没产生新码（应为是）：" + (!secondCode || secondCode === firstCode ? "是 ✓" : "否 ✗"));
  } else {
    modeOk = !!secondCode && secondCode !== firstCode && filled2 === secondCode;
    modeMsg = "限流关着：点一次拿一个码、再点拿一个新的";
    console.log("  确实是一个新码：" + (secondCode && secondCode !== firstCode ? "是 ✓" : "否 ✗"));
    console.log("  输入框同步成新码：" + (filled2 === secondCode && secondCode ? "是 ✓" : "否 ✗"));
  }
  const lastToasts = [...doc.querySelectorAll(".toast")].map((e) => e.textContent.trim());
  console.log("  最近一条提示：" + JSON.stringify(lastToasts.slice(-1)));

  // 第三步：勾协议、点登录，看真的能不能登进去（用输入框里当前那个码）
  let logged = false;
  if (ok) {
    const chk = doc.querySelector(".chk input[type=checkbox]");
    chk.checked = true;
    chk.dispatchEvent(new win.Event("change", { bubbles: true }));
    await sleep(150);
    doc.querySelector(".btn--p").click();
    await sleep(2600);
    const tok = win.sessionStorage.getItem("token");
    logged = !!tok;
    console.log("点「登录」后的 token：" + (tok ? tok.slice(0, 12) + "…" : "(没有)"));
  }

  ok = ok && modeOk && logged;
  console.log(ok ? "[PASS] " + modeMsg + "，且登录成功" : "[FAIL]");
  process.exit(ok ? 0 : 1);
})();
