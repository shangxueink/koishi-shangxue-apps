// ==UserScript==
// @name         Koishi Market Registry Redirector
// @namespace    https://koishi.chat/
// @version      1.1
// @description  将 Koishi 注册表请求重定向到更新的镜像，使用 yumetsuki.moe 提供的镜像源。
// @author       shangxueink
// @license      MIT 
// @match        https://koishi.chat/zh-CN/market/*
// @match        https://koishi.chat/market/*
// @grant        none
// @run-at       document-start
// @icon         https://koishi.chat/logo.png
// ==/UserScript==


(function () {
    'use strict';

    // ===== 配置项 =====
    const CONFIG = {
        // 需要被替换的原始 URL (可以是部分 URL，脚本会检查是否包含此字符串)
        sourceUrl: 'registry.koishi.chat/index.json',

        // 替换成的目标 URL (完整 URL)
        targetUrl: 'https://koishi-registry-cf.yumetsuki.moe/index.json',

        // 是否在控制台输出调试信息
        debug: true,

        // 是否添加时间戳参数以避免缓存 (设为 true 会在目标 URL 后添加 ?t=时间戳)
        avoidCache: false
    };
    // ===== 配置项 =====

    const log = function (...args) {
        if (CONFIG.debug) {
            console.log('[Koishi Registry Redirector]', ...args);
        }
    };

    // 获取目标 URL 
    const getTargetUrl = function () {
        if (CONFIG.avoidCache) {
            const timestamp = new Date().getTime();
            const separator = CONFIG.targetUrl.includes('?') ? '&' : '?';
            return `${CONFIG.targetUrl}${separator}t=${timestamp}`;
        }
        return CONFIG.targetUrl;
    };

    // 创建一个 XMLHttpRequest 代理
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        // 检查 URL 是否是我们想要重定向的
        if (url && typeof url === 'string' && url.includes(CONFIG.sourceUrl)) {
            log('拦截到 XHR 请求:', url);
            // 替换为新的 URL
            url = getTargetUrl();
            log('重定向到:', url);
        }

        return originalXHROpen.apply(this, arguments.length === 1 ? [method] : arguments.length === 2 ? [method, url] : arguments.length === 3 ? [method, url, async] : arguments.length === 4 ? [method, url, async, user] : [method, url, async, user, password]);
    };

    // 拦截 请求
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (input && typeof input === 'string' && input.includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (字符串):', input);
            // 替换  URL
            input = getTargetUrl();
            log('重定向到:', input);
        } else if (input && input instanceof Request && input.url.includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (Request):', input.url);
            // 创建一个新的 Request 对象，但使用新的 URL
            input = new Request(getTargetUrl(), input);
            log('重定向到:', input.url);
        }

        // 调用原始 fetch 方法
        return originalFetch.call(this, input, init);
    };

    // （if）监听 Service Worker 请求
    if (navigator.serviceWorker) {
        log('检测到 Service Worker 支持，添加消息监听器');
        navigator.serviceWorker.addEventListener('message', function (event) {
            if (event.data && event.data.type === 'FETCH' && event.data.url && event.data.url.includes(CONFIG.sourceUrl)) {
                log('拦截到 Service Worker 请求:', event.data.url);
                event.data.url = getTargetUrl();
                log('重定向到:', event.data.url);
            }
        });
    }

    log('脚本已启动 - 将', CONFIG.sourceUrl, '重定向到', CONFIG.targetUrl);
})();
