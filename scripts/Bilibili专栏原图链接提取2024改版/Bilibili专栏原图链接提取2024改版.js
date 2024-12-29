// ==UserScript==
// @name         Bilibili专栏原图链接提取2024改版
// @namespace    https://github.com/shangxueink
// @version      2.7
// @description  PC端B站专栏图片默认是经压缩过的webp。此脚本帮助用户点击按钮后获取哔哩哔哩专栏中所有原图的直链，方便使用其他工具批量下载原图。
// @author       shangxueink
// @license      GPLv3
// @match        https://www.bilibili.com/read/cv*
// @match        https://www.bilibili.com/opus/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// @acknowledgement 原始脚本由Hui-Shao开发，本脚本在其基础上进行了修改和增强。（https://greasyfork.org/zh-CN/scripts/456497-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96 -> https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88）
// @downloadURL https://update.greasyfork.org/scripts/521666/Bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.user.js
// @updateURL https://update.greasyfork.org/scripts/521666/Bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const iconExtractLink = 'https://i0.hdslb.com/bfs/article/541ab91a8a0675458a325fc0c9f936e9312276085.png'; //  提取链接图标
    const iconCopyLink = 'https://i0.hdslb.com/bfs/article/cecac694c99629afbe764eb2b2066a46312276085.png'; //  复制链接图标
    const iconDownloadEach = 'https://i0.hdslb.com/bfs/article/0896498c861585719a122e0fc6ef5689312276085.png'; //  逐张下载图标

    function createButton(targetContainer, showDownloadEach) {
        var buttonsContainer = document.createElement("div");
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.flexDirection = "column";
        buttonsContainer.style.alignItems = "center";

        var existingItem = targetContainer.querySelector('.toolbar-item, .side-toolbar__action');
        var height = existingItem ? existingItem.clientHeight : 40;
        var width = existingItem ? existingItem.clientWidth : 40;

        var buttonDownload = document.createElement("button");
        buttonDownload.id = "btn001";
        buttonDownload.className = "toolbar-item";
        buttonDownload.style = setButtonStyle("#C7EDCC", width, height, iconExtractLink);
        buttonDownload.onclick = function () {
            buttonDownload.disabled = true;
            buttonDownload.style.backgroundColor = "#FDE6E0";
            buttonDownload.style.backgroundImage = "none"; // Remove icon
            buttonDownload.innerHTML = "正在处理，请稍候...";
            urlGetAllModes(buttonDownload, true);
        };
        buttonsContainer.appendChild(buttonDownload);

        var buttonCopy = document.createElement("button");
        buttonCopy.id = "btn002";
        buttonCopy.className = "toolbar-item";
        buttonCopy.style = setButtonStyle("#E3EDCD", width, height, iconCopyLink);
        buttonCopy.onclick = function () {
            buttonCopy.disabled = true;
            buttonCopy.style.backgroundColor = "#FDE6E0";
            buttonCopy.style.backgroundImage = "none"; // Remove icon
            buttonCopy.innerHTML = "正在处理，请稍候...";
            urlGetAllModes(buttonCopy, false);
        };
        buttonsContainer.appendChild(buttonCopy);

        if (showDownloadEach) {
            var buttonDownloadEach = document.createElement("button");
            buttonDownloadEach.id = "btn003";
            buttonDownloadEach.className = "toolbar-item";
            buttonDownloadEach.style = setButtonStyle("#FFD700", width, height, iconDownloadEach);
            buttonDownloadEach.onclick = function () {
                buttonDownloadEach.disabled = true;
                buttonDownloadEach.style.backgroundColor = "#FDE6E0";
                buttonDownloadEach.style.backgroundImage = "none"; // Remove icon
                buttonDownloadEach.innerHTML = "正在下载，请稍候...";
                urlGetAllModes(buttonDownloadEach, 'each');
            };
            buttonsContainer.appendChild(buttonDownloadEach);
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
        let modes = [1, 2, 3];
        let url_list = [];
        let mode_found = false;

        for (let m of modes) {
            let { selector, attribute } = getSelectorAndAttributeByMode(m);
            let img_list = document.querySelectorAll(selector);
            if (img_list.length > 0) {
                mode_found = true;
                img_list.forEach(item => {
                    let text = item.getAttribute(attribute);
                    if (text.startsWith('//')) {
                        text = 'https:' + text;
                    }
                    text = text.split('@')[0];
                    url_list.push(text);
                });
            }
        }

        if (!mode_found) {
            alert("在正文中似乎并没有获取到图片……");
            button.textContent = "无图片：点击无效，请刷新重试";
        } else {
            let url_str = url_list.join("\n");
            if (mode === true) {
                download_txt("bili_img_urls", url_str);
                button.innerHTML = `已提取${url_list.length}张`;
            } else if (mode === false) {
                copyToClipboard(url_str);
                button.innerHTML = `已复制${url_list.length}张`;
            } else if (mode === 'each') {
                downloadEachImage(url_list);
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
            default:
                alert("传入模式参数错误！");
                return { selector: "", attribute: "" };
        }
    }

    function download_txt(filename, text) {
        let pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);
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

    if (window.location.href.includes("read/cv")) {
        var observer = new MutationObserver(function (mutations, me) {
            var toolbar = document.querySelector(".side-toolbar");
            if (toolbar) {
                createButton(toolbar, false); // 不显示第三个按钮
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
                createButton(toolbarOpus, showDownloadEach); // 根据 URL 决定是否显示第三个按钮
                me.disconnect();
                return;
            }
        });
        observerOpus.observe(document.body, { childList: true, subtree: true });
    }
})();
