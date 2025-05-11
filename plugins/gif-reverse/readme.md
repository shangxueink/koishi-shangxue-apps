# koishi-plugin-gif-reverse

[![npm](https://img.shields.io/npm/v/koishi-plugin-gif-reverse?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-gif-reverse)

| 位置                 | 仓库地址                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm 包               | [https://www.npmjs.com/package/koishi-plugin-gif-reverse](https://www.npmjs.com/package/koishi-plugin-gif-reverse)                                                     |
| idranme 仓库         | [https://github.com/idranme/koishi-plugin-gif-reverse](https://github.com/idranme/koishi-plugin-gif-reverse)                                                           |
| shangxueink 发布仓库 | [https://github.com/shangxueink/koishi-shangxue-apps/blob/main/plugins/gif-reverse](https://github.com/shangxueink/koishi-shangxue-apps/blob/main/plugins/gif-reverse) |


处理 GIF 图片，提供倒放/正放、变速、滑动、旋转、翻转功能。

## 指令选项


<table>
<thead>
<tr>
<th>选项</th>
<th>简写</th>
<th>描述</th>
<th>类型</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>--rebound</code></td>
<td><code>-b</code></td>
<td>回弹效果（正放+倒放）</td>
<td><code>boolean</code></td>
</tr>
<tr>
<td><code>--reverse</code></td>
<td><code>-r</code></td>
<td>倒放 GIF</td>
<td><code>boolean</code></td>
</tr>
<tr>
<td><code>--frame</code></td>
<td><code>-f</code></td>
<td>指定处理gif的平均帧间隔</td>
<td><code>number</code></td>
</tr>
<tr>
<td><code>--slide</code></td>
<td><code>-l</code></td>
<td>滑动方向 (上/下/左/右)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--rotate</code></td>
<td><code>-o</code></td>
<td>旋转方向 (顺/逆)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--turn</code></td>
<td><code>-t</code></td>
<td>转向角度 (上/下/左/右/0-360)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--information</code></td>
<td><code>-i</code></td>
<td>显示 GIF 信息</td>
<td><code>boolean</code></td>
</tr>
</tbody>
</table>

---

<h2>使用示例</h2>

<details>
<summary>点击此处————查看指令使用示例</summary>
    
<ul>
<li><strong>回弹 GIF:</strong>
<pre><code>gif -b</code></pre>
</li>
<li><strong>倒放 GIF:</strong>
<pre><code>gif -r</code></pre>
</li>
<li><strong>指定帧间隔 20ms:</strong>
<pre><code>gif -f 20</code></pre>
</li>
<li><strong>右滑 GIF:</strong>
<pre><code>gif -l 右</code></pre>
</li>
<li><strong>逆时针旋转 GIF:</strong>
<pre><code>gif -o 逆</code></pre>
</li>
<li><strong>转向 30 度:</strong>
<pre><code>gif -t 30</code></pre>
</li>
<li><strong>转向向上:</strong>
<pre><code>gif -t 上</code></pre>
</li>
<li><strong>右上方滑动:</strong>
<pre><code>gif -l 右 -t 45</code></pre>
</li>
<li><strong>顺时针旋转:</strong>
<pre><code>gif -o 顺</code></pre>
</li>
<li><strong>显示 GIF 信息:</strong>
<pre><code>gif -i</code></pre>
</li>
</ul>
</details>

完整使用方法请使用 <code>gif -h</code> 查看指令用法

---