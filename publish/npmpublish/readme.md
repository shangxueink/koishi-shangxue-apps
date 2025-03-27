# koishi-plugin-command-creator-extender

[![npm](https://img.shields.io/npm/v/koishi-plugin-command-creator-extender?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-command-creator-extender)


本插件效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/c3a90e76082632cd5321d23582f9bc0d312276085.png" target="_blank" referrerpolicy="no-referrer">一次调用多个指令</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/b130e445dcfe99a89e841ee7615a4e61312276085.png" target="_blank" referrerpolicy="no-referrer">同一个指令，不同群里调用不同指令</a></li>

---

我们在下面的默认配置项内容里写好了一个使用示例

（注：下面的【前缀】均指【全局设置】里的指令前缀）

> 灵感来自 [command-creator](https://www.npmjs.com/package/koishi-plugin-command-creater)

<h2>使用示例</h2>
<p>假设您的 全局设置 里前缀只有 <code>["++", "/"]</code>：</p>
<ul>
<li><strong>默认配置项</strong>（例如 <code>rawCommand: "一键打卡"</code>）：
<ul>
<li><strong>私聊</strong>：可以使用 <code>一键打卡</code>、<code>++一键打卡</code> 或 <code>/一键打卡</code> 触发。</li>
<li><strong>群聊</strong>：必须使用 <code>++一键打卡</code> 或 <code>/一键打卡</code> 触发。</li>
</ul>
</li>
<li><strong>修改配置项</strong>（例如 <code>rawCommand: "**一键打卡"</code>）：
<ul>
<li><strong>私聊、群聊</strong>：必须使用 <code>++**一键打卡</code> 或 <code>/**一键打卡</code> 触发。（即使配置中包含了其他字符，全局前缀仍然是必需的）</li>
</ul>
</li>
</ul>

<code>即，解析rawCommand的行为 与指令效果 一致</code>

---

🎯 定时任务配置指南：
1. 启用定时执行功能开关
2. 填写机器人ID、频道ID、执行指令和定时时间
3. 时间格式为 "YYYY/MM/DD HH:mm:ss"
4. 插件启动时会自动创建定时任务

### 调试设置

- **reverse_order**：是否逆序执行指令（先执行下一个指令再执行原始指令）。默认为 `false`。
- **loggerinfo**：日志调试模式。默认为 `false`。

## 许可证

此项目遵循 MIT 许可证。