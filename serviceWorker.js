importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const googleAnalytics = workbox.googleAnalytics;

googleAnalytics.initialize();

registerRoute(/\.(?:js|css|json)$/, new NetworkFirst({cacheName: 'static-cache'}));

registerRoute(/\.(?:png|jpg|jpeg|svg|gif|ico)$/,
    new NetworkFirst({cacheName: 'images-cache'})
);
