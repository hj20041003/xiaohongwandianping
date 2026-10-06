/* ============================================================================
   地址簿 UI 端到端：真开页面、真点按钮，把「新增 → 设默认 → 删除」走一遍。

   和 address_smoke.js 的分工：
     address_smoke.js  打接口，验的是**业务规则**（越权、补位、幂等）
     address_ui_test.js 挂页面，验的是**页面真的把这些能力接上了** ——
                        按钮点下去有没有反应、列表有没有重排、表单有没有拦住空值。
   接口对但页面没接上，是两回事，所以两边都要有。

   跑法（需要新后端 + QA 站点）：
     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082
     $NODE _qa/static_proxy.js 8085 8082
     $NODE _qa/address_ui_test.js
   ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = process.argv[2] || "http://127.0.0.1:8085";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else {
    fail++;
    console.log("  FAIL " + what + (extra !== undefined ? "   → " + JSON.stringify(extra) : ""));
  }
}

/* 直接用开发取码接口拿 token，不碰 Redis */
async function login(phone) {
  const s = await fetch(`${ROOT}/api/user/code?phone=${phone}`, { method: "POST" }).then((r) => r.json());
  if (!s.success) throw new Error("发码失败: " + s.errorMsg);
  const c = await fetch(`${ROOT}/api/user/code/dev?phone=${phone}`).then((r) => r.json());
  if (!c.success) throw new Error("取码失败: " + c.errorMsg);
  const l = await fetch(`${ROOT}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: c.data })
  }).then((r) => r.json());
  if (!l.success) throw new Error("登录失败: " + l.errorMsg);
  return l.data;
}

function newPhone() {
  return "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
}

function postAddress(token, body) {
  return fetch(`${ROOT}/api/address`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: token },
    body: JSON.stringify(Object.assign(
      { name: "张三", phone: "13800138000",
      province: "浙江省", city: "杭州", district: "拱墅区",
      detail: "文三路 1 号", tag: 0, isDefault: 0 },
      body))
  }).then((r) => r.json());
}

/* ⚠️ 这里**故意**不复用种子用户（13686869696）。
   第一版就是拿种子用户跑的，结果它自己把种子数据改了（换默认、删了一条），
   第二次跑第一步就红 —— 一个只会绿一次的测试等于没有。
   改成每次现建一个新用户、用接口预置三条，用例就是可重复的。 */
async function prepareUser() {
  const token = await login(newPhone());
  await postAddress(token, { name: "小鱼同学", province: "浙江省", city: "杭州", district: "拱墅区",
    detail: "金华路锦昌文华苑 29 号", tag: 0 });                                   // 自动默认
  await postAddress(token, { name: "小鱼同学", province: "北京市", city: "北京", district: "朝阳区",
    detail: "三里屯路 19 号院", tag: 1 });
  await postAddress(token, { name: "老妈", province: "上海市", city: "上海", district: "黄浦区",
    detail: "思南路 36 号", tag: 3 });
  return token;
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
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      if (token) win.sessionStorage.setItem("token", token);
    }
  });
  await sleep(4200);
  return { dom, errs };
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const cards = (doc) => [...doc.querySelectorAll(".addr")];
const toastText = (doc) => [...doc.querySelectorAll(".toast")].map(txt).join(" | ");
/* 省市区选择器：第 col 列（0 省 / 1 市 / 2 区）里点名字以 label 开头的项 */
const cols = (doc) => [...doc.querySelectorAll(".rg__col")];
const colItems = (doc, i) => [...cols(doc)[i].querySelectorAll(".rg__it")];
async function pickCol(doc, col, label) {
  const it = colItems(doc, col).filter((x) => txt(x).indexOf(label) === 0)[0];
  if (!it) {
    throw new Error("第 " + (col + 1) + " 列里没有「" + label + "」，实际有：" +
      colItems(doc, col).map(txt).slice(0, 10).join(" / "));
  }
  it.click();
  await sleep(90);
}
/* Vue 2 的 v-model 监听的是原生 input 事件，直接改 .value 是不生效的 */
function setInput(win, el, value) {
  el.value = value;
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

(async () => {
  // 每次现建一个用户并预置 3 条地址，保证脚本可重复跑
  const token = await prepareUser();

  /* ------------------------------------------------ 1. 列表页渲染 */
  console.log("=== 1. 地址簿 · 我的地址 ===");
  let { dom, errs } = await open("/address.html", token);
  let win = dom.window, doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("渲染出 3 张地址卡", cards(doc).length === 3, cards(doc).length);
  ok("默认地址排在第一张", !!cards(doc)[0] && !!cards(doc)[0].querySelector(".atag--def"));
  ok("默认卡带了高亮边框", !!cards(doc)[0] && cards(doc)[0].className.indexOf("addr--def") !== -1);
  ok("非默认卡不显示「默认」徽标",
     cards(doc).slice(1).every((c) => !c.querySelector(".atag--def")));
  // 这是真实踩过的 bug：默认徽标和标签写成了 v-if/v-else，导致把一条地址设成默认后，
  // 它上面写的"公司"直接消失。默认是状态、标签是分类，两个维度不能二选一。
  ok("默认卡同时显示「默认」和标签（两者不互斥）",
     cards(doc)[0].querySelectorAll(".atag").length === 2,
     cards(doc)[0].querySelectorAll(".atag").length);
  ok("每张卡都带标签", cards(doc).every((c) => c.querySelectorAll(".atag").length >= 1));
  ok("卡上有手机号", /\d{11}/.test(txt(cards(doc)[0])), txt(cards(doc)[0]));
  ok("卡上有城市 + 详细地址",
     txt(cards(doc)[0]).indexOf("杭州") !== -1 && txt(cards(doc)[0]).indexOf("拱墅区") !== -1,
     txt(cards(doc)[0]));
  ok("非默认卡有「设为默认」按钮",
     [...cards(doc)[1].querySelectorAll(".addr__act")].some((b) => txt(b) === "设为默认"));
  ok("默认卡上没有「设为默认」", ![...cards(doc)[0].querySelectorAll(".addr__act")].some((b) => txt(b) === "设为默认"));
  ok("底部有虚线的新增地址入口", !!doc.querySelector(".addr-add"));

  /* ------------------------------------------------ 2. 点「设为默认」 */
  console.log("\n=== 2. 点「设为默认」 ===");
  const beforeTop = txt(cards(doc)[0]);
  const btn = [...cards(doc)[1].querySelectorAll(".addr__act")].filter((b) => txt(b) === "设为默认")[0];
  const movingName = txt(cards(doc)[1].querySelector(".addr__nm"));
  btn.click();
  await sleep(1800);

  ok("弹出成功提示", toastText(doc).indexOf("已设为默认地址") !== -1, toastText(doc));
  ok("刚点的那条升到了第一位",
     txt(cards(doc)[0].querySelector(".addr__nm")) === movingName, txt(cards(doc)[0].querySelector(".addr__nm")));
  ok("第一张卡现在是默认卡", !!cards(doc)[0].querySelector(".atag--def"));
  ok("全局只有一张默认卡", cards(doc).filter((c) => c.querySelector(".atag--def")).length === 1,
     cards(doc).filter((c) => c.querySelector(".atag--def")).length);
  ok("第一位确实换人了（不是原地不动）", txt(cards(doc)[0]) !== beforeTop);
  dom.window.close();

  /* ------------------------------------------------ 3. 删除（确认抽屉） */
  console.log("\n=== 3. 删除 ===");
  ({ dom, errs } = await open("/address.html", token));
  win = dom.window; doc = win.document;
  const delName = txt(cards(doc)[2].querySelector(".addr__nm"));
  const nBefore = cards(doc).length;

  cards(doc)[2].querySelector(".addr__act--del").click();
  await sleep(400);
  ok("弹出删除确认抽屉", !!doc.querySelector(".sheet"), "没有 .sheet");
  ok("抽屉里写清了要删哪条", txt(doc.querySelector(".sheet")).indexOf(delName) !== -1,
     txt(doc.querySelector(".sheet")).slice(0, 80));

  // 先点「再想想」——不确认就不该真删
  [...doc.querySelectorAll(".sheet .btn")].filter((b) => txt(b) === "再想想")[0].click();
  await sleep(600);
  ok("点「再想想」不删数据", cards(doc).length === nBefore, cards(doc).length);

  cards(doc)[2].querySelector(".addr__act--del").click();
  await sleep(400);
  [...doc.querySelectorAll(".sheet .btn")].filter((b) => txt(b) === "删除")[0].click();
  await sleep(1800);
  ok("确认后卡片少了一张", cards(doc).length === nBefore - 1, cards(doc).length);
  ok("弹出已删除提示", toastText(doc).indexOf("已删除") !== -1, toastText(doc));
  dom.window.close();

  /* ------------------------------------------------ 4. 门店地址那一栏 */
  console.log("\n=== 4. 门店地址 ===");
  ({ dom, errs } = await open("/address.html", token));
  win = dom.window; doc = win.document;
  [...doc.querySelectorAll(".tabs__i")].filter((b) => txt(b) === "门店地址")[0].click();
  await sleep(2200);

  const groups = [...doc.querySelectorAll(".dir")];
  ok("按城市分出 8 组", groups.length === 8, groups.length);
  ok("组标题是城市名 + 门店数",
     /杭州/.test(txt(groups[0].querySelector(".dir__hd"))) && /家门店/.test(txt(groups[0].querySelector(".dir__hd"))),
     txt(groups[0].querySelector(".dir__hd")));
  ok("门店行渲染出店名与地址",
     txt(groups[0].querySelector(".pick__t")).length > 0 &&
     txt(groups[0].querySelector(".pick__s")).indexOf("·") !== -1,
     txt(groups[0].querySelector(".pick")));
  const totalRow = [...doc.querySelectorAll(".pick")].length;
  ok("门店总数是 84", totalRow === 84, totalRow);
  ok("结尾有汇总行", /全国共/.test(txt(doc.querySelector(".dir__tail"))), txt(doc.querySelector(".dir__tail")));

  // 搜索
  setInput(win, doc.querySelector(".pad .search input"), "火锅");
  await sleep(300);
  const hitGroups = [...doc.querySelectorAll(".dir")];
  const hitRows = [...doc.querySelectorAll(".pick")];
  ok("搜索「火锅」后结果变少", hitRows.length > 0 && hitRows.length < totalRow, hitRows.length);
  ok("搜出来的都带「火锅」", hitRows.every((r) => txt(r).indexOf("火锅") !== -1),
     hitRows.map((r) => txt(r.querySelector(".pick__t"))).join(" / "));
  ok("没有店的城市整组被去掉", hitGroups.every((g) => g.querySelectorAll(".pick").length > 0));

  setInput(win, doc.querySelector(".pad .search input"), "不存在的店xyz");
  await sleep(300);
  ok("搜不到时显示空状态", !!doc.querySelector(".empty"));
  dom.window.close();

  /* ------------------------------------------------ 5. 新增地址 */
  console.log("\n=== 5. 新增地址 ===");
  const freshToken = await login(newPhone());

  ({ dom, errs } = await open("/address-edit.html", freshToken));
  win = dom.window; doc = win.document;
  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("标题是「新增地址」", txt(doc.querySelector(".hd__t")) === "新增地址", txt(doc.querySelector(".hd__t")));

  // 空表单直接提交 → 必须被拦住
  doc.querySelector(".hd__btn--txt").click();
  await sleep(600);
  ok("空表单提交被拦住并给出文案", toastText(doc).indexOf("收货人不能为空") !== -1, toastText(doc));

  const inputs = [...doc.querySelectorAll(".inp")];
  setInput(win, inputs[0], "王五");
  setInput(win, inputs[1], "12345");                 // 非法手机号
  doc.querySelector(".hd__btn--txt").click();
  await sleep(600);
  ok("非法手机号被拦住（前后端同一条规则）",
     toastText(doc).indexOf("手机号格式看着不对") !== -1, toastText(doc));

  setInput(win, inputs[1], "13812345678");
  setInput(win, doc.querySelector(".txa"), "静安区南京西路 1266 号 3201");

  // 所在地区：省 → 市 → 区三级
  doc.querySelector(".row--link").click();
  await sleep(300);
  ok("省市区抽屉打开了", doc.querySelectorAll(".rg").length === 1);
  ok("第一列是 34 个省级行政区", colItems(doc, 0).length === 34, colItems(doc, 0).length);

  // 「全国」不是收件地址，先试它应该被拒
  [...doc.querySelectorAll(".rg__chip")].filter((c) => txt(c) === "全国")[0].click();
  await sleep(90);
  doc.querySelector(".rg__ok").click();
  await sleep(700);
  ok("选「全国」会被拒绝并给出解释",
     toastText(doc).indexOf("收件地址得选到城市这一级") !== -1 &&
     doc.querySelectorAll(".rg").length === 0, toastText(doc));

  doc.querySelector(".row--link").click();
  await sleep(300);
  await pickCol(doc, 0, "上海市");
  await pickCol(doc, 1, "上海");
  await pickCol(doc, 2, "黄浦区");
  doc.querySelector(".rg__ok").click();
  await sleep(700);
  ok("选完抽屉关掉、省市区回填到表单",
     doc.querySelectorAll(".rg").length === 0 &&
     /上海市 · 上海 · 黄浦区/.test(txt(doc.querySelector(".row__v"))),
     txt(doc.querySelector(".row__v")));

  // 标签
  [...doc.querySelectorAll(".chip")].filter((c) => txt(c) === "公司")[0].click();
  await sleep(150);

  ok("新用户会被提示「第一条会自动成为默认地址」",
     txt(doc.querySelector(".note-box")).indexOf("第一条地址") !== -1,
     txt(doc.querySelector(".note-box")));

  doc.querySelector(".hd__btn--txt").click();
  await sleep(2200);
  ok("提交后提示「地址已添加」", toastText(doc).indexOf("地址已添加") !== -1, toastText(doc));
  dom.window.close();

  // 回到列表页确认真的落库了，而且自动成了默认
  ({ dom, errs } = await open("/address.html", freshToken));
  doc = dom.window.document;
  ok("新用户的列表里出现了刚加的地址", cards(doc).length === 1, cards(doc).length);
  ok("第一条自动成为默认地址", !!cards(doc)[0].querySelector(".atag--def"));
  ok("省市区与详细地址都对",
     txt(cards(doc)[0]).indexOf("上海市") !== -1 &&
     txt(cards(doc)[0]).indexOf("上海") !== -1 &&
     txt(cards(doc)[0]).indexOf("南京西路") !== -1,
     txt(cards(doc)[0]));
  ok("标签存下来的是「公司」", txt(cards(doc)[0]).indexOf("公司") !== -1, txt(cards(doc)[0]));
  const newId = cards(doc)[0].querySelector("a[href*='id=']").getAttribute("href").split("id=")[1];
  dom.window.close();

  /* ------------------------------------------------ 6. 编辑已有地址 */
  console.log("\n=== 6. 编辑地址 ===");
  ({ dom, errs } = await open("/address-edit.html?id=" + newId, freshToken));
  win = dom.window; doc = win.document;
  ok("标题是「编辑地址」", txt(doc.querySelector(".hd__t")) === "编辑地址", txt(doc.querySelector(".hd__t")));
  ok("表单回填了收货人", doc.querySelectorAll(".inp")[0].value === "王五", doc.querySelectorAll(".inp")[0].value);
  ok("表单回填了手机号", doc.querySelectorAll(".inp")[1].value === "13812345678");
  ok("表单回填了城市", txt(doc.querySelector(".row__v")).indexOf("上海") !== -1);
  ok("「公司」这个标签是选中态",
     [...doc.querySelectorAll(".chip")].filter((c) => txt(c) === "公司")[0].className.indexOf("on") !== -1);
  ok("已是默认地址时，默认勾选框被锁住",
     doc.querySelector(".chk input").disabled === true);
  ok("并且解释了为什么不能取消",
     txt(doc.querySelector(".chk")).indexOf("不能取消") !== -1, txt(doc.querySelector(".chk")));
  ok("编辑态下出现「删除这条地址」", !!doc.querySelector(".btn--g"));

  setInput(win, doc.querySelectorAll(".inp")[0], "王五（改）");
  doc.querySelector(".hd__btn--txt").click();
  await sleep(2200);
  ok("保存成功提示", toastText(doc).indexOf("已保存") !== -1, toastText(doc));
  dom.window.close();

  ({ dom, errs } = await open("/address.html", freshToken));
  doc = dom.window.document;
  ok("改动确实生效了", txt(cards(doc)[0].querySelector(".addr__nm")) === "王五（改）",
     txt(cards(doc)[0].querySelector(".addr__nm")));
  dom.window.close();

  /* ------------------------------------------------ 7. 我的页入口 */
  console.log("\n=== 7. 我的页入口 ===");
  ({ dom, errs } = await open("/info.html", token));
  doc = dom.window.document;
  const entry = [...doc.querySelectorAll("a.row")].filter((a) => txt(a).indexOf("地址簿") !== -1)[0];
  ok("「我的」里有地址簿入口", !!entry);
  ok("入口指向 /address.html", entry && entry.getAttribute("href") === "/address.html",
     entry && entry.getAttribute("href"));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
