# koishi-plugin-command-creator-extender

[![npm](https://img.shields.io/npm/v/koishi-plugin-command-creator-extender?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-command-creator-extender)

`koishi-plugin-command-creator-extender` 是一个用于创建和扩展指令的 Koishi 插件，支持自定义指令和多重调用。

## 功能

- **指令创建**：允许用户创建自定义指令，以满足特定需求。
- **指令映射**：支持将一个指令映射到多个功能，便于实现复杂调用。
- **多重调用**：通过 `table2` 表格实现复杂的多重调用逻辑。


<body>
<h1>插件使用说明</h1>
<p>该插件用于将一个已有的指令映射到其他指令，并允许用户自定义指令。</p>
<h2>功能</h2>
<ul>
<li>指令映射：通过配置表将输入指令映射到多个输出指令。</li>
<li>自定义指令：用户可以创建自定义指令，指定其行为为回复消息或执行其他指令。</li>
<li>日志调试：启用调试模式以输出详细日志信息。</li>
</ul>
<h2>使用方法</h2>
<p>您可以在 <strong>table2</strong> 表格中指定【已经注册的指令】的调用关系。</p>
<p>如果希望创建一个全新的指令，可以使用 <strong>commands</strong> 配置项。</p>
<h3>注意事项</h3>
<ul>
<li><strong>table2</strong>：在执行完【原始指令】之后，会自动执行右侧的【下一个指令】。可以指定多个重复的【原始指令】以实现多重调用。</li>
<li><strong>commands</strong>：用于创建自定义的指令，实现【创建一个指令去调用另一个指令】或【创建一个指令返回指定内容】的功能。</li>
<li>需要注意：在同一个 Koishi 环境中，【指令名称不可以重复】，即配置项<strong>commands.name</strong>不可以与已有指令重复。<strong>table2</strong>配置项里的指令必须都已经存在。</li>
</ul>
<p>推荐在 <strong>commands</strong> 中创建全新指令，并在 <strong>table2</strong> 表格中指定其对应的调用指令。</p>
</body>
