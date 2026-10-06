/* ============================================================================
 *  jsdom 跑地图页时用的「高德替身」。
 *
 *  为什么需要它：
 *    1. jsdom 没有 canvas / WebGL，真正的高德脚本跑不起来，一初始化就抛；
 *    2. 真去请求 webapi.amap.com 会拉 995 KB，慢，而且断网就挂；
 *    3. 更要紧的是——页面里 initMap 会等容器有高度（AMap 对 0 高度容器静默不渲染），
 *       而 jsdom **不做布局**，clientHeight 恒为 0，页面会一路重试到放弃。
 *
 *  这个替身做两件事：
 *    - 往 window 上塞一个假的 AMap，页面见到 window.AMap 就不会再去注入脚本；
 *    - 把 HTMLElement.prototype.clientHeight 伪装成固定值，
 *      让页面走到真正的「建图 → 画标记 → fitBounds」分支。
 *  于是"画了几个标记""有没有按区域重画"这类断言在 jsdom 里也能做了，
 *  调用记录挂在 window.__amap 上供断言读取。
 * ========================================================================== */

function install(win) {
  const log = {
    maps: 0,          // new AMap.Map 的次数
    markers: [],      // 每次 new AMap.Marker 的参数（含 position）
    bounds: [],       // fitBounds 收到的点
    fit: 0,           // setFitView 调用次数
    cleared: 0,       // clearMap 调用次数
    circles: 0,       // 定位后加的蓝点
    geo: 0            // new AMap.Geolocation 的次数
  };

  function LngLatBounds() { this.pts = []; }
  LngLatBounds.prototype.extend = function (p) { this.pts.push(p); log.bounds.push(p); };
  LngLatBounds.prototype.isEmpty = function () { return this.pts.length === 0; };

  function Marker(opt) {
    this.opt = opt;
    log.markers.push(opt);
  }
  Marker.prototype.on = function (ev, fn) { this.opt[ev] = fn; };
  Marker.prototype.setMap = function () {};
  Marker.prototype.setPosition = function () {};

  function Map(el, opt) {
    log.maps += 1;
    this.el = el;
    this.opt = opt;
  }
  Map.prototype.clearMap = function () {
    log.cleared += 1;
    // 真正的高德 clearMap 会清掉地图上的覆盖物，所以这里也把标记列表清空——
    // log.markers 的语义就是"此刻图上有几个标记"，页面切城市时会先 clear 再重画。
    log.markers.length = 0;
  };
  Map.prototype.setFitView = function () { log.fit += 1; };
  Map.prototype.setZoomAndCenter = function () {};
  Map.prototype.getZoom = function () { return 12; };
  Map.prototype.add = function () {};
  Map.prototype.remove = function () {};
  Map.prototype.destroy = function () {};

  function Pixel(x, y) { this.x = x; this.y = y; }
  function CircleMarker() { log.circles += 1; }

  function Geolocation() { log.geo += 1; }
  // 定位直接回调成功，坐标固定在一个已知点上，方便断言距离排序
  Geolocation.prototype.getCurrentPosition = function (cb) {
    cb("complete", { position: { lng: 120.149192, lat: 30.316078 } });  // 103茶餐厅 门口
  };
  Geolocation.prototype.getCityInfo = function () {};

  win.AMap = {
    Map: Map,
    Marker: Marker,
    LngLatBounds: LngLatBounds,
    Pixel: Pixel,
    CircleMarker: CircleMarker,
    Geolocation: Geolocation
  };
  win.__amap = log;

  // jsdom 不做布局，clientHeight 恒为 0；页面会一直等到超时才降级。
  // 给它一个假高度，让页面能走到真正的渲染分支。
  try {
    Object.defineProperty(win.HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: function () { return 320; }
    });
  } catch (e) { /* 拿不到就算了，页面会走降级分支，不算失败 */ }

  return log;
}

module.exports = { install: install };
