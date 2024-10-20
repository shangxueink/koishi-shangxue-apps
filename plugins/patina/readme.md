# koishi-plugin-patina


<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>插件说明</title>
</head>
<body>

### 本插件 旨在使用puppeteer来操作一些有趣的网页，让bot实现网页的部分功能
#### 本插件提供了多个指令，使用方法如下：
<details>
<summary>点击此处查看——包浆</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理，并可调节图像做旧年份、画质等参数。</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://github.com/itorr/patina/tree/main" target="_blank">patina 项目主页（github）</a>
</p>
<h2>功能示例</h2>
<pre>
转换 -g -w -y 10 -q 60
</pre>
<p>触发指令后会要求用户单独上传图片。</p>
</details>

<details>
<summary>点击此处查看——蒸汽机</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://magiconch.com/vaporwave/" target="_blank">https://magiconch.com/vaporwave/</a>
</p>
<h2>功能示例</h2>
<pre>
蒸汽机 -p 數字信號 -r
</pre>
<p>触发指令后会要求用户单独上传图片。</p>
</details>


<details>
<summary>点击此处查看——斜着看生成器</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://lab.magiconch.com/xzk/" target="_blank">https://lab.magiconch.com/xzk/</a>
</p>
<h2>功能示例</h2>
<pre>
斜着看 我喜欢你 我也是 -d 把屏幕放平看
</pre>
<p>触发指令后会返回图片</p>
</details>

---

> 目前就这几个指令 ，以后有什么好玩的再加。

---
</body>
</html>