# koishi-plugin-autowithdraw-fix

[![npm](https://img.shields.io/npm/v/koishi-plugin-autowithdraw-fix?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-autowithdraw-fix)



---

<h2>简介</h2>

<p>自动撤回 Koishi 机器人发送的消息，并在消息被撤回后，自动撤回机器人回复的关联消息。</p>

---

<h2>特性</h2>

<ul>
<li><b>自动关联撤回:</b> 当用户撤回消息时，自动撤回机器人回复的关联消息 (通过引用)。</li>
<li><b>可配置的过期时间:</b> 可以设置记录 <code>session.sn</code> 的过期时间，防止内存占用过多。</li>
<li><b>可配置的引用回复:</b> 可以选择是否以引用的方式回复指令，方便用户追溯上下文。</li>
<li><b>日志调试:</b> 提供详细的日志输出，方便开发者调试和排查问题。</li>
<li><b>防止撤回指令的发送:</b> 拦截已撤回 session 的后续消息，避免消息继续发送。</li>
</ul>

---

<h2>配置</h2>

<p>插件提供以下配置选项：</p>

<ul>
<li><b><code>quoteEnable</code> (boolean):</b> 是否以引用的方式回复用户的指令。如果启用，机器人回复的消息会引用用户的原始消息。 默认为 <code>false</code>。</li>
<li><b><code>withdrawExpire</code> (number):</b> 记录 <code>session.sn</code> 的过期时间，单位为秒。 超过这个时间后，插件会清理已撤回的 <code>session.sn</code> 记录，释放内存。默认为 <code>60</code> 秒。</li>
<li><b><code>loggerinfo</code> (boolean):</b> 是否开启详细的日志调试输出。 开启后，插件会在控制台输出更多的调试信息，方便开发者排查问题。 默认为 <code>false</code>。 <b>警告：</b> 开启此选项可能会产生大量的日志输出。</li>
</ul>

---

<h2>使用方法</h2>

<ol>
<li>安装并配置插件后，插件会自动监听 <code>message-deleted</code> 事件。</li>
<li>当用户撤回消息时，插件会自动撤回机器人回复的关联消息 (如果存在)。</li>
<li>如果开启了 <code>quoteEnable</code> 选项，机器人会以引用的方式回复用户的指令。</li>
</ol>

---

<h2>注意事项</h2>

<ul>
<li>确保 Koishi 机器人具有撤回消息的权限。</li>
<li><code>withdrawExpire</code> 设置得太小可能会导致插件无法正确撤回消息。</li>
<li><code>loggerinfo</code> 选项仅用于调试目的，不建议在生产环境中开启。</li>
</ul>

<h2>灵感来源</h2>
<p>灵感来自这个项目：<a href="https://github.com/Kabuda-czh/koishi-plugin-autowithdraw/" target="_blank">github.com/Kabuda-czh/koishi-plugin-autowithdraw</a></p>

---