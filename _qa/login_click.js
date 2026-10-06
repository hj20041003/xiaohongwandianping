/* 登录页「获取验证码」按钮的真实点击回归。
   目的：证明页面自己发出的请求能到达后端——排查「控制台看不到验证码」时，
   用来区分「后端没打日志」和「请求压根没发出去」。
   用法：node _qa/login_click.js [手机号] */
const { JSDOM, VirtualConsole } = require("jsdom");

const PHONE = process.argv[2] || "13611112222";
const PAGE = "http://localhost:8080/login.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented: navigation/.test(e.message)) errs.push("jsdomError: " + e.message);
  });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  vc.on("warn", (...a) => errs.push("console.warn: " + a.join(" ")));

  const dom = await JSDOM.fromURL(PAGE, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  await sleep(3500);

  const win = dom.window;
  const doc = win.document;

  const input = doc.querySelector("#phone");
  const btn = doc.querySelector(".btn--g");
  if (!input || !btn) {
    console.log("[FAIL] 找不到 #phone 或 .btn--g —— 页面结构变了？");
    process.exit(1);
  }

  // Vue 2 的 v-model 监听 input 事件
  input.value = PHONE;
  input.dispatchEvent(new win.Event("input", { bubbles: true }));
  await sleep(200);

  btn.click();
  console.log("已点击「获取验证码」，手机号 " + PHONE);
  await sleep(2500);

  const toasts = [...doc.querySelectorAll(".toast")].map((e) => e.textContent.trim());
  console.log("页面弹出的提示：" + (toasts.length ? JSON.stringify(toasts) : "(没有 toast)"));

  const counting = /秒后重发/.test(btn.textContent);
  console.log("按钮进入倒计时：" + (counting ? "是" : "否") + "（文案：" + btn.textContent.trim() + "）");

  // 开发取码模式：后端 /user/code/dev 可用时，页面会渲染 .devcode 并把码自动填进输入框
  const devBox = doc.querySelector(".devcode");
  const devVal = devBox ? (devBox.querySelector(".devcode__v") || {}).textContent : null;
  const inputCode = (doc.querySelector("#code") || {}).value || "";
  if (devBox) {
    console.log("取码模式：开发接口可用 —— 页面显示了验证码 " + String(devVal).trim());
    console.log("      验证码已自动填入输入框：" + (inputCode === String(devVal).trim() ? "是" : "否（是 " + inputCode + "）"));
  } else {
    console.log("取码模式：退回控制台提示（取码接口 404 / 已关闭 / 后端没重启）");
  }

  console.log("控制台报错：" + (errs.length ? "\n  " + errs.join("\n  ") : "无"));

  // 结论
  const ok = toasts.some((t) => /验证码/.test(t)) && counting;
  console.log(ok ? "[PASS] 页面确实把请求发出去了，后端应已打印验证码" : "[FAIL] 请求没发出去");
  process.exit(ok ? 0 : 1);
})();
