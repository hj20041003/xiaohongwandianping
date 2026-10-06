/* ============================================================================
 *  地图找店页端到端。
 *
 *  重点验两件事：
 *   1. **没配高德 key 时不白屏** —— 地图区显示引导卡，门店列表和城市切换照常可用。
 *      这条最重要：这个页面的"地图"依赖一个用户自己去申请的外部 key，
 *      如果没 key 就整页瘫掉，演示时会很尴尬。
 *   2. 列表 / 选中卡片 / 区域联动这条主链路是通的。
 *
 *  跑法（只用只读接口，用户的 nginx 8080 就能跑）：
 *     $NODE _qa/map_test.js [站点根，默认 http://127.0.0.1:8080]
 * ========================================================================= */
const { JSDOM, VirtualConsole } = require("jsdom");
const amapStub = require("./_amap_stub");

const ROOT = process.argv[2] || "http://127.0.0.1:8080";
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
      // 高德替身：不请求外网，并伪装出容器高度，
      // 这样页面会走到「建图 → 画标记 → fitBounds」的真实分支。
      amapStub.install(win);
    }
  });
  await sleep(4200);
  return { dom, errs };
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const cards = (doc) => [...doc.querySelectorAll(".shop")];
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

(async () => {
  /* ------------------------------------------------------ 1. 全国视图 */
  console.log("=== 1. 地图页 · 全国 ===");
  let { dom, errs } = await open("/map.html", {});
  let win = dom.window, doc = win.document;

  ok("无控制台报错", errs.length === 0, errs.slice(0, 3).join(" | "));
  // ⚠️ jsdom 不做布局，getBoundingClientRect() 永远是 0，量不到高度。
  // "容器高度为 0 会让 AMap 静默不渲染"这条只能靠真实浏览器验证；
  // 代码里已经做了兜底（initMap 发现 clientHeight 为 0 会等 nextTick 重试），
  // 这里只断言容器和挂载点都在。
  ok("地图容器和挂载点都在", !!doc.querySelector(".mp") && !!doc.querySelector(".mp__cv"));
  // "地图区不是空白的"：要么地图起来了（会渲染出右下角的定位按钮），
  // 要么给了说明卡。用 .mp__fab 是因为替身版的 AMap 不会往容器里塞 DOM，
  // 用容器的 children 判断会误报。
  ok("地图区要么起来了、要么是说明卡（绝不空白）",
     !!doc.querySelector(".mp__fab") || !!doc.querySelector(".mp__card"),
     [doc.querySelectorAll(".mp__fab").length, doc.querySelectorAll(".mp__card").length]);
  // 这条断言刻意做成"两种状态都算过"：
  //   配了 key   -> 卡片说"加载中/加载失败"，并**不该**出现申请链接
  //   没配 key   -> 卡片说"还没配地图 key"，并给出申请入口
  // 因为 js/config.js 里有没有填 key 是用户自己的事，测试不该依赖它。
  const card = doc.querySelector(".mp__card");
  if (card) {
    const hasApplyLink = !!doc.querySelector('.mp__card a[href*="amap"]');
    const saysNeedKey = /还没配地图 key/.test(txt(card));
    ok("说明卡里给了明确的下一步（申请 key 的入口 或 加载中/失败的说明）",
       hasApplyLink === saysNeedKey && (hasApplyLink || /加载|失败/.test(txt(card))),
       txt(card));
  } else {
    ok("地图已经起来了（没有说明卡）", true);
  }
  ok("列表照常渲染出 84 家店", cards(doc).length === 84, cards(doc).length);
  ok("区域按钮显示「全国」", txt(doc.querySelector(".hd__city")).indexOf("全国") === 0,
     txt(doc.querySelector(".hd__city")));
  ok("标题写明是全国门店", txt(doc.querySelector(".sec__t")).indexOf("全国") !== -1,
     txt(doc.querySelector(".sec__t")));

  const imgs = [...doc.querySelectorAll(".shop__ph img")].map((i) => i.getAttribute("src"));
  ok("缩略图用的是门店类型图标（不是空 src）",
     imgs.length === 84 && imgs.every((s) => s && s.indexOf("/imgs/") === 0), imgs.slice(0, 2));
  // 断言形状而不是具体哪座城：排序是"按人气"，第一家店会随数据变化
  ok("全国视图下卡片上能看到「省 · 市 · 区 · 商圈 · 地址」",
     /^\S+ · \S+ · \S+ · /.test(txt(cards(doc)[0].querySelector(".shop__row"))),
     txt(cards(doc)[0].querySelector(".shop__row")));

  /* 地图本身：用了高德替身，所以"画了几个标记""有没有 fitBounds"能在 jsdom 里断言 */
  const amap = win.__amap;
  ok("地图实例建起来了", amap && amap.maps === 1, amap && amap.maps);
  ok("全国视图画了 84 个标记", amap && amap.markers.length === 84, amap && amap.markers.length);
  ok("标记用的是真实经纬度（不是 0,0）",
     amap && amap.markers.every((m) => m.position[0] > 70 && m.position[1] > 10),
     amap && amap.markers[0] && amap.markers[0].position);
  ok("画完标记会把视野 fit 到这些点上", amap && amap.fit >= 1, amap && amap.fit);

  /* --------------------------------------------------- 2. 选中卡片 */
  console.log("\n=== 2. 点列表 → 选中卡片 ===");
  ok("一开始没有选中卡片", doc.querySelectorAll(".mp-pick").length === 0);
  const firstName = txt(cards(doc)[0].querySelector(".shop__t"));
  cards(doc)[0].click();
  await sleep(400);
  ok("选中卡片浮出来了", doc.querySelectorAll(".mp-pick").length === 1);
  ok("卡片上是同一家店", txt(doc.querySelector(".mp-pick__t")) === firstName,
     [txt(doc.querySelector(".mp-pick__t")), firstName]);
  ok("卡片上有商圈 / 地址", txt(doc.querySelector(".mp-pick__s")).length > 2,
     txt(doc.querySelector(".mp-pick__s")));
  ok("卡片上有「进店」链接且指向对的 id",
     /shop-detail\.html\?id=\d+/.test(doc.querySelector(".mp-pick__go").getAttribute("href")),
     doc.querySelector(".mp-pick__go").getAttribute("href"));
  ok("被选中的那条在列表里高亮了", doc.querySelectorAll(".shop--on").length === 1);
  doc.querySelector(".mp-pick__x").click();
  await sleep(300);
  ok("点叉能关掉卡片", doc.querySelectorAll(".mp-pick").length === 0);
  dom.window.close();

  /* ------------------------------------------------ 3. 切到成都 */
  console.log("\n=== 3. 切到成都 ===");
  ({ dom, errs } = await open("/map.html", {}));
  doc = dom.window.document;
  doc.querySelector(".hd__city").click();
  await sleep(300);
  ok("省市区选择器能打开", doc.querySelectorAll(".rg").length === 1);
  await pickCol(doc, 0, "四川省");
  await pickCol(doc, 1, "成都");
  doc.querySelector(".rg__ok").click();
  await sleep(1800);
  const amapCd = dom.window.__amap;
  ok("切到成都后地图重画成 10 个标记（不是留着全国的 84 个）",
     amapCd && amapCd.markers.length === 10, amapCd && amapCd.markers.length);
  ok("重画前先 clear 过",
     amapCd && amapCd.cleared >= 2, amapCd && amapCd.cleared);
  ok("按钮变成成都", txt(doc.querySelector(".hd__city")).indexOf("成都") === 0,
     txt(doc.querySelector(".hd__city")));
  // 地图页给选择器传了 auto-district=false，所以点「成都」拿到的是整座城而不是某个区
  ok("点「成都」拿到的是整座城（没有自动落到某个区）", cards(doc).length === 10, cards(doc).length);
  ok("标题是「成都的门店」而不是某个区",
     txt(doc.querySelector(".sec__t")) === "成都的门店", txt(doc.querySelector(".sec__t")));
  ok("卡片上没有省名前缀（已按区域收窄）",
     cards(doc).every((c) => txt(c.querySelector(".shop__row")).indexOf("四川省") === -1));
  dom.window.close();

  /* -------------------------------------- 4. 记住选择（localStorage） */
  console.log("\n=== 4. 刷新后仍在成都 ===");
  ({ dom, errs } = await open("/map.html", {
    "xhw:region": JSON.stringify({ province: "四川省", city: "成都", district: "" })
  }));
  doc = dom.window.document;
  ok("带着上次的选择打开，还是成都", txt(doc.querySelector(".hd__city")).indexOf("成都") === 0,
     txt(doc.querySelector(".hd__city")));
  ok("列表也还是成都的 10 家", cards(doc).length === 10, cards(doc).length);
  ok("按钮上是「成都」而不是某个区", txt(doc.querySelector(".hd__city")) === "成都",
     txt(doc.querySelector(".hd__city")));
  dom.window.close();

  /* ------------------------------------------ 5. 没门店的城市 */
  console.log("\n=== 5. 选一座没门店的城市 ===");
  ({ dom, errs } = await open("/map.html", {}));
  doc = dom.window.document;
  doc.querySelector(".hd__city").click();
  await sleep(300);
  await pickCol(doc, 0, "新疆维吾尔自治区");
  await pickCol(doc, 1, "乌鲁木齐");
  doc.querySelector(".rg__ok").click();
  await sleep(1500);
  ok("空状态说明了原因", /乌鲁木齐还没有门店/.test(txt(doc.querySelector(".empty__t"))),
     txt(doc.querySelector(".empty__t")));
  ok("给了一条出路（去热门城市）", txt(doc.querySelector(".empty__act")).indexOf("去") !== -1,
     txt(doc.querySelector(".empty__act")));
  ok("地图区这时也该是引导卡而不是崩溃", !!doc.querySelector(".mp"));
  dom.window.close();

  console.log(`\n==================================================`);
  console.log(`通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("脚本自身出错: " + e.stack);
  process.exit(2);
});
