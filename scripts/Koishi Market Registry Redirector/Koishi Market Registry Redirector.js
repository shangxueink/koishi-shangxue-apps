// ==UserScript==
// @name         Koishi Market Registry Redirector
// @namespace    https://github.com/shangxueink
// @version      3.1
// @description  将 Koishi 市场注册表请求重定向到多个备用镜像源，支持自动重试，并修复时间显示问题。
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
            "https://shangxueink.github.io/koishi-registry-aggregator/market.json",
            'https://koishi-registry.yumetsuki.moe/index.json',
            'https://koishi-registry-cf.yumetsuki.moe/',
            'https://registry.koishi.chat/index.json',
        ],
        currentMirrorIndex: 0,
        debug: false,
        requestTimeout: 5000,
        maxRetries: 2,
        currentRetries: 0
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
            <h2>镜像源列表（优先级从高到低）</h2>
            <p>镜像源地址，请确保地址正确，否则会导致插件市场无法正常加载。</p>
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
            <button id="reset-btn" class="VPLink link button" style="width: 100%;">重置全部为默认配置</button>
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
            mirrorList.innerHTML = CONFIG.mirrorUrls.map((url, index) => `
                <div class="mirror-item" style="margin-bottom: 0.5rem; display: flex; flex-direction: column; align-items: stretch;">
                    <input type="text" value="${url}" style="width: 100%; margin-bottom: 0.5rem; border: 1px solid #ccc; padding: 0.5rem; box-sizing: border-box;">
                    <div style="display: flex; width: 100%;">
                        <button class="move-up VPLink link button" data-index="${index}" style="width: 33.33%; margin-right: 0.25rem;">↑</button>
                        <button class="move-down VPLink link button" data-index="${index}" style="width: 33.33%; margin: 0 0.125rem;">↓</button>
                        <button class="remove-mirror VPLink link button" data-index="${index}" style="width: 33.33%; margin-left: 0.25rem;">删除</button>
                    </div>
                </div>
            `).join('');
        }
        renderMirrorList();

        // 事件监听
        document.getElementById('add-mirror').addEventListener('click', () => {
            CONFIG.mirrorUrls.push('');
            renderMirrorList();
        });

        // 带动画的移动函数
        function animateMove(fromIndex, toIndex, direction) {
            const items = mirrorList.querySelectorAll('.mirror-item');
            const fromItem = items[fromIndex];
            const toItem = items[toIndex];

            if (!fromItem || !toItem) return;

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
                CONFIG.mirrorUrls.splice(index, 1);
                renderMirrorList();
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
            if (confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
                // 重置配置为默认值
                CONFIG.mirrorUrls = [...DEFAULT_CONFIG.mirrorUrls];
                CONFIG.requestTimeout = DEFAULT_CONFIG.requestTimeout;
                CONFIG.maxRetries = DEFAULT_CONFIG.maxRetries;
                CONFIG.debug = DEFAULT_CONFIG.debug;
                CONFIG.currentMirrorIndex = DEFAULT_CONFIG.currentMirrorIndex;
                CONFIG.currentRetries = DEFAULT_CONFIG.currentRetries;

                // 更新UI显示
                renderMirrorList();
                document.getElementById('timeout').value = CONFIG.requestTimeout;
                document.getElementById('retries').value = CONFIG.maxRetries;
                document.getElementById('debug').checked = CONFIG.debug;
            }
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            CONFIG.mirrorUrls = Array.from(mirrorList.querySelectorAll('input'))
                .map(input => input.value.trim())
                .filter(url => url);

            CONFIG.requestTimeout = parseInt(document.getElementById('timeout').value) || 5000;
            CONFIG.maxRetries = parseInt(document.getElementById('retries').value) || 2;
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
    });

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

            originalFetch.call(window, typeof input === 'string' ? targetUrl : new Request(targetUrl, { ...input, cache: 'no-store' }), init)

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
        // log('查找插件:', shortPackageName);

        // 在 objects 数组中查找匹配的插件
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name === shortPackageName) {
                //log('找到插件数据:', shortPackageName);
                return item;
            }
        }

        // 如果没有找到完全匹配的
        for (const item of registryData.objects) {
            if (item && item.package && item.package.name) {
                // 检查是否是 scoped 包，并进行匹配
                if (item.package.name === shortPackageName || item.package.name.endsWith('/' + shortPackageName)) {
                    //log('通过灵活匹配找到插件数据:', item.package.name);
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
