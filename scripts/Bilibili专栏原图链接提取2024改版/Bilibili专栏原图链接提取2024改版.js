// ==UserScript==
// @name         Bilibili专栏原图链接提取2024改版
// @namespace    https://github.com/shangxueink
// @version      2.5
// @description  PC端B站专栏图片默认是经压缩过的webp。此脚本帮助用户点击按钮后获取哔哩哔哩专栏中所有原图的直链，方便使用其他工具批量下载原图。
// @author       shangxueink
// @license      GPLv3
// @match        https://www.bilibili.com/read/cv*
// @match        https://www.bilibili.com/opus/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// @acknowledgement 原始脚本由Hui-Shao开发，本脚本在其基础上进行了修改和增强。
// @downloadURL https://update.greasyfork.org/scripts/521666/bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.user.js
// @updateURL https://update.greasyfork.org/scripts/521666/bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88.meta.js
// ==/UserScript==

(function () {
    'use strict';

    function createButton(targetContainer) {
        // 创建一个新的div作为按钮的容器
        var buttonsContainer = document.createElement("div");
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.flexDirection = "column";
        buttonsContainer.style.alignItems = "center"; // 使按钮居中对齐

        // 检测现有元素的尺寸
        var existingItem = targetContainer.querySelector('.toolbar-item, .side-toolbar__action');
        var height = existingItem ? existingItem.clientHeight : 40; // 默认高度为40px，如果无法获取现有元素的高度
        var width = existingItem ? existingItem.clientWidth : 40; // 默认宽度为40px

        var buttonDownload = document.createElement("button");
        buttonDownload.id = "btn001";
        buttonDownload.textContent = "提取链接";
        buttonDownload.className = "toolbar-item";
        buttonDownload.style = setButtonStyle("#C7EDCC", width, height);
        buttonDownload.onclick = function () {
            buttonDownload.disabled = true;
            buttonDownload.style.backgroundColor = "#FDE6E0";
            buttonDownload.innerHTML = "触发防误触：正在处理，请稍候...";
            urlGetAllModes(buttonDownload, true);
        };
        buttonsContainer.appendChild(buttonDownload);

        var buttonCopy = document.createElement("button");
        buttonCopy.id = "btn002";
        buttonCopy.textContent = "仅复制链接";
        buttonCopy.className = "toolbar-item";
        buttonCopy.style = setButtonStyle("#E3EDCD", width, height);
        buttonCopy.onclick = function () {
            buttonCopy.disabled = true;
            buttonCopy.style.backgroundColor = "#FDE6E0";
            buttonCopy.innerHTML = "触发防误触：正在处理，请稍候...";
            urlGetAllModes(buttonCopy, false);
        };
        buttonsContainer.appendChild(buttonCopy);

        // 将新的按钮容器添加到目标容器中
        targetContainer.appendChild(buttonsContainer);
    }


    function setButtonStyle(backgroundColor, width, height) {
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
            box-shadow: inset 0 0 20px rgba(255, 255, 255, 1); /* 内部阴影，中心透明度较低，向边缘透明度增加 */
        `;
    }


    function urlGetAllModes(button, download) {
        let modes = [1, 2, 3];
        let url_list = [];
        let mode_found = false;

        for (let mode of modes) {
            let { selector, attribute } = getSelectorAndAttributeByMode(mode);
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
            if (download) {
                download_txt("bili_img_urls", url_str);
                button.innerHTML = `已下载${url_list.length}张`;
            } else {
                copyToClipboard(url_str);
                button.innerHTML = `已复制${url_list.length}张`;
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

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // 确定按钮添加的位置
    if (window.location.href.includes("read/cv")) {
        var observer = new MutationObserver(function (mutations, me) {
            var toolbar = document.querySelector(".side-toolbar");
            if (toolbar) {
                createButton(toolbar);
                me.disconnect();
                return;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } else if (window.location.href.includes("opus/")) {
        var observerOpus = new MutationObserver(function (mutations, me) {
            var toolbarOpus = document.querySelector(".side-toolbar__box");
            if (toolbarOpus) {
                createButton(toolbarOpus);
                me.disconnect();
                return;
            }
        });
        observerOpus.observe(document.body, { childList: true, subtree: true });
    }
})();
