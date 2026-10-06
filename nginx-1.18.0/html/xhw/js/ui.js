/* ============================================================================
   小红碗 · 视觉层  ui.js
   图标、星级、底部导航、画廊、toast，以及一个 $message 兼容垫片。
   垫片的目的是让业务代码里那 40 多处 this.$message.error(err) 一行都不用改。
   依赖：vue.js → common.js → 本文件
   ========================================================================= */

/* --------------------------------------------------------- 内联 SVG 图标 */
/* 全部 24×24 线性图标，统一 1.7 描边，颜色继承 currentColor。
   这样就不需要 Element UI 那套字体图标（element.css 235KB + element.js 575KB）。 */
const ICONS = {
  home: '<path d="M3.5 10.6 12 3.7l8.5 6.9"/><path d="M5.6 9.6V20h12.8V9.6"/><path d="M9.8 20v-5.2h4.4V20"/>',
  map: '<path d="M9 4.5 3.5 6.6v12.9L9 17.4l6 2.1 5.5-2.1V4.5L15 6.6z"/><path d="M9 4.5v12.9"/><path d="M15 6.6v12.9"/>',
  message: '<path d="M20.5 12.4c0 3.9-3.8 7.1-8.5 7.1-1 0-2-.15-2.9-.42L4 20.5l1.5-3.6c-.8-1.3-1.4-2.8-1.4-4.5 0-3.9 3.8-7.1 8.5-7.1s7.9 3.2 7.9 7.1z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c0-3.6 3.2-6.2 7.2-6.2s7.2 2.6 7.2 6.2"/>',
  plus: '<path d="M12 5.2v13.6"/><path d="M5.2 12h13.6"/>',
  back: '<path d="M14.5 5 7.5 12l7 7"/>',
  right: '<path d="M9.5 5l7 7-7 7"/>',
  down: '<path d="M5 9.5 12 16.5l7-7"/>',
  up: '<path d="M5 14.5 12 7.5l7 7"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.7 15.7 4.3 4.3"/>',
  pin: '<path d="M12 21.4s7-6.1 7-11A7 7 0 0 0 5 10.4c0 4.9 7 11 7 11z"/><circle cx="12" cy="10.2" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.3V12l3.3 2"/>',
  camera: '<path d="M3.5 8.9h3.3l1.5-2.5h7.4l1.5 2.5h3.3v10.3H3.5z"/><circle cx="12" cy="13.9" r="3.3"/>',
  close: '<path d="m6.6 6.6 10.8 10.8"/><path d="M17.4 6.6 6.6 17.4"/>',
  edit: '<path d="M4.6 19.4h3.1l9.7-9.7-3.1-3.1-9.7 9.7z"/><path d="m15.3 5.5 3.1 3.1"/>',
  thumb: '<path d="M4.3 10.8h3.2V20H4.3z"/><path d="M7.5 10.8 11.3 3.6a2 2 0 0 1 2.9 2.4l-1 3.3h5.1a2 2 0 0 1 2 2.6l-1.5 6a2 2 0 0 1-2 1.5H7.5z"/>',
  comment: '<path d="M20.5 11.8c0 3.5-3.4 6.4-7.6 6.4-.9 0-1.8-.13-2.6-.37L5.2 20.2l1.3-3.2c-1-1.1-1.6-2.6-1.6-4.2 0-3.5 3.4-6.4 7.6-6.4s7.9 2.9 7.9 6.4z"/>',
  check: '<path d="m5 12.6 4.6 4.6L19 7.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.6"/><circle cx="8.8" cy="9.7" r="1.7"/><path d="m4.5 17.6 4.6-4.4 3.4 3.2 3-2.8 4 3.7"/>',
  logout: '<path d="M15 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H15"/><path d="M18.5 12H10"/><path d="m15 8.5 3.5 3.5L15 15.5"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="1.6"/><path d="M3.5 10.5h17"/><path d="M8 3.6v3.8"/><path d="M16 3.6v3.8"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.3"/><path d="M12 8.1v.3"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.5 4.6v5.2h-5.2"/>',
  /* 收藏用。加它是因为 ICONS 表里原本没有星标，
     而收藏/点赞这一类「我标记过的东西」用星标是最常见的视觉约定。 */
  star: '<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/>',
  ticket: '<path d="M4 7.6h16v2.9a1.5 1.5 0 0 0 0 3v2.9H4v-2.9a1.5 1.5 0 0 0 0-3z"/><path d="M14.2 7.6v11" stroke-dasharray="2.4 2.4"/>',
  list: '<path d="M4 6.6h16"/><path d="M4 12h16"/><path d="M4 17.4h16"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5z"/>',
  lock: '<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.7"/><path d="M8.2 10.4V7.9a3.8 3.8 0 0 1 7.6 0v2.5"/>'
};

function iconSvg(name, size, filled) {
  if (!ICONS[name]) {
    // 写错图标名时给个线索，否则只会渲染出一个看不见的空 span
    console.warn("[tk-icon] 没有这个图标：" + name);
  }
  return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" ' +
    'fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
}

Vue.component("tk-icon", {
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
    filled: { type: Boolean, default: false }
  },
  computed: {
    svg: function () {
      return iconSvg(this.name, this.size, this.filled);
    }
  },
  template: '<span class="tk-ico" v-html="svg"></span>'
});

/* ================================================================= toast */
const ui = {};

(function () {
  let host = null;
  const MAX = 3;

  function ensureHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }

  const KIND = { error: "e", success: "s", warning: "w", info: "i" };
  const ICON_OF = { e: "close", s: "check", w: "info", i: "info" };

  function stringify(msg) {
    if (typeof msg === "string") return msg;
    if (msg === null || msg === undefined) return "";
    if (typeof msg === "object") {
      return msg.errorMsg || msg.message || msg.msg || "操作失败";
    }
    return String(msg);
  }

  /* 统一的消息出口。原来这里是 Element 的 $message，
     现在换成机打凭条样式：黑底、左侧一道彩边。 */
  ui.toast = function (msg, kind) {
    const k = KIND[kind] || KIND.info;
    const text = stringify(msg) || "操作失败";
    const h = ensureHost();

    while (h.children.length >= MAX) h.removeChild(h.firstChild);

    const el = document.createElement("div");
    el.className = "toast toast--" + k;

    const ic = document.createElement("span");
    ic.className = "toast__ic";
    ic.innerHTML = iconSvg(ICON_OF[k], 16);

    const tx = document.createElement("span");
    tx.textContent = text;   // 用 textContent，消息内容不进 DOM 解析

    el.appendChild(ic);
    el.appendChild(tx);
    h.appendChild(el);

    let done = false;
    function dismiss() {
      if (done) return;
      done = true;
      el.classList.add("out");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 180);
    }
    const timer = setTimeout(dismiss, 2800);
    el.addEventListener("click", function () {
      clearTimeout(timer);
      dismiss();
    });
    return dismiss;
  };

  /* ---- $message 兼容垫片 -------------------------------------------------
     业务代码里到处是 .catch(this.$message.error)，
     垫片让这些调用一行都不用改就切到新样式。 */
  Vue.prototype.$message = {
    error: function (m) { ui.toast(m, "error"); },
    success: function (m) { ui.toast(m, "success"); },
    warning: function (m) { ui.toast(m, "warning"); },
    info: function (m) { ui.toast(m, "info"); }
  };

  /* 后端 Result 里的 errorMsg 有时是空串，兜一下 */
  ui.err = function (e) {
    return ui.toast(e, "error");
  };
})();

/* ============================================================== 星级评分 */
/* 后端 score 是 1~5 分乘 10 存的。这里用「★ 叠色裁剪」做半星，
   不引入任何图标库，精度也是准的。 */
Vue.component("tk-stars", {
  props: {
    score: { default: 0 },
    showScore: { type: Boolean, default: false },
    size: { type: String, default: "md" }
  },
  computed: {
    pct: function () { return util.scorePct(this.score); },
    text: function () { return util.score(this.score).toFixed(1); }
  },
  template:
    '<span class="stars-wrap">' +
      '<span class="stars" :class="\'stars--\' + size" :aria-label="text + \' 分\'">' +
        '<span class="stars__b" aria-hidden="true">★★★★★</span>' +
        '<span class="stars__f" :style="{ width: pct + \'%\' }" aria-hidden="true">★★★★★</span>' +
      '</span>' +
      '<span v-if="showScore" class="num stars__n">{{ text }}</span>' +
    '</span>'
});

/* ============================================================== 底部导航 */
/* 组件名与 prop 都保持原样（foot-bar / active-btn），
   这样万一有页面没改到也不会白屏。 */
Vue.component("foot-bar", {
  props: { activeBtn: { default: 0 } },
  data: function () { return { unread: 0 }; },
  created: function () {
    var self = this;
    // 没登录就不问了。`/message/unread` 在 MvcConfig 里是放行的（未登录返回 0 而不是 401），
    // 否则每个页面一进来就会被送进登录页 —— 但连 token 都没有时少发一次请求更好。
    if (!util.hasToken()) return;
    axios.get("/message/unread", { silent401: true })
      .then(function (res) { self.unread = Number(res.data) || 0; })
      .catch(function () { /* 就是个小红点，拿不到就不显示 */ });
  },
  template:
    '<nav class="tk-ft" aria-label="主导航">' +
      '<a class="tk-ft__i" :class="{ on: activeBtn === 1 }" href="/index.html">' +
        '<tk-icon name="home" :size="21"/><span class="tk-ft__lb">首页</span>' +
      '</a>' +
      '<a class="tk-ft__i" :class="{ on: activeBtn === 2 }" href="/map.html">' +
        '<tk-icon name="map" :size="21"/><span class="tk-ft__lb">地图</span>' +
      '</a>' +
      '<a class="tk-ft__add" href="/blog-edit.html" aria-label="发笔记">' +
        '<span class="tk-ft__seal"><tk-icon name="plus" :size="22"/></span>' +
      '</a>' +
      '<a class="tk-ft__i" :class="{ on: activeBtn === 3 }" href="/message.html">' +
        '<tk-icon name="message" :size="21"/><span class="tk-ft__lb">消息</span>' +
        '<span class="tk-ft__dot" v-if="unread > 0">{{ unread > 99 ? "99+" : unread }}</span>' +
      '</a>' +
      '<a class="tk-ft__i" :class="{ on: activeBtn === 4 }" href="/info.html">' +
        '<tk-icon name="user" :size="21"/><span class="tk-ft__lb">我的</span>' +
      '</a>' +
    '</nav>'
});

/* ================================================================ 画廊 */
/* 原生 scroll-snap 横向滚动。触摸、鼠标滚轮、触控板、键盘都能用，
   比原来那 120 行手写 touchstart/touchmove/translate3d 稳得多。 */
Vue.component("tk-gallery", {
  props: {
    images: { type: Array, default: function () { return []; } },
    label: { type: String, default: "图片" }
  },
  data: function () {
    return { cur: 0 };
  },
  computed: {
    /* 只有一张图时不显示圆点和左右按钮 —— 一个按不动的按钮比没有按钮更糟 */
    many: function () { return this.images.length > 1; },
    canPrev: function () { return this.cur > 0; },
    canNext: function () { return this.cur < this.images.length - 1; }
  },
  methods: {
    onScroll: function (e) {
      const el = e.target;
      const w = el.clientWidth || 1;
      const n = Math.round(el.scrollLeft / w);
      this.cur = Math.max(0, Math.min(this.images.length - 1, n));
    },
    /** 跳到第 i 张。越界自动夹住，调用方不用先判断 */
    jump: function (i) {
      const n = Math.max(0, Math.min(this.images.length - 1, i));
      // 先改状态、再发滚动：圆点/计数立刻响应，不等平滑滚动结束。
      // 滚动过程中 onScroll 会把它校正成真实位置，所以这里不会说谎。
      // （顺带让这个交互在 jsdom 里可断言 —— 那里没有真正的滚动。）
      this.cur = n;
      const el = this.$refs.gal;
      if (!el) return;
      const left = n * el.clientWidth;
      // matchMedia 和 scrollTo 都做存在性判断：jsdom 里两者都不完整，
      // 真机上才走平滑滚动这条路。
      const reduce = typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (typeof el.scrollTo === "function") {
        el.scrollTo({ left: left, behavior: reduce ? "auto" : "smooth" });
      } else {
        el.scrollLeft = left;
      }
    },
    prev: function () { if (this.canPrev) this.jump(this.cur - 1); },
    next: function () { if (this.canNext) this.jump(this.cur + 1); }
  },
  template:
    '<div v-if="images.length" class="gal-wrap">' +
      /* .gal-hold 只是为了给左右按钮一个定位参照 —— 它的高就是图片区的高，
         按钮 top:50% 正好落在图片竖直中线上（不含下面的圆点条）。 */
      '<div class="gal-hold">' +
        '<div class="gal" ref="gal" @scroll="onScroll">' +
          '<div class="gal__i" v-for="(src, i) in images" :key="i">' +
            '<img :src="src" :alt="label + \' \' + (i + 1)" loading="lazy">' +
          '</div>' +
        '</div>' +
        '<template v-if="many">' +
          '<button class="gal__nav gal__nav--prev" type="button" :disabled="!canPrev"' +
          ' aria-label="上一张" title="上一张" @click="prev">' +
            '<tk-icon name="back" :size="18"></tk-icon>' +
          '</button>' +
          '<button class="gal__nav gal__nav--next" type="button" :disabled="!canNext"' +
          ' aria-label="下一张" title="下一张" @click="next">' +
            '<tk-icon name="right" :size="18"></tk-icon>' +
          '</button>' +
        '</template>' +
      '</div>' +
      '<div class="gal__bar" v-if="images.length > 1">' +
        '<div class="gal__dots">' +
          '<span class="gal__dot" v-for="(src, i) in images" :key="i"' +
          ' :class="{ on: i === cur }" @click="jump(i)"></span>' +
        '</div>' +
        '<span class="num gal__n">{{ cur + 1 }} / {{ images.length }}</span>' +
      '</div>' +
    '</div>'
});

/* ==================================================== 省 / 市 / 区 三级选择器 */
/* 三列并排、点哪列换哪列，和原生日期选择器一个思路。
 * 数据来自 GET /shop/regions（全国 34 省 / 390 市 / 3259 区）。
 *
 * 两个刻意的设计：
 * 1. 「有门店」和「没开门店」的城市都可选。没门店的城市用灰色 + 数量空着标出来，
 *    选中之后底部直接说明"这座城市还没有门店"并给一个跳转热门城市的按钮。
 *    反过来做成"没门店就不让选"，用户会以为这个 App 坏了一部分。
 * 2. 「全省」「全区」各留一个入口。级联选择器通常会自动填下一级，但那样就没法
 *    只按省筛选了（浙江省 ≠ 杭州市），所以两条路都留着。
 */
Vue.component("tk-region", {
  props: {
    open: { type: Boolean, default: false },
    value: { type: Object, default: function () { return { province: "", city: "", district: "" }; } },
    /* 选了城市之后要不要自动选中一个区。
       首页 / 店铺列表要 true：自动落到门店最多的那个区，进页面就有内容。
       地图页要 false：用户点「成都」是想过看整座城，
       自动落到某个区会让他以为另外几家店不见了。 */
    autoDistrict: { type: Boolean, default: true }
  },
  data: function () {
    return { list: [], p: "", c: "", d: "" };
  },

  computed: {
    provinces: function () { return this.list; },
    cities: function () {
      if (!this.p) return [];
      var hit = this.list.filter(function (x) { return x.name === this.p; }, this)[0];
      return hit ? (hit.cities || []) : [];
    },
    node: function () {
      // ⚠️ 这里必须把 this 作为 filter 的第二个参数传进去。
      // 写成 function(){ return x.name === this.c } 的话，回调里的 this 是
      // undefined（严格模式）而不是组件，node 永远是 null，
      // 第三级就永远是空的——而且不报任何错。
      var hit = this.cities.filter(function (x) { return x.name === this.c; }, this)[0];
      return hit || null;
    },
    districts: function () { return (this.node && this.node.districts) || []; },
    /* 自动落到「门店最多的那个区」。
       之前是 districts[0]，而行政区划是按编码排的，第一位往往是"上城区""彭州市"
       这种压根没有店的地方 —— 用户点一下城市就撞上空列表，体验上像是坏了。
       所以这里按门店数挑，挑不到就留空（= 全区）。 */
    topDistrict: function () {
      var best = null;
      this.districts.forEach(function (d) {
        if (!best || (d.count || 0) > (best.count || 0)) best = d;
      });
      return best && best.count > 0 ? best.name : "";
    },
    hot: function () {
      var out = [];
      this.list.forEach(function (p) {
        (p.cities || []).forEach(function (c) {
          if (c.count > 0) out.push({ province: p.name, name: c.name, count: c.count });
        });
      });
      out.sort(function (a, b) { return b.count - a.count; });
      return out.slice(0, 8);
    },
    /* 选中的城市一家店都没有时，给一句解释 + 一个去处。
       不解释的话，用户看到空列表只会觉得"这页坏了"。 */
    hint: function () {
      if (!this.c || (this.node && this.node.count > 0)) return "";
      var h = this.hot[0];
      return h ? this.c + " 还没有门店，先去 " + h.name + " 看看" : this.c + " 还没有门店";
    }
  },

  watch: {
    open: function (v) { if (v) this.reset(); }
  },

  created: function () {
    var self = this;
    // 区划树只拉一次，util 内部有缓存
    util.loadRegions().then(function (list) { self.list = list; });
  },

  methods: {
    reset: function () {
      var v = this.value || {};
      this.p = v.province || "";
      this.c = v.city || "";
      this.d = v.district || "";
    },
    pickAll: function () {
      this.p = ""; this.c = ""; this.d = "";
    },
    pickProvince: function (name) {
      this.p = name;
      var cities = this.cities;
      // 换省之后原来那个市多半不属于新省，直接落到第一家有门店的，否则第一家
      var keep = cities.filter(function (x) { return x.name === this.c; }, this)[0];
      var next = keep || cities.filter(function (x) { return x.count > 0; })[0] || cities[0];
      this.c = next ? next.name : "";
      this.d = this.autoDistrict ? this.topDistrict : "";
    },
    pickCity: function (name) {
      this.c = name;
      this.d = this.autoDistrict ? this.topDistrict : "";
    },
    pickDistrict: function (name) { this.d = name; },
    /* 「全省」/「全区」：只选到省/市，不带下一级 */
    clearCity: function () { this.c = ""; this.d = ""; },
    clearDistrict: function () { this.d = ""; },
    jumpHot: function () {
      var h = this.hot[0];
      if (!h) return;
      this.pickCity(h.name);
      this.p = h.province;
      this.pickCity(h.name);
    },
    confirm: function () {
      this.$emit("change", { province: this.p, city: this.c, district: this.d });
      this.$emit("close");
    }
  },

  /* 根节点必须挂在 open 上：否则组件一挂载就把抽屉渲染出来了，
     页面刚打开就盖着一层遮罩 */
  template:
    '<div v-if="open">' +
      '<div class="mask" @click="$emit(\'close\')"></div>' +
      '<div class="sheet rg" role="dialog" aria-label="选择区域">' +
        '<div class="sheet__hd">' +
          '<button class="hd__btn" type="button" @click="$emit(\'close\')" aria-label="关闭">' +
            '<tk-icon name="close" :size="18"></tk-icon></button>' +
          '<span class="sheet__t">选择区域</span>' +
          '<button class="rg__ok" type="button" @click="confirm">确定</button>' +
        '</div>' +

        '<div class="rg__hot">' +
          '<button class="rg__chip" type="button" :class="{ on: !p && !c }" @click="pickAll">全国</button>' +
          '<button class="rg__chip" type="button" v-for="h in hot" :key="h.name" ' +
            ':class="{ on: p === h.province && c === h.name && !d }" ' +
            '@click="p = h.province; pickCity(h.name)">{{ h.name }}</button>' +
        '</div>' +

        '<div class="rg__cols">' +
          '<div class="rg__col">' +
            '<button class="rg__it" type="button" v-for="pv in provinces" :key="pv.name" ' +
              ':class="{ on: pv.name === p }" @click="pickProvince(pv.name)">' +
              '<span class="ellip">{{ pv.name }}</span></button>' +
            '<div class="rg__none" v-if="!provinces.length">区划加载中…</div>' +
          '</div>' +

          '<div class="rg__col">' +
            '<button class="rg__it" type="button" v-if="cities.length > 1" ' +
              ':class="{ on: !c }" @click="clearCity">全省</button>' +
            '<button class="rg__it" type="button" v-for="cv in cities" :key="cv.name" ' +
              ':class="{ on: cv.name === c }" @click="pickCity(cv.name)">' +
              '<span class="ellip">{{ cv.name }}</span>' +
              '<span class="rg__n" v-if="cv.count">{{ cv.count }}</span></button>' +
            '<div class="rg__none" v-if="!cities.length">{{ p ? "该省不设市" : "先选省份" }}</div>' +
          '</div>' +

          '<div class="rg__col">' +
            '<button class="rg__it" type="button" v-if="districts.length > 1" ' +
              ':class="{ on: !d }" @click="clearDistrict">全区</button>' +
            '<button class="rg__it" type="button" v-for="dn in districts" :key="dn.name" ' +
              ':class="{ on: dn.name === d }" @click="pickDistrict(dn.name)">' +
              '<span class="ellip">{{ dn.name }}</span>' +
              '<span class="rg__n" v-if="dn.count">{{ dn.count }}</span></button>' +
            '<div class="rg__none" v-if="!districts.length">' +
              '{{ c ? "该市不设区" : "先选城市" }}</div>' +
          '</div>' +
        '</div>' +

        '<div class="rg__foot" v-if="hint">' +
          '<span>{{ hint }}</span>' +
          '<button class="rg__jump" type="button" v-if="hot.length" @click="jumpHot">去看看</button>' +
        '</div>' +
      '</div>' +
    '</div>'
});
