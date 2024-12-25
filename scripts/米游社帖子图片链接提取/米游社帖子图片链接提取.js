// ==UserScript==
// @name         米游社帖子图片链接提取
// @namespace    miyoushe-img-article
// @version      0.2
// @description  提取米游社帖子中的图片链接
// @author       shangxue
// @match        https://www.miyoushe.com/*
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    function extractAndDownloadUrls() {
        // 更新选择器以匹配包含图片的元素
        const imgElements = document.querySelectorAll('div.mhy-img-article img');
        // 提取图片URL并移除查询字符串
        const urls = Array.from(imgElements).map(img => {
          const url = img.getAttribute('src');
          return url.split('?')[0];
        });
      
        if (urls.length === 0) {
          alert("没有找到任何图片链接。");
          return;
        }
      
        if (confirm(`共找到了${urls.length}个图片链接，是否下载链接信息？`)) {
          downloadUrls(urls);
        }
      }
      

    function downloadUrls(urls) {
        const urlText = urls.join('\n');
        const blob = new Blob([urlText], { type: 'text/plain' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = "miyoushe_img_urls.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(href);
    }

    function createExtractButton() {
        const button = document.createElement('button');
        button.textContent = '提取图片链接';
        button.style.cssText = `
        position: fixed;
        top: 70px;
        left: 15%;
        transform: translateX(-50%);
        z-index: 1000;
        width: 120px;
        height: 60px;
        background-color: #53489c;
        color: white;
        border: none;
        border-radius: 8px; /* 圆角边缘 */
        cursor: pointer;
        font-size: 18px; 
        `;
        button.onclick = extractAndDownloadUrls;
        document.body.appendChild(button);
    }

    window.addEventListener('load', createExtractButton);
})();
