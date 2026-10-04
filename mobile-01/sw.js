"use strict";

const CACHE_PREFIX = "ember-ember-mobile-01-";
const CACHE_NAME = "ember-ember-mobile-01-27ee268a966440e1";
const PRECACHE_URLS = Object.freeze([
  "./app.js",
  "./build-manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./logic.js",
  "./manifest.webmanifest",
  "./probe-bootstrap.js",
  "./probe-shell.css",
  "./styles.css"
]);

self.addEventListener("install", function installProbeWorker(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function precacheProbe(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener("activate", function activateProbeWorker(event) {
  event.waitUntil(
    caches.keys().then(function removeOldProbeCaches(names) {
      return Promise.all(names.map(function removeOldProbeCache(name) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) return caches.delete(name);
        return false;
      }));
    }).then(function claimProbeClients() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function fetchProbeAsset(event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(function cachedProbeShell(cache) {
        return cache.match("./index.html").then(function useCachedProbeShell(response) {
          return response || Response.error();
        });
      })
    );
    return;
  }

  const allowedAssets = new Set(PRECACHE_URLS.map(function resolvePrecacheUrl(asset) {
    return new URL(asset, self.registration.scope).href;
  }));
  if (!allowedAssets.has(requestUrl.href)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function cachedProbeAsset(cache) {
      return cache.match(request).then(function useCachedProbeAsset(response) {
        return response || fetch(request);
      });
    })
  );
});
