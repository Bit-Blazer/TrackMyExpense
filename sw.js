var CACHE_NAME = "expense-manager-cache";
var urlsToCache = [
  "style.css",
  "icons/favicon-32x32.png",
  "icons/favicon-16x16.png",
  "init.js",
  "transfer.js",
  "utils.js",
  "expense.js"
];

// cache after the first install
self.addEventListener("install", function (event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// listen for fetch events
self.addEventListener("fetch", function (event) {
  const requestURL = new URL(event.request.url);
  event.respondWith(
    caches.open(CACHE_NAME).then(async function (cache) {
      const response = await caches.match(event.request);
      var fetchPromise = fetch(event.request).then(function (networkResponse) {
        // cache same host files only
        if (requestURL.hostname === "" ||
          requestURL.hostname === "localhost")
          cache.put(event.request, networkResponse.clone());
        return networkResponse;
      });
      return response || fetchPromise;
    })
  );
});
