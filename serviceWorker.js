importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;
const googleAnalytics = workbox.googleAnalytics;

googleAnalytics.initialize();
registerRoute(/\.(?:js|css|json)$/, new NetworkFirst({cacheName: 'static-cache'}));

registerRoute(/\.(?:png|jpg|jpeg|svg|gif|ico)$/,
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 30,
                maxAgeSeconds: 7 * 24 * 60 * 60,
            })
        ]
    })
);

registerRoute(
    new RegExp('https://data.cdc.gov/.+'),
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
            })
        ]
    })
);

workbox.precaching.precacheAndRoute([{url: 'index.html', revision: `${new Date().getTime()}`}]);
