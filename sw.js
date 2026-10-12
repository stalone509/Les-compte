/* Ma journée fibre : mode hors-ligne */
var CACHE = "ma-journee-fibre-v1";
var INDEX = new URL("index.html", self.registration.scope).href;

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return fetch(new Request(INDEX, { cache: "reload" })).then(function (r) {
        if (r.ok) return c.put(INDEX, r);
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  var font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!same && !font) return;
  if (same && req.mode !== "navigate" && url.pathname.slice(-6) === "/sw.js") return;

  var key = req.mode === "navigate" ? INDEX : req;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key).then(function (cached) {
        var net = fetch(same ? new Request(req.url, { cache: "no-cache" }) : req).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
          return res;
        }).catch(function () { return null; });
        if (cached) { e.waitUntil(net); return cached; }
        return net.then(function (res) {
          if (res) return res;
          return req.mode === "navigate" ? cache.match(INDEX).then(function (i) { return i || Response.error(); }) : Response.error();
        });
      });
    })
  );
});
