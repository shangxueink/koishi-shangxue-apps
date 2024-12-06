
# koishi-plugin-image-save-path 使用说明 📦
[![npm](https://img.shields.io/npm/v/koishi-plugin-image-save-path?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-image-save-path)


一个用于保存图片到本地指定路径的强大插件，支持多种保存方式和灵活的交互方式！




## 🛠️ 功能简介
`保存图片` 指令可以实现以下功能：
- **交互保存**：支持与用户交互选择路径。
- **回复保存**：直接保存回复消息中的图片。
- **批量保存**：自动处理多张图片。
- **中间件监听**：实时监听并保存指定消息中的图片。


### 效果预览
<li><a href="https://i0.hdslb.com/bfs/article/a2780975ccbf74c422dd7f0333af0172312276085.png" target="_blank" referrerpolicy="no-referrer">交互保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/144dac10d99a911648b9016c620fa49a312276085.png" target="_blank" referrerpolicy="no-referrer">回复保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/a3f0844195795fc7e51f947e689fd744312276085.png" target="_blank" referrerpolicy="no-referrer">批量保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/23e26c25d805e0d5d5d76958e5950d56312276085.png" target="_blank" referrerpolicy="no-referrer">中间件批量保存图片</a></li>



<h2>💡 使用示例</h2>
<h3>快速保存</h3>
<pre><code>保存图片 我的图片 -e jpg</code></pre>
<p>👉 将图片保存为 <code>我的图片.jpg</code>。</p>

<h3>路径选择</h3>
<pre><code>保存图片 我的图片 表情包</code></pre>
<p>👉 将图片保存到 <code>E:\\Images\\Memes</code>。</p>

<h3>回复保存</h3>
<pre><code>回复带图片的消息 + 保存图片 我的回复图片</code></pre>
<p>👉 将回复消息中的图片保存为 <code>我的回复图片</code>。</p>


---

---

---
<h2>🚀 使用方法</h2>
<h3>1️⃣ 交互保存（不指定路径，`imageSaveMode` 开启时）</h3>
<p>在开启 <code>imageSaveMode</code> 的情况下，插件会自动保存图片到 <code>savePaths</code> 配置的第一个路径，无需用户额外指定路径。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名</code></pre>
<ul>
<li>用户发送图片后，插件会直接保存到默认路径。</li>
<li>如果没有设置默认路径，会提示错误 <strong>没有设置默认保存路径</strong>。</li>
</ul>

<h3>2️⃣ 交互保存（指定路径，`imageSaveMode` 开启时）</h3>
<p>在 <code>imageSaveMode</code> 开启时，用户仍可指定路径。如果路径无效，插件会提示重新选择。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名 路径名称</code></pre>
<ul>
<li>插件会检查路径名称是否匹配 <code>savePaths</code> 中的配置。</li>
<li>如果匹配成功，直接保存到对应路径。</li>
<li>如果匹配失败，与用户交互重新选择路径。</li>
</ul>

<h3>3️⃣ 回复交互保存</h3>
<p>当用户回复一条包含图片的消息，并使用 <code>保存图片</code> 指令时，插件会提取回复消息中的图片进行保存。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名</code></pre>
<ul>
<li>如果 <code>imageSaveMode</code> 开启，图片将保存到默认路径。</li>
<li>如果未开启，则与用户交互选择路径。</li>
</ul>

<h3>4️⃣ 批量保存</h3>
<p>插件支持批量保存多张图片，但需要在配置中启用 <code>checkDuplicate</code> 选项。</p>
<p><strong>指令示例：</strong></p>
<pre><code>保存图片 文件名 -e png</code></pre>
<ul>
<li>批量保存时，所有图片会被自动重命名，避免重复。</li>
<li>如果未启用 <code>checkDuplicate</code>，一次只允许保存一张图片。</li>
</ul>

<h3>5️⃣ 中间件监听保存</h3>
<p>通过配置中间件监听，插件可以实时保存满足条件的图片消息。</p>
<ul>
<li>自动提取图片消息并保存到默认路径。</li>
<li>适合监控群聊、频道等图片流量大的场景。</li>
</ul>

<h2>⚙️ 配置项说明</h2>

<h3><code>defaultImageExtension</code></h3>
<p><strong>说明：</strong>图片默认保存的格式后缀，不需要填写 <code>.</code>，例如 <code>png</code> 或 <code>jpg</code>。</p>
<p><strong>默认值：</strong> <code>png</code></p>

<h3><code>imageSaveMode</code></h3>
<p><strong>说明：</strong>是否启用多路径选择功能。</p>
<ul>
<li><strong>开启时：</strong>图片保存到 <code>savePaths</code> 的第一个路径。</li>
<li><strong>关闭时：</strong>用户可以交互选择保存路径。</li>
</ul>
<p><strong>默认值：</strong> <code>false</code></p>

<h3><code>savePaths</code></h3>
<p><strong>说明：</strong>配置路径映射关系。用户输入路径名称即可对应保存到指定路径。</p>
<pre><code>
[
{ "name": "默认路径", "path": "E:\\Images\\Default" },
{ "name": "表情包", "path": "E:\\Images\\Memes" }
]
</code></pre>

<h3><code>checkDuplicate</code></h3>
<p><strong>说明：</strong>是否启用重名检查。</p>
<ul>
<li><strong>启用时：</strong>自动为重名文件生成唯一名称。</li>
<li><strong>禁用时：</strong>仅允许保存一张图片。</li>
</ul>
<p><strong>默认值：</strong> <code>false</code></p>




---


## 🔗 推荐搭配插件
- emojihub-bili：发送本地表情包，配合实现“表情包小偷”功能。
- smmcat-photodisk：支持可视化选图，非常实用！
- booru-local：本地图库管理插件。


## 🖥️ 系统支持
- **Windows**：已测试支持
- **其他系统**：未测试 🤷‍♂️

## 注意事项

- 确保提供的路径是服务器上有效且具有写入权限的路径。

- 如果图片无法下载或保存，请检查网络连接和服务器配置。

