# koishi-plugin-patina


<details>
<summary>点击此处查看——幻影坦克</summary>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://uyanide.github.io/Mirage_Colored/" target="_blank">https://uyanide.github.io/Mirage_Colored/</a>
<h2>功能示例</h2>
<ul>
<li><code>幻影</code>：指令触发后，系统会提示上传两张图片。</li>
<li><code>幻影 [图片]</code>：上传一张图片作为表图，系统会提示上传里图。</li>
<li><code>幻影 [图片] [图片]</code>：上传两张图片，分别作为表图和里图。</li>
<li><code>幻影 QQ号 QQ号</code>：使用两个 QQ 号的头像作为表图和里图。</li>
<li><code>幻影 @用户 @用户</code>：使用两个用户的头像作为表图和里图。</li>
</ul>
<pre>
幻影坦克  [图片] [图片] -c -s 1200 -w 0.7
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<ul>
<li><code>-c</code>：开启全彩输出，关闭则为黑白图。</li>
<li><code>-s &lt;size&gt;</code>：指定输出图像尺寸，默认值为 1200。</li>
<li><code>-w &lt;weight&gt;</code>：设置里图混合权重，范围为 0 到 1，默认值为 0.7。</li>
</ul>
<p>如果不指定参数，将使用默认配置。</p>
</details>


<details>
<summary>点击此处查看——像素化</summary>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://lab.miguelmota.com/pixelate/example/" target="_blank">https://lab.miguelmota.com/pixelate/example/</a>
<h2>功能示例</h2>
<ul>
<li><code>像素化</code>：指令触发后，系统会提示上传图片。</li>
<li><code>像素化 [图片]</code>：上传一张图片，并且返回像素化之后的图。</li>
<li><code>幻影 QQ号</code>：使用 QQ 号的头像，并且返回像素化之后的图。</li>
<li><code>幻影 @用户</code>：使用用户的头像，并且返回像素化之后的图。</li>
</ul>
<pre>
像素化  [图片] -p 90
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<ul>
<li><code>-p</code>：像素化百分比，越高越抽象。</li>
</ul>
<p>如果不指定参数，将使用默认配置。</p>
</details>

<details>
<summary>点击此处查看——相机镜框滤镜</summary>
<h2>功能示例</h2>
<ul>
<li><code>相机镜框</code>：指令触发后，系统会提示上传图片。</li>
<li><code>相机镜框 [图片]</code>：上传一张图片，并且返回添加相机镜框之后的图。</li>
<li><code>相机镜框 QQ号</code>：使用 QQ 号的头像，并且返回添加相机镜框之后的图。</li>
<li><code>相机镜框 @用户</code>：使用用户的头像，并且返回添加相机镜框之后的图。</li>
</ul>
<pre>
相机镜框  [图片]
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<p>此功能目前没有可配置的指令参数，但可以通过插件配置调整图片对齐方式和压缩质量。</p>
</details>