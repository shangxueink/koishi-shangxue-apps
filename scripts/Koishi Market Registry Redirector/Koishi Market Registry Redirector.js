// ==UserScript==
// @name         Koishi Market Registry Redirector
// @namespace    https://github.com/shangxueink
// @version      3.15
// @description  将 Koishi 市场注册表请求重定向到多个备用镜像源，支持自动重试、单独配置每个镜像源的代理请求解决CORS问题，并修复时间显示问题。
// @author       shangxueink
// @license      MIT
// @match        https://koishi.chat/zh-CN/market/*
// @match        https://koishi.chat/market/*
// @match        https://koishi.chat/market?keyword=*
// @grant        none
// @run-at       document-start
// @homepageURL  https://greasyfork.org/zh-CN/scripts/533105-koishi-market-registry-redirector
// @icon         https://koishi.chat/logo.png
// @supportURL   https://github.com/shangxueink/koishi-shangxue-apps/issues
// @downloadURL https://update.greasyfork.org/scripts/533105/Koishi%20Market%20Registry%20Redirector.user.js
// @updateURL https://update.greasyfork.org/scripts/533105/Koishi%20Market%20Registry%20Redirector.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    if (currentPath.startsWith('/market') && !currentPath.startsWith('/zh-CN/market')) {
        const newUrl = window.location.origin + '/zh-CN' + currentPath + currentSearch;
        window.location.replace(newUrl);
        return;
    }

    const normalizeUrl = (url) => {
        return url.replace(/\/+$/, '');
    };

    const DEFAULT_CONFIG = {
        sourceUrl: normalizeUrl('registry.koishi.chat/index.json'),
        mirrorUrls: [
            { url: "https://cdn.jsdmirror.com/gh/Hoshino-Yumetsuki/koishi-registry@pages/index.json", useProxy: false },
            { url: "https://cdn.jsdelivr.net/gh/Hoshino-Yumetsuki/koishi-registry@pages/index.json", useProxy: false },
            { url: "https://gitee.com/shangxueink/koishi-registry-aggregator/raw/gh-pages/market.json", useProxy: true },
            { url: "https://shangxueink.github.io/koishi-registry-aggregator/market.json", useProxy: false },
            { url: 'https://koishi-registry.yumetsuki.moe/index.json', useProxy: false },
            { url: 'https://registry.koishi.t4wefan.pub/index.json', useProxy: true },
            { url: 'https://registry.koishi.chat/index.json', useProxy: true },
        ],
        currentMirrorIndex: 0,
        debug: false,
        requestTimeout: 5000,
        maxRetries: 2,
        currentRetries: 0,
        disableCache: true,
        useProxy: true,
        proxyUrl: 'https://web-proxy.apifox.cn/api/v1/request'
    };

    let savedConfig = JSON.parse(localStorage.getItem('koishiMarketConfig') || '{}');
    let CONFIG = { ...DEFAULT_CONFIG, ...savedConfig };

    let registryData = null;

    let configUIOpen = false;
    let configButtonAdded = false;

    function createConfigUI() {
        if (!configUIOpen) return;

        // 创建配置容器（使用页面主题变量）
        const container = document.createElement('div');
        container.className = 'vp-doc';
        container.style.padding = '2rem';
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.width = '90%';
        container.style.maxWidth = '700px';
        container.style.maxHeight = '80%';
        container.style.backgroundColor = 'var(--vp-c-bg)'; // 使用主题背景色
        container.style.color = 'var(--vp-c-text)'; // 使用主题文字颜色
        container.style.zIndex = '1000';
        container.style.overflow = 'auto';
        container.style.boxSizing = 'border-box';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
        container.style.border = '1px solid var(--vp-c-divider)'; // 使用主题边框颜色

        // 创建右上角关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '<span style="transform: translateY(-1.8px); display: inline-block;">×</span>';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.width = '80px';
        closeButton.style.height = '50px';
        closeButton.style.border = 'none';
        closeButton.style.backgroundColor = '#ff4757';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '40px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.cursor = 'pointer';
        closeButton.style.borderRadius = '24px';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        closeButton.style.lineHeight = '1';
        closeButton.style.zIndex = '1001';
        closeButton.title = '关闭配置';

        // 添加悬停效果
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = '#ff3742';
            closeButton.style.transform = 'scale(1.1)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = '#ff4757';
            closeButton.style.transform = 'scale(1)';
        });

        container.appendChild(closeButton);

        // 遮罩层保持原样
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';

        // 镜像源列表
        const mirrorSection = document.createElement('section');
        mirrorSection.innerHTML = `
            <h2>镜像源列表</h2>
            <p>请确保地址正确，否则会导致插件市场无法正常加载。</p>
            <div id="mirror-list" style="margin-bottom: 1rem;"></div>
            <button id="add-mirror" class="VPLink link button" style="margin-bottom: 2rem;">+ 添加镜像源</button>
    
        `;
        container.appendChild(mirrorSection);

        // 其他配置
        const configSection = document.createElement('section');
        configSection.innerHTML = `
            <h2>高级配置</h2>
            <div class="form-item">
                <label for="timeout">请求超时时间（毫秒）</label>
                <input type="number" id="timeout" value="${CONFIG.requestTimeout}" min="1000" style="border: 1px solid #ccc; padding: 0.5rem; width: 100%; box-sizing: border-box;">
                <p>请求超时时间，单位毫秒，建议不要设置过小。</p>
            </div>
            <div class="form-item">
                <label for="retries">最大重试次数</label>
                <input type="number" id="retries" value="${CONFIG.maxRetries}" min="1" style="border: 1px solid #ccc; padding: 0.5rem; width: 100%; box-sizing: border-box;">
                <p>最大重试次数，当请求失败时，会自动重试。</p>
            </div>
            <div class="form-item">
                <label for="disableCache"><input type="checkbox" id="disableCache" ${CONFIG.disableCache ? 'checked' : ''}> 禁用从磁盘缓存</label>
                <p>启用后，请求镜像源时将禁用浏览器缓存，确保获取最新数据。</p>
            </div>
            <div class="form-item">
                <label for="useProxy"><input type="checkbox" id="useProxy" ${CONFIG.useProxy ? 'checked' : ''}> 启用代理请求</label>
                <p>启用代理请求可以解决CORS跨域问题，提高镜像源的兼容性。</p>
            </div>
            <div class="form-item">
                <label for="proxyUrl">代理服务器地址</label>
                <input type="text" id="proxyUrl" value="${CONFIG.proxyUrl}" style="border: 1px solid #ccc; padding: 0.5rem; width: 100%; box-sizing: border-box;">
                <p>代理服务器的URL地址，用于转发请求以避免CORS问题。非开发人员请勿修改。</p>
            </div>
            <div class="form-item">
                <label for="debug"><input type="checkbox" id="debug" ${CONFIG.debug ? 'checked' : ''}> 启用调试模式</label>
                <p>启用调试模式后，会在控制台输出更多信息，方便排查问题。</p>
                <p>注意更改配置项后，需刷新页面生效。</p>
            </div>
        `;
        container.appendChild(configSection);

        // 重置按钮
        const resetButtonGroup = document.createElement('div');
        resetButtonGroup.style.marginTop = '2rem';
        resetButtonGroup.style.display = 'flex';
        resetButtonGroup.style.width = '100%';
        resetButtonGroup.innerHTML = `
            <button id="reset-btn" class="VPLink link button" style="width: 100%;">重置为默认配置</button>
        `;
        container.appendChild(resetButtonGroup);

        // 操作按钮
        const buttonGroup = document.createElement('div');
        buttonGroup.style.marginTop = '1rem';
        buttonGroup.style.display = 'flex';
        buttonGroup.style.width = '100%';
        buttonGroup.innerHTML = `
            <button id="cancel-btn" class="VPLink link button" style="width: 50%; margin-right: 0.5rem;">关闭配置</button>
            <button id="save-btn" class="VPLink link button" style="width: 50%; margin-left: 0.5rem;">保存配置</button>
        `;
        container.appendChild(buttonGroup);

        // 插入到页面
        document.body.appendChild(overlay);
        document.body.appendChild(container);

        // 初始状态设为透明，准备淡入动画
        container.style.opacity = '0';
        container.style.transform = 'translate(-50%, -50%) scale(0.95)';
        overlay.style.opacity = '0';

        // 禁用背景页面滚动
        document.body.style.overflow = 'hidden';

        // 触发淡入动画
        setTimeout(() => {
            container.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            overlay.style.transition = 'opacity 0.2s ease-out';

            container.style.opacity = '1';
            container.style.transform = 'translate(-50%, -50%) scale(1)';
            overlay.style.opacity = '1';
        }, 10);

        // 点击遮罩层关闭配置UI
        overlay.addEventListener('click', () => {
            closeConfigUI();
        });

        // 阻止点击配置容器时关闭UI
        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 阻止滚动穿透到背景页面
        container.addEventListener('wheel', (e) => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isScrollingUp = e.deltaY < 0;
            const isScrollingDown = e.deltaY > 0;

            // 如果向上滚动且已经到顶部，或向下滚动且已经到底部，阻止事件冒泡
            if ((isScrollingUp && scrollTop === 0) ||
                (isScrollingDown && scrollTop + clientHeight >= scrollHeight)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });

        // 初始化镜像源列表
        const mirrorList = document.getElementById('mirror-list');
        function renderMirrorList() {
            mirrorList.innerHTML = CONFIG.mirrorUrls.map((mirror, index) => `
                <div class="mirror-item" style="margin-bottom: 1rem; display: flex; flex-direction: column; align-items: stretch; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 1rem;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; margin-bottom: 0.25rem; font-weight: bold; color: var(--vp-c-text);"></label>
                        <input type="text" value="${mirror.url}" data-field="url" style="width: 100%; border: 1px solid #ccc; padding: 0.5rem; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: flex; align-items: center; color: var(--vp-c-text);">
                            <input type="checkbox" ${mirror.useProxy ? 'checked' : ''} data-field="useProxy" style="margin-right: 0.5rem;">
                            使用代理请求
                        </label>
                        <p style="margin: 0.25rem 0 0 1.5rem; font-size: 0.8rem; color: var(--vp-c-text-2);">非开发人员，请勿修改代理开关！</p>
                    </div>
                    <div style="display: flex; width: 100%;">
                        <button class="move-up VPLink link button" data-index="${index}" style="width: 33.33%; margin-right: 0.25rem;">↑</button>
                        <button class="move-down VPLink link button" data-index="${index}" style="width: 33.33%; margin: 0 0.125rem;">↓</button>
                        <button class="remove-mirror VPLink link button" data-index="${index}" style="width: 33.33%; margin-left: 0.25rem;">×</button>
                    </div>
                </div>
            `).join('');
        }
        renderMirrorList();

        // 事件监听
        document.getElementById('add-mirror').addEventListener('click', () => {
            CONFIG.mirrorUrls.push({ url: '', useProxy: false });
            renderMirrorList();
        });

        // 带动画的移动函数
        function animateMove(fromIndex, toIndex, direction) {
            const items = mirrorList.querySelectorAll('.mirror-item');
            const fromItem = items[fromIndex];
            const toItem = items[toIndex];

            if (!fromItem || !toItem) return;

            // 获取当前输入框的值，确保不会丢失用户输入
            const mirrorItems = mirrorList.querySelectorAll('.mirror-item');
            const currentValues = Array.from(mirrorItems).map(item => {
                const urlInput = item.querySelector('input[data-field="url"]');
                const proxyCheckbox = item.querySelector('input[data-field="useProxy"]');
                return {
                    url: urlInput.value,
                    useProxy: proxyCheckbox.checked
                };
            });

            // 禁用所有按钮防止重复点击
            const buttons = mirrorList.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);

            // 计算精确的移动距离
            const fromRect = fromItem.getBoundingClientRect();
            const toRect = toItem.getBoundingClientRect();
            const distance = Math.abs(fromRect.top - toRect.top);

            // 应用动画变换
            if (direction === 'up') {
                fromItem.style.transform = `translateY(-${distance}px)`;
                toItem.style.transform = `translateY(${distance}px)`;
            } else {
                fromItem.style.transform = `translateY(${distance}px)`;
                toItem.style.transform = `translateY(-${distance}px)`;
            }

            // 动画完成后更新数据和重新渲染
            setTimeout(() => {
                // 使用用户当前输入的值更新CONFIG
                CONFIG.mirrorUrls = currentValues;

                // 交换数据
                const temp = CONFIG.mirrorUrls[fromIndex];
                CONFIG.mirrorUrls[fromIndex] = CONFIG.mirrorUrls[toIndex];
                CONFIG.mirrorUrls[toIndex] = temp;

                // 重新渲染列表
                renderMirrorList();

                // 重新启用按钮
                setTimeout(() => {
                    const newButtons = mirrorList.querySelectorAll('button');
                    newButtons.forEach(btn => btn.disabled = false);
                }, 50);
            }, 300);
        }

        // 晃动动画函数
        function shakeAnimation(element) {
            // 禁用所有按钮防止重复点击
            const buttons = mirrorList.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);

            // 添加晃动动画，模拟手机震动反馈
            element.style.transition = 'transform 0.08s cubic-bezier(0.36, 0.07, 0.19, 0.97)';

            // 更自然的晃动序列，类似手机解锁失败的震动
            const shakeSequence = [
                { transform: 'translateX(-10px)', delay: 0 },
                { transform: 'translateX(10px)', delay: 80 },
                { transform: 'translateX(-8px)', delay: 160 },
                { transform: 'translateX(8px)', delay: 240 },
                { transform: 'translateX(-4px)', delay: 320 },
                { transform: 'translateX(4px)', delay: 400 },
                { transform: 'translateX(0px)', delay: 480 }
            ];

            shakeSequence.forEach(({ transform, delay }) => {
                setTimeout(() => {
                    element.style.transform = transform;
                }, delay);
            });

            // 动画完成后清理样式并重新启用按钮
            setTimeout(() => {
                element.style.transition = '';
                element.style.transform = '';
                buttons.forEach(btn => btn.disabled = false);
            }, 600);
        }

        mirrorList.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.classList.contains('remove-mirror')) {
                // 检查是否尝试删除受保护的镜像源
                const mirrorToDelete = CONFIG.mirrorUrls[index];
                if (mirrorToDelete.url === 'https://registry.koishi.chat/index.json') {
                    // 对受保护的镜像源执行摇晃动画
                    const items = mirrorList.querySelectorAll('.mirror-item');
                    shakeAnimation(items[index]);
                } else {
                    CONFIG.mirrorUrls.splice(index, 1);
                    renderMirrorList();
                }
            } else if (e.target.classList.contains('move-up')) {
                if (index > 0) {
                    animateMove(index, index - 1, 'up');
                } else {
                    // 第一个项目无法上移，执行晃动动画
                    const items = mirrorList.querySelectorAll('.mirror-item');
                    shakeAnimation(items[index]);
                }
            } else if (e.target.classList.contains('move-down')) {
                if (index < CONFIG.mirrorUrls.length - 1) {
                    animateMove(index, index + 1, 'down');
                } else {
                    // 最后一个项目无法下移，执行晃动动画
                    const items = mirrorList.querySelectorAll('.mirror-item');
                    shakeAnimation(items[index]);
                }
            }
        });

        const closeConfigUI = () => {
            configUIOpen = false;

            // 添加淡出动画
            container.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            overlay.style.transition = 'opacity 0.2s ease-out';

            container.style.opacity = '0';
            container.style.transform = 'translate(-50%, -50%) scale(0.95)';
            overlay.style.opacity = '0';

            // 动画完成后移除元素
            setTimeout(() => {
                container.remove();
                overlay.remove();
                document.body.style.overflow = '';
            }, 200);
        };

        // 右上角关闭按钮事件
        closeButton.addEventListener('click', () => {
            closeConfigUI();
        });

        // 重置按钮事件
        document.getElementById('reset-btn').addEventListener('click', () => {
            showResetConfirmDialog();
        });

        // 创建重置确认对话框
        function showResetConfirmDialog() {
            // 创建遮罩层
            const resetOverlay = document.createElement('div');
            resetOverlay.style.position = 'fixed';
            resetOverlay.style.top = '0';
            resetOverlay.style.left = '0';
            resetOverlay.style.width = '100%';
            resetOverlay.style.height = '100%';
            resetOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            resetOverlay.style.zIndex = '1002';
            resetOverlay.style.display = 'flex';
            resetOverlay.style.alignItems = 'center';
            resetOverlay.style.justifyContent = 'center';

            // 创建对话框容器
            const resetDialog = document.createElement('div');
            resetDialog.style.backgroundColor = 'var(--vp-c-bg)';
            resetDialog.style.color = 'var(--vp-c-text)';
            resetDialog.style.padding = '2rem';
            resetDialog.style.borderRadius = '8px';
            resetDialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            resetDialog.style.border = '1px solid var(--vp-c-divider)';
            resetDialog.style.maxWidth = '400px';
            resetDialog.style.width = '90%';
            resetDialog.style.textAlign = 'center';

            // 对话框内容
            resetDialog.innerHTML = `
                <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--vp-c-text);">确认重置配置</h3>
                <p style="margin-bottom: 2rem; color: var(--vp-c-text-2);">确定要重置所有配置为默认值吗？<br>此操作不可撤销。</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="reset-cancel-btn" class="VPLink link button" style="padding: 0.75rem 1.5rem; background-color: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider);">取消</button>
                    <button id="reset-confirm-btn" class="VPLink link button" style="padding: 0.75rem 1.5rem; background-color: #ff4757; color: white; border: 1px solid #ff4757; border-radius: 8px;">确认重置</button>
                </div>
            `;

            resetOverlay.appendChild(resetDialog);
            document.body.appendChild(resetOverlay);

            // 初始动画
            resetOverlay.style.opacity = '0';
            resetDialog.style.transform = 'scale(0.9)';
            resetDialog.style.transition = 'transform 0.2s ease-out';
            resetOverlay.style.transition = 'opacity 0.2s ease-out';

            setTimeout(() => {
                resetOverlay.style.opacity = '1';
                resetDialog.style.transform = 'scale(1)';
            }, 10);

            // 取消按钮事件
            document.getElementById('reset-cancel-btn').addEventListener('click', () => {
                closeResetDialog();
            });

            // 确认按钮事件
            document.getElementById('reset-confirm-btn').addEventListener('click', () => {
                // 重置配置为默认值
                CONFIG.mirrorUrls = [...DEFAULT_CONFIG.mirrorUrls];
                CONFIG.requestTimeout = DEFAULT_CONFIG.requestTimeout;
                CONFIG.maxRetries = DEFAULT_CONFIG.maxRetries;
                CONFIG.debug = DEFAULT_CONFIG.debug;
                CONFIG.disableCache = DEFAULT_CONFIG.disableCache;
                CONFIG.useProxy = DEFAULT_CONFIG.useProxy;
                CONFIG.proxyUrl = DEFAULT_CONFIG.proxyUrl;
                CONFIG.currentMirrorIndex = DEFAULT_CONFIG.currentMirrorIndex;
                CONFIG.currentRetries = DEFAULT_CONFIG.currentRetries;

                // 立即保存到localStorage
                localStorage.setItem('koishiMarketConfig', JSON.stringify(CONFIG));

                // 更新UI显示
                renderMirrorList();
                document.getElementById('timeout').value = CONFIG.requestTimeout;
                document.getElementById('retries').value = CONFIG.maxRetries;
                document.getElementById('disableCache').checked = CONFIG.disableCache;
                document.getElementById('useProxy').checked = CONFIG.useProxy;
                document.getElementById('proxyUrl').value = CONFIG.proxyUrl;
                document.getElementById('debug').checked = CONFIG.debug;

                // 关闭对话框
                closeResetDialog();

                // 关闭整个配置UI
                closeConfigUI();
            });

            // 点击遮罩层关闭对话框
            resetOverlay.addEventListener('click', (e) => {
                if (e.target === resetOverlay) {
                    closeResetDialog();
                }
            });

            // 关闭对话框函数
            function closeResetDialog() {
                resetOverlay.style.opacity = '0';
                resetDialog.style.transform = 'scale(0.9)';

                setTimeout(() => {
                    resetOverlay.remove();
                }, 200);
            }

            // ESC键关闭对话框
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeResetDialog();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            document.addEventListener('keydown', handleEscKey);
        }

        document.getElementById('save-btn').addEventListener('click', () => {
            const mirrorItems = mirrorList.querySelectorAll('.mirror-item');
            CONFIG.mirrorUrls = Array.from(mirrorItems).map(item => {
                const urlInput = item.querySelector('input[data-field="url"]');
                const proxyCheckbox = item.querySelector('input[data-field="useProxy"]');
                return {
                    url: urlInput.value.trim(),
                    useProxy: proxyCheckbox.checked
                };
            }).filter(mirror => mirror.url);

            CONFIG.requestTimeout = parseInt(document.getElementById('timeout').value) || 5000;
            CONFIG.maxRetries = parseInt(document.getElementById('retries').value) || 2;
            CONFIG.disableCache = document.getElementById('disableCache').checked;
            CONFIG.useProxy = document.getElementById('useProxy').checked;
            CONFIG.proxyUrl = document.getElementById('proxyUrl').value.trim() || DEFAULT_CONFIG.proxyUrl;
            CONFIG.debug = document.getElementById('debug').checked;

            localStorage.setItem('koishiMarketConfig', JSON.stringify(CONFIG));

            closeConfigUI();
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            closeConfigUI();
        });

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .vp-doc {
                /* 隐藏滚动条但保持滚动功能 */
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
            }
            .vp-doc::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
            }
            .vp-doc h2 {
                margin-top: 0rem;
                margin-bottom: 1rem;
            }
            .vp-doc section {
                margin-top: 0;
                margin-bottom: 1rem;
            }
            .vp-doc .button {
                border: 1px solid var(--vp-c-divider);
                padding: 0.5rem 1rem;
                cursor: pointer;
                background-color: var(--vp-c-bg-soft);
                color: var(--vp-c-text);
                border-radius: 4px;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .vp-doc .button:hover {
                background-color: var(--vp-c-brand);
                color: var(--vp-c-bg);
            }
            .vp-doc .form-item {
                margin-bottom: 1rem;
            }
            .vp-doc .form-item label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: bold;
                color: var(--vp-c-text);
            }
            .vp-doc .form-item input[type="number"],
            .vp-doc .form-item input[type="text"] {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid var(--vp-c-divider);
                background-color: var(--vp-c-bg);
                color: var(--vp-c-text);
                box-sizing: border-box;
                border-radius: 4px;
            }
            .vp-doc .form-item input[type="checkbox"] {
                margin-right: 0.5rem;
            }
            .vp-doc .mirror-item {
                margin-bottom: 0.5rem;
                flex-direction: column;
                align-items: stretch;
                position: relative;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .vp-doc .mirror-item input[type="text"] {
                width: 100%;
                margin-bottom: 0.5rem;
            }
            .vp-doc .mirror-item > div {
                display: flex;
                width: 100%;
            }
            .vp-doc .mirror-item button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            /* 晃动动画相关样式 */
            .vp-doc .mirror-item.shaking {
                transform-origin: center;
            }
            /* 关闭按钮样式 */
            .vp-doc button[title="关闭配置"] {
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(255, 71, 87, 0.3);
            }
            .vp-doc button[title="关闭配置"]:hover {
                box-shadow: 0 4px 8px rgba(255, 71, 87, 0.4);
            }
            .vp-doc button[title="关闭配置"]:active {
                transform: scale(0.95) !important;
            }
            /* 重置确认对话框样式 */
            #reset-confirm-btn:hover {
                background-color: #ff3742 !important;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
            }
            #reset-cancel-btn:hover {
                background-color: var(--vp-c-bg-alt);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    function addConfigButton() {
        // 如果按钮已经添加，则直接返回
        if (configButtonAdded) {
            return;
        }

        const tryAddButton = () => {
            // 如果按钮已经添加，则直接返回 true
            if (configButtonAdded) {
                return true;
            }

            // 尝试查找已添加的配置按钮
            const existingButton = document.querySelector('.market-config-button');
            if (existingButton) {
                configButtonAdded = true;
                return true;
            }

            // 尝试直接查找包含 "插件市场" 文本的 <h1> 元素
            const marketTitle = Array.from(document.querySelectorAll('h1')).find(h1 => h1.textContent.trim() === '插件市场');

            if (!marketTitle) {
                console.log('[Koishi Market Registry Redirector] 未找到包含 "插件市场" 文本的标题元素，正在重试...');
                return false; // 返回 false 表示未找到元素
            }

            // 创建按钮元素
            const configButton = document.createElement('button');
            configButton.className = 'market-config-button'; // 使用新的类名
            configButton.textContent = '配置镜像源'; // 设置按钮文字

            // 复制原始标题的样式
            const titleStyle = getComputedStyle(marketTitle);
            configButton.style.fontSize = titleStyle.fontSize;
            configButton.style.fontWeight = titleStyle.fontWeight;
            configButton.style.fontFamily = titleStyle.fontFamily;
            configButton.style.color = 'var(--vp-c-text)'; // 使用主题文字颜色变量
            configButton.style.textAlign = titleStyle.textAlign; // 保持文本对齐方式
            configButton.style.lineHeight = titleStyle.lineHeight; // 保持行高
            configButton.style.letterSpacing = titleStyle.letterSpacing; // 保持字符间距

            configButton.style.border = 'none'; // 移除边框
            configButton.style.backgroundColor = 'transparent'; // 透明背景
            configButton.style.cursor = 'pointer'; // 鼠标悬停时显示手型
            configButton.style.padding = '0'; // 移除内边距
            configButton.style.margin = '0'; // 移除外边距
            configButton.style.width = '100%'; // 占据父容器的宽度
            configButton.style.display = 'block'; // 使按钮成为块级元素

            configButton.addEventListener('click', (e) => {
                e.preventDefault();
                configUIOpen = true;
                createConfigUI();
            });

            // 替换标题为按钮
            marketTitle.parentNode.replaceChild(configButton, marketTitle);
            configButtonAdded = true; // 设置标志，表示按钮已添加

            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
            .market-config-button {
                color: var(--vp-c-text) !important; /* 强制使用主题文字颜色 */
            }
            .market-config-button:hover {
                opacity: 0.8; /* 鼠标悬停时稍微改变透明度 */
                color: var(--vp-c-text) !important; /* 悬停时也保持主题颜色 */
            }
            .market-config-button:focus {
                outline: none; /* 移除焦点时的轮廓线 */
                color: var(--vp-c-text) !important; /* 焦点时也保持主题颜色 */
            }
        `;
            document.head.appendChild(style);

            console.log('[Koishi Market Registry Redirector] 成功添加配置按钮');
            return true; // 返回 true 表示已成功找到并替换元素
        };

        // 尝试立即添加按钮
        if (tryAddButton()) return;

        // 如果立即添加失败，则使用 MutationObserver 监听元素出现
        const observer = new MutationObserver((mutations) => {
            // 如果按钮已经添加，则停止监听
            if (configButtonAdded) {
                observer.disconnect();
                return;
            }

            if (tryAddButton()) {
                observer.disconnect(); // 停止监听
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    // 在 DOMContentLoaded 事件触发后立即尝试添加按钮
    document.addEventListener('DOMContentLoaded', () => {
        addConfigButton();
    });



    // 处理URL参数搜索功能 
    function handleUrlSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const keyword = urlParams.get('keyword');

        if (!keyword) return;

        log('检测到URL搜索参数:', keyword);

        // 将关键词按+或空格分割
        const keywords = keyword.split(/[\+\s]+/).filter(k => k.trim());
        if (keywords.length === 0) return;

        log('解析到的关键词:', keywords);

        // 等待搜索框出现
        const waitForSearchBox = function () {
            const searchBox = document.querySelector('.search-box');
            const searchInput = searchBox ? searchBox.querySelector('input') : null;

            if (searchInput) {
                log('找到搜索框，开始快速模拟搜索操作');

                // 模拟输入和确认每个关键词
                const simulateSearch = function (index) {
                    if (index >= keywords.length) {
                        log('所有关键词处理完毕');
                        return;
                    }

                    const kw = keywords[index];
                    log(`快速处理关键词 ${index + 1}/${keywords.length}: "${kw}"`);

                    // 模拟点击搜索框获取焦点
                    searchInput.focus();

                    // 清空输入框（以防万一）
                    searchInput.value = '';

                    // 直接设置值并触发输入事件
                    searchInput.value = kw;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

                    // 立即模拟Enter键序列
                    // 模拟按下Enter键 (keydown)
                    searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true
                    }));

                    // 模拟按下Enter键 (keypress)
                    searchInput.dispatchEvent(new KeyboardEvent('keypress', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true
                    }));

                    // 模拟释放Enter键 (keyup)
                    searchInput.dispatchEvent(new KeyboardEvent('keyup', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true
                    }));

                    // 缩短等待时间，加快处理下一个关键词
                    setTimeout(() => {
                        simulateSearch(index + 1);
                    }, 300); // 减少到300ms
                };

                // 开始模拟搜索
                simulateSearch(0);
            } else {
                // 如果元素还没出现，继续等待
                setTimeout(waitForSearchBox, 100); // 减少等待时间
            }
        };

        // 开始等待搜索框
        waitForSearchBox();
    }

    // NPM镜像站配置
    const NPM_MIRRORS = [
        { name: 'NPM 官方', url: 'https://www.npmjs.com/package/' },
        { name: 'NPM Mirror (淘宝)', url: 'https://npmmirror.com/package/' }
    ];

    // 创建镜像选择器
    function createMirrorSelector(packageName, originalLink) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease-out;
        `;

        // 创建选择器容器
        const selector = document.createElement('div');
        selector.style.cssText = `
            background-color: var(--vp-c-bg);
            color: var(--vp-c-text);
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--vp-c-divider);
            max-width: 400px;
            width: 90%;
            transform: scale(0.9);
            transition: transform 0.2s ease-out;
        `;

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '请选择要跳转的地址';
        title.style.cssText = `
            margin: 0 0 1rem 0;
            color: var(--vp-c-text);
            font-size: 1.1rem;
            text-align: center;
        `;

        // 创建包名显示
        const packageInfo = document.createElement('p');
        packageInfo.textContent = packageName;
        packageInfo.style.cssText = `
            margin: 0 0 1.5rem 0;
            color: var(--vp-c-text-2);
            font-size: 0.9rem;
            text-align: center;
            word-break: break-all;
        `;

        // 创建镜像链接列表
        const linkList = document.createElement('div');
        linkList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        `;

        NPM_MIRRORS.forEach(mirror => {
            const linkButton = document.createElement('button');
            linkButton.textContent = mirror.name;
            linkButton.style.cssText = `
                padding: 0.75rem 1rem;
                border: 1px solid var(--vp-c-divider);
                background-color: var(--vp-c-bg-soft);
                color: var(--vp-c-text);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                font-size: 0.9rem;
            `;

            linkButton.addEventListener('mouseenter', () => {
                linkButton.style.backgroundColor = 'var(--vp-c-brand)';
                linkButton.style.color = 'var(--vp-c-bg)';
                linkButton.style.transform = 'translateY(-1px)';
            });

            linkButton.addEventListener('mouseleave', () => {
                linkButton.style.backgroundColor = 'var(--vp-c-bg-soft)';
                linkButton.style.color = 'var(--vp-c-text)';
                linkButton.style.transform = 'translateY(0)';
            });

            linkButton.addEventListener('click', () => {
                const fullUrl = mirror.url + packageName;
                window.open(fullUrl, '_blank');
                closeMirrorSelector();
            });

            linkList.appendChild(linkButton);
        });

        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            border: 1px solid var(--vp-c-divider);
            background-color: var(--vp-c-bg);
            color: var(--vp-c-text-2);
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s;
        `;

        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.backgroundColor = 'var(--vp-c-bg-soft)';
            cancelButton.style.color = 'var(--vp-c-text)';
            cancelButton.style.transform = 'translateY(-1px)';
        });

        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.backgroundColor = 'var(--vp-c-bg)';
            cancelButton.style.color = 'var(--vp-c-text-2)';
            cancelButton.style.transform = 'translateY(0)';
        });

        cancelButton.addEventListener('click', closeMirrorSelector);

        // 组装选择器
        selector.appendChild(title);
        selector.appendChild(packageInfo);
        selector.appendChild(linkList);
        selector.appendChild(cancelButton);
        overlay.appendChild(selector);

        // 插入到页面
        document.body.appendChild(overlay);

        // 禁用背景滚动
        document.body.style.overflow = 'hidden';

        // 触发动画
        setTimeout(() => {
            overlay.style.opacity = '1';
            selector.style.transform = 'scale(1)';
        }, 10);

        // 关闭选择器函数
        function closeMirrorSelector() {
            overlay.style.opacity = '0';
            selector.style.transform = 'scale(0.9)';

            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 200);
        }

        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMirrorSelector();
            }
        });

        // ESC键关闭
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeMirrorSelector();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
    }

    // 检查是否为标准npm包地址
    function isStandardNpmPackageUrl(url) {
        try {
            const urlObj = new URL(url);

            // 检查域名是否为 www.npmjs.com
            if (urlObj.hostname !== 'www.npmjs.com') {
                return false;
            }

            // 1. /package/包名
            // 2. /package/@scope/包名  
            // 3. /@scope/包名 (直接的@scope格式)
            const pathMatch = urlObj.pathname.match(/^(\/package\/(@[^\/]+\/[^\/]+|[^\/]+)|\/(@[^\/]+\/[^\/]+))$/);
            if (!pathMatch) {
                return false;
            }

            // 检查是否有查询参数或hash
            if (urlObj.search || urlObj.hash) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    // 拦截版本号链接点击
    function interceptVersionLinks() {
        // 使用事件委托监听所有点击事件
        document.addEventListener('click', (e) => {
            // 首先检查点击的目标元素是否在头像区域内
            const avatarContainer = e.target.closest('.avatars');
            if (avatarContainer) {
                // 如果点击的是头像区域，直接返回，不进行拦截
                return;
            }

            // 检查点击的元素是否是版本号链接或其直接子元素
            let target = e.target;

            // 如果点击的是 SVG 或其子元素，向上查找到 <a> 标签
            if (target.tagName === 'svg' || target.tagName === 'path' || target.closest('svg')) {
                target = target.closest('a');
            } else if (target.tagName === 'A') {
                // 如果直接点击的就是 <a> 标签，使用它
                target = target;
            } else {
                // 如果点击的是其他元素，检查是否是版本号链接的直接文本内容
                const parentA = target.closest('a');
                if (parentA && parentA.href && isStandardNpmPackageUrl(parentA.href)) {
                    // 检查是否是版本号链接的文本部分（不是图标）
                    const hasVersionIcon = parentA.querySelector('svg path[d*="M0 252.118V48C0 21.49"]');
                    if (hasVersionIcon && target.nodeType === Node.TEXT_NODE ||
                        (target.tagName && !target.closest('svg') && parentA.contains(target))) {
                        target = parentA;
                    } else {
                        return; // 不是我们要拦截的元素
                    }
                } else {
                    return; // 不是链接元素
                }
            }

            // 检查是否是标准npm包链接
            if (target && target.href && isStandardNpmPackageUrl(target.href)) {
                // 检查是否是版本号链接（包含特定的版本图标）
                const hasVersionIcon = target.querySelector('svg path[d*="M0 252.118V48C0 21.49"]');

                if (hasVersionIcon) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 提取包名
                    let packageName = target.href;
                    if (packageName.includes('/package/')) {
                        packageName = packageName.replace(/^https?:\/\/www\.npmjs\.com\/package\//, '');
                    } else {
                        // 处理直接的@scope格式：https://www.npmjs.com/@scope/package
                        packageName = packageName.replace(/^https?:\/\/www\.npmjs\.com\//, '');
                    }

                    log('拦截版本号链接点击:', packageName);

                    // 显示镜像选择器
                    createMirrorSelector(packageName, target);
                }
            }
        }, true); // 使用捕获阶段确保优先处理
    }

    // 显示当前使用的镜像源
    function showCurrentMirror() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.querySelector && node.querySelector('.info')) {
                            const infoDiv = node.querySelector('.info');
                            if (infoDiv && !document.querySelector('.mirror-info')) {
                                const mirrorInfo = document.createElement('div');
                                mirrorInfo.className = 'mirror-info';
                                mirrorInfo.style.cssText = `
                                    margin-top: 8px;
                                    font-family: monospace;
                                    font-size: 0.9em;
                                    color: var(--vp-c-text-2);
                                    text-align: center;
                                    width: 100%;
                                `;
                                const currentMirror = CONFIG.mirrorUrls[CONFIG.currentMirrorIndex];
                                const mirrorUrl = currentMirror ? currentMirror.url : '';
                                const proxyStatus = currentMirror && currentMirror.useProxy ? ' (代理)' : '';
                                mirrorInfo.innerHTML = `<code>${mirrorUrl}${proxyStatus}</code>`;
                                infoDiv.parentNode.insertBefore(mirrorInfo, infoDiv.nextSibling);
                                log('已添加镜像源信息');
                                observer.disconnect();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 添加返回顶部按钮
    function addBackToTopButton() {
        // 创建一个函数来检查并添加按钮
        const checkAndAddButton = () => {
            // 如果按钮已存在，不再添加
            if (document.querySelector('.back-to-top-btn')) {
                return;
            }

            // 查找所有分页控件
            const paginationElements = document.querySelectorAll('.el-pagination');
            if (paginationElements.length < 2) {
                return; // 等待分页控件加载
            }

            // 获取底部的分页控件
            const bottomPagination = paginationElements[paginationElements.length - 1];
            const nextButton = bottomPagination.querySelector('.btn-next');

            if (!nextButton) {
                return; // 等待下一页按钮加载
            }

            // 创建返回顶部按钮容器
            const backToTopContainer = document.createElement('div');
            backToTopContainer.className = 'back-to-top-container';
            backToTopContainer.style.cssText = `
                width: 100%;
                margin-top: 8px;
                display: none; /* 初始隐藏 */
            `;

            // 创建返回顶部按钮
            const backToTopBtn = document.createElement('button');
            backToTopBtn.type = 'button';
            backToTopBtn.className = 'back-to-top-btn el-button el-button--default';
            backToTopBtn.setAttribute('aria-label', 'Back to top');
            backToTopBtn.textContent = '回到顶部';

            // 使用CSS变量和类名来确保主题适应性
            backToTopBtn.style.cssText = `
                width: 100%;
                height: 32px;
                margin: 0;
                padding: 0 15px;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                white-space: nowrap;
                outline: none;
                user-select: none;
                vertical-align: middle;
                -webkit-appearance: none;
                background-color: var(--el-button-bg-color, #ffffff);
                border: 1px solid var(--el-button-border-color, #dcdfe6);
                color: var(--el-button-text-color, #606266);
            `;

            // 添加悬停效果 - 使用CSS变量确保主题适应
            backToTopBtn.addEventListener('mouseenter', () => {
                backToTopBtn.style.backgroundColor = 'var(--el-button-hover-bg-color, #ecf5ff)';
                backToTopBtn.style.borderColor = 'var(--el-button-hover-border-color, #c6e2ff)';
                backToTopBtn.style.color = 'var(--el-button-hover-text-color, #409eff)';
            });

            backToTopBtn.addEventListener('mouseleave', () => {
                backToTopBtn.style.backgroundColor = 'var(--el-button-bg-color, #ffffff)';
                backToTopBtn.style.borderColor = 'var(--el-button-border-color, #dcdfe6)';
                backToTopBtn.style.color = 'var(--el-button-text-color, #606266)';
            });

            // 添加主题变化监听器
            const updateButtonTheme = () => {
                // 强制重新应用样式以适应主题变化
                backToTopBtn.style.backgroundColor = 'var(--el-button-bg-color, #ffffff)';
                backToTopBtn.style.borderColor = 'var(--el-button-border-color, #dcdfe6)';
                backToTopBtn.style.color = 'var(--el-button-text-color, #606266)';
            };

            // 监听主题变化
            const themeObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' &&
                        (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                        setTimeout(updateButtonTheme, 100);
                    }
                });
            });

            // 监听document和html元素的主题变化
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });
            themeObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });

            // 添加点击事件
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // 将按钮添加到容器中
            backToTopContainer.appendChild(backToTopBtn);

            // 将容器添加到分页控件的父容器中
            bottomPagination.parentNode.appendChild(backToTopContainer);

            // 添加滚动监听，只在滚动到一定位置时显示
            const handleScroll = () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const bottomPaginationRect = bottomPagination.getBoundingClientRect();

                // 当页面滚动超过一屏高度且底部分页控件在视口内时显示按钮
                if (scrollTop > window.innerHeight / 2 &&
                    bottomPaginationRect.top < window.innerHeight &&
                    bottomPaginationRect.bottom > 0) {
                    backToTopContainer.style.display = 'block';
                } else {
                    backToTopContainer.style.display = 'none';
                }
            };

            window.addEventListener('scroll', handleScroll);
            handleScroll(); // 初始检查

            log('已添加返回顶部按钮');
            return true;
        };

        // 立即尝试添加按钮
        if (checkAndAddButton()) {
            return;
        }

        // 如果没有成功添加，设置一个定时器定期检查
        const buttonCheckInterval = setInterval(() => {
            if (checkAndAddButton()) {
                clearInterval(buttonCheckInterval);
            }
        }, 1000);

        // 同时使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            if (checkAndAddButton()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 确保在页面完全加载后也尝试添加按钮
        window.addEventListener('load', checkAndAddButton);
    }

    // 在页面加载完成后初始化
    window.addEventListener('load', () => {
        log('页面加载完成，准备初始化时间修复功能');
        if (registryData) {
            initTimeFixing();
        } else {
            log('注册表数据尚未加载，将在数据加载后自动初始化时间修复功能');
        }

        // 添加配置按钮
        addConfigButton();

        // 处理URL搜索参数
        handleUrlSearch();

        // 初始化版本号链接拦截
        interceptVersionLinks();
        log('已初始化版本号链接拦截功能');

        // 显示当前使用的镜像源
        showCurrentMirror();

        // 添加返回顶部按钮
        addBackToTopButton();

        // 初始化头像悬停置顶功能
        initAvatarHoverEffect();
    });

    // 头像悬停置顶功能
    function initAvatarHoverEffect() {
        log('初始化头像悬停置顶功能');

        // 添加CSS样式
        const avatarStyle = document.createElement('style');
        avatarStyle.textContent = `
            /* 头像容器悬停效果 */
            .avatars {
                position: relative;
                transition: all 0.2s ease;
            }
            
            .avatars:hover {
                z-index: 1000 !important;
                position: relative !important;
                overflow: visible !important;
            }
            
            /* 当头像容器悬停时，允许其父容器溢出 */
            .avatars:hover .avatar {
                position: relative;
                z-index: 1001;
            }
            
            /* 确保头像在悬停时可以超出边界显示 */
            .market-package:has(.avatars:hover) {
                overflow: visible !important;
                z-index: 999 !important;
            }
            
            /* 为了兼容性，也添加JavaScript控制的类 */
            .avatars.hover-active {
                z-index: 1000 !important;
                position: relative !important;
                overflow: visible !important;
            }
            
            .avatars.hover-active .avatar {
                position: relative;
                z-index: 1001;
            }
            
            .market-package.avatar-hover-parent {
                overflow: visible !important;
                z-index: 999 !important;
            }
            
            /* 确保头像容器的父级元素也支持溢出 */
            .market-package .footer {
                position: relative;
            }
            
            .market-package .footer:has(.avatars:hover) {
                overflow: visible !important;
                z-index: 999 !important;
            }
            
            .market-package .footer.avatar-hover-footer {
                overflow: visible !important;
                z-index: 999 !important;
            }
            
            /* 确保Element UI的tooltip始终显示在头像区域之上 */
            .el-popper[role="tooltip"] {
                z-index: 10000 !important;
            }
            
            /* 特别针对作者昵称tooltip的样式 */
            .el-popper.is-dark[role="tooltip"] {
                z-index: 10000 !important;
            }
        `;
        document.head.appendChild(avatarStyle);

        // 使用事件委托监听头像区域的鼠标事件
        document.addEventListener('mouseenter', function (e) {
            // 安全检查：确保 e.target 存在且有 classList 属性
            if (!e.target || !e.target.classList) return;

            // 检查是否是头像容器
            const avatarsContainer = e.target.classList.contains('avatars') ? e.target : e.target.closest('.avatars');

            if (avatarsContainer) {
                const marketPackage = avatarsContainer.closest('.market-package');
                const footer = avatarsContainer.closest('.footer');

                if (marketPackage) {
                    log('鼠标进入头像区域，启用置顶显示');

                    // 添加悬停状态类
                    avatarsContainer.classList.add('hover-active');
                    marketPackage.classList.add('avatar-hover-parent');
                    if (footer) {
                        footer.classList.add('avatar-hover-footer');
                    }

                    // 确保所有父级元素都支持溢出显示
                    let parent = avatarsContainer.parentElement;
                    while (parent && !parent.classList.contains('market-package')) {
                        parent.style.overflow = 'visible';
                        parent.style.position = 'relative';
                        parent = parent.parentElement;
                    }
                }
            }
        }, true);

        document.addEventListener('mouseleave', function (e) {
            // 安全检查：确保 e.target 存在且有 classList 属性
            if (!e.target || !e.target.classList) return;

            // 检查是否是头像容器
            const avatarsContainer = e.target.classList.contains('avatars') ? e.target : e.target.closest('.avatars');

            if (avatarsContainer) {
                const marketPackage = avatarsContainer.closest('.market-package');
                const footer = avatarsContainer.closest('.footer');

                if (marketPackage) {
                    log('鼠标离开头像区域，恢复正常显示');

                    // 移除悬停状态类
                    avatarsContainer.classList.remove('hover-active');
                    marketPackage.classList.remove('avatar-hover-parent');
                    if (footer) {
                        footer.classList.remove('avatar-hover-footer');
                    }

                    // 恢复父级元素的原始样式
                    let parent = avatarsContainer.parentElement;
                    while (parent && !parent.classList.contains('market-package')) {
                        parent.style.overflow = '';
                        parent.style.position = '';
                        parent = parent.parentElement;
                    }
                }
            }
        }, true);

        log('头像悬停置顶功能初始化完成');
    }

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
        const currentMirror = CONFIG.mirrorUrls[CONFIG.currentMirrorIndex];
        return currentMirror ? currentMirror.url : '';
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
        return baseUrl;
    };

    // 代理请求函数
    const requestWithProxy = async function (targetUrl) {
        const currentMirror = CONFIG.mirrorUrls[CONFIG.currentMirrorIndex];
        if (!currentMirror || !currentMirror.useProxy) {
            // 如果当前镜像源不使用代理，直接返回原始fetch
            return originalFetch.call(window, targetUrl, {
                cache: CONFIG.disableCache ? 'no-store' : 'default'
            });
        }

        try {
            log('使用代理请求:', targetUrl);
            const response = await originalFetch.call(window, CONFIG.proxyUrl, {
                method: 'POST',
                headers: {
                    'api-u': targetUrl,
                    'api-o0': 'method=GET, timings=true, timeout=30000',
                    'Content-Type': 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`代理请求失败: ${response.status} ${response.statusText}`);
            }

            // 获取代理返回的数据
            const proxyData = await response.text();

            // 创建一个新的Response对象，模拟原始请求的响应
            const mockResponse = new Response(proxyData, {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            log('代理请求成功');
            return mockResponse;
        } catch (error) {
            error('代理请求失败:', error);
            throw error;
        }
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
        const currentMirror = CONFIG.mirrorUrls[CONFIG.currentMirrorIndex];
        const shouldUseProxy = currentMirror ? currentMirror.useProxy : false;

        return new Promise((resolve, reject) => {
            // 设置超时
            const timeoutId = setTimeout(() => {
                error(`请求超时: ${typeof input === 'string' ? input : input.url}`);
                resolve(handleRequestFailure(input, init));
            }, CONFIG.requestTimeout);

            // 根据当前镜像源的代理设置决定是否使用代理
            const requestPromise = shouldUseProxy
                ? requestWithProxy(targetUrl)
                : originalFetch.call(window, typeof input === 'string' ? targetUrl : new Request(targetUrl, {
                    ...input,
                    cache: CONFIG.disableCache ? 'no-store' : 'default'
                }), CONFIG.disableCache ? { ...init, cache: 'no-store' } : init);

            requestPromise
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
        if (input && typeof input === 'string' && normalizeUrl(input).includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (字符串):', input);
            // 使用带重试功能的fetch
            return fetchWithRetry(input, CONFIG.disableCache ? { ...init, cache: 'no-store' } : init);
        } else if (input && input instanceof Request && input.url.includes(CONFIG.sourceUrl)) {
            log('拦截到 fetch 请求 (Request):', input.url);
            // 使用带重试功能的fetch
            return fetchWithRetry(input, CONFIG.disableCache ? { ...init, cache: 'no-store' } : init);
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
        let shortPackageName = packageName;
        if (typeof packageName === 'string') {
            shortPackageName = packageName
                .replace('https://www.npmjs.com/package/', '')
                .replace('https://www.npmjs.com/', '');
        }

        // 在 objects 数组中查找匹配的插件
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name === shortPackageName) {
                return item;
            }
        }

        // 如果没有找到完全匹配的
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name) {
                // 检查是否是 scoped 包，并进行匹配
                if (item.package.name === shortPackageName || item.package.name.endsWith('/' + shortPackageName)) {
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

