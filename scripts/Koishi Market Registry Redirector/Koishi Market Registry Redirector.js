// ==UserScript==
// @name         Koishi Market Registry Redirector
// @namespace    https://github.com/shangxueink
// @version      1.8
// @description  将 Koishi 市场注册表请求重定向到多个备用镜像源，支持自动重试，并修复时间显示问题。
// @author       shangxueink
// @license      MIT
// @match        https://koishi.chat/zh-CN/market/*
// @match        https://koishi.chat/market/*
// @grant        none
// @run-at       document-start
// @homepageURL  https://greasyfork.org/zh-CN/scripts/533105-koishi-market-registry-redirector
// @updateURL    https://update.greasyfork.org/scripts/533105/Koishi%20Market%20Registry%20Redirector.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/533105/Koishi%20Market%20Registry%20Redirector.user.js
// @icon         https://koishi.chat/logo.png
// @supportURL   https://github.com/shangxueink/koishi-shangxue-apps/issues
// ==/UserScript==

(function () {
    'use strict';

    // ===== 配置项 =====
    const CONFIG = {
        // 需要被替换的原始 URL 
        // 可以是部分 URL，脚本会检查是否包含此字符串 
        sourceUrl: 'registry.koishi.chat/index.json',

        // 备用镜像源列表（按优先级 降序排列）
        mirrorUrls: [
            "https://koishi-registry.yumetsuki.moe/",
            "https://registry.koishi.t4wefan.pub/index.json",
            "https://kp.itzdrli.cc",
            "https://koi.nyan.zone/registry/index.json",
            "https://registry.koishi.chat/index.json",
            // "",
        ],

        // 当前使用的镜像源索引
        currentMirrorIndex: 0,

        // 是否在控制台输出调试信息
        debug: false, // 默认关闭调试信息，错误信息始终打印

        // 已废弃
        // 是否添加时间戳参数以避免缓存 (设为 true 会在目标 URL 后添加 ?t=时间戳)
        // avoidCache: false, 

        // 请求超时时间（毫秒）
        requestTimeout: 5000,

        // 每个镜像源的重试上限次数
        maxRetries: 2, // 越大可能等待越久

        // 当前重试次数
        currentRetries: 0
    };
    // ===== 配置项结束 =====

    // 存储完整的API响应数据
    let registryData = null;

    const log = function (...args) {
        if (CONFIG.debug) {
            console.log('[Koishi Market Registry Redirector]', ...args);
        }
    };

    const error = function (...args) {
        console.error('[Koishi Market Registry Redirector ERROR]', ...args);
    };

    // 获取当前使用的镜像源URL
    const getCurrentMirrorUrl = function () {
        return CONFIG.mirrorUrls[CONFIG.currentMirrorIndex];
    };

    // 切换到下一个镜像源
    const switchToNextMirror = function () {
        CONFIG.currentMirrorIndex = (CONFIG.currentMirrorIndex + 1) % CONFIG.mirrorUrls.length;
        CONFIG.currentRetries = 0; // 切换镜像源后重置重试次数
        error(`切换到下一个镜像源: ${getCurrentMirrorUrl()}, 重置重试次数`); // 始终打印切换镜像源的信息
        return getCurrentMirrorUrl();
    };

    // 重置重试计数
    const resetRetries = function () {
        CONFIG.currentRetries = 0;
    };

    // 获取目标 URL 
    const getTargetUrl = function () {
        const baseUrl = getCurrentMirrorUrl();
        /*
        if (CONFIG.avoidCache) {
            const timestamp = new Date().getTime();
            const separator = baseUrl.includes('?') ? '&' : '?';
            return `${baseUrl}${separator}t=${timestamp}`;
        }
        */
        return baseUrl;
    };

    // 处理请求失败和重试
    const handleRequestFailure = function (originalRequest, init) {
        CONFIG.currentRetries++;
        if (CONFIG.currentRetries <= CONFIG.maxRetries) {
            const currentUrl = typeof originalRequest === 'string' ? originalRequest : originalRequest.url;
            error(`请求 ${currentUrl} 失败，正在重试 (第 ${CONFIG.currentRetries}/${CONFIG.maxRetries} 次)`);

            // 如果是字符串URL
            if (typeof originalRequest === 'string') {
                return fetchWithRetry(originalRequest, init); // 保持原始URL，fetchWithRetry会自动获取新的targetUrl
            }
            // 如果是Request对象
            else if (originalRequest instanceof Request) {
                return fetchWithRetry(new Request(originalRequest.url, originalRequest), init); // 保持原始Request对象，fetchWithRetry会自动获取新的targetUrl
            }
        } else {
            error(`已达到最大重试次数 (${CONFIG.maxRetries})，尝试切换镜像源`);
            const nextUrl = switchToNextMirror();
            if (CONFIG.currentMirrorIndex === 0) { // 切换回第一个镜像源，说明所有镜像源都尝试过了
                error(`所有镜像源都尝试过了，请求失败`);
                resetRetries();
                return Promise.reject(new Error('所有镜像源请求均失败'));
            } else {
                error(`切换到备用镜像: ${nextUrl}`);
                // 如果是字符串URL
                if (typeof originalRequest === 'string') {
                    return fetchWithRetry(originalRequest, init); // 保持原始URL，fetchWithRetry会自动获取新的targetUrl
                }
                // 如果是Request对象
                else if (originalRequest instanceof Request) {
                    return fetchWithRetry(new Request(originalRequest.url, originalRequest), init); // 保持原始Request对象，fetchWithRetry会自动获取新的targetUrl
                }
            }
        }
    };

    // 带重试功能的fetch
    const fetchWithRetry = function (input, init) {
        const targetUrl = getTargetUrl(); // 每次请求都重新获取targetUrl，以保证时间戳更新
        return new Promise((resolve, reject) => {
            // 设置超时
            const timeoutId = setTimeout(() => {
                error(`请求超时: ${typeof input === 'string' ? input : input.url}`);
                resolve(handleRequestFailure(input, init));
            }, CONFIG.requestTimeout);

            originalFetch.call(window, typeof input === 'string' ? targetUrl : new Request(targetUrl, input), init)
                .then(response => {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        error(`请求返回非成功状态码: ${response.status}`);
                        resolve(handleRequestFailure(input, init));
                        return;
                    }

                    // 成功后重置重试计数
                    resetRetries();

                    // 克隆响应以便我们可以读取它两次
                    const clonedResponse = response.clone();

                    // 读取响应并存储插件数据
                    clonedResponse.json().then(data => {
                        // 存储完整的响应数据
                        registryData = data;
                        log('已缓存注册表数据');

                        // 在数据加载后初始化时间修复功能
                        setTimeout(initTimeFixing, 1000);
                    }).catch(err => {
                        error('解析注册表数据失败:', err);
                    });

                    resolve(response);
                })
                .catch(err => {
                    clearTimeout(timeoutId);
                    error(`请求失败:`, err);
                    resolve(handleRequestFailure(input, init));
                });
        });
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

    // 拦截 fetch 请求
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (input && typeof input === 'string' && input.includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (字符串):', input);
            // 使用带重试功能的fetch
            return fetchWithRetry(input, init);
        } else if (input && input instanceof Request && input.url.includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (Request):', input.url);
            // 使用带重试功能的fetch
            return fetchWithRetry(input, init);
        }

        // 调用原始 fetch 方法
        return originalFetch.call(this, input, init);
    };

    // 监听 Service Worker 请求
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

    // 格式化时间差
    function formatTimeDiff(date) {
        const now = new Date();
        const diff = now - new Date(date);

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(months / 12);

        if (years > 0) return `${years} 年前`;
        if (months > 0) return `${months} 个月前`;
        if (days > 0) return `${days} 天前`;
        if (hours > 0) return `${hours} 小时前`;
        if (minutes > 0) return `${minutes} 分钟前`;
        return `${seconds} 秒前`;
    }

    // 查找插件数据
    function findPluginData(packageName) {
        if (!registryData || !registryData.objects || !Array.isArray(registryData.objects)) {
            error('注册表数据不可用或格式不正确');
            return null;
        }

        // 从 URL 中提取包名
        const shortPackageName = packageName.replace('https://www.npmjs.com/package/', '').replace('https://www.npmjs.com/', ''); // 移除两种可能的 URL 前缀
        log('查找插件:', shortPackageName);

        // 在 objects 数组中查找匹配的插件
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name === shortPackageName) {
                log('找到插件数据:', shortPackageName);
                return item;
            }
        }

        // 如果没有找到完全匹配的
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name) {
                // 检查是否是 scoped 包，并进行匹配
                if (item.package.name === shortPackageName || item.package.name.endsWith('/' + shortPackageName)) {
                    log('通过灵活匹配找到插件数据:', item.package.name);
                    return item;
                }
            }
        }

        error('未找到插件数据:', shortPackageName);
        return null;
    }

    // 修复时间显示功能
    function fixTimeDisplay(tooltipElement, packageName) {
        try {
            // 查找对应的插件数据
            const pluginData = findPluginData(packageName);

            if (pluginData && pluginData.package && pluginData.package.date) {
                const formattedTime = formatTimeDiff(pluginData.package.date);
                tooltipElement.textContent = formattedTime;
                log('已修复插件时间显示为:', formattedTime);
            } else {
                error('未找到有效的时间数据');
            }
        } catch (err) {
            error('修复时间显示时发生错误:', err);
        }
    }

    // 监听工具提示的显示
    function initTimeFixing() {
        log('开始初始化时间修复功能');

        // 创建一个 MutationObserver 来监听 DOM 变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        // 检查是否是工具提示元素
                        if (node.nodeType === 1 && node.classList && node.classList.contains('el-popper')) {
                            // 检查是否包含 "{0} 小时前" 这样的文本
                            const tooltipContent = node.textContent;
                            if (tooltipContent && (tooltipContent.includes('{0}') || tooltipContent.includes('小时前') || tooltipContent.includes('分钟前') || tooltipContent.includes('天前'))) {
                                // 查找当前悬停的元素
                                const hoveredElements = document.querySelectorAll(':hover');
                                for (const element of hoveredElements) {
                                    if (element.tagName === 'A' && element.href && element.href.includes('npmjs.com')) { // 修改为更宽泛的匹配
                                        const tooltipSpan = node.querySelector('span');
                                        if (tooltipSpan) {
                                            fixTimeDisplay(tooltipSpan, element.href);
                                        } else {
                                            error('未找到工具提示内的span元素');
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        log('已初始化时间修复功能');
    }

    // 在页面加载完成后初始化
    window.addEventListener('load', () => {
        log('页面加载完成，准备初始化时间修复功能');
        if (registryData) {
            initTimeFixing();
        } else {
            log('注册表数据尚未加载，将在数据加载后自动初始化时间修复功能');
        }
    });

    log('脚本已启动 —————— 将', CONFIG.sourceUrl, '重定向到多个备用镜像源，当前使用:', getCurrentMirrorUrl());
})();
