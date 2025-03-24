# koishi-plugin-qqq-bot-manager

[![npm](https://img.shields.io/npm/v/koishi-plugin-qqq-bot-manager?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-qqq-bot-manager)  


---

<p>本插件使用<strong>派生式指令</strong>结构，所有功能均在父级指令 <code>qqqbot</code> 下。</p>

<table>
<thead>
<tr>
<th>父级指令</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td class="command"><code>qqqbot</code></td>
<td>qqbot管理</td>
</tr>
</tbody>
</table>

<table>
<thead>
<tr>
<th>子指令</th>
<th>描述</th>
<th>示例</th>
</tr>
</thead>
<tbody>
<tr>
<td class="command"><code>qqqbot 取消登录</code></td>
<td>取消当前正在进行的登录操作。</td>
<td><code>qqqbot 取消登录</code> 或 <code>qqqbot.取消登录</code></td>
</tr>
<tr>
<td class="command"><code>qqqbot 机器人数据 [天数]</code></td>
<td>查看机器人近日数据</td>
<td><code>qqqbot 机器人数据</code> 或 <code>qqqbot 机器人数据 3</code> (返回最近3天数据)</td>
</tr>
<tr>
<td class="command"><code>qqqbot 查看通知 [数量]</code></td>
<td>查看 QQ 开放平台站内通知信</td>
<td><code>qqqbot 查看通知</code> 或 <code>qqqbot 查看通知 5</code> (返回最近5条通知)</td>
</tr>
<tr>
<td class="command"><code>qqqbot 登录</code></td>
<td>登录 QQ 开放平台后台，用于后续数据查看功能。</td>
<td><code>qqqbot 登录</code> 或 <code>qqqbot.登录</code></td>
</tr>
</tbody>
</table>

<p><strong>注意：</strong>  请使用完整的指令形式，例如 <code>qqqbot.登录</code> 或 <code>qqqbot 机器人数据</code> 等来调用插件功能。</p>

---

<h2>服务依赖</h2>

<p>本插件依赖以下 Koishi 服务：</p>

<table class="dependency-table">
<thead>
<tr>
<th>服务类型</th>
<th>服务名称</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>必须服务：</strong></td>
<td><code>i18n</code></td>
<td>Koishi 的国际化服务，用于插件文本的本地化支持。</td>
</tr>
<tr>
<td><strong>可选服务：</strong></td>
<td><code>qrcode</code></td>
<td>二维码服务。 <strong>如果需要使用二维码方式显示登录链接， <br>则必须安装并启用 <code>koishi-plugin-qrcode-service-null</code> 插件。<br></strong>  如果未安装或未启用，插件将默认使用文本链接形式提供登录地址。</td>
</tr>
</tbody>
</table>

---

<h2>功能特性</h2>

<ul class="feature-list">
<li><strong>登录 QQ 开放平台后台：</strong>  通过指令获取登录链接或二维码，用户使用手机 QQ 扫码或点击链接完成登录授权，插件将保存登录状态以便后续操作。</li>
<li><strong>查看站内信内容：</strong>  获取并显示 QQ 开放平台站内通知信，方便用户及时了解平台通知。可以指定查看最近的站内信数量。</li>
<li><strong>查看机器人近日数据：</strong>  获取并展示机器人的近日运营数据，包括消息量、用户数、留存率等关键指标。可以指定查看最近的天数。</li>
</ul>

---