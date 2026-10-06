/* ============================================================================
   省 / 市 / 区 三级选择器端到端：真开页面、真点三列，断言筛选链路是通的。

   覆盖的是一条完整链路：
     点「浙江省」→「成都」→某个区 → 确定
       → 首页按钮变成区名
       → 笔记按区过滤
       → 偏好写进 localStorage
       → 店铺列表页带着同一个区域打开
   这条链路上任何一环没接上，断言就会红。

   跑法（需要新后端 + QA 站点）：
     java -jar target/xhw-1.0-SNAPSHOT.jar --server.port=8082
     $NODE _qa/static_proxy.js 8085 8082
     $NODE _qa/region_test.js
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

async function open(path, store) {
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
      Object.keys(store || {}).forEach((k) => win.localStorage.setItem(k, store[k]));
    }
  });
  await sleep(4200);
  return { dom, errs };
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const cols = (doc) => [...doc.querySelectorAll(".rg__col")];
const colItems = (doc, i) => [...cols(doc)[i].querySelectorAll(".rg__it")];

async function pick(doc, col, label) {
  const it = colItems(doc, col).filter((x) => txt(x).indexOf(label) === 0)[0];
  if (!it) {
    throw new Error("第 " + (col + 1) + " 列里没有「" + label + "」，实际有：" +
      colItems(doc, col).map(txt).slice(0, 12).join(" / "));
  }
  it.click();
  await sleep(90);            // Vue 的 DOM 更新是异步的，下一列要等它渲染完
  return it;
}
const confirm = async (doc) => {
  doc.querySelector(".rg__ok").click();
  await sleep(2000);
};

(async () => {
  /* ---------------------------------------------- 1. 首页默认全国 */
  console.log("=== 1. 首页 · 默认全国 ===");
  let { dom, errs } = await open("/index.html");
  let win = dom.window, doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("顶部显示「全国」", txt(doc.querySelector(".hd__city")).indexOf("全国") === 0,
     txt(doc.querySelector(".hd__city")));
  ok("页面一打开选择器是收起的", doc.querySelectorAll(".rg").length === 0);
  ok("笔记有渲染", doc.querySelectorAll(".note").length > 0, doc.querySelectorAll(".note").length);
  const locs = [...doc.querySelectorAll(".note__loc")].map(txt);
  ok("全国视图下每条笔记都标了城市", locs.length === doc.querySelectorAll(".note").length,
     `${locs.length}/${doc.querySelectorAll(".note").length}`);
  ok("笔记横跨 >= 3 座城市", new Set(locs).size >= 3, [...new Set(locs)].join("/"));

  /* ---------------------------------------------- 2. 打开三级选择器 */
  console.log("\n=== 2. 打开选择器 ===");
  doc.querySelector(".hd__city").click();
  await sleep(250);
  ok("选择器打开了", doc.querySelectorAll(".rg").length === 1);
  ok("三列都在", cols(doc).length === 3, cols(doc).length);
  ok("第一列是 34 个省级行政区", colItems(doc, 0).length === 34, colItems(doc, 0).length);
  const provNames = colItems(doc, 0).map(txt);
  ok("按官方顺序排（第一个是北京市）", provNames[0] === "北京市", provNames[0]);
  ok("港澳台都在里面",
     provNames.indexOf("香港特别行政区") !== -1 &&
     provNames.indexOf("澳门特别行政区") !== -1 &&
     provNames.indexOf("台湾省") !== -1);
  const chips = [...doc.querySelectorAll(".rg__chip")].map(txt);
  ok("有「全国」快捷入口", chips[0] === "全国", chips[0]);
  ok("热门城市只列有门店的", chips.length > 1 && chips.length <= 9, chips.join("/"));
  ok("没选省时第二列提示先选省份",
     txt(doc.querySelectorAll(".rg__none")[0]).indexOf("先选省份") !== -1,
     txt(doc.querySelectorAll(".rg__none")[0]));

  /* ---------------------------------------------- 3. 省 → 市 → 区 */
  console.log("\n=== 3. 浙江省 → 成都 → 某区 ===");
  await pick(doc, 0, "浙江省");
  // 11 个市 + 首行「全省」= 12 项
  ok("第二列是浙江的 11 个市（外加「全省」入口）", colItems(doc, 1).length === 12, colItems(doc, 1).length);
  const onCity = colItems(doc, 1).filter((x) => x.className.indexOf("on") !== -1).map(txt)[0] || "";
  ok("自动落到第一家有门店的市（杭州）", onCity.indexOf("杭州") === 0, onCity);
  ok("有门店的市后面带上了门店数", /杭州\d+/.test(onCity), onCity);
  ok("第一列提供「全省」入口", colItems(doc, 1).some((x) => txt(x) === "全省"),
     colItems(doc, 1).map(txt).slice(0, 3).join("/"));

  await pick(doc, 0, "四川省");
  const cd = colItems(doc, 1).filter((x) => txt(x).indexOf("成都") === 0)[0];
  ok("四川的市里找得到成都", !!cd);
  cd.click();
  await sleep(120);
  const dists = colItems(doc, 2).map(txt);
  ok("第三列列出了成都的区", dists.length >= 10, dists.length);
  // 区名后面跟着门店数（"锦江区3"），所以只能前缀匹配，不能全等
  const hasDist = (n) => dists.some((x) => x.indexOf(n) === 0);
  ok("区里有锦江区和武侯区，并且带上了各自的门店数",
     hasDist("锦江区") && hasDist("武侯区") &&
     dists.some((x) => /^锦江区\d+$/.test(x)), dists.join("/"));

  await pick(doc, 2, "锦江区");
  await confirm(doc);

  ok("选择器关掉了", doc.querySelectorAll(".rg").length === 0);
  ok("顶部按钮变成区名", txt(doc.querySelector(".hd__city")).indexOf("锦江区") === 0,
     txt(doc.querySelector(".hd__city")));
  ok("副标题也跟着变", txt(doc.querySelector(".sec__hd .masthead__r")).indexOf("锦江区") !== -1,
     txt(doc.querySelector(".sec__hd .masthead__r")));
  const stored = JSON.parse(win.localStorage.getItem("xhw:region") || "{}");
  ok("省市区都写进了 localStorage",
     stored.province === "四川省" && stored.city === "成都" && stored.district === "锦江区", stored);
  await sleep(2500);
  const cdShops = [...doc.querySelectorAll(".note__shop")].map(txt);
  ok("只留下锦江区的笔记", cdShops.length > 0 &&
     cdShops.every((s) => s.indexOf("春熙路") !== -1 || s.indexOf("太古里") !== -1), cdShops.join(" | "));
  ok("按区筛过之后不再重复标城市",
     doc.querySelectorAll(".note__loc").length === 0);
  dom.window.close();

  /* ---------------------------------------------- 4. 偏好持久化 */
  console.log("\n=== 4. 刷新后还在锦江区 ===");
  // jsdom 每个实例有独立的 localStorage，所以"刷新"只能靠预置来模拟
  ({ dom, errs } = await open("/index.html", {
    "xhw:region": JSON.stringify({ province: "四川省", city: "成都", district: "锦江区" })
  }));
  doc = dom.window.document;
  ok("带着上次的选择重新打开，仍然是锦江区",
     txt(doc.querySelector(".hd__city")).indexOf("锦江区") === 0, txt(doc.querySelector(".hd__city")));

  /* ---------------------------------------------- 5. 没门店的城市 */
  console.log("\n=== 5. 选一座还没开进去的城市 ===");
  doc.querySelector(".hd__city").click();
  await sleep(250);
  await pick(doc, 0, "新疆维吾尔自治区");
  const wj = colItems(doc, 1).filter((x) => txt(x).indexOf("乌鲁木齐") === 0)[0];
  ok("新疆的市里找得到乌鲁木齐", !!wj);
  wj.click();
  await sleep(120);
  ok("底部说明了「还没有门店」并给了去处",
     /乌鲁木齐 还没有门店/.test(txt(doc.querySelector(".rg__foot"))) &&
     !!doc.querySelector(".rg__jump"),
     txt(doc.querySelector(".rg__foot")));
  doc.querySelector(".rg__jump").click();
  await sleep(120);
  const jumped = colItems(doc, 1).filter((x) => x.className.indexOf("on") !== -1).map(txt)[0] || "";
  ok("点「去看看」跳到了一座有门店的城市", jumped.indexOf("杭州") === 0, jumped);
  await confirm(doc);
  // 按钮上显示的是**最细**的一级：自动落到杭州里门店最多的区，所以是「拱墅区」
  // 而不是「杭州」。这正是想要的行为 —— 不会一选完就落在一家店都没有的区。
  ok("自动落到门店最多的区（拱墅区），而不是行政排序第一的滨江区",
     txt(doc.querySelector(".hd__city")).indexOf("拱墅区") === 0, txt(doc.querySelector(".hd__city")));
  dom.window.close();

  /* ---------------------------------------------- 6. 全省 / 全区 */
  console.log("\n=== 6. 全省、全区、全国 三个入口 ===");
  ({ dom, errs } = await open("/index.html"));
  doc = dom.window.document;
  doc.querySelector(".hd__city").click();
  await sleep(250);
  await pick(doc, 0, "广东省");
  ok("广东这一列有「全省」入口",
     colItems(doc, 1).some((x) => txt(x) === "全省"),
     colItems(doc, 1).map(txt).slice(0, 4).join("/"));
  await pick(doc, 1, "广州");
  ok("第三列有「全区」入口",
     colItems(doc, 2).some((x) => txt(x) === "全区"),
     colItems(doc, 2).map(txt).slice(0, 4).join("/"));
  colItems(doc, 1).filter((x) => txt(x) === "全省")[0].click();
  await sleep(120);
  ok("选「全省」之后区列被清空", colItems(doc, 2).length === 0, colItems(doc, 2).length);
  await confirm(doc);
  ok("按钮显示广东省", txt(doc.querySelector(".hd__city")).indexOf("广东省") === 0,
     txt(doc.querySelector(".hd__city")));
  await sleep(1500);
  const gdshops = [...doc.querySelectorAll(".note__shop")].map(txt);
  ok("广东省的笔记同时包含广州和深圳的店",
     gdshops.some((s) => s.indexOf("点都德") !== -1) &&      // 广州
     gdshops.some((s) => s.indexOf("八合里海记") !== -1),   // 深圳
     gdshops.join(" | "));

  // 全国
  doc.querySelector(".hd__city").click();
  await sleep(250);
  [...doc.querySelectorAll(".rg__chip")].filter((c) => txt(c) === "全国")[0].click();
  await sleep(90);
  await confirm(doc);
  ok("「全国」把三级都清空了", txt(doc.querySelector(".hd__city")).indexOf("全国") === 0,
     txt(doc.querySelector(".hd__city")));
  dom.window.close();

  /* ---------------------------------------------- 7. 店铺列表带区域 */
  console.log("\n=== 7. 店铺列表 · 按区域 ===");
  ({ dom, errs } = await open("/shop-list.html?type=1&province=" +
    encodeURIComponent("四川省") + "&city=" + encodeURIComponent("成都")));
  doc = dom.window.document;
  ok("无控制台报错", errs.length === 0, errs.slice(0, 2).join(" | "));
  ok("排序条上的区域是成都", txt(doc.querySelector(".sortbar__city")).indexOf("成都") === 0,
     txt(doc.querySelector(".sortbar__city")));
  const list = [...doc.querySelectorAll(".shop")];
  ok("店铺有渲染", list.length > 0, list.length);
  ok("每家都在成都（地址行不含省名，说明已按区域收窄）",
     list.every((el) => txt(el.querySelector(".shop__row")).indexOf("四川省") === -1),
     txt(list[0].querySelector(".shop__row")));
  ok("单城市视图下「距离」可用",
     [...doc.querySelectorAll(".sortbar__i")].some((b) => txt(b) === "距离"));
  ok("每家都带出真实距离", list.every((el) => /\d+(\.\d+)?(m|km)/.test(txt(el))),
     txt(list[0]));
  dom.window.close();

  /* ---------------------------------------------- 8. 店铺列表全国 */
  console.log("\n=== 8. 店铺列表 · 全国 ===");
  ({ dom, errs } = await open("/shop-list.html?type=1&province=&city=&district="));
  doc = dom.window.document;
  const all = [...doc.querySelectorAll(".shop")];
  ok("全国视图有店铺", all.length > 0, all.length);
  ok("全国视图下地址是「省 · 市 · 区 · 商圈 · 地址」五段",
     /^\S+ · \S+ · \S+ · /.test(txt(all[0].querySelector(".shop__row"))),
     txt(all[0].querySelector(".shop__row")));
  ok("全国视图下「距离」被拿掉",
     ![...doc.querySelectorAll(".sortbar__i")].some((b) => txt(b) === "距离"));
  dom.window.close();

  /* ---------------------------------------------- 9. 非法城市兜底 */
  console.log("\n=== 9. 非法城市兜底 ===");
  ({ dom, errs } = await open("/shop-list.html?type=1&province=" +
    encodeURIComponent("火星省") + "&city=" + encodeURIComponent("火星市")));
  doc = dom.window.document;
  ok("不存在的城市被兜回全国",
     txt(doc.querySelector(".sortbar__city")).indexOf("全国") === 0,
     txt(doc.querySelector(".sortbar__city")));
  ok("兜底之后仍然有店铺", doc.querySelectorAll(".shop").length > 0,
     doc.querySelectorAll(".shop").length);
  dom.window.close();

  /* ------------------------------------------ 10. 地址簿也用三级 */
  console.log("\n=== 10. 地址簿编辑页用同一套三级选择 ===");
  const phone = "13" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  await fetch(`${ROOT}/api/user/code?phone=${phone}`, { method: "POST" });
  const code = (await fetch(`${ROOT}/api/user/code/dev?phone=${phone}`).then((r) => r.json())).data;
  const token = (await fetch(`${ROOT}/api/user/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code })
  }).then((r) => r.json())).data;

  ({ dom, errs } = await open("/address-edit.html"));
  doc = dom.window.document;
  doc.querySelector(".row--link").click();
  await sleep(250);
  ok("地址页也能打开三级选择器", doc.querySelectorAll(".rg").length === 1);
  await pick(doc, 0, "广东省");
  await pick(doc, 1, "深圳");
  await pick(doc, 2, "南山区");
  await confirm(doc);
  ok("省市区回填到表单行",
     /广东省 · 深圳 · 南山区/.test(txt(doc.querySelector(".row__v"))), txt(doc.querySelector(".row__v")));

  const inputs = [...doc.querySelectorAll(".inp")];
  const setInput = (el, v) => {
    el.value = v;
    el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  };
  setInput(inputs[0], "收件人");
  setInput(inputs[1], "13800000000");
  setInput(doc.querySelector(".txa"), "科苑路 15 号 A 座 1203");
  await sleep(120);
  ok("地区那行不再是「去选择」", txt(doc.querySelector(".row__v")).indexOf("去选择") === -1);
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
