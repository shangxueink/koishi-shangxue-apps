# koishi-plugin-keyword-blocker

[![npm](https://img.shields.io/npm/v/koishi-plugin-keyword-blocker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-keyword-blocker)

<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>使用说明</title>
</head>
<body>
<p>让你的机器人可以屏蔽和取消屏蔽关键词及用户\~</p>
<p>旨在在某些群里屏蔽掉一些特定指令或用户</p>
<p>你可以在数据库的 <code>blockedKeywords</code> 表里看到已经添加的屏蔽词和黑名单用户，并且如果有需要，可以手动操作数据库哦</p>
<h3>指令列表：</h3>
<details>
<summary>点击查看使用说明</summary>
<ol>
<li><strong>添加屏蔽词</strong>
<ul>
<li>指令：<code>添加屏蔽词 &lt;关键词&gt;</code></li>
<li>描述：将指定关键词添加到当前群的屏蔽列表中。可以用于在某个群屏蔽某个指令。</li>
<li>示例：<code>添加屏蔽词 spam</code></li>
</ul>
</li>
<li><strong>取消屏蔽词</strong>
<ul>
<li>指令：<code>取消屏蔽词 &lt;关键词&gt;</code></li>
<li>描述：将指定关键词从当前群的屏蔽列表中移除。</li>
<li>示例：<code>取消屏蔽词 spam</code></li>
</ul>
</li>
<li><strong>全局添加屏蔽词</strong>
<ul>
<li>指令：<code>全局添加屏蔽词 &lt;关键词&gt;</code></li>
<li>描述：将指定关键词添加到全局屏蔽列表中，所有群均生效。可以用于屏蔽某个指令。</li>
<li>示例：<code>全局添加屏蔽词 spam</code></li>
</ul>
</li>
<li><strong>全局取消屏蔽词</strong>
<ul>
<li>指令：<code>全局取消屏蔽词 &lt;关键词&gt;</code></li>
<li>描述：将指定关键词从全局屏蔽列表中移除。</li>
<li>示例：<code>全局取消屏蔽词 spam</code></li>
</ul>
</li>
<li><strong>拉黑用户</strong>
<ul>
<li>指令：<code>拉黑用户 &lt;用户ID&gt;</code></li>
<li>描述：将指定用户添加到当前群的黑名单中。可以用于在某个群屏蔽某个用户。</li>
<li>示例：<code>拉黑用户 123456</code></li>
</ul>
</li>
<li><strong>取消拉黑用户</strong>
<ul>
<li>指令：<code>取消拉黑用户 &lt;用户ID&gt;</code></li>
<li>描述：将指定用户从当前群的黑名单中移除。</li>
<li>注意：不允许对自己操作。</li>
<li>示例：<code>取消拉黑用户 123456</code></li>
</ul>
</li>
<li><strong>全局拉黑用户</strong>
<ul>
<li>指令：<code>全局拉黑用户 &lt;用户ID&gt;</code></li>
<li>描述：将指定用户添加到全局黑名单中，所有群均生效。可以用于屏蔽某个用户。</li>
<li>示例：<code>全局拉黑用户 123456</code></li>
</ul>
</li>
<li><strong>全局取消拉黑用户</strong>
<ul>
<li>指令：<code>全局取消拉黑用户 &lt;用户ID&gt;</code></li>
<li>描述：将指定用户从全局黑名单中移除。</li>
<li>示例：<code>全局取消拉黑用户 123456</code></li>
</ul>
</li>
<li><strong>拉黑频道</strong>
<ul>
<li>指令：<code>拉黑频道 &lt;频道ID&gt;</code></li>
<li>描述：将指定频道添加到黑名单中。</li>
<li>示例：<code>拉黑频道 123456</code></li>
</ul>
</li>
<li><strong>取消拉黑频道</strong>
<ul>
<li>指令：<code>取消拉黑频道 &lt;频道ID&gt;</code></li>
<li>描述：将指定频道从黑名单中移除。</li>
<li>示例：<code>取消拉黑频道 123456</code></li>
</ul>
</li>
</ol>
<h3>注意事项：</h3>
<ul>
<li>屏蔽词和黑名单用户信息保存在数据库的 <code>blockedKeywords</code> 表中。</li>
<li>在使用取消屏蔽词或取消拉黑用户指令时，确保提供的关键词或用户ID是有效的。</li>
<li>在koishi控制台可以手动操作数据库以管理屏蔽词和黑名单用户。</li>
</ul>
<h3>日志调试模式：</h3>
<ul>
<li>配置项 <code>loggerinfo</code> 可以启用日志调试模式，用于记录屏蔽操作的详细信息。</li>
<li>启用方法：在配置文件中将 <code>loggerinfo</code> 设置为 <code>开启</code>，然后插件右上角重载。</li>
</ul>
</details>
</body>
</html>



## command_userId_list 配置项说明

- **command**: 指令名称，需包含指令前缀（如果有）。
- **userId**: 应用对象，可以是用户ID、频道ID或平台名称。
- **enableobject**: 应用对象属性，支持以下选项：
  - `用户ID`
  - `频道ID`
  - `平台名称`
  
- **enable**: 应用方法，支持以下选项：
  - `取消应用`: 该行配置不生效。
  - `白名单`: 仅允许此对象。
  - `黑名单`: 仅屏蔽此对象。

## 使用方法

1. **触发优先级**:
   - 配置项的触发优先级按照数组的顺序进行。即，数组中靠前的配置项优先级更高。
   - 例如，如果用户ID `114514` 在频道 `1919810` 中，若配置项中先设置 `[114514 白名单]`，再设置 `[1919810 黑名单]`，则用户 `114514` 在频道 `1919810` 中可以触发指令。
   - 如果顺序相反，则用户 `114514` 在频道 `1919810` 中无法触发指令。

2. **私信频道ID**:
   - 请注意，私信的频道ID通常带有 `private:` 前缀。例如：`private:114514`。

3. **白名单与黑名单**:
   - `白名单` 配置表示仅允许配置的对象使用该指令。
   - `黑名单` 配置表示仅屏蔽配置的对象使用该指令。
