/* ============================================================================
   QA 用的临时站点服务器：静态文件走 nginx 的 web 根目录，/api/* 转发到指定后端。

   为什么不直接用正在跑的 nginx(8080)：
     它的 proxy_pass 写死指向 8081，也就是**用户手上那个旧后端**。
     全国化改造要验的是新后端（8082），而改 nginx.conf 再 reload 会动到
     用户正在用的环境，还踩过"同一个 nginx 起了两遍、reload 只生效一半"的坑。
     所以这里起一个一次性的 Node 服务器，零副作用。

   跑法：
     NODE_PATH=... node _qa/static_proxy.js [监听端口=8085] [后端端口=8082]
   ========================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || 8085);
const BACKEND = Number(process.argv[3] || 8082);
const WEB_ROOT = path.join(__dirname, "..", "nginx-1.18.0", "html", "xhw");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

async function proxyApi(req, res) {
  const target = "http://127.0.0.1:" + BACKEND + req.url.slice("/api".length);
  const headers = {};
  // 只转发这两个：把 content-length 一起带过去会和实际 body 对不上，
  // undici 会直接抛错；其它头（host、connection 等）也不该由我们决定。
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (chunks.length) {
      init.body = Buffer.concat(chunks);
      init.duplex = "half";
    }
  }
  try {
    const r = await fetch(target, init);
    const buf = Buffer.from(await r.arrayBuffer());
    const out = { "content-type": r.headers.get("content-type") || "application/json; charset=utf-8" };
    res.writeHead(r.status, out);
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, errorMsg: "上游不可达: " + e.message }));
  }
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api")) return proxyApi(req, res);

  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(WEB_ROOT, p);
  // 目录穿越防护：拼出来的路径必须还在 web 根目录里
  if (!file.startsWith(WEB_ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found: " + p);
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      // 和 nginx 改完之后的策略一致：html/css/js 不缓存，改完刷新就能看到
      "cache-control": /\.(html|css|js)$/i.test(file) ? "no-cache" : "public, max-age=3600"
    });
    res.end(buf);
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`QA 站点 http://127.0.0.1:${PORT}  →  静态 ${WEB_ROOT}  /api 转发到 127.0.0.1:${BACKEND}`);
});
