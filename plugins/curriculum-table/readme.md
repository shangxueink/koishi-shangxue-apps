# koishi-plugin-curriculum-table

[![npm](https://img.shields.io/npm/v/koishi-plugin-curriculum-table?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-curriculum-table)

<p>
这是一个群组课表插件，允许用户添加、移除和查看课程表，并支持从 WakeUp 课程表应用导入课程。
此外，插件还支持定时自动发送课程表图片到指定群组。
</p>

<h2>主要功能</h2>

<ul>
<li><strong>手动添加课程</strong>：通过指令手动添加课程信息。</li>
<li><strong>WakeUp 课程表导入</strong>：从 WakeUp 课程表应用分享的链接中导入课程。</li>
<li><strong>查看课程表</strong>：生成并发送当前群组的课程表图片。</li>
<li><strong>定时发送</strong>：根据配置的 Cron 表达式，定时自动发送课程表图片。</li>
<li><strong>移除课程</strong>: 移除已添加的课程。</li>
</ul>

<h2>指令说明</h2>
<details>
<summary>点击此处————查看指令说明</summary>
<h3>1. 手动添加课程</h3>

<p>
使用以下指令手动添加课程：
</p>

<pre>
<code>
群友课程表/添加课程 &lt;星期几&gt; &lt;课程名称&gt; &lt;上课时间-下课时间&gt;
</code>
</pre>
<ul>
<li><code>星期几</code>: 支持 "周一"、"周二"... "周日"，也支持 "周一周三" 这种格式。</li>
<li><code>课程名称</code>: 课程的名称。</li>
<li><code>上课时间-下课时间</code>: 课程的上课和下课时间，使用 24 小时制，例如 "8:00-9:30"。</li>
</ul>

<p>
<strong>可选参数：</strong>
</p>

<ul>
<li><code>-i, --userid &lt;userid&gt;</code>: 指定用户的 QQ 号码（不指定则为当前用户）。</li>
<li><code>-n, --username &lt;username&gt;</code>: 指定用户的昵称（不指定则为当前用户的昵称）。</li>
</ul>

<p>
<strong>示例：</strong>
</p>

<pre>
<code>
群友课程表/添加课程 周一周三 高等数学 8:00-9:30
群友课程表/添加课程 周四周五 9:55-12:15 大学英语 -i 114514 -n 上学大人
</code>
</pre>

<h3>2. WakeUp 课程表导入</h3>

<p>
使用以下指令从 WakeUp 课程表分享链接导入课程：
</p>

<pre>
<code>
群友课程表/wakeup &lt;WakeUp分享的文本&gt;
</code>
</pre>

<p>
<code>WakeUp分享的文本</code>: 从 WakeUp 课程表应用中复制的分享文本（包含分享口令）。
</p>

<p>
<strong>可选参数：</strong>
</p>

<ul>
<li><code>-i, --userid &lt;userid&gt;</code>: 指定用户的 QQ 号码（不指定则为当前用户）。</li>
<li><code>-n, --username &lt;username&gt;</code>: 指定用户的昵称（不指定则为当前用户的昵称）。</li>
</ul>

<p>
<strong>示例：</strong>
</p>

<pre>
<code>
群友课程表/wakeup 这是来自「WakeUp课程表」的课表分享......分享口令为「PaJ_8Kj_zeelspJs2HBL1」
</code>
</pre>

<h3>3. 查看课程表</h3>
<p>
使用以下指令渲染并发送当前群组的课程表图片：
</p>
<pre>
<code>
群友课程表/查看课程表
</code>
</pre>

<h3>4. 移除课程</h3>

<p>使用以下指令移除已添加的课程：</p>

<pre>
<code>
群友课程表/移除课程
</code>
</pre>

<p>
指令会列出当前用户在本群已添加的所有课程，并提示用户选择要移除的课程序号。
</p>

<p>
<strong>可选参数：</strong>
</p>

<ul>
<li><code>-i, --userid &lt;userid&gt;</code>: 指定用户的 QQ 号码（不指定则为当前用户）。</li>
<li><code>-n, --username &lt;username&gt;</code>: 指定用户的昵称（不指定则为当前用户的昵称）。</li>
</ul>

<h3>5. 定时发送设置 (配置项)</h3>

<p>
通过插件的配置项 <code>subscribe</code> 来设置定时发送课程表。
需要配置以下内容：
</p>

<ul>
<li><code>channelId</code>: 要发送课程表的群组 ID。</li>
<li>
<code>subscribetime</code>:  Cron 表达式，定义发送课程表的时间。
例如：
<ul>
<li><code>"0 12 * * *"</code>：每天中午 12:00 发送。</li>
<li><code>"10 16 * * *"</code>：每天下午 4:10 发送。</li>
<li><code>"0 8 * * 1"</code>：每周一早上 8:00 发送。</li>
</ul>
</li>
</ul>
</details>

---

<li><a href="https://i0.hdslb.com/bfs/article/a80a8b5ea7f4a3053b3f0b24520a84d9312276085.png" target="_blank" referrerpolicy="no-referrer">wakeup课程表导入</a></li>

<li><a href="https://i0.hdslb.com/bfs/article/df4c68e2ad6406d2fd27b6bf8d1c5322312276085.png" target="_blank" referrerpolicy="no-referrer">插件效果预览1</a></li>

<li><a href="https://i0.hdslb.com/bfs/article/3cd43011f330ee77f9cf6ac7f8d8308a312276085.png" target="_blank" referrerpolicy="no-referrer">插件效果预览2</a></li>

---

本插件只适合一些互相熟悉的小团体玩。