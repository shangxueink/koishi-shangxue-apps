// ==UserScript==
// @name         Bilibili专栏原图链接提取2024改版
// @namespace    https://github.com/shangxueink
// @version      4.0
// @description  PC端B站专栏图片默认是经压缩过的webp。此脚本帮助用户点击按钮后获取哔哩哔哩专栏中所有原图的直链，方便使用其他工具批量下载原图。
// @author       shangxueink
// @license      MIT
// @match        https://www.bilibili.com/read/cv*
// @match        https://www.bilibili.com/opus/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*/dynamic
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// @acknowledgement 原始脚本由Hui-Shao开发，本脚本在其基础上进行了修改和增强。（https://greasyfork.org/zh-CN/scripts/456497-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96 -> https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88）
// @downloadURL https://update.greasyfork.org/scripts/521666/Bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.user.js
// @updateURL https://update.greasyfork.org/scripts/521666/Bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.meta.js
// ==/UserScript==

// https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88

/*
 * （仅供示例） @match 的地址：
 *
 * https://www.bilibili.com/read/cv123456/
 * https://space.bilibili.com/12345678/dynamic
 *
 * https://www.bilibili.com/opus/9101112    // 已经失效了
 * https://t.bilibili.com/789012/   // 已经失效了
 */

(function () {
    'use strict';
    const iconExtractLink = 'https://i0.hdslb.com/bfs/article/7a0cc21280e2ba013d2681cff4dee947312276085.png'; //  提取链接图标
    const iconCopyLink = 'https://i0.hdslb.com/bfs/article/cecac694c99629afbe764eb2b2066a46312276085.png'; //  复制链接图标
    const iconDownloadEach = 'https://i0.hdslb.com/bfs/article/0896498c861585719a122e0fc6ef5689312276085.png'; //  逐张下载图标
    const iconDownloadMarkdown = 'https://www.svgrepo.com/show/510065/markdown.svg'; //  下载文档图标


    function createButton(targetContainer, showDownloadEach, isHorizontal, showMarkdownButton) {
        var buttonsContainer = document.createElement("div");
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.flexDirection = isHorizontal ? "row" : "column";
        buttonsContainer.style.alignItems = "center";

        var existingItem = targetContainer.querySelector('.toolbar-item, .side-toolbar__action, .bili-dyn-item__action');
        var height = existingItem ? existingItem.clientHeight : 40;
        var width = existingItem ? existingItem.clientWidth : 40;

        var buttonDownload = document.createElement("button");
        buttonDownload.id = "btn001";
        buttonDownload.className = "toolbar-item";
        buttonDownload.style = setButtonStyle("#C7EDCC", width, height, iconExtractLink);
        buttonDownload.onclick = function () {
            handleButtonClick(buttonDownload, true);
        };
        buttonsContainer.appendChild(buttonDownload);

        var buttonCopy = document.createElement("button");
        buttonCopy.id = "btn002";
        buttonCopy.className = "toolbar-item";
        buttonCopy.style = setButtonStyle("#E3EDCD", width, height, iconCopyLink);
        buttonCopy.onclick = function () {
            handleButtonClick(buttonCopy, false);
        };
        buttonsContainer.appendChild(buttonCopy);

        if (showDownloadEach) {
            var buttonDownloadEach = document.createElement("button");
            buttonDownloadEach.id = "btn003";
            buttonDownloadEach.className = "toolbar-item";
            buttonDownloadEach.style = setButtonStyle("#FFD700", width, height, iconDownloadEach);
            buttonDownloadEach.onclick = function () {
                handleButtonClick(buttonDownloadEach, 'each');
            };
            buttonsContainer.appendChild(buttonDownloadEach);
        }

        if (showMarkdownButton) {
            var buttonDownloadMD = document.createElement("button");
            buttonDownloadMD.id = "btn004";
            buttonDownloadMD.className = "toolbar-item";
            buttonDownloadMD.style = setButtonStyle("#ADD8E6", width, height, iconDownloadMarkdown); // Light blue
            buttonDownloadMD.onclick = function () {
                handleMarkdownDownload(this);
            };
            buttonsContainer.appendChild(buttonDownloadMD);
        }

        targetContainer.appendChild(buttonsContainer);
    }

    function setButtonStyle(backgroundColor, width, height, icon) {
        return `
            border-radius: 6px;
            margin: 5px 0;
            height: ${height}px;
            width: ${width}px;
            padding: 0px;
            background-color: ${backgroundColor};
            color: black;
            font-weight: bold;
            overflow: hidden;
            text-align: center;
            box-shadow: inset 0 0 20px rgba(255, 255, 255, 1);
            background-image: url(${icon});
            background-size: 30px 30px; /* 150% of 20px */
            background-repeat: no-repeat;
            background-position: center;
        `;
    }

    function urlGetAllModes(button, mode) {
        let modes = [1, 2, 3, 4, 5];
        let url_list = [];
        let mode_found = false;

        for (let m of modes) {
            let { selector, attribute } = getSelectorAndAttributeByMode(m);
            let img_list = document.querySelectorAll(selector);
            if (img_list.length > 0) {
                mode_found = true;
                img_list.forEach(item => {
                    let text = item.getAttribute(attribute);
                    if (!text) {
                        // 兼容opus
                        const imgElement = item.querySelector('img');
                        if (imgElement) {
                            text = imgElement.getAttribute('src');
                        }
                    }
                    if (text && (text.includes('.jpg') || text.includes('.png') || text.includes('.webp') || text.includes('.jpeg') || text.includes('.gif') || text.includes('.bmp'))) {
                        if (text.startsWith('//')) {
                            text = 'https:' + text;
                        }
                        text = text.split('@')[0];
                        if (!text.includes('/face') && !text.includes('/garb')) {
                            url_list.push(text);
                        }
                    }
                });
            }
        }


        // 去重处理
        url_list = Array.from(new Set(url_list));

        // 获取选中的URL
        let selectedUrls = getSelectedUrls();

        if (!mode_found) {
            alert("在正文中似乎并没有获取到图片……");
            button.textContent = "无图片：点击无效，请刷新重试";
        } else {
            let url_str = (mode === 'each' ? url_list : selectedUrls).join("\n"); // 如果是逐个下载，则下载所有URL，否则使用选中的URL
            let url_count = (mode === 'each' ? url_list : selectedUrls).length;

            if (mode === true) {
                download_txt("bili_img_urls", url_str);
                button.innerHTML = `已提取${url_count}张`;
            } else if (mode === false) {
                copyToClipboard(url_str);
                button.innerHTML = `已复制${url_count}张`;
            } else if (mode === 'each') {
                downloadEachImage(selectedUrls);
                button.innerHTML = `正在下载`;
            }
        }
    }


    function getSelectorAndAttributeByMode(mode) {
        switch (mode) {
            case 1:
                return { selector: "#article-content img[data-src].normal-img", attribute: "data-src" };
            case 2:
                return { selector: "#article-content p.normal-img img", attribute: "src" };
            case 3:
                return { selector: "div.opus-module-content img", attribute: "src" };
            case 4:
                return { selector: ".dyn-card-opus__pics img", attribute: "src" };
            case 5:
                return { selector: "div.opus-para-pic", attribute: "" }; // 用于opus的selector
            default:
                alert("传入模式参数错误！");
                return { selector: "", attribute: "" };
        }
    }

    function download_txt(filename, text) {
        // 获取当前URL
        const currentUrl = window.location.href;
        let customFilename = filename;

        // 根据URL格式生成特定的文件名
        if (currentUrl.includes('/opus/')) {
            const opusId = currentUrl.match(/\/opus\/(\d+)/);
            if (opusId && opusId[1]) {
                customFilename = `bili_img_urls.opus.${opusId[1]}.txt`;
            }
        } else if (currentUrl.includes('/read/cv')) {
            const cvId = currentUrl.match(/\/read\/cv(\d+)/);
            if (cvId && cvId[1]) {
                customFilename = `bili_img_urls.read.cv${cvId[1]}.txt`;
            }
        } else if (currentUrl.includes('t.bilibili.com/')) {
            const tId = currentUrl.match(/t\.bilibili\.com\/(\d+)/);
            if (tId && tId[1]) {
                customFilename = `bili_img_urls.t.${tId[1]}.txt`;
            }
        } else {
            // 对于其他URL格式，使用默认文件名
            customFilename = `${filename}.txt`;
        }

        let pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', customFilename);
        pom.click();
    }

    function downloadEachImage(urls) {
        urls.forEach((url, index) => {
            setTimeout(() => {
                let link = document.createElement('a');
                fetch(url)
                    .then(response => response.blob())
                    .then(blob => {
                        let blobUrl = URL.createObjectURL(blob);
                        link.href = blobUrl;
                        link.download = url.split('/').pop();
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                    })
                    .catch(e => console.error('Download failed:', e));
            }, index * 100); // 逐张下载，每张间隔0.1秒
        });
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    function handleDynamicItem(item) {
        const footer = item.querySelector('.bili-dyn-item__footer');
        const action = footer ? footer.querySelector('.bili-dyn-item__action') : null;
        if (footer && action && !footer.querySelector('button')) {
            const buttonWidth = action.clientWidth;
            const buttonHeight = action.clientHeight;

            createButton(footer, false, true, false);

            const buttonDownload = footer.querySelector("#btn001");
            const buttonCopy = footer.querySelector("#btn002");

            buttonDownload.onclick = () => {
                buttonDownload.disabled = true;
                buttonDownload.style.backgroundColor = "#FDE6E0";
                buttonDownload.style.backgroundImage = "none";
                extractDynamicImages(item, true, buttonDownload);
            };

            buttonCopy.onclick = () => {
                buttonCopy.disabled = true;
                buttonCopy.style.backgroundColor = "#FDE6E0";
                buttonCopy.style.backgroundImage = "none";
                extractDynamicImages(item, false, buttonCopy);
            };
        }
    }

    function extractDynamicImages(item, download, button) {
        const imgList = item.querySelectorAll('.bili-album__preview__picture__img img, img');
        const urlSet = new Set();

        imgList.forEach(img => {
            let src = img.getAttribute('src');
            if (src.startsWith('//')) {
                src = 'https:' + src;
            }
            const baseUrl = src.split('@')[0];
            if (!baseUrl.includes('/face') && !baseUrl.includes('/garb')) {
                urlSet.add(baseUrl);
            }
        });

        const urlStr = Array.from(urlSet).join("\n");
        if (download) {
            download_txt("bili_dyn_img_urls", urlStr);
            //button.innerHTML = `${urlSet.size}张`;    // 会多一张
            button.innerHTML = `已整理`;
        } else {
            copyToClipboard(urlStr);
            //button.innerHTML = `${urlSet.size}张`;    // 会多一张
            button.innerHTML = `已复制`;
        }
    }

    function observeDocument() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.matches('.bili-dyn-list__item')) {
                        handleDynamicItem(node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }



    function addSelectionFeatures() {
        // 找到所有包含图片的元素
        let imageElements = document.querySelectorAll('#article-content img[data-src].normal-img, #article-content p.normal-img img, div.opus-para-pic');

        imageElements.forEach(imgElement => {
            // 创建一个覆盖层
            const overlay = document.createElement('div');
            overlay.classList.add('image-overlay');
            overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9; /* 确保在图片之上，勾选框之下 */
            cursor: pointer;
        `;

            // 创建勾选框
            const checkbox = document.createElement('div');
            checkbox.classList.add('image-checkbox');
            checkbox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="green" stroke="green" stroke-width="2"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`; // 初始为绿色勾
            checkbox.style.cssText = `
            position: absolute;
            right: 5px;
            bottom: 5px;
            width: 30px; /* 增大尺寸 */
            height: 30px; /* 增大尺寸 */
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
        `;

            // 初始状态设置为选中
            imgElement.dataset.selected = 'true';

            // 将覆盖层和勾选框添加到图片的父元素
            let parentElement = imgElement.parentNode;
            if (imgElement.classList.contains('opus-para-pic')) {
                parentElement = imgElement; // 如果是opus-para-pic本身就是父元素
            }
            parentElement.style.position = 'relative'; // 确保父元素是定位的
            parentElement.appendChild(overlay);
            parentElement.appendChild(checkbox);

            // 点击覆盖层切换选中状态
            overlay.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                const isSelected = imgElement.dataset.selected === 'true';
                imgElement.dataset.selected = isSelected ? 'false' : 'true';

                if (isSelected) {
                    // 切换为红色叉号
                    checkbox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="red" stroke="red" stroke-width="2"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
                } else {
                    // 切换为绿色勾
                    checkbox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="green" stroke="green" stroke-width="2"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
                }
            });

            // 初始状态，显示勾选框
            checkbox.style.display = 'flex';
        });
    }

    // 获取选中的URL
    function getSelectedUrls() {
        let selectedUrls = [];
        let imageElements = document.querySelectorAll('#article-content img[data-src].normal-img, #article-content p.normal-img img, div.opus-para-pic');

        imageElements.forEach(imgElement => {
            if (imgElement.dataset.selected === 'true') {
                let src = null;
                if (imgElement.classList.contains('opus-para-pic')) {
                    // opus情况
                    const img = imgElement.querySelector('img');
                    if (img) {
                        src = img.getAttribute('src');
                    }
                } else {
                    // cv情况
                    src = imgElement.getAttribute('src') || imgElement.dataset.src;
                }


                if (src) {
                    if (src.startsWith('//')) {
                        src = 'https:' + src;
                    }
                    src = src.split('@')[0];
                    // 获取图片尺寸
                    let width = imgElement.naturalWidth || imgElement.width;
                    let height = imgElement.naturalHeight || imgElement.height;

                    if (imgElement.classList.contains('opus-para-pic')) {
                        const img = imgElement.querySelector('img');
                        width = img?.naturalWidth || img?.width || 0; // 确保 img 存在
                        height = img?.naturalHeight || img?.height || 0; // 确保 img 存在                  
                    }
                    // 将尺寸信息添加到 URL
                    // src = `${src}?px=${width}x${height}`;

                    if (!src.includes('/face') && !src.includes('/garb')) {
                        selectedUrls.push(src);
                    }
                }
            }
        });

        return selectedUrls;
    }

    function handleButtonClick(button, mode) {
        const selectedUrls = getSelectedUrls();
        if (selectedUrls.length === 0) {
            button.disabled = true;
            button.style.backgroundColor = "#FDE6E0";
            button.style.backgroundImage = "none";
            button.innerHTML = "未选图~";

            setTimeout(() => {
                button.disabled = false;
                button.style.backgroundColor = ""; // 恢复默认背景色
                button.style.backgroundImage = `url(${mode === true ? iconExtractLink : (mode === false ? iconCopyLink : iconDownloadEach)
                    })`; // 恢复图标
                // 恢复原始样式
                button.style.cssText = setButtonStyle(
                    mode === true ? "#C7EDCC" : mode === false ? "#E3EDCD" : "#FFD700",
                    button.clientWidth,
                    button.clientHeight,
                    mode === true ? iconExtractLink : mode === false ? iconCopyLink : iconDownloadEach
                );
                button.innerHTML = ""; // 清空文字
            }, 3000);
        } else {
            button.disabled = true;
            button.style.backgroundColor = "#FDE6E0";
            button.style.backgroundImage = "none";
            button.innerHTML = "正在处理，请稍候...";
            urlGetAllModes(button, mode);
        }
    }


    function download_md(filename, text) {
        const currentUrl = window.location.href;
        let customFilename = filename;
        let articleTitle = document.querySelector('.opus-module-title__text')?.innerText || document.querySelector('.title')?.innerText || '';

        // Sanitize title
        articleTitle = articleTitle.replace(/[\\/:"*?<>|]/g, '_'); // remove invalid filename characters

        if (currentUrl.includes('/opus/')) {
            const opusId = currentUrl.match(/\/opus\/(\d+)/);
            if (opusId && opusId[1]) {
                customFilename = `${articleTitle || `bili_article.opus.${opusId[1]}`}.md`;
            }
        } else if (currentUrl.includes('/read/cv')) {
            const cvId = currentUrl.match(/\/read\/cv(\d+)/);
            if (cvId && cvId[1]) {
                customFilename = `${articleTitle || `bili_article.read.cv${cvId[1]}`}.md`;
            }
        } else {
            customFilename = `${articleTitle || filename}.md`;
        }

        let pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', customFilename);
        pom.click();
    }

    function convertArticleToMarkdown() {
        const title = document.querySelector('.opus-module-title__text')?.innerText || document.querySelector('.title')?.innerText || 'Untitled';
        let markdown = `# ${title}\n\n`;

        const authorEl = document.querySelector('.opus-module-author__name');
        const pubDateEl = document.querySelector('.opus-module-author__pub__text');
        if (authorEl) {
            markdown += `> 作者：${authorEl.innerText}\n`;
        }
        if (pubDateEl) {
            markdown += `> ${pubDateEl.innerText}\n`;
        }
        if (authorEl || pubDateEl) {
            markdown += `\n`;
        }

        const articleContainer = document.querySelector('.opus-module-content.opus-paragraph-children') || document.querySelector('#article-content');
        if (!articleContainer) return markdown;

        const processInlines = (element) => {
            let content = '';
            for (const child of element.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    content += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const tagName = child.tagName.toLowerCase();
                    const innerContent = processInlines(child);

                    // Skip elements that are empty after processing children
                    if (innerContent.trim() === '' && !['br', 'img'].includes(tagName)) {
                        continue;
                    }

                    switch (tagName) {
                        case 'strong':
                        case 's':
                        case 'em':
                        case 'i':
                            const marker = { 'strong': '**', 's': '~~', 'em': '*', 'i': '*' }[tagName];
                            const leadSpace = innerContent.match(/^\s*/)[0];
                            const trailSpace = innerContent.match(/\s*$/)[0];
                            const trimmed = innerContent.trim();

                            if (trimmed) {
                                // If there were no spaces originally, add them. Otherwise, keep the original spaces.
                                const finalLeadSpace = leadSpace.length > 0 ? leadSpace : ' ';
                                const finalTrailSpace = trailSpace.length > 0 ? trailSpace : ' ';
                                content += `${finalLeadSpace}${marker}${trimmed}${marker}${finalTrailSpace}`;
                            } else {
                                content += innerContent; // Preserve spaces if that's all there is
                            }
                            break;
                        case 'a':
                            // If the link contains an image, processInlines would have already converted the image.
                            // So we just pass the content up. If not, format as a markdown link.
                            if (child.querySelector('img')) {
                                content += innerContent;
                            } else {
                                content += `[${innerContent}](${child.href})`;
                            }
                            break;
                        case 'br':
                            content += '  \n';
                            break;
                        case 'img':
                            let src = (child.src || child.dataset.src || '').split('@')[0];
                            if (src.startsWith('//')) {
                                src = 'https:' + src;
                            }
                            if (src) {
                                content += `<center><img src="${src}" alt="${child.alt || 'image'}" referrerpolicy="no-referrer"></center>`;
                            }
                            break;
                        // For block-like elements that can appear inside others, just get their content.
                        case 'p':
                        case 'span':
                        case 'div':
                        default:
                            content += innerContent;
                            break;
                    }
                }
            }
            return content;
        };

        for (const node of articleContainer.children) {
            const tagName = node.tagName.toLowerCase();
            // Process children and clean up markdown for adjacent strong tags
            let nodeContent = processInlines(node).replace(/\*\*\s*\*\*/g, '');

            switch (tagName) {
                case 'h1':
                    markdown += `## ${nodeContent}\n\n`;
                    break;
                case 'h2':
                    markdown += `### ${nodeContent}\n\n`;
                    break;
                case 'h3':
                    markdown += `#### ${nodeContent}\n\n`;
                    break;
                case 'h4':
                    markdown += `##### ${nodeContent}\n\n`;
                    break;
                case 'h5':
                    markdown += `###### ${nodeContent}\n\n`;
                    break;
                case 'h6':
                    markdown += `###### ${nodeContent}\n\n`;
                    break;
                case 'p':
                    if (nodeContent.trim() === '') {
                        // don't add multiple empty lines
                        if (!markdown.endsWith('\n\n') && !markdown.endsWith('\n')) {
                            markdown += '\n';
                        }
                    } else {
                        if (node.style.textAlign === 'center') {
                            markdown += `<center>${nodeContent}</center>\n\n`;
                        } else {
                            markdown += `${nodeContent}\n\n`;
                        }
                    }
                    break;
                case 'figure':
                    if (node.classList.contains('opus-para-line')) {
                        markdown += '---\n\n';
                    } else {
                        // This is an image, processInlines has handled it.
                        if (nodeContent.trim()) {
                            markdown += `${nodeContent}\n\n`;
                        }
                    }
                    break;
                case 'div':
                    // This handles opus-para-pic and other divs.
                    if (nodeContent.trim()) {
                        markdown += `${nodeContent}\n\n`;
                    }
                    break;
                case 'ul':
                    let listContent = '';
                    for (const li of node.querySelectorAll('li')) {
                        // process each li and clean it up
                        listContent += `- ${processInlines(li).replace(/\*\*\s*\*\*/g, '')}\n`;
                    }
                    markdown += `${listContent}\n`;
                    break;
                default:
                    if (nodeContent.trim()) {
                        markdown += `${nodeContent}\n\n`;
                    }
                    break;
            }
        }
        // Final cleanup of excessive newlines
        return markdown.replace(/(\n{3,})/g, '\n\n').trim();
    }


    function handleMarkdownDownload(button) {
        button.disabled = true;
        button.style.backgroundColor = "#FDE6E0";
        button.style.backgroundImage = "none";
        button.innerHTML = "正在生成...";

        try {
            const markdownContent = convertArticleToMarkdown();
            if (markdownContent && markdownContent.trim() !== '') {
                download_md("bili_article", markdownContent);
                button.innerHTML = "已下载";
            } else {
                button.innerHTML = "内容为空，请【前往新版】";
            }
        } catch (e) {
            console.error("Markdown conversion failed:", e);
            button.innerHTML = "生成失败";
        }

        setTimeout(() => {
            button.disabled = false;
            button.style.cssText = setButtonStyle(
                "#ADD8E6",
                button.clientWidth,
                button.clientHeight,
                iconDownloadMarkdown
            );
            button.innerHTML = "";
        }, 3000);
    }


    if (window.location.href.includes("space.bilibili.com") && window.location.href.includes("dynamic")) {
        observeDocument();
    } else if (window.location.href.includes("read/cv")) {
        var observer = new MutationObserver(function (mutations, me) {
            var toolbar = document.querySelector(".side-toolbar");
            if (toolbar) {
                createButton(toolbar, false, false, true);
                addSelectionFeatures();
                me.disconnect();
                return;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } else if (window.location.href.includes("opus/")) {
        var observerOpus = new MutationObserver(function (mutations, me) {
            var toolbarOpus = document.querySelector(".side-toolbar__box");
            if (toolbarOpus) {
                var showDownloadEach = window.location.href.includes("opus/");
                createButton(toolbarOpus, showDownloadEach, false, true);
                addSelectionFeatures();
                me.disconnect();
                return;
            }
        });
        observerOpus.observe(document.body, { childList: true, subtree: true });
    } else if (window.location.href.includes("t.bilibili.com")) {
        var observerT = new MutationObserver(function (mutations, me) {
            var toolbarT = document.querySelector(".side-toolbar__box");
            if (toolbarT) {
                createButton(toolbarT, true, false, false);
                me.disconnect();
                return;
            }
        });
        observerT.observe(document.body, { childList: true, subtree: true });
    }
})();
