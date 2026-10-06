/* ============================================================================
   小红碗 · 通信层与工具集  common.js
   ----------------------------------------------------------------------------
   ↓↓↓ 这一段是全站唯一的接口契约，改前端时不要动它 ↓↓↓
     baseURL = "/api"          nginx 在 /api/ 处剥掉前缀转发到 8081
     header  authorization     值就是 sessionStorage 里的 token，
                               后端拿它去读 login:token:{token} 这个 hash
     响应体 = Result            { success, errorMsg, data, total }
                               success=false 时拦截器直接 reject(errorMsg)
                               success=true 时拦截器返回的是整个 Result，
                               所以业务里统一写 .then(({ data }) => ...)
     HTTP 401                  一律跳 /login.html
   ↑↑↑ ------------------------------------------------------------------ ↑↑↑
   ========================================================================= */

let commonURL = "/api";

axios.defaults.baseURL = commonURL;

/* 原值是 2000ms。秒杀接口在并发下会超过 2 秒，会把一次成功下单
   误判成「服务器异常」，用户以为没抢到、其实已经扣了库存。 */
axios.defaults.timeout = 10000;

/* 保留这个全局变量：部分页面在模板里直接写了 v-if="!token" */
let token = sessionStorage.getItem("token");

axios.interceptors.request.use(
  function (config) {
    // 每次现取，避免登录后不刷页时拿到过期值
    const t = sessionStorage.getItem("token");
    if (t) config.headers["authorization"] = t;
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function (response) {
    if (!response.data.success) {
      return Promise.reject(response.data.errorMsg || "操作失败");
    }
    return response.data;
  },
  function (error) {
    const status = error.response && error.response.status;
    const cfg = error.config || {};
    if (status === 401) {
      // 带上 silent401 的请求只是「顺便看看有没有登录」，不该把人踢去登录页。
      // 例如笔记详情页要判断"要不要显示关注按钮"，未登录是正常情况。
      if (cfg.silent401) return Promise.reject("请先登录");
      setTimeout(function () {
        location.href = "/login.html?from=" +
          encodeURIComponent(location.pathname + location.search);
      }, 200);
      return Promise.reject("请先登录");
    }
    if (error.code === "ECONNABORTED") return Promise.reject("请求超时，请重试");
    if (!error.response) return Promise.reject("连不上服务器，确认后端是否已启动");
    if (status === 400) return Promise.reject("请求参数不对（400）");
    if (status === 404) return Promise.reject("接口不存在（404）");
    if (status === 500) return Promise.reject("服务器内部错误（500），看后端日志");
    return Promise.reject("服务器异常（" + status + "）");
  }
);

/* 空值一律不拼进 query string：
   /shop/of/type 的 typeId 是 @RequestParam 必填，发一个空的 typeId=
   会被 Spring 判成 400。宁可让调用方自己保证参数存在。 */
axios.defaults.paramsSerializer = function (params) {
  const parts = [];
  Object.keys(params).forEach(function (k) {
    const v = params[k];
    if (v === undefined || v === null || v === "") return;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
  });
  return parts.join("&");
};

/* ==========================================================================
   工具集
   ========================================================================= */
const util = {
  commonURL: commonURL,

  /* --------------------------------------------------------------- URL */
  getUrlParam: function (name) {
    const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    const r = window.location.search.substr(1).match(reg);
    return r != null ? decodeURIComponent(r[2]) : "";
  },
  param: function (name) {
    return util.getUrlParam(name);
  },
  go: function (url) {
    location.href = url;
  },
  back: function () {
    if (history.length > 1) history.back();
    else location.href = "/index.html";
  },
  hasToken: function () {
    return !!sessionStorage.getItem("token");
  },
  /* 未登录就带上当前地址去登录页，登录完能原路返回 */
  requireLogin: function () {
    if (util.hasToken()) return true;
    location.href = "/login.html?from=" +
      encodeURIComponent(location.pathname + location.search);
    return false;
  },
  loginUrl: function () {
    return "/login.html";
  },
  logout: function () {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userInfo");
    location.href = "/index.html";
  },

  /* --------------------------------------------------------------- 金额 */
  /* 后端所有金额字段（payValue / actualValue / avgPrice）单位都是「分」 */
  money: function (fen) {
    if (fen === null || fen === undefined || fen === "") return "0.00";
    const n = Number(fen);
    if (!isFinite(n)) return "0.00";
    return (n / 100).toFixed(2);
  },
  /* 票面上「￥」+ 大整数 + 小零头要分开排版 */
  moneyParts: function (fen) {
    const s = util.money(fen);
    const i = s.indexOf(".");
    return { int: s.slice(0, i), dec: s.slice(i) };
  },
  /* 兼容老页面的名字 */
  formatPrice: function (fen) {
    return util.money(fen);
  },

  /* ------------------------------------------------------------ 图片路径 */
  /* 后端返回的路径有的带前导斜杠、有的不带；上传接口返回的还没有 /imgs 前缀。
     这里统一补齐，外部 CDN 一律不碰。 */
  asset: function (p) {
    if (!p) return "";
    const s = String(p).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//i.test(s) || s.indexOf("data:") === 0) return s;
    return s.charAt(0) === "/" ? s : "/" + s;
  },
  imgPath: function (p) {
    const s = util.asset(p);
    if (!s) return "";
    return s.indexOf("/imgs/") === 0 ? s : "/imgs" + s;
  },
  iconUrl: function (p) {
    const s = util.asset(p);
    return s || "/imgs/icons/default-icon.png";
  },
  splitImages: function (s) {
    if (!s) return [];
    return String(s).split(",").map(function (x) {
      return util.asset(x.trim());
    }).filter(Boolean);
  },
  /* 列表里只取第一张，省流量 */
  firstImage: function (s) {
    const list = util.splitImages(s);
    return list.length ? list[0] : "";
  },

  /* -------------------------------------------------------------- 编号 */
  /* 票据上的机打编号，固定位数、前补零 */
  no: function (id, len) {
    const s = String(id === null || id === undefined ? "" : id);
    return "No." + s.padStart(len || 6, "0");
  },

  /* -------------------------------------------------------------- 时间 */
  parse: function (v) {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const d = new Date(typeof v === "string" ? v.replace(" ", "T") : v);
    return isNaN(d.getTime()) ? null : d;
  },
  dateCn: function (v) {
    const d = util.parse(v);
    if (!d) return "";
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  },
  dateTimeCn: function (v) {
    const d = util.parse(v);
    if (!d) return "";
    return util.dateCn(d) + " " + util.pad2(d.getHours()) + ":" + util.pad2(d.getMinutes());
  },
  ago: function (v) {
    const d = util.parse(v);
    if (!d) return "";
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "刚刚";
    if (s < 3600) return Math.floor(s / 60) + " 分钟前";
    if (s < 86400) return Math.floor(s / 3600) + " 小时前";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " 天前";
    return util.dateCn(d);
  },
  pad2: function (n) {
    return String(n).padStart(2, "0");
  },
  /* 秒 → 倒计时。超过一天就带上"天"，否则 2030 年到期的券会显示成
     "28510:46:42" 这种没人看得懂的数字。 */
  clock: function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const hms = util.pad2(h) + ":" + util.pad2(m) + ":" + util.pad2(s);
    return d > 0 ? d + "天" + hms : hms;
  },

  /* -------------------------------------------------------------- 数值 */
  score: function (v) {
    const n = Number(v);
    return isFinite(n) ? n / 10 : 0;
  },
  /* 评分是 1~5 分乘 10 存的（47 = 4.7）。这里换算成星条填充百分比 */
  scorePct: function (v) {
    const n = Number(v);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, (n / 50) * 100));
  },
  dist: function (m) {
    const n = Number(m);
    if (!isFinite(n) || n <= 0) return "";
    return n < 1000 ? Math.round(n) + "m" : (n / 1000).toFixed(1) + "km";
  },

  /* -------------------------------------------------------------- 区域 */
  /* 省 / 市 / 区三级。三个字段都可以是空串，语义是"不按这一级过滤"，
     三个都空 = 全国。层级名和后端 regions.json、tb_shop.province/city/district
     必须**逐字一致**，差一个字筛选就会静默返回空——所以这三处的名字都别自己改。 */
  ALL_CITY: "全国",
  REGION_KEY: "xhw:region",
  CITY_KEY: "xhw:city",

  getRegion: function () {
    try {
      const v = JSON.parse(localStorage.getItem(util.REGION_KEY) || "null");
      if (v && typeof v === "object") {
        return {
          province: v.province || "",
          city: v.city || "",
          district: v.district || ""
        };
      }
    } catch (e) { /* 存坏了就当没选过 */ }
    return { province: "", city: "", district: "" };
  },
  setRegion: function (r) {
    const v = {
      province: (r && r.province) || "",
      city: (r && r.city) || "",
      district: (r && r.district) || ""
    };
    try { localStorage.setItem(util.REGION_KEY, JSON.stringify(v)); } catch (e) {}
    return v;
  },
  isAllRegion: function (r) {
    r = r || util.getRegion();
    return !r.province && !r.city && !r.district;
  },
  /* 标签取最细的那一级：选了区就只显示区，否则市，再否则省 */
  regionLabel: function (r) {
    r = r || util.getRegion();
    return r.district || r.city || r.province || util.ALL_CITY;
  },
  /* 「浙江省 · 杭州市 · 拱墅区」，只拼已选的部分 */
  regionText: function (r) {
    r = r || util.getRegion();
    return [r.province, r.city, r.district].filter(Boolean).join(" · ") || util.ALL_CITY;
  },

  /* 全国区划树。34 省 / 390 市 / 3259 区，约 55 KB，
     一次会话只请求一次，切城市不重复打接口。 */
  regionCache: null,
  loadRegions: function () {
    if (util.regionCache) return Promise.resolve(util.regionCache);
    return axios.get("/shop/regions", { silent401: true })
      .then(function (res) {
        util.regionCache = res.data || [];
        return util.regionCache;
      })
      .catch(function () {
        /* 接口挂了也不能让选择器变成一片空白，至少还能选「全国」 */
        util.regionCache = [];
        return util.regionCache;
      });
  },
  provinces: function () { return util.regionCache || []; },
  citiesOf: function (province) {
    var hit = (util.regionCache || []).filter(function (p) { return p.name === province; })[0];
    return hit ? (hit.cities || []) : [];
  },
  cityNode: function (province, city) {
    var hit = util.citiesOf(province).filter(function (c) { return c.name === city; })[0];
    return hit || null;
  },
  /* 有门店的城市，按门店数降序。给"热门城市"快捷入口用。 */
  hotCities: function (limit) {
    var out = [];
    (util.regionCache || []).forEach(function (p) {
      (p.cities || []).forEach(function (c) {
        if (c.count > 0) out.push({ province: p.name, name: c.name, count: c.count });
      });
    });
    out.sort(function (a, b) { return b.count - a.count; });
    return limit ? out.slice(0, limit) : out;
  },

  /* ------------------------------------------------------------------
     城市坐标（GEO 查询的圆心）
     ⚠️ 这里刻意用 /shop/cities 给的「该城所有店铺坐标的均值」，
     而不是 regions.json 里的行政区中心点。原因是 /shop/of/type 的 GEO
     搜索半径写死 5000m，而种子数据的店是按 ±0.018 度（约 2km）抖动生成的：
     用店铺均值当圆心，每家店都稳稳落在半径内；
     用行政区中心点，位置偏一点的店就会掉出半径，列表"莫名其妙少几家"。
     ------------------------------------------------------------------ */
  cityCache: null,
  loadCities: function () {
    if (util.cityCache) return Promise.resolve(util.cityCache);
    return axios.get("/shop/cities", { silent401: true })
      .then(function (res) {
        util.cityCache = res.data || [];
        return util.cityCache;
      })
      .catch(function () {
        util.cityCache = [];
        return util.cityCache;
      });
  },
  cityPos: function (city) {
    if (!city) return null;
    var hit = (util.cityCache || []).filter(function (c) { return c.name === city; })[0];
    if (!hit || hit.x === null || hit.x === undefined) return null;
    return { x: hit.x, y: hit.y };
  },
  /* 这座城市有没有门店（用来决定要不要给"换一座"的引导）。
     只传一个参数时按"当前选中的市"算。 */
  cityCount: function (province, city) {
    if (city === undefined) {
      var r = util.getRegion();
      province = r.province;
      city = r.city;
    }
    var node = util.cityNode(province, city);
    return node ? (node.count || 0) : 0;
  },

  /* 两点球面距离（米）。
     地图页要按「我离这家店多远」排序，后端只对「当前城市 + 已知圆心」算过距离，
     浏览器定位这个圆心是前端才知道的，所以这里自己算一次。
     Haversine 公式：把经纬度当成单位球面上的两点，算大圆弧长。
     误差在几百米量级，够「2.3km / 850m」这种展示用了。 */
  haversine: function (lng1, lat1, lng2, lat2) {
    if ([lng1, lat1, lng2, lat2].some(function (v) { return v === null || v === undefined || isNaN(v); })) {
      return null;
    }
    var R = 6371000;                       // 地球半径（米）
    var toRad = function (d) { return d * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
  },

  /* -------------------------------------------------------------- 文本 */
  esc: function (s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
  /* 笔记正文：种子数据里用的是 <br/> 排版，外加少量把换行写成字面量
     \r\n \n 的情况。三种都要先还原成真换行，再整体转义。
     顺序很关键——先还原、后转义，这样 <br/> 变成换行而其它标签被中和，
     既保住原来的排版，又不给 XSS 留口子
     （原来直接 v-html 原始内容，是一处实打实的注入点） */
  rich: function (text) {
    let t = String(text === null || text === undefined ? "" : text);
    t = t.replace(/\\r\\n|\\n|\\r/g, "\n")      // 字面量 \r\n、\n、\r
         .replace(/\r\n?/g, "\n")              // 真回车
         .replace(/<br\s*\/?>/gi, "\n")        // 正文排版用的 <br> / <br/>
         .trim();
    if (!t) return "";
    // 空行分段，段内单换行折行
    return t.split(/\n{2,}/).map(function (p) {
      return "<p>" + util.esc(p.trim()).replace(/\n/g, "<br>") + "</p>";
    }).filter(function (p) { return p !== "<p></p>"; }).join("");
  },
  /* 用户输入的搜索词、标题等，进 DOM 前也要过一遍 */
  safe: function (s) {
    return util.esc(s);
  },

  /* -------------------------------------------------- 触底加载（哨兵） */
  /* 用 IntersectionObserver 代替手算 scrollTop + offsetHeight > scrollHeight：
     后者在 header / 底栏是 fixed 的布局下会因为高度算错而反复触发。 */
  onBottom: function (el, cb, opts) {
    if (!el || typeof IntersectionObserver === "undefined") {
      return { disconnect: function () {} };
    }
    let busy = false;
    const ob = new IntersectionObserver(function (entries) {
      const hit = entries.some(function (e) { return e.isIntersecting; });
      if (hit && !busy) {
        busy = true;
        Promise.resolve(cb()).finally(function () {
          // 留一帧，避免同一次滚动里连发
          setTimeout(function () { busy = false; }, 120);
        });
      }
    }, Object.assign({ rootMargin: "160px 0px" }, opts || {}));
    ob.observe(el);
    return ob;
  }
};

window.util = util;
