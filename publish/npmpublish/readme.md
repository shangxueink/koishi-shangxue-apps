<h1>koishi-plugin-image-save-path 使用说明 📦</h1>
<p>
<a href="https://www.npmjs.com/package/koishi-plugin-image-save-path">
<img src="https://img.shields.io/npm/v/koishi-plugin-image-save-path?style=flat-square" alt="npm">
</a>
</p>
<p>一个用于保存图片到本地指定路径的强大插件，支持多种保存方式和灵活的交互模式！</p>

<hr>

<h2>效果预览：</h2>
<ul>
<li><a href="https://i0.hdslb.com/bfs/article/a2780975ccbf74c422dd7f0333af0172312276085.png" target="_blank" referrerpolicy="no-referrer">交互保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/144dac10d99a911648b9016c620fa49a312276085.png" target="_blank" referrerpolicy="no-referrer">回复保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/a3f0844195795fc7e51f947e689fd744312276085.png" target="_blank" referrerpolicy="no-referrer">批量保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/23e26c25d805e0d5d5d76958e5950d56312276085.png" target="_blank" referrerpolicy="no-referrer">中间件批量保存图片</a></li>
</ul>

<hr>

<h2>多种指令交互模式预览：</h2>
<ul>
<li><a href="https://i0.hdslb.com/bfs/article/a3d7513782fcd223fc02cc1b107aba2b312276085.png" target="_blank" referrerpolicy="no-referrer">1.【保存图片 [图片重命名] [文件夹备注] [图片]】</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/7caf059b2874c2e3201669d51e614d35312276085.png" target="_blank" referrerpolicy="no-referrer">2.【保存图片 [文件夹备注] [图片重命名] [图片]】</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/fa61465af2ed31f85c537ddf598d6b3a312276085.png" target="_blank" referrerpolicy="no-referrer">3.【保存图片 [图片重命名] [图片]】（仅存到第一个文件夹路径里）</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/1309846507b81c4d0fa755553feebce6312276085.png" target="_blank" referrerpolicy="no-referrer">4.【保存图片 [文件夹备注] [图片]】（自动为图片重命名）</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/4342e979dd9fac9a77fa519baa2a7c49312276085.png" target="_blank" referrerpolicy="no-referrer">5.【保存图片 [图片]】（自动为图片重命名，并且保存到第一个文件夹路径）</a></li>
</ul>

<hr>

<h2>🛠️ 功能简介</h2>
<ul>
<li><strong>多交互模式：</strong>支持五种交互格式，满足不同使用习惯。</li>
<li><strong>批量保存：</strong>处理多张图片并自动重命名，避免重复。</li>
<li><strong>路径选择：</strong>用户可指定路径或保存到默认路径。</li>
<li><strong>中间件监听：</strong>实时监控群聊或频道中的图片并自动保存。</li>
<li><strong>文件重命名：</strong>支持手动命名和自动命名。</li>
<li><strong>多路径映射：</strong>通过配置支持多个文件夹路径。</li>
</ul>

<hr>

<h2>🌟 特性</h2>
<ul>
<li>支持五种交互模式：</li>
</ul>
<pre><code>
1: 保存图片 [图片重命名] [文件夹备注] [图片]
2: 保存图片 [文件夹备注] [图片重命名] [图片]
3: 保存图片 [图片重命名] [图片]（仅保存到第一个路径）
4: 保存图片 [文件夹备注] [图片]（自动重命名）
5: 保存图片 [图片]（自动重命名并保存到第一个路径）
</code></pre>

<hr>

<h2>🚀 使用方法</h2>

<details>
<summary>点击此处————查看完整使用方法说明</summary>

<h3>1️⃣ 交互保存（默认路径，无需指定路径）</h3>
<p>将 <code>Interaction_mode</code> 配置项选择到 <code>3</code>。</p>
<pre><code>保存图片 图片名称</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会自动保存图片到默认路径，并以指定的图片名称保存。</li>
<li>如果未设置默认路径，插件会提示错误：<code>没有设置默认保存路径</code>。</li>
</ul>

<h3>2️⃣ 交互保存（指定路径）</h3>
<p>将 <code>Interaction_mode</code> 配置项选择到 <code>1</code>。</p>
<pre><code>保存图片 图片名称 表情包</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会检查 <code>savePaths</code> 中是否存在路径备注为 <code>表情包</code> 的配置。</li>
<li>如果匹配成功，图片将保存到对应路径。</li>
<li>如果匹配失败，插件会提示用户重新输入路径备注。</li>
</ul>

<h3>3️⃣ 回复交互保存</h3>
<pre><code>回复一条图片消息，并发送：保存图片 图片名称</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会提取回复消息中的图片，并保存为指定文件名。</li>
<li>默认保存到第一个路径或用户指定路径。</li>
</ul>

<h3>4️⃣ 批量保存图片</h3>
<pre><code>保存图片 批量保存 -e png</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>插件会自动处理多张图片，避免文件重名冲突。</li>
<li>若未启用 <code>checkDuplicate</code>，仅允许保存一张图片。</li>
</ul>

<h3>5️⃣ 中间件监听保存</h3>
<pre><code>{
"groupListmapping": 
    [    
        {
        "groupList": "123456",
        "enable": true,
        "defaultsavepath": "E:\\Images\\GroupChat",
        "count": 3
        }
    ]
}</code></pre>
<p><strong>行为说明：</strong></p>
<ul>
<li>自动保存指定群聊/频道中的图片消息。</li>
<li>支持自定义保存路径与触发条件。</li>
</ul>

<hr>

<h2>🔧 高级功能</h2>
<h3>1️⃣ 图片自动命名</h3>
<p>插件会根据当前时间生成安全的文件名：</p>
<pre><code>YYYY-MM-DD-HH-MM.png</code></pre>

<h3>2️⃣ 重名检查</h3>
<p>当启用 <code>checkDuplicate</code> 时，插件会自动为重名文件生成唯一文件名：</p>
<pre><code>图片名称(1).png
图片名称(2).png</code></pre>

<h3>3️⃣ 自定义路径映射</h3>
    <pre><code>{
    "savePaths": [
        { "name": "默认路径", "path": "E:\\Images\\Default" },
        { "name": "表情包", "path": "E:\\Images\\Memes" }
    ]
}</code></pre>

<h3>4️⃣ 配合中间件监听群聊/频道</h3>
<p>实时保存符合条件的图片消息到指定路径。</p>

<hr>

<h2>⚙️ 配置项说明</h2>
<h3>Interaction_mode</h3>
<p>选择交互模式，支持五种模式：</p>
<table>
<thead>
<tr>
<th>模式</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>保存图片 [图片重命名] [文件夹备注] [图片]</td>
</tr>
<tr>
<td>2</td>
<td>保存图片 [文件夹备注] [图片重命名] [图片]</td>
</tr>
<tr>
<td>3</td>
<td>保存图片 [图片重命名] [图片]（仅保存到第一个路径）</td>
</tr>
<tr>
<td>4</td>
<td>保存图片 [文件夹备注] [图片]（自动重命名）</td>
</tr>
<tr>
<td>5</td>
<td>保存图片 [图片]（自动重命名并保存到第一个路径）</td>
</tr>
</tbody>
</table>

<h3>其他配置项</h3>
<h4>defaultImageExtension</h4>
<p><strong>说明：</strong>图片保存的默认后缀格式，例如 <code>png</code> 或 <code>jpg</code>。</p>
<p><strong>默认值：</strong> <code>png</code></p>

<h4>savePaths</h4>
<p><strong>说明：</strong>配置路径映射，便于用户选择存储路径。</p>
<pre><code>{
    "savePaths": [
        { "name": "默认路径", "path": "E:\\Images\\Default" },
        { "name": "表情包", "path": "E:\\Images\\Memes" }
    ]
}</code></pre>

<h4>checkDuplicate</h4>
<p><strong>说明：</strong>启用时，会为重名文件生成唯一名称。</p>
<p><strong>默认值：</strong> <code>false</code></p>

<hr>

</details>

## 图片保存配置项


### 1. 图片扩展名配置 (`ImageExtension`)

#### 功能描述

`ImageExtension` 是一个用于定义图片保存时文件名前缀、后缀和默认扩展名的配置项。支持动态替换日期、随机数字以及 `session` 和 `config` 中的字段。

<details>
<summary>点击此处————查看完整使用方法说明</summary>

#### 配置项格式
- **类型**：数组（仅第一行视为有效配置）
- **默认值**：
  ```
  [
    {
      prefix: "",
      suffix: "",
      extension: ".png"
    }
  ]
  ```
- **示例**：

  ```
  ImageExtension: [
    {
      prefix: "prefix_${YYYY}_",
      suffix: "_${session.userId}",
      extension: ".jpg"
    }
  ]
  ```

#### 可用占位符
| 占位符       | 描述                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `${YYYY}`    | 当前年份，例如 `2023`                                                |
| `${MM}`      | 当前月份，补零到两位，例如 `01` 到 `12`                              |
| `${DD}`      | 当前日期，补零到两位，例如 `01` 到 `31`                              |
| `${A}`       | 一位随机数字，范围 `0` 到 `9`                                        |
| `${BB}`      | 两位随机数字，范围 `00` 到 `99`                                      |
| `${CCC}`     | 三位随机数字，范围 `000` 到 `999`                                    |
| `${session}` | 动态提取 `session` 对象的字段，例如 `${session.userId}`              |
| `${config}`  | 动态提取 `config` 对象的字段，例如 `${config.defaultImageExtension}` |

#### 示例
- **默认格式**：
  ```
  ImageExtension: [
    {
      prefix: "",
      suffix: "",
      extension: ".png"
    }
  ]
  ```
  - 生成文件名：`2023-10-05-12-34-56-789.png`。

- **包含前缀和后缀**：
  ```
  ImageExtension: [
    {
      prefix: "prefix_${YYYY}_",
      suffix: "_${session.userId}",
      extension: ".jpg"
    }
  ]
  ```
  - 生成文件名（假设 `session.userId` 为 `12345`）：`prefix_2023_2023-10-05-12-34-56-789_12345.jpg`。

- **包含配置项**：
  ```
  ImageExtension: [
    {
      prefix: "prefix_${config.ImageExtension[0]?.extension}_",
      suffix: "_${CCC}",
      extension: ".png"
    }
  ]
  ```
  - 生成文件名（假设 `config.defaultImageExtension` 为 `png`）：`prefix_png_2023-10-05-12-34-56-789_123.png`。

</details>


### 2. 图片自动重命名规则 (`autoRenameRules`)

#### 功能描述

`autoRenameRules` 是一个用于定义图片自动重命名规则的配置项。通过设置占位符，用户可以自定义生成的文件名格式。支持动态替换日期、随机数字以及 `session` 和 `config` 中的字段。

<details>
<summary>点击此处————查看完整使用方法说明</summary>

#### 配置项格式
- **类型**：字符串
- **默认值**：`${YYYY}-${MM}-${DD}-${BB}-${BB}-${BB}-${CCC}`
- **示例**：

  ```
  autoRenameRules: "${YYYY}-${MM}-${DD}-${BB}-${BB}-${BB}-${CCC}-${session.userId}"
  ```

#### 可用占位符
| 占位符       | 描述                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `${YYYY}`    | 当前年份，例如 `2023`                                                |
| `${MM}`      | 当前月份，补零到两位，例如 `01` 到 `12`                              |
| `${DD}`      | 当前日期，补零到两位，例如 `01` 到 `31`                              |
| `${A}`       | 一位随机数字，范围 `0` 到 `9`                                        |
| `${BB}`      | 两位随机数字，范围 `00` 到 `99`                                      |
| `${CCC}`     | 三位随机数字，范围 `000` 到 `999`                                    |
| `${session}` | 动态提取 `session` 对象的字段，例如 `${session.userId}`              |
| `${config}`  | 动态提取 `config` 对象的字段，例如 `${config.defaultImageExtension}` |

#### 示例
- **默认格式**：
  ```
  autoRenameRules: "${YYYY}-${MM}-${DD}-${BB}-${BB}-${BB}-${CCC}"
  ```
  - 生成文件名：`2023-10-05-12-34-56-789.png`。

- **包含用户 ID**：
  ```
  autoRenameRules: "${YYYY}-${MM}-${DD}-${BB}-${BB}-${BB}-${CCC}-${session.userId}"
  ```
  - 生成文件名（假设 `session.userId` 为 `12345`）：`2023-10-05-12-34-56-789-12345.png`。

- **包含配置项**：
  ```
  autoRenameRules: "${YYYY}-${MM}-${DD}-${BB}-${BB}-${BB}-${CCC}-${config.defaultImageExtension}"
  ```
  - 生成文件名（假设 `config.defaultImageExtension` 为 `png`）：`2023-10-05-12-34-56-789-png.png`。

</details>

---

<h2>📜 注意事项</h2>
<ul>
<li>确保保存路径具有写入权限。</li>
<li>如果图片保存失败，请检查网络连接和路径配置。</li>
</ul>

<hr>

<h2>🔗 推荐搭配插件</h2>
<ul>
<li><strong>emojihub-bili：</strong>发送本地表情包，配合实现“表情包小偷”功能。</li>
<li><strong>smmcat-photodisk：</strong>支持图片的可视化选取功能。</li>
</ul>

<hr>

<h2>🖥️ 系统支持</h2>
<ul>
<li><strong>Windows：</strong>已测试支持。</li>
<li><strong>Linux/MacOS：</strong>未测试。</li>
</ul>