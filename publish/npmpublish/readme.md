# koishi-plugin-perchance


<h1>Perchance AI 绘画插件</h1>

<section>
<h2>简介</h2>
<p>这是一个用于生成 AI 绘画的插件。你可以使用关键词来生成图像。</p>
</section>

<section>
<h2>使用方法</h2>
<p>使用 <code>perchance</code> 命令，并添加关键词来生成图像。</p>

<h3>示例</h3>
<pre><code>/perchance -r -n 1 -u 768x512 -s Waifu  intergalactic spy with a sentient gadget</code></pre>
<p><strong>参数说明：</strong></p>
<ul>
<li><code>-r</code>: 随机 tag</li>
<li><code>-n</code>: 返回的绘画数量 (这里是 1)</li>
<li><code>-u</code>: 指定图片尺寸 (这里是 768x512)</li>
<li><code>-s</code>: 绘画的风格 (这里是 "Waifu")</li>
<li><code>keyword</code>: 绘画的tag (这里是 "intergalactic spy with a sentient gadget")</li>
</ul>
</section>

<section>
<h2>注意事项</h2>
<div class="note">
<p><strong>重要提示：</strong> 默认情况下，本插件需要你的网络环境可以访问外网，否则将无法正常使用。</p>
</div>
</section>