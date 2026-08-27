/**
 * 本文件由 Copilot 生成，sw 配置实在是太难写了 😭
 */

const CACHE_NAME = 'qlogo-cache-v1'
// const CACHE_DURATION = 1000;
const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000

self.addEventListener('install', (event) => {
    // 跳过等待，立即激活
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    // 清理旧缓存
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                    }
                }),
            )
        }),
    )
})

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)

    // sw.js 本身的请求不缓存
    if (url.pathname === '/sw.js') {
        return
    }

    if (url.hostname === 'q1.qlogo.cn') {
        // 对于 QQ 头像的请求，缓存三天
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        return response
                    }

                    return fetch(event.request).then((response) => {
                        const responseClone = response.clone()
                        cache.put(event.request, responseClone)
                        return response
                    })
                })
            }),
        )
    } else {
        // 对于其他请求，采用默认的网络优先策略
        event.respondWith(fetch(event.request))
    }
})
