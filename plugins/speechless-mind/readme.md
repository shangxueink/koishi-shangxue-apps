# koishi-plugin-speechless-mind

[![npm](https://img.shields.io/npm/v/koishi-plugin-speechless-mind?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-speechless-mind)

<h2>指令格式</h2>

<p>使用以下格式的指令来触发插件：</p>

<ul>
    <li><code>无语</code> - 生成默认的无语思维文本。</li>
    <li><code>无语 [文本]</code> - 使用指定的文本生成无语思维内容。</li>
    <li><code>无语 [文本] [图片]</code> - 使用指定的文本和图片生成无语思维内容。</li>
</ul>

<h2>使用示例</h2>

<div class="example">
    <strong>示例 1:</strong> <code>无语</code><br>
    说明: 生成默认的无语思维文本内容。
</div>

<div class="example">
    <strong>示例 2:</strong> <code>无语 koishi</code><br>
    说明: 使用“koishi”作为文本，生成无语思维内容。
</div>

<div class="example">
    <strong>示例 3:</strong> <code>无语 koishi [图片]</code><br>
    说明: 使用“koishi”作为文本，并附带一张图片，生成无语思维内容。
</div>

<h2>插件所需服务</h2>

<ul>
    <li><strong>Puppeteer:</strong> 用于渲染最终的输出图像。Puppeteer 提供了强大的页面渲染功能，使得生成的代码更易于编写和维护。</li>
    <li><strong>Canvas:</strong> 用于获取输入图片的分辨率。Canvas 提供了快速的图像尺寸检测功能，确保处理效率。</li>
</ul>

<h2>注意事项</h2>

<ul>
    <li>确保图片的分辨率符合插件的要求，否则会提示上传合适的图片。</li>
    <li>如果文本内容包含换行符，可以根据配置选择是否允许自动换行。</li>
    <li>在使用图片时，请确保图片 URL 可访问。</li>
</ul>
